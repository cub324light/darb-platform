import { NextRequest, NextResponse } from "next/server";
import { getAdminApp, getVerifiedRole } from "@/lib/server/firebaseAdmin";
import { checkRateLimit } from "@/lib/server/rateLimit";

/* firebase-admin يحتاج Node APIs — نمنع تجميعه على Edge */
export const runtime = "nodejs";

/* حذف الحساب نهائياً: مستند Firestore + قائمة الأصدقاء + حساب المصادقة.
   المالك لا يُحذف أبداً (حماية صريحة). الهوية تُتحقَّق عبر ID Token. */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  /* M-6: محدّد معدّل دائم — ١٠/دقيقة لكل IP */
  if (!(await checkRateLimit("account_" + ip, 10, 60_000))) {
    return NextResponse.json({ error: "محاولات كثيرة — انتظر دقيقة" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body || body.mode !== "delete") {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const who = await getVerifiedRole(req);
  if (!who) {
    return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  }
  /* المالك محميّ — لا يُحذف بأي حال */
  if (who.role === "owner") {
    return NextResponse.json({ error: "لا يمكن حذف حساب المالك" }, { status: 403 });
  }

  try {
    const app = await getAdminApp();
    const { getFirestore } = await import("firebase-admin/firestore");
    const { getAuth } = await import("firebase-admin/auth");
    const db = getFirestore(app);

    /* احذف قائمة الأصدقاء (مجموعة فرعية) ثم مستند المستخدم في دفعة واحدة */
    const friends = await db.collection("users").doc(who.uid).collection("friends").get();
    const batch = db.batch();
    friends.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(db.collection("users").doc(who.uid));
    await batch.commit();

    /* احذف حساب المصادقة نفسه — بعدها لا يمكن تسجيل الدخول به */
    await getAuth(app).deleteUser(who.uid);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "تعذّر حذف الحساب — حاول لاحقاً" }, { status: 500 });
  }
}
