/* ═══════════ حدودُ الباقات — مصدرٌ واحد يقرؤه الخادمُ وصفحةُ الأسعار ═══════════
   كانت صفحةُ الباقات تَعِد بـ«بلا حدّ» و«—»، ولا شيءَ من ذلك مفروضٌ في الكود:
   الجميعُ — مجّانيّهم ومدفوعُهم — يأخذ مئةً وخمسين رسالةَ دويرب وثلاثين تحليلاً
   في اليوم. فالمدفوعُ لا يشتري شيئاً إلا سعةَ الخزنة. هذا الملفُّ يُنهي ذلك:
   رقمٌ واحدٌ يُعرض ويُفرض معاً، فلا تفترق الصفحةُ عن السلوك مرّةً أخرى.

   ▓ المبدأ (بأمر المالك): **ما يذاكر به الطالبُ مجّانيّ** — تركيزٌ ومساري
   والتقويم والدفتر والمدرسة وأخطائي وبنكُ المراجعة، كلُّها بلا نقصان.
   والمدفوعُ يشتري **السعةَ والذكاء** وحدهما، وهما ما يُكلّفنا فعلاً.

   ▓ «بلا حدّ» كلمةٌ لا نكتبها: للذكاء سقفٌ دائماً — إن لم يكن للطالب فللميزانية.
   نكتب الرقمَ صريحاً، فمن بلغه عرف لماذا وقف.

   ▓ نقاء: لا تخزينَ ولا شبكةَ هنا. الخادمُ يقرأ الباقةَ من Firestore
   (`serverPlan`) ثم يسأل هذا الملفَّ عن الحدّ. */
import type { PlanId } from "./types";

export interface PlanLimits {
  /** رسائلُ دويرب في اليوم (وتوليدُ أسئلة التدريب يشرب من الحوض نفسه). */
  chatPerDay: number;
  /** تحليلُ ملفٍّ أو صورةٍ بالذكاء في اليوم. */
  analyzePerDay: number;
  /** أخطاءٌ محفوظةٌ لكل مادة — `Infinity` = بلا سقف. */
  vaultPerSubject: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free:    { chatPerDay: 25,  analyzePerDay: 3,  vaultPerSubject: 25 },
  shaheen: { chatPerDay: 150, analyzePerDay: 30, vaultPerSubject: Infinity },
  anqa:    { chatPerDay: 150, analyzePerDay: 30, vaultPerSubject: Infinity },
};

export function limitsFor(plan: PlanId): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

/** نصُّ الحدّ كما يُعرض في الجدول — رقمٌ صريح، أو «غير محدودة» للسقف الغائب. */
export function limitLabel(v: number, unit: string): string {
  return v === Infinity ? "غير محدودة" : `${v} ${unit}`;
}
