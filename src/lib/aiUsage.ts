/* ─── تسجيل استهلاك الذكاء الاصطناعي (توكنز Groq) ───
   يُستدعى من مسار /api/chat بعد كل رد ناجح. يجمّع الاستهلاك في وثيقة
   يومية داخل مجموعة ai_usage في Firestore. مرن تماماً: أي فشل يُبتلع
   بصمت ولا يؤثر على رد المستخدم.

   شكل الوثيقة ai_usage/{YYYY-MM-DD}:
   { date, requests, promptTokens, completionTokens,
     byModel: { <safeKey>: { label, requests, promptTokens, completionTokens } } }
*/

import { getAdminDbOptional } from "@/lib/server/firebaseAdmin";

const dayKey = () => new Date().toISOString().slice(0, 10);
const safeKey = (model: string) => model.replace(/[^a-zA-Z0-9]/g, "_");

export async function recordAiUsage(
  model: string,
  promptTokens: number,
  completionTokens: number,
): Promise<void> {
  try {
    const p = Math.max(0, Math.floor(promptTokens) || 0);
    const c = Math.max(0, Math.floor(completionTokens) || 0);
    const db = await getAdminDbOptional();
    if (!db) return;

    const { FieldValue } = await import("firebase-admin/firestore");
    const date = dayKey();
    const key = safeKey(model);

    await db.collection("ai_usage").doc(date).set(
      {
        date,
        requests: FieldValue.increment(1),
        promptTokens: FieldValue.increment(p),
        completionTokens: FieldValue.increment(c),
        byModel: {
          [key]: {
            label: model,
            requests: FieldValue.increment(1),
            promptTokens: FieldValue.increment(p),
            completionTokens: FieldValue.increment(c),
          },
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    /* لا نُفشل الرد بسبب فشل التسجيل */
  }
}
