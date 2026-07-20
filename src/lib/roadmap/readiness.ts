/* ═══════════ محرّك الجاهزية (Readiness Engine) — مستقلٌّ ومعياريٌّ (Modular) ═══════════
   لا معادلةٌ ثابتةٌ مبعثرةٌ في الكود: كل عاملٍ (Factor) دالّةٌ نقيّةٌ تُنتج إشارةً موحّدة
   (متاح؟ · درجة ٠..١ · وزن · تلميحٌ للتفعيل)، والمحرّك يركّب العوامل المتاحة فقط. إضافة
   أيّ عاملٍ مستقبليّ (مثل «الاختبار التشخيصي») = عاملٌ جديدٌ يُمرَّر للمحرّك، بلا إعادة بناء.

   قاعدة الصدق: عاملٌ بلا بياناتٍ حقيقية = available:false (يُستبعد من الحساب، ويظهر تلميحه
   للمستخدم). ولو لم تكفِ العوامل المتاحة → النتيجة available:false («لا توجد بيانات كافية بعد»).
   لا رقمٌ تقديريٌّ أو وهميّ إطلاقاً.

   التوسعة: العوامل «محايدة النطاق» (scope-agnostic) — المتّصِل يحسب المدخلات لأي نطاق
   (الطالب كلّه الآن · لكل اختبارٍ مستقبلاً عند ربط جلسات التركيز بالاختبارات) بلا تغيير هنا. */

export type FactorId = "commitment" | "progress" | "errors" | "results" | "proximity"; // مستقبلاً: "diagnostic" | ...
export type Band = "good" | "watch" | "risk"; // 🟢 ممتاز · 🟡 يحتاج متابعة · 🔴 في خطر

export interface FactorSignal {
  id: FactorId;
  label: string;
  available: boolean; // هل تتوفّر بياناتٌ حقيقية لهذا العامل؟
  score: number;      // ٠..١ (ذو معنى فقط عند available)
  weight: number;     // الوزن الافتراضي في تركيب الجاهزية
  hint: string;       // ماذا يفعل الطالب لتفعيل هذا العامل (يُعرض عند عدم التوفّر)
}

/* أوزانٌ افتراضية (تعريف المؤشّر لا رقمٌ يُعرض للمستخدم) — قابلة للضبط لاحقاً. */
export const DEFAULT_WEIGHT: Record<FactorId, number> = {
  commitment: 0.28, progress: 0.28, results: 0.20, errors: 0.16, proximity: 0.08,
};

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/* حدود النطاقات (تعريف المؤشّر) — قابلة للضبط. */
export const GOOD_AT = 0.70;
export const WATCH_AT = 0.45;
export function bandOf(score01: number): Band {
  return score01 >= GOOD_AT ? "good" : score01 >= WATCH_AT ? "watch" : "risk";
}

/* ═══════════ العوامل (Factors) — دوالّ نقيّة من بياناتٍ حقيقية ═══════════ */

/** الالتزام: المُنجَز ÷ المخطّط (زمن). محايد النطاق: المتّصِل يمرّر المخطّط/المنجَز
    (إجمالاً الآن، ولكل اختبارٍ مستقبلاً). متاحٌ فقط إذا حُدِّدت خطّةٌ وبدأ الطالب فعلاً. */
export function commitmentFactor(i: { plannedMins: number; doneMins: number; started: boolean }): FactorSignal {
  const available = i.plannedMins > 0 && i.started;
  const score = available ? clamp01(i.doneMins / i.plannedMins) : 0;
  return { id: "commitment", label: "الالتزام", available, score, weight: DEFAULT_WEIGHT.commitment,
    hint: "حدّد ساعات مذاكرتك وابدأ أوّل جلسة ليُحسب التزامك." };
}

/** إنجاز الخطة: المنجَز ÷ الكلّي (دروس/تدريب الآن، والتزامٌ بالـTimeline لاحقاً — بلا تغيير واجهة). */
export function progressFactor(i: { doneItems: number; totalItems: number }): FactorSignal {
  const available = i.totalItems > 0;
  const score = available ? clamp01(i.doneItems / i.totalItems) : 0;
  return { id: "progress", label: "إنجاز الخطة", available, score, weight: DEFAULT_WEIGHT.progress,
    hint: "أضِف دروسك وابدأ إنجازها ليظهر تقدّم خطتك." };
}

/** الأخطاء: من «أخطائي». متاحٌ فقط إن سجّل الطالب أخطاءً. أخطاءٌ أكثر ⇐ درجةٌ أقل (سقفٌ قابلٌ للضبط). */
export function errorsFactor(i: { activeErrors: number; everLogged: boolean }, cap: number = 40): FactorSignal {
  const available = i.everLogged;
  const score = available ? clamp01(1 - i.activeErrors / cap) : 0;
  return { id: "errors", label: "الأخطاء", available, score, weight: DEFAULT_WEIGHT.errors,
    hint: "سجّل أخطاءك في «أخطائي» لتتابع تحسّنك." };
}

/** النتائج: آخر درجةٍ مسجّلة ÷ الأعلى. متاحٌ فقط إن وُجدت درجةٌ حقيقية. */
export function resultsFactor(i: { lastScore?: number | null; max?: number }): FactorSignal {
  const max = i.max && i.max > 0 ? i.max : 100;
  const available = i.lastScore != null;
  const score = available ? clamp01((i.lastScore as number) / max) : 0;
  return { id: "results", label: "النتائج", available, score, weight: DEFAULT_WEIGHT.results,
    hint: "سجّل درجتك بعد أوّل اختبار/محاولة لتدخل في الحساب." };
}

/** متّسع الوقت: كم بقي على الموعد نسبةً لمدّة تحضيرٍ مرجعية. متاحٌ فقط إن حُدِّد الموعد. */
export function proximityFactor(i: { daysLeft: number | null }, prepDays: number = 60): FactorSignal {
  const available = i.daysLeft != null;
  const score = available ? clamp01((i.daysLeft as number) / prepDays) : 0; // موعدٌ منتهٍ ⇐ ٠
  return { id: "proximity", label: "متّسع الوقت", available, score, weight: DEFAULT_WEIGHT.proximity,
    hint: "حدّد موعد اختبارك ليُحسب متّسع وقتك." };
}

/* ═══════════ المحرّك: تركيب العوامل المتاحة فقط ═══════════ */
export interface ReadinessResult {
  available: boolean;      // هل تكفي العوامل المتاحة؟
  score: number;           // ٠..١٠٠ (ذو معنى فقط عند available)
  band: Band;
  used: FactorSignal[];    // العوامل التي ساهمت
  missing: FactorSignal[]; // العوامل بلا بيانات (تلميحاتها ترشد المستخدم)
}

/** أدنى عددٍ من العوامل المتاحة لاعتبار الجاهزية ذات معنى (قابلٌ للضبط). */
export const MIN_FACTORS = 2;

export function computeReadiness(factors: FactorSignal[], minFactors: number = MIN_FACTORS): ReadinessResult {
  const used = factors.filter((f) => f.available);
  const missing = factors.filter((f) => !f.available);
  if (used.length < minFactors) {
    return { available: false, score: 0, band: "risk", used, missing };
  }
  const wsum = used.reduce((a, f) => a + f.weight, 0) || 1;
  const s = clamp01(used.reduce((a, f) => a + f.score * f.weight, 0) / wsum);
  return { available: true, score: Math.round(s * 100), band: bandOf(s), used, missing };
}

/* ═══════════ عدسة الخطر (Danger) — نظرةٌ على مجموعةٍ فرعية {الالتزام · الأخطاء · قرب الموعد} ═══════════ */
export interface DangerResult { available: boolean; band: Band; reasons: string[]; }

export function computeDanger(factors: FactorSignal[]): DangerResult {
  const pick = (id: FactorId) => factors.find((f) => f.id === id && f.available);
  const c = pick("commitment"), e = pick("errors"), p = pick("proximity");
  const core = [c, e].filter(Boolean) as FactorSignal[];
  if (core.length === 0 && !p) return { available: false, band: "good", reasons: [] };
  const base = core.length ? core.reduce((a, f) => a + f.score, 0) / core.length : 0.6;
  const urgency = p ? clamp01(1 - p.score) : 0;      // موعدٌ قريب ⇐ إلحاحٌ أعلى
  const effective = clamp01(base * (1 - 0.4 * urgency));
  const reasons: string[] = [];
  if (e && e.score < 0.5) reasons.push("أخطاؤك النشطة كثيرة");
  if (c && c.score < 0.5) reasons.push("التزامك بالمذاكرة منخفض");
  if (p && p.score < 0.25) reasons.push("موعد الاختبار قريب");
  return { available: true, band: bandOf(effective), reasons };
}

/* ═══════════ التوقّع (النسبة المتوقعة) — معياريٌّ، فارغٌ بصدقٍ حتى ترتكز على نتيجةٍ حقيقية ═══════════
   يرتكز على درجةٍ مسجّلة (لاحقاً: أو اختبارٍ تشخيصيّ كمدخلٍ إضافيّ)، ويُعدَّل قليلاً بالتقدّم/الأخطاء.
   بلا مرتكزٍ حقيقيّ ⇒ لا رقم إطلاقاً، بل رسالةٌ توضيحية. */
export interface PredictionResult { available: boolean; score: number; band: Band; hint: string; }

export function computePrediction(i: { results: FactorSignal; progress: FactorSignal; errors: FactorSignal }): PredictionResult {
  if (!i.results.available) {
    return { available: false, score: 0, band: "risk",
      hint: "لم نكوّن توقّعاً بعد. ابدأ المذاكرة وسجّل أوّل نتيجة وسنقدّر درجتك المتوقّعة." };
  }
  let s = i.results.score;
  if (i.progress.available) s = s * 0.8 + i.progress.score * 0.2;
  if (i.errors.available) s = s * (0.9 + 0.1 * i.errors.score);
  s = clamp01(s);
  return { available: true, score: Math.round(s * 100), band: bandOf(s), hint: "" };
}
