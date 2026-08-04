/* ─── مؤشّر الرضا عن الدرجة (Score Satisfaction) — دالة نقيّة حتمية ───
   عند إدخال الطالب درجة اختبار نقارنها **بهدفه الذي كتبه بيده** ونُخرج مؤشّراً:
   🟢 بلغتَه · 🟡 قريب · 🔴 بعيد. يُغذّي بطاقةَ «هل أنت راضٍ عن درجتك؟» وقرار
   الإعادة الذي يقرؤه Life Engine.

   ▓ كانت العتبةُ تُشتقّ أولاً من **متطلّب التخصص** عبر `requiredScores`، فتقول
     «متطلّب تخصصك ≈ ٨٥» — و٨٥ رقمُنا لا رقمُ جهةِ قبول. حُذف المصدرُ ذاك.
     وبقي مصدرٌ واحدٌ للعتبة: هدفُ الطالب. وبلا هدفٍ لا ندّعي هدفاً — نُخرج
     تقديراً عامّاً موسوماً بأنه عام، وندعوه ليحدّد هدفه. */
import type { DarbGoals } from "./storage";

export type SatBand = "green" | "yellow" | "red";
export type ExamKey = "qudurat" | "tahsili" | "step";

export interface Satisfaction {
  band: SatBand;
  title: string;
  note: string;
  threshold: number | null;   // هدفُ الطالب المستخدَم (null = لا هدف ⇒ تقديرٌ عام)
}

/* اسم الاختبار المعروض → مفتاح العتبة (مرن: يطابق بالتضمين) */
export function examKeyOf(exam: string): ExamKey | null {
  const e = exam.trim();
  if (e.includes("قدرات")) return "qudurat";
  if (e.includes("تحصيلي")) return "tahsili";
  if (e.includes("STEP") || e.includes("ستيب")) return "step";
  return null;
}

const TARGET_FIELD: Record<ExamKey, keyof DarbGoals> = {
  qudurat: "quduratTarget",
  tahsili: "tahsiliTarget",
  step: "stepTarget",
};

/* العتبة: هدفُ الطالب وحدَه. وبلا هدفٍ `null` — لا نستبدله بمتطلّبٍ مقدَّر. */
export function resolveThreshold(key: ExamKey, goals: DarbGoals): number | null {
  const t = goals[TARGET_FIELD[key]];
  return typeof t === "number" && Number.isFinite(t) ? t : null;
}

/* الحكم النقي: الدرجة مقابل هدف الطالب — وبلا هدفٍ تقديرٌ عامٌّ **يقول إنه عام**. */
export function evaluateSatisfaction(score: number, threshold: number | null): Satisfaction {
  if (threshold == null) {
    /* بندٌ عامٌّ صريح — لا يذكر «هدفك» لأن الطالب لم يحدّد هدفاً. */
    const band: SatBand = score >= 85 ? "green" : score >= 75 ? "yellow" : "red";
    const title =
      band === "green" ? "🟢 درجة قوية"
      : band === "yellow" ? "🟡 درجة جيدة"
      : "🔴 درجة تحتاج رفعاً";
    return { band, title, note: "تقديرٌ عام — حدّد درجتك المستهدفة لقياسٍ على هدفك أنت.", threshold: null };
  }
  const band: SatBand = score >= threshold ? "green" : score >= threshold - 5 ? "yellow" : "red";
  const title =
    band === "green" ? "🟢 بلغتَ هدفك"
    : band === "yellow" ? "🟡 قريب من هدفك — بضع درجات تكفي"
    : "🔴 أقل من هدفك — كل درجة تفتح خياراتٍ أكثر";
  return { band, title, note: `هدفك ${threshold}.`, threshold };
}

/* الواجهة الجاهزة: من اسم الاختبار ودرجته وأهداف الطالب → مؤشّر (أو null إن تعذّر) */
export function satisfactionForResult(exam: string, scoreRaw: string | number | undefined, goals: DarbGoals): Satisfaction | null {
  const key = examKeyOf(exam);
  if (!key) return null;
  const score = typeof scoreRaw === "number" ? scoreRaw : parseFloat(String(scoreRaw ?? ""));
  if (!Number.isFinite(score)) return null;
  return evaluateSatisfaction(score, resolveThreshold(key, goals));
}
