import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, authorizeAdmin } from "@/lib/server/firebaseAdmin";
import {
  buildSnapshot, scanStaleSources, suggestedStatus, sourceFreshness, entryFreshness,
  diffSource, diffEntry, nextVersion, buildVersionRecords,
  SOURCE_CATEGORIES, type Source, type KBEntry, type SourceCategory, type FetchMethod, type UpdateMode, type ItemStatus,
} from "@/lib/kb";
import { invalidateKBCache } from "@/lib/kb/server";

export const runtime = "nodejs";

const CATS = new Set<string>(SOURCE_CATEGORIES.map((c) => c.id));
const FETCH = new Set<string>(["api", "rss", "scrape", "pdf", "manual"]);
const UPD = new Set<string>(["auto", "manual"]);
const STATUS = new Set<string>(["active", "disabled", "expired"]);

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, lo: number, hi: number, dflt: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : dflt;

/* تنظيف مصدر قادم من الإدارة — allow-list صارم */
function cleanSource(raw: unknown, now: number): Source | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "بيانات المصدر مفقودة" };
  const r = raw as Record<string, unknown>;
  const id = str(r.id, 60).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!id) return { error: "معرّف المصدر مطلوب (أحرف/أرقام)" };
  const category = str(r.category, 30);
  if (!CATS.has(category)) return { error: "قسم غير صالح" };
  const name = str(r.name, 120); if (!name) return { error: "اسم المصدر مطلوب" };
  const url = str(r.url, 300);
  if (url && !/^https?:\/\//.test(url)) return { error: "رابط غير صالح" };
  const fetchMethod = str(r.fetchMethod, 10);
  if (!FETCH.has(fetchMethod)) return { error: "طريقة جلب غير صالحة" };
  const updateMode = str(r.updateMode, 10);
  if (!UPD.has(updateMode)) return { error: "وضع تحديث غير صالح" };
  const status = STATUS.has(str(r.status, 10)) ? (str(r.status, 10) as ItemStatus) : "active";
  return {
    id, category: category as SourceCategory, name,
    org: str(r.org, 120) || name,
    url, official: r.official === true,
    trust: num(r.trust, 0, 100, 80),
    fetchMethod: fetchMethod as FetchMethod,
    updateMode: updateMode as UpdateMode,
    reviewCadenceDays: num(r.reviewCadenceDays, 1, 3650, 30),
    lastVerified: num(r.lastVerified, 0, Number.MAX_SAFE_INTEGER, now),
    expiresAt: typeof r.expiresAt === "number" ? r.expiresAt : null,
    status,
    notes: str(r.notes, 500) || undefined,
    tags: Array.isArray(r.tags) ? (r.tags as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 12) : [],
    version: num(r.version, 1, 1e9, 1),
    updatedAt: now,
    origin: "custom",
  };
}

function cleanEntry(raw: unknown, now: number): KBEntry | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "بيانات المدخل مفقودة" };
  const r = raw as Record<string, unknown>;
  const id = str(r.id, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!id) return { error: "معرّف المدخل مطلوب" };
  const category = str(r.category, 30);
  if (!CATS.has(category)) return { error: "قسم غير صالح" };
  const question = str(r.question, 300); if (!question) return { error: "السؤال مطلوب" };
  const answer = str(r.answer, 4000); if (!answer) return { error: "الإجابة مطلوبة" };
  return {
    id, category: category as SourceCategory, question, answer,
    keywords: Array.isArray(r.keywords) ? (r.keywords as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 30) : [],
    sourceIds: Array.isArray(r.sourceIds) ? (r.sourceIds as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 20) : [],
    trust: num(r.trust, 0, 100, 85),
    lastVerified: num(r.lastVerified, 0, Number.MAX_SAFE_INTEGER, now),
    expiresAt: typeof r.expiresAt === "number" ? r.expiresAt : null,
    status: STATUS.has(str(r.status, 10)) ? (str(r.status, 10) as ItemStatus) : "active",
    version: num(r.version, 1, 1e9, 1),
    updatedAt: now,
    origin: "custom",
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  const { mode } = body as { mode?: string };

  /* القراءة: مشرف فأعلى. الكتابة: مشرف عام (admin) فأعلى. */
  const writeModes = new Set(["upsertSource", "deleteSource", "upsertEntry", "deleteEntry", "applyAutoExpire"]);
  const minRole = writeModes.has(mode ?? "") ? "admin" : "moderator";
  const caller = await authorizeAdmin(req, body as { password?: unknown }, minRole);
  if (!caller) return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });

  let db: FirebaseFirestore.Firestore;
  try { db = await getAdminDb(); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "خادم غير مهيّأ" }, { status: 503 }); }
  const now = Date.now();

  /* يقرأ overlay من Firestore ويبني اللقطة المدموجة (بذرة + overlay) */
  async function snapshot() {
    const [sSnap, eSnap] = await Promise.all([
      db.collection("kb_sources").limit(2000).get(),
      db.collection("kb_entries").limit(5000).get(),
    ]);
    return buildSnapshot({
      sources: sSnap.docs.map((d) => ({ ...(d.data() as Source), id: d.id })),
      entries: eSnap.docs.map((d) => ({ ...(d.data() as KBEntry), id: d.id })),
    });
  }

  async function audit(action: string, targetId: string, changes: unknown) {
    await db.collection("audit_log").add({
      area: "kb", action, targetId,
      by: caller!.email ?? caller!.uid, at: now, changes: changes ?? null,
    }).catch(() => {});
  }

  try {
    /* ─── list: المصادر مع حالة التقادم ─── */
    if (mode === "list" || mode === undefined) {
      const snap = await snapshot();
      const sources = snap.sources.map((s) => ({ ...s, freshness: sourceFreshness(s, now) }));
      return NextResponse.json({ sources, categories: SOURCE_CATEGORIES });
    }

    /* ─── listEntries ─── */
    if (mode === "listEntries") {
      const snap = await snapshot();
      const entries = snap.entries.map((e) => ({ ...e, freshness: entryFreshness(e, now) }));
      return NextResponse.json({ entries });
    }

    /* ─── scanStale: المصادر القديمة/المنتهية ─── */
    if (mode === "scanStale") {
      const snap = await snapshot();
      const reports = scanStaleSources(snap.sources, now)
        .map((r) => ({ id: r.item.id, name: r.item.name, category: r.item.category, state: r.info.state, daysOverdue: r.info.daysOverdue }));
      return NextResponse.json({ stale: reports });
    }

    /* ─── applyAutoExpire: تعطيل المنتهي صلاحيته تلقائياً ─── */
    if (mode === "applyAutoExpire") {
      const snap = await snapshot();
      let changed = 0;
      const batch = db.batch();
      for (const s of snap.sources) {
        const next = suggestedStatus(s, now);
        if (next !== s.status && next === "expired") {
          batch.set(db.collection("kb_sources").doc(s.id), { ...s, status: "expired", updatedAt: now, origin: "custom" }, { merge: true });
          changed++;
        }
      }
      if (changed) { await batch.commit(); invalidateKBCache(); await audit("auto_expire", "*", { changed }); }
      return NextResponse.json({ ok: true, expired: changed });
    }

    /* ─── upsertSource: إضافة/تعديل مع نسخ ─── */
    if (mode === "upsertSource") {
      const cleaned = cleanSource((body as { source?: unknown }).source, now);
      if ("error" in cleaned) return NextResponse.json({ error: cleaned.error }, { status: 400 });

      const snap = await snapshot();
      const before = snap.sources.find((s) => s.id === cleaned.id) ?? null;
      const changes = diffSource(before, cleaned);
      const version = nextVersion(before?.version, changes.length > 0);
      const toWrite: Source = { ...cleaned, version, updatedAt: now };

      const batch = db.batch();
      batch.set(db.collection("kb_sources").doc(cleaned.id), toWrite, { merge: false });
      for (const v of buildVersionRecords("source", cleaned.id, version, changes, caller.email ?? caller.uid, now)) {
        batch.set(db.collection("kb_versions").doc(v.id), v);
      }
      await batch.commit();
      invalidateKBCache();
      await audit("upsert_source", cleaned.id, changes);
      return NextResponse.json({ ok: true, source: toWrite, changed: changes.length });
    }

    /* ─── deleteSource: حذف overlay (يعود للبذرة إن كان منها) ─── */
    if (mode === "deleteSource") {
      const id = str((body as { id?: unknown }).id, 60);
      if (!id) return NextResponse.json({ error: "id مفقود" }, { status: 400 });
      await db.collection("kb_sources").doc(id).delete().catch(() => {});
      invalidateKBCache();
      await audit("delete_source", id, null);
      return NextResponse.json({ ok: true });
    }

    /* ─── upsertEntry: إضافة/تعديل مدخل معرفة مع نسخ ─── */
    if (mode === "upsertEntry") {
      const cleaned = cleanEntry((body as { entry?: unknown }).entry, now);
      if ("error" in cleaned) return NextResponse.json({ error: cleaned.error }, { status: 400 });

      const snap = await snapshot();
      const before = snap.entries.find((e) => e.id === cleaned.id) ?? null;
      const changes = diffEntry(before, cleaned);
      const version = nextVersion(before?.version, changes.length > 0);
      const toWrite: KBEntry = { ...cleaned, version, updatedAt: now };

      const batch = db.batch();
      batch.set(db.collection("kb_entries").doc(cleaned.id), toWrite, { merge: false });
      for (const v of buildVersionRecords("entry", cleaned.id, version, changes, caller.email ?? caller.uid, now)) {
        batch.set(db.collection("kb_versions").doc(v.id), v);
      }
      await batch.commit();
      invalidateKBCache();
      await audit("upsert_entry", cleaned.id, changes);
      return NextResponse.json({ ok: true, entry: toWrite, changed: changes.length });
    }

    if (mode === "deleteEntry") {
      const id = str((body as { id?: unknown }).id, 80);
      if (!id) return NextResponse.json({ error: "id مفقود" }, { status: 400 });
      await db.collection("kb_entries").doc(id).delete().catch(() => {});
      invalidateKBCache();
      await audit("delete_entry", id, null);
      return NextResponse.json({ ok: true });
    }

    /* ─── versions: تاريخ نسخ مصدر/مدخل ─── */
    if (mode === "versions") {
      const targetId = str((body as { targetId?: unknown }).targetId, 80);
      if (!targetId) return NextResponse.json({ error: "targetId مفقود" }, { status: 400 });
      const snap = await db.collection("kb_versions").where("targetId", "==", targetId).limit(100).get();
      const versions = snap.docs.map((d) => d.data()).sort((a, b) => (b.changedAt ?? 0) - (a.changedAt ?? 0));
      return NextResponse.json({ versions });
    }

    return NextResponse.json({ error: "mode غير مدعوم" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `خطأ: ${msg}` }, { status: 500 });
  }
}
