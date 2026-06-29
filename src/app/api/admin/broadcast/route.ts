import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, authorizeAdmin, getVerifiedUid } from "@/lib/server/firebaseAdmin";
import { recordAudit } from "@/lib/server/audit";
import { checkRateLimit } from "@/lib/server/rateLimit";
import { cleanId, safeInternalPath } from "@/lib/server/sanitize";
import { matchesAudience, validateAudience, describeAudience, type TargetProfile } from "@/lib/broadcast/audience";
import { BROADCAST_TYPES, type Broadcast, type BroadcastType, type AudienceFilter, type BroadcastStatus } from "@/lib/broadcast/types";

export const runtime = "nodejs";

const TYPES = new Set<string>(BROADCAST_TYPES.map((t) => t.id));
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/* يشتق ملف الاستهداف من وثيقة المستخدم (الحقول العليا + نسخة backup) */
function profileFromDoc(data: FirebaseFirestore.DocumentData): TargetProfile {
  let prof: Record<string, unknown> = {}, goals: Record<string, unknown> = {};
  let results: { exam?: string; score?: string }[] = [];
  try { prof = JSON.parse((data.backup?.darb_user as string) ?? "{}"); } catch { /* ignore */ }
  try { goals = JSON.parse((data.backup?.darb_goals as string) ?? "{}"); } catch { /* ignore */ }
  try { const r = JSON.parse((data.backup?.darb_results as string) ?? "[]"); if (Array.isArray(r)) results = r; } catch { /* ignore */ }
  const best = (needle: string): number | null => {
    let m: number | null = null;
    for (const r of results) {
      if (typeof r?.exam === "string" && r.exam.includes(needle) && r.score) {
        const n = parseFloat(r.score);
        if (Number.isFinite(n)) m = m == null ? n : Math.max(m, n);
      }
    }
    return m;
  };
  return {
    stage: (data.studyLevel ?? prof.studyLevel ?? null) as string | null,
    grade: (data.grade ?? prof.grade ?? null) as string | null,
    university: (goals.university ?? null) as string | null,
    rp: typeof data.rp === "number" ? data.rp : null,
    lastSeen: data.lastSeen?.seconds ? data.lastSeen.seconds * 1000 : null,
    quduratScore: best("قدرات"),
    tahsiliScore: best("تحصيلي"),
  };
}

/* تقدير عدد المستهدفين (دقيق لـ all، وعيّنة محدودة لبقية الفلاتر) */
async function countTargeted(db: FirebaseFirestore.Firestore, audience: AudienceFilter, now: number): Promise<number> {
  if (audience.kind === "all") {
    const c = await db.collection("users").count().get();
    return c.data().count;
  }
  const snap = await db.collection("users").limit(5000).get();
  let n = 0;
  for (const d of snap.docs) if (matchesAudience(profileFromDoc(d.data()), audience, now)) n++;
  return n;
}

function cleanAudience(raw: unknown): AudienceFilter {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const kind = str(r.kind, 20) as AudienceFilter["kind"];
  const out: AudienceFilter = { kind: kind || "all" };
  if (r.stage) out.stage = str(r.stage, 20);
  if (r.grade) out.grade = str(r.grade, 20);
  if (r.university) out.university = str(r.university, 60);
  if (typeof r.minRp === "number") out.minRp = Math.max(0, Math.floor(r.minRp));
  if (typeof r.maxRp === "number") out.maxRp = Math.max(0, Math.floor(r.maxRp));
  if (typeof r.inactiveDays === "number") out.inactiveDays = Math.max(1, Math.floor(r.inactiveDays));
  if (r.exam === "qudurat" || r.exam === "tahsili") out.exam = r.exam;
  if (r.scoreOp === "gte" || r.scoreOp === "lte") out.scoreOp = r.scoreOp;
  if (typeof r.scoreValue === "number") out.scoreValue = r.scoreValue;
  return out;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  const { mode } = body as { mode?: string };

  let db: FirebaseFirestore.Firestore;
  try { db = await getAdminDb(); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "خادم غير مهيّأ" }, { status: 503 }); }
  const { FieldValue } = await import("firebase-admin/firestore");
  const now = Date.now();

  /* ═══ أوضاع المستخدم (لا تتطلب أدمن) ═══ */

  /* activeForUser: يُعيد إشعارات المستخدم المطابقة (المُرسَلة أو المجدولة المستحقّة) */
  if (mode === "activeForUser") {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    const userDoc = await db.collection("users").doc(uid).get();
    const profile = userDoc.exists ? profileFromDoc(userDoc.data()!) : ({} as TargetProfile);
    const snap = await db.collection("broadcasts").orderBy("createdAt", "desc").limit(80).get();
    const out = snap.docs
      .map((d) => ({ ...(d.data() as Broadcast), id: d.id }))
      .filter((b) => b.status === "sent" || (b.status === "scheduled" && (b.scheduledAt ?? Infinity) <= now))
      .filter((b) => matchesAudience(profile, b.audience, now))
      .slice(0, 20)
      .map((b) => ({ id: b.id, type: b.type, title: b.title, body: b.body, targetPage: b.targetPage ?? null, createdAt: b.createdAt }));
    return NextResponse.json({ broadcasts: out });
  }

  /* report: تبليغ إحصاءة (delivered/opened/dismissed) */
  if (mode === "report") {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!(await checkRateLimit("bcreport_" + ip, 60, 60_000))) return NextResponse.json({ ok: false }, { status: 429 }); // M-6
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    const id = cleanId((body as { id?: unknown }).id, 80); // M-1
    const ev = str((body as { event?: unknown }).event, 12);
    const field = ev === "opened" ? "stats.opened" : ev === "dismissed" ? "stats.dismissed" : ev === "delivered" ? "stats.delivered" : null;
    if (!id || !field) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    await db.collection("broadcasts").doc(id).update({ [field]: FieldValue.increment(1) }).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  /* ═══ أوضاع الإدارة ═══ */
  const writeModes = new Set(["save", "send", "schedule", "cancel", "duplicate", "delete"]);
  const caller = await authorizeAdmin(req, body as { password?: unknown }, writeModes.has(mode ?? "") ? "admin" : "moderator");
  if (!caller) return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });

  try {
    /* list: كل الإشعارات (الأحدث أولاً) */
    if (mode === "list" || mode === undefined) {
      const snap = await db.collection("broadcasts").orderBy("createdAt", "desc").limit(100).get();
      const broadcasts = snap.docs.map((d) => ({ ...(d.data() as Broadcast), id: d.id }));
      return NextResponse.json({ broadcasts });
    }

    /* estimate: تقدير عدد المستهدفين لفلتر معيّن (للمعاينة) */
    if (mode === "estimate") {
      const audience = cleanAudience((body as { audience?: unknown }).audience);
      const targeted = await countTargeted(db, audience, now);
      return NextResponse.json({ targeted, describe: describeAudience(audience) });
    }

    /* save: إنشاء/تحديث مسودة أو مجدول */
    if (mode === "save") {
      const b = (body as { broadcast?: Record<string, unknown> }).broadcast ?? {};
      const type = str(b.type, 20);
      if (!TYPES.has(type)) return NextResponse.json({ error: "نوع غير صالح" }, { status: 400 });
      const title = str(b.title, 120); const bodyText = str(b.body, 2000);
      if (!title || !bodyText) return NextResponse.json({ error: "العنوان والنص مطلوبان" }, { status: 400 });
      const audience = cleanAudience(b.audience);
      const aErr = validateAudience(audience);
      if (aErr) return NextResponse.json({ error: aErr }, { status: 400 });

      const id = cleanId(b.id, 80) || db.collection("broadcasts").doc().id;
      const existing = (await db.collection("broadcasts").doc(id).get()).data() as Broadcast | undefined;
      const status: BroadcastStatus = (b.status === "scheduled" ? "scheduled" : "draft");
      const scheduledAt = status === "scheduled" && typeof b.scheduledAt === "number" ? b.scheduledAt : null;

      const doc: Broadcast = {
        id, type: type as BroadcastType, title, body: bodyText,
        targetPage: safeInternalPath(b.targetPage) ?? undefined,
        audience, status, scheduledAt, sentAt: existing?.sentAt ?? null,
        createdBy: existing?.createdBy ?? (caller.email ?? caller.uid),
        createdAt: existing?.createdAt ?? now, updatedAt: now,
        stats: existing?.stats ?? { targeted: 0, delivered: 0, opened: 0, dismissed: 0 },
      };
      await db.collection("broadcasts").doc(id).set(doc, { merge: false });
      await recordAudit(db, req, caller, {
        area: "broadcast", action: existing ? "broadcast_update" : "broadcast_create",
        targetType: "broadcast", targetId: id,
        after: { type, title, status, audience: describeAudience(audience) },
        summary: `${existing ? "تعديل" : "إنشاء"} إشعار: ${title.slice(0, 50)}`,
      });
      return NextResponse.json({ ok: true, broadcast: doc });
    }

    /* send: إرسال فوري — يحسب المستهدفين ويعلّمه «sent» */
    if (mode === "send") {
      const id = cleanId((body as { id?: unknown }).id, 80);
      const ref = db.collection("broadcasts").doc(id);
      const snap = await ref.get();
      if (!snap.exists) return NextResponse.json({ error: "الإشعار غير موجود" }, { status: 404 });
      const b = snap.data() as Broadcast;
      if (b.status === "sent") return NextResponse.json({ error: "أُرسل مسبقاً" }, { status: 400 });
      const targeted = await countTargeted(db, b.audience, now);
      await ref.set({ status: "sent", sentAt: now, scheduledAt: null, "stats.targeted": targeted }, { merge: true });
      await recordAudit(db, req, caller, {
        area: "broadcast", action: "broadcast_send", targetType: "broadcast", targetId: id,
        after: { targeted, audience: describeAudience(b.audience) },
        summary: `إرسال «${b.title.slice(0, 50)}» لـ ${targeted} مستخدم (${describeAudience(b.audience)})`,
      });
      return NextResponse.json({ ok: true, targeted });
    }

    /* schedule: جدولة الإرسال */
    if (mode === "schedule") {
      const id = cleanId((body as { id?: unknown }).id, 80);
      const at = (body as { scheduledAt?: unknown }).scheduledAt;
      if (typeof at !== "number" || at <= now) return NextResponse.json({ error: "اختر وقتاً مستقبلياً" }, { status: 400 });
      const ref = db.collection("broadcasts").doc(id);
      if (!(await ref.get()).exists) return NextResponse.json({ error: "الإشعار غير موجود" }, { status: 404 });
      await ref.set({ status: "scheduled", scheduledAt: at }, { merge: true });
      await recordAudit(db, req, caller, {
        area: "broadcast", action: "broadcast_schedule", targetType: "broadcast", targetId: id,
        after: { scheduledAt: at }, summary: `جدولة إشعار`,
      });
      return NextResponse.json({ ok: true });
    }

    /* cancel: إلغاء (مجدول/مرسَل يتوقف ظهوره للجدد) */
    if (mode === "cancel") {
      const id = cleanId((body as { id?: unknown }).id, 80);
      await db.collection("broadcasts").doc(id).set({ status: "canceled" }, { merge: true });
      await recordAudit(db, req, caller, { area: "broadcast", action: "broadcast_cancel", targetType: "broadcast", targetId: id, summary: "إلغاء إشعار" });
      return NextResponse.json({ ok: true });
    }

    /* duplicate: إعادة استخدام إشعار سابق كمسودة جديدة */
    if (mode === "duplicate") {
      const id = cleanId((body as { id?: unknown }).id, 80);
      const snap = await db.collection("broadcasts").doc(id).get();
      if (!snap.exists) return NextResponse.json({ error: "الإشعار غير موجود" }, { status: 404 });
      const src = snap.data() as Broadcast;
      const newId = db.collection("broadcasts").doc().id;
      const copy: Broadcast = {
        ...src, id: newId, status: "draft", scheduledAt: null, sentAt: null,
        createdBy: caller.email ?? caller.uid, createdAt: now, updatedAt: now,
        stats: { targeted: 0, delivered: 0, opened: 0, dismissed: 0 },
      };
      await db.collection("broadcasts").doc(newId).set(copy);
      await recordAudit(db, req, caller, { area: "broadcast", action: "broadcast_duplicate", targetType: "broadcast", targetId: newId, summary: `نسخ إشعار «${src.title.slice(0, 40)}»` });
      return NextResponse.json({ ok: true, id: newId });
    }

    /* delete: حذف مسودة/ملغى */
    if (mode === "delete") {
      const id = cleanId((body as { id?: unknown }).id, 80);
      await db.collection("broadcasts").doc(id).delete().catch(() => {});
      await recordAudit(db, req, caller, { area: "broadcast", action: "broadcast_delete", targetType: "broadcast", targetId: id, summary: "حذف إشعار" });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "mode غير مدعوم" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `خطأ: ${msg}` }, { status: 500 });
  }
}
