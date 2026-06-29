import { NextRequest, NextResponse } from "next/server";
import type { Timestamp } from "firebase-admin/firestore";
import { getAdminApp, getVerifiedUid, authorizeAdmin } from "@/lib/server/firebaseAdmin";
import { recordAudit } from "@/lib/server/audit";
import { isUserBlocked, buildReportFields } from "@/lib/server/moderation";

/* firebase-admin يحتاج Node APIs — نمنع تجميعه على Edge */
export const runtime = "nodejs";

/* حماية من الإساءة: 30 طلب بالدقيقة لكل IP */
const attempts = new Map<string, { count: number; reset: number }>();
function allowAttempt(ip: string): boolean {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now > e.reset) {
    attempts.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (e.count >= 30) return false;
  e.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowAttempt(ip)) {
    return NextResponse.json({ error: "محاولات كثيرة — انتظر دقيقة" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const { mode } = (body ?? {}) as { mode?: string };

  try {
    const app = await getAdminApp();
    const { getFirestore, FieldValue, Timestamp } = await import("firebase-admin/firestore");
    const db = getFirestore(app);

    /* -------- search: البحث عن مستخدمين بالاسم -------- */
    if (mode === "search") {
      const { query } = body as { query?: string };
      if (!query || typeof query !== "string" || query.trim().length < 2) {
        return NextResponse.json({ results: [] });
      }
      const q = query.trim();
      // prefix search using Firestore range query
      const snap = await db.collection("users")
        .where("name", ">=", q)
        .where("name", "<", q + "")
        .limit(10)
        .get();
      const results = snap.docs
        .map((d) => {
          const data = d.data();
          return { uid: d.id, name: data.name ?? "", track: data.track ?? "", isPrivate: data.isPrivate === true };
        })
        .filter((u) => !u.isPrivate)
        .map(({ uid, name, track }) => ({ uid, name, track }));
      return NextResponse.json({ results });
    }

    /* -------- studiers: عدد المتواجدين حالياً -------- */
    if (mode === "studiers") {
      const tenMinutesAgo = Timestamp.fromMillis(Date.now() - 10 * 60 * 1000);
      /* .select(region): نجلب حقل المنطقة فقط بدل وثيقة المستخدم الكاملة
         (تحوي نسخة localStorage كاملة) — يقلّص حجم القراءة بشكل كبير */
      const snap = await db.collection("users")
        .where("lastSeen", ">=", tenMinutesAgo)
        .select("region")
        .get();
      const regions: Record<string, number> = {};
      for (const d of snap.docs) {
        const data = d.data();
        const region = (data.region as string) || "غير محدد";
        regions[region] = (regions[region] ?? 0) + 1;
      }
      return NextResponse.json({ count: snap.size, regions });
    }

    /* -------- presence: تحديث آخر ظهور (هوية موثّقة) -------- */
    if (mode === "presence") {
      const uid = await getVerifiedUid(req);
      if (!uid) {
        return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
      }
      await db.collection("users").doc(uid).set(
        { lastSeen: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return NextResponse.json({ ok: true });
    }

    /* -------- getAnnouncements: جلب الإعلانات الرسمية --------
       groupId اختياري: لو مُرسل نعيد إعلانات هذا القروب + إعلانات «الكل».
       بدونه (لوحة الأدمن) نعيد كل الإعلانات. المثبّت يطفو فوق. */
    if (mode === "getAnnouncements") {
      const { groupId } = body as { groupId?: string };
      const snap = await db.collection("announcements")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      let announcements = snap.docs.map((d) => {
        const data = d.data();
        const createdAt = data.createdAt as Timestamp | undefined;
        return {
          id: d.id,
          title: data.title ?? "",
          content: data.content ?? "",
          groupId: (data.groupId as string) ?? "all",
          pinned: data.pinned === true,
          createdAt: createdAt ? { seconds: createdAt.seconds } : undefined,
        };
      });
      if (groupId) {
        announcements = announcements.filter((a) => a.groupId === "all" || a.groupId === groupId);
      }
      /* المثبّت أولاً (الترتيب ثابت فيحافظ على createdAt تنازلياً داخل كل فئة) */
      announcements.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      return NextResponse.json({ announcements });
    }

    /* -------- announce: نشر إعلان (للمشرف فقط) -------- */
    if (mode === "announce") {
      const { title, content, groupId, pinned } = body as {
        title?: string; content?: string; groupId?: string; pinned?: boolean;
      };
      const annCaller = await authorizeAdmin(req, body as { password?: unknown }, "admin");
      if (!annCaller) {
        return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
      }
      if (!title || typeof title !== "string" || !title.trim()) {
        return NextResponse.json({ error: "العنوان مفقود" }, { status: 400 });
      }
      if (!content || typeof content !== "string" || !content.trim()) {
        return NextResponse.json({ error: "المحتوى مفقود" }, { status: 400 });
      }
      const ref = await db.collection("announcements").add({
        title: title.trim(),
        content: content.trim(),
        groupId: typeof groupId === "string" && groupId ? groupId : "all",
        pinned: pinned === true,
        createdAt: FieldValue.serverTimestamp(),
      });
      await recordAudit(db, req, annCaller, {
        area: "council", action: "announce_create", targetType: "announcement", targetId: ref.id,
        after: { title: title.trim(), groupId: groupId || "all", pinned: pinned === true },
        summary: `نشر إعلان: ${title.trim().slice(0, 60)}`,
      });
      return NextResponse.json({ ok: true, id: ref.id });
    }

    /* -------- editAnnouncement: تعديل إعلان (للمشرف فقط) -------- */
    if (mode === "editAnnouncement") {
      const { id, title, content, groupId } = body as {
        id?: string; title?: string; content?: string; groupId?: string;
      };
      const editCaller = await authorizeAdmin(req, body as { password?: unknown }, "admin");
      if (!editCaller) {
        return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
      }
      if (!id || typeof id !== "string") {
        return NextResponse.json({ error: "معرّف الإعلان مفقود" }, { status: 400 });
      }
      if (!title || !title.trim() || !content || !content.trim()) {
        return NextResponse.json({ error: "العنوان والمحتوى مطلوبان" }, { status: 400 });
      }
      await db.collection("announcements").doc(id).set({
        title: title.trim(),
        content: content.trim(),
        ...(typeof groupId === "string" && groupId ? { groupId } : {}),
      }, { merge: true });
      await recordAudit(db, req, editCaller, {
        area: "council", action: "announce_edit", targetType: "announcement", targetId: id,
        after: { title: title.trim() }, summary: `تعديل إعلان: ${title.trim().slice(0, 60)}`,
      });
      return NextResponse.json({ ok: true });
    }

    /* -------- pinAnnouncement: تثبيت / إلغاء تثبيت (للمشرف فقط) -------- */
    if (mode === "pinAnnouncement") {
      const { id, pinned } = body as { id?: string; pinned?: boolean };
      const pinCaller = await authorizeAdmin(req, body as { password?: unknown }, "admin");
      if (!pinCaller) {
        return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
      }
      if (!id || typeof id !== "string") {
        return NextResponse.json({ error: "معرّف الإعلان مفقود" }, { status: 400 });
      }
      await db.collection("announcements").doc(id).set({ pinned: pinned === true }, { merge: true });
      await recordAudit(db, req, pinCaller, {
        area: "council", action: "announce_pin", targetType: "announcement", targetId: id,
        after: { pinned: pinned === true }, summary: pinned ? "تثبيت إعلان" : "إلغاء تثبيت إعلان",
      });
      return NextResponse.json({ ok: true, pinned: pinned === true });
    }

    /* -------- deleteAnnouncement: حذف إعلان (للمشرف فقط) -------- */
    if (mode === "deleteAnnouncement") {
      const { id } = body as { id?: string };
      const delCaller = await authorizeAdmin(req, body as { password?: unknown }, "admin");
      if (!delCaller) {
        return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
      }
      if (!id || typeof id !== "string") {
        return NextResponse.json({ error: "معرّف الإعلان مفقود" }, { status: 400 });
      }
      await db.collection("announcements").doc(id).delete();
      await recordAudit(db, req, delCaller, {
        area: "council", action: "announce_delete", targetType: "announcement", targetId: id,
        summary: "حذف إعلان",
      });
      return NextResponse.json({ ok: true });
    }

    /* -------- getFriends: جلب قائمة الأصدقاء (هوية موثّقة) -------- */
    if (mode === "getFriends") {
      const uid = await getVerifiedUid(req);
      if (!uid) {
        return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
      }
      const snap = await db.collection("users").doc(uid).collection("friends").get();
      const friends = snap.docs.map((d) => {
        const data = d.data();
        return { uid: d.id, name: data.name ?? "", track: data.track ?? "" };
      });
      return NextResponse.json({ friends });
    }

    /* -------- getProfile: بروفايل صديق + إحصاءاته (هوية موثّقة + احترام الخصوصية) -------- */
    if (mode === "getProfile") {
      const uid = await getVerifiedUid(req);
      if (!uid) {
        return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
      }
      const { targetUid } = body as { targetUid?: string };
      if (!targetUid || typeof targetUid !== "string") {
        return NextResponse.json({ error: "targetUid مفقود" }, { status: 400 });
      }
      const doc = await db.collection("users").doc(targetUid).get();
      if (!doc.exists) {
        return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
      }
      const data = doc.data()!;
      /* البروفايل الخاص لا يُكشف إلا لصاحبه أو لصديق مؤكَّد */
      if (data.isPrivate === true && targetUid !== uid) {
        const friend = await db.collection("users").doc(uid).collection("friends").doc(targetUid).get();
        if (!friend.exists) {
          return NextResponse.json({ error: "هذا الحساب خاص" }, { status: 403 });
        }
      }
      const lastSeen = data.lastSeen as Timestamp | undefined;
      return NextResponse.json({
        profile: {
          uid: targetUid,
          name: data.name ?? "",
          track: data.track ?? "",
          isPrivate: data.isPrivate === true,
          streak: Number(data.streak ?? 0),
          focusMins: Number(data.focusMins ?? 0),
          sessions: Number(data.sessions ?? 0),
          silver: Number(data.silver ?? 0),
          lastSeen: lastSeen ? lastSeen.toMillis() : null,
        },
      });
    }

    /* -------- addFriend: إضافة صديق (هوية موثّقة) -------- */
    if (mode === "addFriend") {
      const uid = await getVerifiedUid(req);
      if (!uid) {
        return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
      }
      const { targetUid } = body as { targetUid?: string };
      if (!targetUid || typeof targetUid !== "string") {
        return NextResponse.json({ error: "targetUid مفقود" }, { status: 400 });
      }
      // جلب اسم الصديق المستهدف
      const targetDoc = await db.collection("users").doc(targetUid).get();
      const targetData = targetDoc.data();
      const targetName = targetData?.name ?? "";
      const targetTrack = targetData?.track ?? "";
      // حفظ الصديق في السابكوليكشن
      await db.collection("users").doc(uid).collection("friends").doc(targetUid).set({
        addedAt: FieldValue.serverTimestamp(),
        name: targetName,
        track: targetTrack,
      });
      return NextResponse.json({ ok: true, name: targetName });
    }

    /* -------- removeFriend: حذف صديق (هوية موثّقة) -------- */
    if (mode === "removeFriend") {
      const uid = await getVerifiedUid(req);
      if (!uid) {
        return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
      }
      const { targetUid } = body as { targetUid?: string };
      if (!targetUid || typeof targetUid !== "string") {
        return NextResponse.json({ error: "targetUid مفقود" }, { status: 400 });
      }
      await db.collection("users").doc(uid).collection("friends").doc(targetUid).delete();
      return NextResponse.json({ ok: true });
    }

    /* -------- leaderboard: لوحة الشرف (هوية موثّقة، تحترم الخصوصية) -------- */
    if (mode === "leaderboard") {
      const uid = await getVerifiedUid(req);
      if (!uid) {
        return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
      }
      /* نجلب أكثر من المطلوب ثم نُقصي الخاص ونأخذ العشرين الأوائل.
         .select يتجنّب جلب حقل backup الضخم. */
      const topBy = async (field: "focusMins" | "streak") => {
        const snap = await db.collection("users")
          .orderBy(field, "desc")
          .limit(60)
          .select("name", "track", "streak", "focusMins", "isPrivate")
          .get();
        return snap.docs
          .map((d) => {
            const x = d.data();
            return { uid: d.id, name: (x.name as string) ?? "طالب", track: (x.track as string) ?? "", value: Number(x[field] ?? 0), isPrivate: x.isPrivate === true };
          })
          .filter((u) => !u.isPrivate && u.value > 0)
          .slice(0, 20)
          .map(({ uid: id, name, track, value }) => ({ uid: id, name, track, value }));
      };
      const [topHours, topStreak] = await Promise.all([topBy("focusMins"), topBy("streak")]);
      return NextResponse.json({ topHours, topStreak });
    }

    /* -------- reportMessage: بلاغ عن رسالة (C1) — الحقول تُشتق من الرسالة الحقيقية --------
       جذر إصلاح C1: العميل يرسل (groupId, messageId, reason, note) فقط؛ الخادم
       يقرأ الرسالة الفعلية ويشتق منها reportedUid/reportedName/content، فلا يمكن
       تلفيق بلاغ عن ضحية أو حقن محتوى مزوّر. (البلاغات صارت خادمية فقط في القواعد.) */
    if (mode === "reportMessage") {
      const uid = await getVerifiedUid(req);
      if (!uid) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
      if (await isUserBlocked(db, uid)) return NextResponse.json({ error: "الحساب موقوف" }, { status: 403 });
      const { groupId, messageId, reason, note } = body as { groupId?: string; messageId?: string; reason?: string; note?: string };
      if (typeof groupId !== "string" || !groupId || typeof messageId !== "string" || !messageId) {
        return NextResponse.json({ error: "بيانات البلاغ ناقصة" }, { status: 400 });
      }
      const msgSnap = await db.collection("chats").doc(groupId).collection("messages").doc(messageId).get();
      if (!msgSnap.exists) return NextResponse.json({ error: "الرسالة غير موجودة" }, { status: 404 });
      const report = buildReportFields({
        groupId, messageId, msg: msgSnap.data() ?? {},
        reporterUid: uid, reason: typeof reason === "string" ? reason : "other",
        note: typeof note === "string" ? note : "",
      });
      const ref = await db.collection("reports").add({ ...report, createdAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ ok: true, id: ref.id });
    }

    /* -------- submitFeedback: ملاحظة/اقتراح/مشكلة (هوية موثّقة) -------- */
    if (mode === "submitFeedback") {
      const uid = await getVerifiedUid(req);
      if (!uid) {
        return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
      }
      if (await isUserBlocked(db, uid)) return NextResponse.json({ error: "الحساب موقوف" }, { status: 403 });
      const { kind, text, name, page } = body as { kind?: string; text?: string; name?: string; page?: string };
      const KINDS = ["feature", "bug", "opinion"];
      if (!kind || !KINDS.includes(kind)) {
        return NextResponse.json({ error: "نوع غير صالح" }, { status: 400 });
      }
      if (!text || typeof text !== "string" || text.trim().length < 3) {
        return NextResponse.json({ error: "اكتب ملاحظتك أولاً" }, { status: 400 });
      }
      await db.collection("feedback").add({
        uid,
        name: typeof name === "string" ? name.slice(0, 40) : "",
        kind,
        text: text.trim().slice(0, 2000),
        page: typeof page === "string" ? page.slice(0, 80) : "",
        status: "new",
        createdAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ ok: true });
    }

    /* -------- getFeedback: قائمة الملاحظات (للطاقم فقط) -------- */
    if (mode === "getFeedback") {
      if (!(await authorizeAdmin(req, body as { password?: unknown }, "moderator"))) {
        return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
      }
      const snap = await db.collection("feedback")
        .orderBy("createdAt", "desc")
        .limit(200)
        .get();
      const items = snap.docs.map((d) => {
        const data = d.data();
        const createdAt = data.createdAt as Timestamp | undefined;
        return {
          id: d.id,
          uid: data.uid ?? "",
          name: data.name ?? "",
          kind: data.kind ?? "opinion",
          text: data.text ?? "",
          page: data.page ?? "",
          status: data.status ?? "new",
          createdAt: createdAt ? createdAt.toMillis() : null,
        };
      });
      return NextResponse.json({ items });
    }

    /* -------- getReferral: كود الإحالة + العدد + المكافأة المعلّقة (هوية موثّقة) -------- */
    if (mode === "getReferral") {
      const uid = await getVerifiedUid(req);
      if (!uid) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
      const snap = await db.collection("users").doc(uid).get();
      const x = snap.data() ?? {};
      return NextResponse.json({
        code: uid,
        count: Number(x.referralCount ?? 0),
        pendingReward: Number(x.pendingRefReward ?? 0),
      });
    }

    /* -------- redeemReferral: استبدال كود إحالة (مرة واحدة، لا إحالة ذاتية) -------- */
    if (mode === "redeemReferral") {
      const uid = await getVerifiedUid(req);
      if (!uid) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
      const { code } = body as { code?: string };
      if (typeof code !== "string" || code.length < 6 || code.length > 128 || code === uid) {
        return NextResponse.json({ ok: false, error: "كود غير صالح" });
      }
      const REWARD = 50; // فضة لكلٍّ من المُحيل والمُحال
      const meRef = db.collection("users").doc(uid);
      const refRef = db.collection("users").doc(code);
      const result = await db.runTransaction(async (tx) => {
        const [meSnap, refSnap] = await Promise.all([tx.get(meRef), tx.get(refRef)]);
        if (!refSnap.exists) return { ok: false as const };
        const me = meSnap.data() ?? {};
        if (me.referredBy) return { ok: false as const }; // استُبدلت سابقاً
        tx.set(meRef, { referredBy: code }, { merge: true });
        tx.set(refRef, {
          referralCount: FieldValue.increment(1),
          pendingRefReward: FieldValue.increment(REWARD),
        }, { merge: true });
        return { ok: true as const, reward: REWARD };
      });
      return NextResponse.json(result);
    }

    /* -------- claimRefReward: استلام مكافآت الإحالة المتراكمة (هوية موثّقة) -------- */
    if (mode === "claimRefReward") {
      const uid = await getVerifiedUid(req);
      if (!uid) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
      const meRef = db.collection("users").doc(uid);
      const claimed = await db.runTransaction(async (tx) => {
        const snap = await tx.get(meRef);
        const amt = Number((snap.data() ?? {}).pendingRefReward ?? 0);
        if (amt > 0) tx.set(meRef, { pendingRefReward: 0 }, { merge: true });
        return amt;
      });
      return NextResponse.json({ claimed });
    }

    return NextResponse.json({ error: "mode غير مدعوم" }, { status: 400 });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `خطأ في الخادم: ${msg}` }, { status: 500 });
  }
}
