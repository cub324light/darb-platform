import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import type { Timestamp } from "firebase-admin/firestore";

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

/* مقارنة بوقت ثابت */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/* تهيئة ديناميكية — أي فشل في تحميل firebase-admin يصبح خطأً JSON بدل انهيار 500 */
async function adminApp() {
  const { initializeApp, getApps, cert, applicationDefault } = await import("firebase-admin/app");
  if (getApps().length > 0) return getApps()[0]!;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (sa) {
    let parsed: object;
    try { parsed = JSON.parse(sa); }
    catch { throw new Error("FIREBASE_SERVICE_ACCOUNT ليس JSON صالحاً — تأكد من النسخ الكامل"); }
    return initializeApp({ credential: cert(parsed as Parameters<typeof cert>[0]) });
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ credential: applicationDefault(), projectId: "my-education-platform-a160e" });
  }
  throw new Error("FIREBASE_SERVICE_ACCOUNT غير مضبوط — أضفه في إعدادات Vercel ثم أعد النشر");
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
    const app = await adminApp();
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
      const snap = await db.collection("users")
        .where("lastSeen", ">=", tenMinutesAgo)
        .get();
      const regions: Record<string, number> = {};
      for (const d of snap.docs) {
        const data = d.data();
        const region = (data.region as string) || "غير محدد";
        regions[region] = (regions[region] ?? 0) + 1;
      }
      return NextResponse.json({ count: snap.size, regions });
    }

    /* -------- presence: تحديث آخر ظهور -------- */
    if (mode === "presence") {
      const { uid } = body as { uid?: string };
      if (!uid || typeof uid !== "string") {
        return NextResponse.json({ error: "uid مفقود" }, { status: 400 });
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
      const { password, title, content, groupId, pinned } = body as {
        password?: string; title?: string; content?: string; groupId?: string; pinned?: boolean;
      };
      const adminPass = process.env.ADMIN_PASS ?? "darb-admin-2026";
      if (typeof password !== "string" || !safeEqual(password, adminPass)) {
        return NextResponse.json({ error: "كلمة السر خاطئة" }, { status: 401 });
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
      return NextResponse.json({ ok: true, id: ref.id });
    }

    /* -------- editAnnouncement: تعديل إعلان (للمشرف فقط) -------- */
    if (mode === "editAnnouncement") {
      const { password, id, title, content, groupId } = body as {
        password?: string; id?: string; title?: string; content?: string; groupId?: string;
      };
      const adminPass = process.env.ADMIN_PASS ?? "darb-admin-2026";
      if (typeof password !== "string" || !safeEqual(password, adminPass)) {
        return NextResponse.json({ error: "كلمة السر خاطئة" }, { status: 401 });
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
      return NextResponse.json({ ok: true });
    }

    /* -------- pinAnnouncement: تثبيت / إلغاء تثبيت (للمشرف فقط) -------- */
    if (mode === "pinAnnouncement") {
      const { password, id, pinned } = body as { password?: string; id?: string; pinned?: boolean };
      const adminPass = process.env.ADMIN_PASS ?? "darb-admin-2026";
      if (typeof password !== "string" || !safeEqual(password, adminPass)) {
        return NextResponse.json({ error: "كلمة السر خاطئة" }, { status: 401 });
      }
      if (!id || typeof id !== "string") {
        return NextResponse.json({ error: "معرّف الإعلان مفقود" }, { status: 400 });
      }
      await db.collection("announcements").doc(id).set({ pinned: pinned === true }, { merge: true });
      return NextResponse.json({ ok: true, pinned: pinned === true });
    }

    /* -------- deleteAnnouncement: حذف إعلان (للمشرف فقط) -------- */
    if (mode === "deleteAnnouncement") {
      const { password, id } = body as { password?: string; id?: string };
      const adminPass = process.env.ADMIN_PASS ?? "darb-admin-2026";
      if (typeof password !== "string" || !safeEqual(password, adminPass)) {
        return NextResponse.json({ error: "كلمة السر خاطئة" }, { status: 401 });
      }
      if (!id || typeof id !== "string") {
        return NextResponse.json({ error: "معرّف الإعلان مفقود" }, { status: 400 });
      }
      await db.collection("announcements").doc(id).delete();
      return NextResponse.json({ ok: true });
    }

    /* -------- getFriends: جلب قائمة الأصدقاء -------- */
    if (mode === "getFriends") {
      const { uid } = body as { uid?: string };
      if (!uid || typeof uid !== "string") {
        return NextResponse.json({ error: "uid مفقود" }, { status: 400 });
      }
      const snap = await db.collection("users").doc(uid).collection("friends").get();
      const friends = snap.docs.map((d) => {
        const data = d.data();
        return { uid: d.id, name: data.name ?? "", track: data.track ?? "" };
      });
      return NextResponse.json({ friends });
    }

    /* -------- getProfile: بروفايل صديق + إحصاءاته -------- */
    if (mode === "getProfile") {
      const { targetUid } = body as { targetUid?: string };
      if (!targetUid || typeof targetUid !== "string") {
        return NextResponse.json({ error: "targetUid مفقود" }, { status: 400 });
      }
      const doc = await db.collection("users").doc(targetUid).get();
      if (!doc.exists) {
        return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
      }
      const data = doc.data()!;
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

    /* -------- addFriend: إضافة صديق -------- */
    if (mode === "addFriend") {
      const { uid, targetUid } = body as { uid?: string; targetUid?: string };
      if (!uid || typeof uid !== "string") {
        return NextResponse.json({ error: "uid مفقود" }, { status: 400 });
      }
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

    /* -------- removeFriend: حذف صديق -------- */
    if (mode === "removeFriend") {
      const { uid, targetUid } = body as { uid?: string; targetUid?: string };
      if (!uid || typeof uid !== "string") {
        return NextResponse.json({ error: "uid مفقود" }, { status: 400 });
      }
      if (!targetUid || typeof targetUid !== "string") {
        return NextResponse.json({ error: "targetUid مفقود" }, { status: 400 });
      }
      await db.collection("users").doc(uid).collection("friends").doc(targetUid).delete();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "mode غير مدعوم" }, { status: 400 });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `خطأ في الخادم: ${msg}` }, { status: 500 });
  }
}
