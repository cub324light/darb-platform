/* ═══════════ محرّك الجاهزية (Readiness Engine) — نقيٌّ 100٪ · معياريّ · صادق ═══════════
   ▸ لماذا؟ لتحويل مؤشّرات مساري (جاهزية · خطر · توقّع) من معادلاتٍ مبعثرةٍ إلى محرّكٍ واحدٍ
     شفّاف: كل عاملٍ (Factor) دالّةٌ نقيّةٌ تُنتج إشارةً موحّدة، والمحرّك يركّب المتاح فقط.
   ▸ نقاءٌ تام: لا localStorage ولا واجهة هنا. المدخلات تُمرَّر (القارئ read.ts يجمّعها من
     DarbUser خارج المحرّك)، والإعداد يُمرَّر من config.ts (لا رقمٌ ثابتٌ هنا).
   ▸ صدق: عاملٌ بلا بياناتٍ حقيقية ⇒ available:false (يُستبعد، ويظهر تلميحه). ولو لم تكفِ
     العوامل ⇒ الجاهزية available:false («لا توجد بيانات كافية») — لا رقمٌ إطلاقاً، ولا صفرٌ وهميّ.
   ▸ توسعة: العوامل محايدة النطاق (إجماليٌّ الآن، لكل اختبارٍ لاحقاً)، وأيّ عاملٍ جديد
     (تشخيصي · XP · توقّعات AI · دويرب) يُمرَّر للمحرّك بلا إعادة بناء. */
import { ROADMAP_TUNING, type ReadinessWeights } from "./config";

export type FactorId = "commitment" | "progress" | "errors" | "results" | "proximity"; // مستقبلاً: "diagnostic" | ...
export type Band = "good" | "watch" | "risk"; // 🟢 ممتاز · 🟡 يحتاج متابعة · 🔴 في خطر

export interface FactorSignal {
  id: FactorId;
  label: string;
  available: boolean; // هل تتوفّر بياناتٌ حقيقية؟ (الوزن من الإعداد لا من هنا)
  score: number;      // 0..1 (ذو معنى فقط عند available)
  hint: string;       // ماذا يفعل الطالب لتفعيل هذا العامل (يُعرض عند عدم التوفّر)
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export function bandOf(score01: number, r = ROADMAP_TUNING.readiness): Band {
  return score01 >= r.goodAt ? "good" : score01 >= r.watchAt ? "watch" : "risk";
}

/* ═══════════ العوامل (Factors) — دوالّ نقيّة من بياناتٍ حقيقية ═══════════ */

/** الالتزام — ▸ لماذا: هل يذاكر الطالب فعلاً بقدر خطّته؟ ▸ المصدر: دقائق التركيز المُنجَزة
    مقابل المخطّط (ساعات الطالب × النافذة) — يجمّعها القارئ. ▸ الهدف: قياس الانضباط الفعليّ.
    محايد النطاق: المتّصِل يمرّر المخطّط/المنجَز (إجمالاً الآن، ولكل اختبارٍ لاحقاً). */
export function commitmentFactor(i: { plannedMins: number; doneMins: number; started: boolean }): FactorSignal {
  const available = i.plannedMins > 0 && i.started; // بلا خطّةٍ فعلية ⇒ لا يظهر
  return { id: "commitment", label: "الالتزام", available, score: available ? clamp01(i.doneMins / i.plannedMins) : 0,
    hint: "حدّد ساعات مذاكرتك وابدأ أوّل جلسة ليُحسب التزامك." };
}

/** إنجاز الخطة — ▸ لماذا: كم أنجز من محتوى مذاكرته؟ ▸ المصدر: دروس/تدريب منجزة ÷ الكلّي
    (لاحقاً: التزامٌ بالـTimeline، بلا تغيير واجهة). ▸ الهدف: نسبة التقدّم الحقيقيّة. */
export function progressFactor(i: { doneItems: number; totalItems: number }): FactorSignal {
  const available = i.totalItems > 0;
  return { id: "progress", label: "إنجاز الخطة", available, score: available ? clamp01(i.doneItems / i.totalItems) : 0,
    hint: "أضِف دروسك وابدأ إنجازها ليظهر تقدّم خطتك." };
}

/** الأخطاء — ▸ لماذا: كثرة الأخطاء غير المُعالَجة تخفض الجاهزية. ▸ المصدر: عدد أخطاء «أخطائي»
    (available فقط إن استُعمل الدفتر). ▸ الهدف: إشارةٌ عكسية (أخطاءٌ أكثر ⇒ درجةٌ أقل، حتى السقف). */
export function errorsFactor(i: { activeErrors: number; everLogged: boolean }, cap = ROADMAP_TUNING.errorsCap): FactorSignal {
  const available = i.everLogged;
  return { id: "errors", label: "الأخطاء", available, score: available ? clamp01(1 - i.activeErrors / cap) : 0,
    hint: "سجّل أخطاءك في «أخطائي» لتتابع تحسّنك." };
}

/** النتائج — ▸ لماذا: أقوى مؤشّرٍ فعليٍّ على المستوى. ▸ المصدر: آخر درجةٍ مسجّلة ÷ الأعلى
    (available فقط إن وُجدت درجةٌ حقيقية). ▸ الهدف: ترسيخ الجاهزية على أداءٍ ملموس. */
export function resultsFactor(i: { lastScore?: number | null; max?: number }): FactorSignal {
  const max = i.max && i.max > 0 ? i.max : 100;
  const available = i.lastScore != null;
  return { id: "results", label: "النتائج", available, score: available ? clamp01((i.lastScore as number) / max) : 0,
    hint: "سجّل درجتك بعد أوّل اختبار/محاولة لتدخل في الحساب." };
}

/** متّسع الوقت — ▸ لماذا: وقتٌ أكثر قبل الموعد = مساحةٌ أكبر للجاهزية. ▸ المصدر: الأيام المتبقّية
    نسبةً لمدّة تحضيرٍ مرجعية (available فقط إن حُدِّد الموعد). ▸ الهدف: تعديلٌ خفيفٌ حسب الإلحاح. */
export function proximityFactor(i: { daysLeft: number | null }, prepDays = ROADMAP_TUNING.proximityPrepDays): FactorSignal {
  const available = i.daysLeft != null;
  return { id: "proximity", label: "متّسع الوقت", available, score: available ? clamp01((i.daysLeft as number) / prepDays) : 0,
    hint: "حدّد موعد اختبارك ليُحسب متّسع وقتك." };
}

/* ═══════════ المحرّك: تركيب العوامل المتاحة فقط (الأوزان من الإعداد) ═══════════
   ▸ الهدف: جاهزيةٌ مركّبةٌ من إشاراتٍ حقيقية. ▸ الصدق: أقل من minFactors عاملٍ متاح ⇒
   available:false ولا رقم إطلاقاً (لا نعرض جاهزيةً من 100 ببياناتٍ ناقصة). */
export interface ReadinessResult {
  available: boolean;      // هل تكفي العوامل المتاحة؟ (إن لا ⇒ لا رقم، فقط «لا بيانات كافية»)
  score: number;           // 0..100 (ذو معنى فقط عند available)
  band: Band;
  used: FactorSignal[];    // العوامل التي ساهمت
  missing: FactorSignal[]; // العوامل بلا بيانات (تلميحاتها ترشد المستخدم لتفعيل المؤشّر)
}

export function computeReadiness(factors: FactorSignal[], r = ROADMAP_TUNING.readiness): ReadinessResult {
  const used = factors.filter((f) => f.available);
  const missing = factors.filter((f) => !f.available);
  if (used.length < r.minFactors) return { available: false, score: 0, band: "risk", used, missing };
  const weightOf = (id: FactorId): number => r.weights[id as keyof ReadinessWeights] ?? 0;
  const wsum = used.reduce((a, f) => a + weightOf(f.id), 0) || 1;
  const s = clamp01(used.reduce((a, f) => a + f.score * weightOf(f.id), 0) / wsum);
  return { available: true, score: Math.round(s * 100), band: bandOf(s, r), used, missing };
}

/* ═══════════ عدسة الخطر (Danger) — {الالتزام · الأخطاء · قرب الموعد} ═══════════
   ▸ لماذا: تنبيهٌ مبكّرٌ للطالب المتعثّر. ▸ المصدر: نفس عوامل الجاهزية (مجموعةٌ فرعية).
   ▸ الهدف: 🟢🟡🔴 + أسبابٌ واضحة، مع تكبير الإلحاح كلّما اقترب الموعد. */
export interface DangerResult { available: boolean; band: Band; reasons: string[]; }

export function computeDanger(factors: FactorSignal[], r = ROADMAP_TUNING.readiness): DangerResult {
  const pick = (id: FactorId) => factors.find((f) => f.id === id && f.available);
  const c = pick("commitment"), e = pick("errors"), p = pick("proximity");
  const core = [c, e].filter(Boolean) as FactorSignal[];
  if (core.length === 0 && !p) return { available: false, band: "good", reasons: [] };
  const base = core.length ? core.reduce((a, f) => a + f.score, 0) / core.length : 0.6;
  const urgency = p ? clamp01(1 - p.score) : 0;      // موعدٌ قريب ⇒ إلحاحٌ أعلى
  const effective = clamp01(base * (1 - 0.4 * urgency));
  const reasons: string[] = [];
  if (e && e.score < 0.5) reasons.push("أخطاؤك النشطة كثيرة");
  if (c && c.score < 0.5) reasons.push("التزامك بالمذاكرة منخفض");
  if (p && p.score < 0.25) reasons.push("موعد الاختبار قريب");
  return { available: true, band: bandOf(effective, r), reasons };
}

/* ═══════════ التوقّع (النسبة المتوقعة) — متعدّد العوامل، صادقٌ في الفراغ ═══════════
   ▸ لماذا: تقديرٌ لدرجةٍ متوقّعة يوجّه الطالب. ▸ المصدر: يرتكز على نتيجةٍ حقيقية (مطلوبة)،
   ويُعدَّل بالتقدّم + الالتزام + الأخطاء (ولاحقاً: تشخيصيّ/AI — كمدخلٍ إضافيّ بلا إعادة بناء).
   ▸ الصدق: بلا نتيجةٍ حقيقية (مرتكز) ⇒ لا توقّع إطلاقاً، بل رسالةٌ توضيحية. */
export interface PredictionResult { available: boolean; score: number; band: Band; hint: string; }

export function computePrediction(
  i: { results: FactorSignal; progress: FactorSignal; commitment: FactorSignal; errors: FactorSignal },
  cfg = ROADMAP_TUNING,
): PredictionResult {
  if (!i.results.available) {
    return { available: false, score: 0, band: "risk",
      hint: "لم نكوّن توقّعاً بعد. ابدأ المذاكرة وسجّل أوّل نتيجة وسنقدّر درجتك المتوقّعة." };
  }
  const { anchorWeight, errorsFloor } = cfg.prediction;
  const base = i.results.score;
  const adjust = [i.progress, i.commitment].filter((f) => f.available).map((f) => f.score);
  let s = adjust.length ? base * anchorWeight + (adjust.reduce((a, x) => a + x, 0) / adjust.length) * (1 - anchorWeight) : base;
  if (i.errors.available) s = s * (errorsFloor + (1 - errorsFloor) * i.errors.score);
  s = clamp01(s);
  return { available: true, score: Math.round(s * 100), band: bandOf(s, cfg.readiness), hint: "" };
}
