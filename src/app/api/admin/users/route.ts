import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

/* مقارنة بوقت ثابت — تمنع كشف كلمة السر من زمن الاستجابة */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/* يعمل تلقائياً على Firebase Hosting (بيانات اعتماد المشروع نفسه).
   خارج Google Cloud: ضع محتوى Service Account JSON في FIREBASE_SERVICE_ACCOUNT */
function adminDb() {
  if (getApps().length === 0) {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    initializeApp(
      sa
        ? { credential: cert(JSON.parse(sa)) }
        : { credential: applicationDefault(), projectId: "my-education-platform-a160e" }
    );
  }
  return getFirestore();
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowAttempt(ip)) {
    return NextResponse.json({ error: "محاولات كثيرة — انتظر دقيقة" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const password = body?.password;

  const adminPass = process.env.ADMIN_PASS ?? "darb-admin-2026";
  if (typeof password !== "string" || !safeEqual(password, adminPass)) {
    return NextResponse.json({ error: "كلمة السر خاطئة" }, { status: 401 });
  }

  try {
    const snap = await adminDb().collection("users").get();
    const users = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name ?? "",
        track: data.track ?? "",
        streak: data.streak ?? 0,
        focusMins: data.focusMins ?? 0,
        sessions: data.sessions ?? 0,
        silver: data.silver ?? 0,
        taseesProgress: data.taseesProgress ?? 0,
        tadreebProgress: data.tadreebProgress ?? 0,
        joinedAt: data.joinedAt ? { seconds: data.joinedAt.seconds } : null,
        lastSeen: data.lastSeen ? { seconds: data.lastSeen.seconds } : null,
      };
    });
    users.sort((a, b) => (b.lastSeen?.seconds ?? 0) - (a.lastSeen?.seconds ?? 0));
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json(
      { error: "تعذر جلب البيانات — تأكد من بيانات اعتماد Firebase على الخادم" },
      { status: 500 }
    );
  }
}
