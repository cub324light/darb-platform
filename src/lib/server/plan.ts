/* ─── باقةُ المستخدم كما يراها الخادم ───
   الباقةُ تُقرأ من `users/{uid}.plan` في Firestore. وقواعدُ الأمان تمنع العميلَ
   من كتابة هذا الحقل (يُضبط عبر Admin SDK وحده)، فما نقرؤه هنا لا يُزوَّر —
   ولو قرأناه من جسم الطلب لرفع كلُّ أحدٍ نفسَه إلى «عنقاء» بسطرٍ في المتصفّح.

   عند غياب Firestore أو تعذّر القراءة نسقط إلى «مجّاني»: الفشلُ يُضيّق ولا
   يُوسّع. ومن حُرم حقَّه بعطلٍ عابرٍ يشتكي فنُصلح؛ أمّا العكسُ فيُنفق ميزانيةً
   لا تُسترد. */
import { normalizePlan } from "../plan";
import { limitsFor, type PlanLimits } from "../planLimits";
import { getAdminDbOptional } from "./firebaseAdmin";
import type { PlanId } from "../types";

export async function serverPlan(uid: string): Promise<PlanId> {
  const db = await getAdminDbOptional();
  if (!db) return "free";
  try {
    const snap = await db.collection("users").doc(uid).get();
    return normalizePlan(snap.exists ? snap.data()?.plan : undefined);
  } catch {
    return "free";
  }
}

export async function serverLimits(uid: string): Promise<PlanLimits> {
  return limitsFor(await serverPlan(uid));
}
