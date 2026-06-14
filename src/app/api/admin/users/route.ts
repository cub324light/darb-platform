import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

/* حماية من تخمين كلمة السر: 5 محاولات بالدقيقة لكل IP */
const attempts = new Map<string, { count: number; reset: number }>();
function allowAttempt(ip: string): boolean {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now > e.reset) {
    attempts.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (e.count >= 5) return false;
  e.count++;
  return true;
}

/* مقارنة بوقت ثابت */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function adminApp() {
  if (getApps().length > 0) return getApps()[0]!;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (sa) {
    let parsed: object;
    try { parsed = JSON.parse(sa); }
    catch { throw new Error("FIREBASE_SERVICE_ACCOUNT ليس JSON صالحاً — تأكد من النسخ الكامل"); }
    return initializeApp({ credential: cert(parsed as Parameters<typeof cert>[0]) });
  }
  try {
    return initializeApp({ credential: applicationDefault(), projectId: "my-education-platform-a160e" });
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT غير موجود — أضفه في Vercel Environment Variables");
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowAttempt(ip)) {
    return NextResponse.json({ error: "محاولات كثيرة — انتظر دقيقة" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const { password, mode } = (body ?? {}) as { password?: string; mode?: string };

  const adminPass = process.env.ADMIN_PASS ?? "darb-admin-2026";
  if (typeof password !== "string" || !safeEqual(password, adminPass)) {
    return NextResponse.json({ error: "كلمة السر خاطئة" }, { status: 401 });
  }

  /* وضع التشخيص */
  if (mode === "ping") {
    try {
      const app = adminApp();
      await getFirestore(app).collection("users").limit(1).get();
      return NextResponse.json({ ok: true, msg: "Firebase متصل بنجاح" });
    } catch (e) {
      return NextResponse.json({ ok: false, msg: String(e) }, { status: 500 });
    }
  }

  try {
    const app = adminApp();
    const db  = getFirestore(app);
    const fbAuth = getAuth(app);

    /* جلب مستخدمي Firebase Auth (للإيميلات) */
    const authEmailMap = new Map<string, string>();
    const authCreatedMap = new Map<string, number>(); // uid → createdAt ms
    const authLastSignInMap = new Map<string, number>(); // uid → lastSignInTime ms
    try {
      let pageToken: string | undefined;
      do {
        const result = await fbAuth.listUsers(1000, pageToken);
        for (const u of result.users) {
          if (u.email) authEmailMap.set(u.uid, u.email);
          if (u.metadata.creationTime)
            authCreatedMap.set(u.uid, new Date(u.metadata.creationTime).getTime());
          if (u.metadata.lastSignInTime)
            authLastSignInMap.set(u.uid, new Date(u.metadata.lastSignInTime).getTime());
        }
        pageToken = result.pageToken;
      } while (pageToken);
    } catch {
      /* لو فشل جلب Auth users، نكمل بدونه */
    }

    /* جلب مستخدمي Firestore */
    const snap = await db.collection("users").get();
    const now  = Date.now();

    const users = snap.docs.map((d) => {
      const data = d.data();
      const uid  = d.id;

      /* الإيميل: من Firestore أولاً (المستخدمون الجدد)، ثم من Auth Map (لو الـ id هو Auth UID) */
      const email = data.email || authEmailMap.get(uid) || "";

      const joinedMs  = data.joinedAt?.seconds  ? data.joinedAt.seconds  * 1000 : null;
      const lastSeenMs = data.lastSeen?.seconds ? data.lastSeen.seconds * 1000 : null;

      /* مدة الاستخدام: من أول تسجيل حتى الآن (بالأيام) */
      const durationDays = joinedMs ? Math.max(0, Math.floor((now - joinedMs) / 86_400_000)) : null;

      return {
        id:              uid,
        name:            data.name      ?? "",
        email,
        track:           data.track     ?? "",
        streak:          data.streak    ?? 0,
        focusMins:       data.focusMins ?? 0,
        sessions:        data.sessions  ?? 0,
        silver:          data.silver    ?? 0,
        taseesProgress:  data.taseesProgress  ?? 0,
        tadreebProgress: data.tadreebProgress ?? 0,
        school:          data.school ?? "",
        region:          data.region ?? "",
        city:            data.city   ?? "",
        phone:           data.phone  ?? "",
        durationDays,
        joinedAt:  joinedMs  ? { seconds: data.joinedAt.seconds  } : null,
        lastSeen:  lastSeenMs ? { seconds: data.lastSeen.seconds } : null,
      };
    });

    users.sort((a, b) => (b.lastSeen?.seconds ?? 0) - (a.lastSeen?.seconds ?? 0));
    return NextResponse.json({ users });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `تعذر جلب البيانات: ${msg}` }, { status: 500 });
  }
}
