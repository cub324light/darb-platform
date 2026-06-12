import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
  const body = await req.json().catch(() => null);
  const password = body?.password;

  const adminPass = process.env.ADMIN_PASS ?? "darb-admin-2026";
  if (!password || password !== adminPass) {
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
