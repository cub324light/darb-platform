/* ─── تحديد المعدّل لكل مستخدم (دائم، عبر Firestore) ───
   بديل عن العدّاد في الذاكرة (الذي يُصفَّر مع كل instance ولا يُشارَك بينها).
   نافذة منزلقة لكل uid عبر transaction ذرّية. آمن للتوسّع لملايين المستخدمين
   (مفتاح لكل مستخدم). fail-open عند غياب البنية التحتية حتى لا نحبس الشرعيين.
   لا تستوردها من العميل. */
import { getAdminDbOptional } from "./firebaseAdmin";

export async function checkUserRateLimit(
  uid: string,
  limit = 20,
  windowMs = 60_000,
): Promise<boolean> {
  const db = await getAdminDbOptional();
  if (!db) return true; // بيئة تطوير بلا Admin SDK — لا نحبس
  const ref = db.collection("aiRate").doc(uid);
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const now = Date.now();
      const data = snap.exists ? (snap.data() as { count?: number; reset?: number }) : null;
      if (!data || now > (data.reset ?? 0)) {
        tx.set(ref, { count: 1, reset: now + windowMs });
        return true;
      }
      if ((data.count ?? 0) >= limit) return false;
      tx.update(ref, { count: (data.count ?? 0) + 1 });
      return true;
    });
  } catch {
    return true; // خطأ بنية تحتية لا يحبس مستخدماً شرعياً
  }
}
