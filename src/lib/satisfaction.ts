/* ─── مؤشّر الرضا عن الدرجة (Score Satisfaction) — دالة نقيّة حتمية ───
   عند إدخال الطالب درجة اختبار، نقارنها بعتبة هدفه (متطلّب تخصصه إن وُجد، وإلا
   هدفه الرقمي، وإلا حكم عام) ونُخرج مؤشّراً بسيطاً: 🟢 مناسبة · 🟡 قريبة · 🔴 تحتاج
   رفعاً. يُغذّي بطاقةَ «هل أنت راضٍ عن درجتك؟» وقرار الإعادة الذي يقرؤه Life Engine.
   لا نخترع عتبة: إن لم يكن هناك هدف/تخصص نستخدم بنداً عاماً صريحاً (٨٥/٧٥). */
import type { DarbGoals } from "./storage";
import { findMajor, requiredScores } from "./university";

export type SatBand = "green" | "yellow" | "red";
export type ExamKey = "qudurat" | "tahsili" | "step";

export interface Satisfaction {
  band: SatBand;
  title: string;
  note: string;
  threshold: number | null;   // العتبة المستخدمة (null = حكم عام)
  fromMajor: boolean;         // هل العتبة من متطلّب التخصص؟
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

/* العتبة: متطلّب التخصص أولاً، ثم هدف الطالب الرقمي، وإلا null (حكم عام) */
export function resolveThreshold(key: ExamKey, goals: DarbGoals): { threshold: number | null; fromMajor: boolean } {
  const major = findMajor(goals.majorId ?? undefined);
  const req = major?.requirements ? requiredScores(major.requirements) : {};
  const fromMajor = req[key] != null;
  if (fromMajor) return { threshold: req[key]!, fromMajor: true };
  const t = goals[TARGET_FIELD[key]];
  if (typeof t === "number") return { threshold: t, fromMajor: false };
  return { threshold: null, fromMajor: false };
}

/* الحكم النقي: الدرجة مقابل العتبة (أو بنود عامة إن لا عتبة) */
export function evaluateSatisfaction(score: number, threshold: number | null, fromMajor = false): Satisfaction {
  let band: SatBand;
  if (threshold != null) {
    band = score >= threshold ? "green" : score >= threshold - 5 ? "yellow" : "red";
  } else {
    band = score >= 85 ? "green" : score >= 75 ? "yellow" : "red";
  }
  const title =
    band === "green" ? "🟢 ممتاز — درجتك مناسبة لهدفك"
    : band === "yellow" ? "🟡 جيدة — رفعها بضع درجات يفتح لك خياراتٍ أكثر"
    : "🔴 تحتاج رفعاً — أعِد الاختبار إن كان هدفك هذا التخصص";
  const note =
    threshold == null ? "حكمٌ عام — حدّد تخصصك المستهدف لقياسٍ أدقّ."
    : fromMajor ? `متطلّب تخصصك ≈ ${threshold}.`
    : `هدفك ${threshold}.`;
  return { band, title, note, threshold, fromMajor };
}

/* الواجهة الجاهزة: من اسم الاختبار ودرجته وأهداف الطالب → مؤشّر (أو null إن تعذّر) */
export function satisfactionForResult(exam: string, scoreRaw: string | number | undefined, goals: DarbGoals): Satisfaction | null {
  const key = examKeyOf(exam);
  if (!key) return null;
  const score = typeof scoreRaw === "number" ? scoreRaw : parseFloat(String(scoreRaw ?? ""));
  if (!Number.isFinite(score)) return null;
  const { threshold, fromMajor } = resolveThreshold(key, goals);
  return evaluateSatisfaction(score, threshold, fromMajor);
}
