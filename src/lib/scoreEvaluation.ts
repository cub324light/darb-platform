/* ─── التقييم العام لدرجات الطالب — مصدر الحقيقة الوحيد ───
   مستوىً واحد فقط: أين يقف الطالب عموماً حسب توزيع الجهات الرسمية (قياس/هيئة تقويم التعليم
   والتدريب) — لا أرقامٌ مخترعة. هذا منفصلٌ تماماً عن شروط الفرص (admissionRequirements.ts):

   • هنا: تقييمٌ عامّ لقدرة الطالب (أقل من المتوسط/متوسط/جيد/مرتفع/ممتاز) + النسبة المئوية.
   • هناك: هل يستوفي شرط فرصةٍ بعينها (جامعة/تخصص/برنامج) — لكلٍّ حدّه الخاص.

   القدرات والتحصيلي يُقاسان على مقياس قياس المعياري نفسه (0–100) فيتشاركان التوزيع.
   STEP اختبار لغةٍ مختلف — بلا نسبةٍ مئوية رسمية معلنة. تغيّرت حدود قياس مستقبلاً؟ عدّل
   هذا الملف وحده. */

import { n, pct } from "./format";

export type EvalTier = "below" | "average" | "good" | "high" | "excellent";
export type EvalIcon = "🟢" | "🟡" | "🔴";
export type EvalKey = "qudurat" | "tahsili" | "step";

export interface EvalBand {
  tier: EvalTier;
  label: string;        // التسمية العربية للمستوى
  min: number;          // أدنى درجةٍ للمستوى (شاملة)
  icon: EvalIcon;
  percentile?: number;  // «أفضل من حوالي ٪X من المختبرين» — رسمي (قياس) فقط
}

/* توزيع قياس الرسمي المشترك للقدرات والتحصيلي (مقياس 0–100 المعياري). */
export const QIYAS_BANDS: readonly EvalBand[] = [
  { tier: "excellent", label: "ممتاز",          min: 81, icon: "🟢", percentile: 95 },
  { tier: "high",      label: "مرتفع",          min: 78, icon: "🟢", percentile: 90 },
  { tier: "good",      label: "جيد",            min: 70, icon: "🟢", percentile: 70 },
  { tier: "average",   label: "متوسط",          min: 60, icon: "🟡" },
  { tier: "below",     label: "أقل من المتوسط", min: 0,  icon: "🔴" },
] as const;

/* STEP — اختبار لغةٍ إنجليزية (0–100). مستوياتٌ إرشادية بلا نسبةٍ مئوية رسمية. */
export const STEP_EVAL_BANDS: readonly EvalBand[] = [
  { tier: "excellent", label: "متقدّم",       min: 90, icon: "🟢" },
  { tier: "high",      label: "فوق المتوسط",  min: 83, icon: "🟢" },
  { tier: "good",      label: "متوسط",        min: 70, icon: "🟢" },
  { tier: "average",   label: "أساسي",        min: 50, icon: "🟡" },
  { tier: "below",     label: "مبتدئ",        min: 0,  icon: "🔴" },
] as const;

const BANDS: Record<EvalKey, readonly EvalBand[]> = {
  qudurat: QIYAS_BANDS,
  tahsili: QIYAS_BANDS,
  step: STEP_EVAL_BANDS,
};

/* الحدّ الأعلى لكل اختبار (كلها على مقياس 0–100). */
export const EVAL_MAX = 100;

function bandFor(bands: readonly EvalBand[], score?: number | null): EvalBand | null {
  if (score == null || Number.isNaN(score)) return null;
  for (const b of bands) if (score >= b.min) return b; // مرتّبة تنازلياً
  return bands[bands.length - 1] ?? null;
}

/** المستوى العام لدرجةٍ في اختبارٍ محدّد — من التوزيع الرسمي. */
export const evalBand = (key: EvalKey, score?: number | null): EvalBand | null => bandFor(BANDS[key], score);

export const getQuduratEval = (s?: number | null) => evalBand("qudurat", s);
export const getTahsiliEval = (s?: number | null) => evalBand("tahsili", s);
export const getStepEval = (s?: number | null) => evalBand("step", s);

/** «أفضل من حوالي ٪X من المختبرين» — يظهر فقط حين يوجد أساسٌ رسمي (نسبة مئوية). */
export const percentileText = (b: EvalBand | null | undefined): string | null =>
  b && b.percentile != null ? `أفضل من حوالي ${pct(b.percentile)} من المختبرين` : null;

/** نسبة امتلاء شريط التقدّم (0–100) — مقصوصة ضمن الحدود. */
export const evalBarPct = (score?: number | null): number =>
  score == null || Number.isNaN(score) ? 0 : Math.max(0, Math.min(100, (score / EVAL_MAX) * 100));

/** نصّ الدرجة «X من 100» بالأرقام العربية-الهندية. */
export const scoreOutOf = (score: number): string => `${n(score)} من ${n(EVAL_MAX)}`;

export const SCORE_EVALUATION_DISCLAIMER =
  "التقييم العام إرشادي حسب توزيع الجهات الرسمية — لا يغيّر شروط القبول الخاصة بكل فرصة.";
