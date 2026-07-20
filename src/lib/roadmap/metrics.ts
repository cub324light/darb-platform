/* ═══════════ جسور مساري (Metrics) — منطق الحساب النقيّ الذي تعرضه الواجهة ═══════════
   الواجهة لا تحسب شيئاً: هذه الطبقة تأخذ لقطة بياناتٍ حقيقية (ExamInputs) وتُنتج كائناً
   جاهزاً للعرض (ExamDashboard). كل مؤشّرٍ يحمل available؛ إن نقصت بياناته فلا رقم، بل
   available:false + تلميحٌ يشرح للمستخدم ماذا يفعل. لا تخمين ولا صفرٌ وهميّ.
   تجميعٌ لمحرّك الجاهزية + مقاييس زمنية (توقّع الانتهاء · التاريخ المقترح). */
import {
  commitmentFactor, progressFactor, errorsFactor, resultsFactor, proximityFactor,
  computeReadiness, computeDanger, computePrediction,
  type FactorSignal, type ReadinessResult, type DangerResult, type PredictionResult,
} from "./readiness";
import { examStatus, type ExamStatus } from "./model";
import { ROADMAP_TUNING } from "./config";

/* ── مساعدات تاريخ نقيّة (UTC) ── */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86_400_000);
}
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date + "T00:00:00Z") + days * 86_400_000).toISOString().slice(0, 10);
}

/* ── لقطة المدخلات الحقيقية (يجمعها القارئ read.ts من التخزين) ── */
export interface ExamInputs {
  today: string;                 // YYYY-MM-DD
  examDate: string | null;       // من trackExamDates
  registrationDate: string | null;
  targetScore: number | null;
  doneItems: number; totalItems: number;          // تقدّم المذاكرة
  plannedMins: number; doneMins: number; started: boolean; // الالتزام (زمن)
  activeErrors: number; everLoggedErrors: boolean;         // الأخطاء
  lastErrorDaysAgo: number | null;                         // منذ كم يومٍ آخر خطأ (null = لا أخطاء)
  lastScore: number | null; scoreMax: number; waitingResult: boolean; // النتائج
  elapsedDays: number;           // منذ أوّل نشاط — لتقدير المعدّل
  examWindows: { start: string; end: string }[]; // نوافذ التسجيل القادمة (examProvider)
  prepDays: number;              // مدّة التحضير المقترحة (من الساعات/العمل المتبقّي)
}

/* ── توقّع الانتهاء ── ▸ لماذا: يجيب «متى أنهي خطّتي؟» بتاريخٍ لا بعددٍ مجرّد. ▸ المصدر:
   معدّل الإنجاز الفعليّ (المنجَز ÷ الأيام) مسقَطاً على المتبقّي. ▸ الصدق: بلا أيامٍ/إنجازٍ
   كافٍ (عتبتا config.forecast) ⇒ لا تاريخ، بل تلميحٌ يوجّه لمواصلة الإنجاز. */
export interface FinishForecast { available: boolean; date: string | null; days: number; hint: string; }
export function finishForecast(
  i: { remaining: number; done: number; elapsedDays: number; today: string },
  f = ROADMAP_TUNING.forecast,
): FinishForecast {
  const enough = i.elapsedDays >= f.minElapsedDays && i.done >= f.minDone && i.remaining > 0;
  if (!enough) return { available: false, date: null, days: 0, hint: "أنجز دروساً لأيامٍ متتالية وسنقدّر تاريخ انتهائك." };
  const ratePerDay = i.done / i.elapsedDays;
  const days = Math.max(1, Math.ceil(i.remaining / ratePerDay));
  return { available: true, date: addDays(i.today, days), days, hint: "" };
}

/* ── التاريخ المقترح للتسجيل ── ▸ لماذا: نساعد الطالب باقتراح موعدٍ رسميّ واقعيّ فقط حين
   نثق به. ▸ المصدر: نوافذ التسجيل الرسمية (examProvider) + مدّة تحضيرٍ مرجعية. ▸ الصدق:
   لا نقترح إلا نافذةً يبدأ تسجيلها بعد اكتمال مدّة التحضير (ثقةٌ حقيقية)؛ وإلا لا تاريخ،
   بل «حدد موعد اختبارك أولاً.» — فلا نخمّن موعداً غير واقعيّ. */
export interface SuggestedDate { available: boolean; date: string | null; hint: string; }
export function suggestedExamDate(
  i: { windows: { start: string; end: string }[]; today: string },
  prepDays = ROADMAP_TUNING.suggestedPrepDays,
): SuggestedDate {
  const readyBy = addDays(i.today, Math.max(0, prepDays));
  const confident = i.windows
    .filter((w) => w.end >= i.today && w.start >= readyBy) // نافذةٌ تبدأ بعد اكتمال التحضير
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  if (!confident) return { available: false, date: null, hint: "حدد موعد اختبارك أولاً." };
  return { available: true, date: confident.start, hint: "" };
}

/* ── الكائن الجاهز للعرض — الواجهة تعرضه كما هو ── */
export interface ValueMetric { available: boolean; hint: string; }
export interface ExamDashboard {
  status: ExamStatus;
  readiness: ReadinessResult;
  danger: DangerResult;
  prediction: PredictionResult;
  commitment: ValueMetric & { pct: number };
  planProgress: ValueMetric & { pct: number };
  activeErrors: { available: boolean; count: number; lastErrorDaysAgo: number | null };
  target: { available: boolean; value: number };
  countdown: { available: boolean; daysLeft: number };
  finish: FinishForecast;
  suggestedDate: SuggestedDate;
  examDate: string | null;
  registrationDate: string | null;
}

/** الجسر الأساسي: من بياناتٍ حقيقية → كائن عرض. كلّ الحساب هنا، لا في الواجهة. */
export function computeExamDashboard(inp: ExamInputs): ExamDashboard {
  const commitment = commitmentFactor({ plannedMins: inp.plannedMins, doneMins: inp.doneMins, started: inp.started });
  const progress = progressFactor({ doneItems: inp.doneItems, totalItems: inp.totalItems });
  const errors = errorsFactor({ activeErrors: inp.activeErrors, everLogged: inp.everLoggedErrors });
  const results = resultsFactor({ lastScore: inp.lastScore, max: inp.scoreMax });
  const daysLeft = inp.examDate != null ? daysBetween(inp.today, inp.examDate) : null;
  const proximity = proximityFactor({ daysLeft });

  const factors: FactorSignal[] = [commitment, progress, errors, results, proximity];
  const readiness = computeReadiness(factors);
  const danger = computeDanger(factors);
  const prediction = computePrediction({ results, progress, commitment, errors });

  const status = examStatus({
    progress: inp.totalItems > 0 ? Math.round((inp.doneItems / inp.totalItems) * 100) : 0,
    registered: !!inp.registrationDate,
    examPassed: daysLeft != null && daysLeft < 0,
    hasResult: inp.lastScore != null,
    waitingResult: inp.waitingResult,
  });

  return {
    status, readiness, danger, prediction,
    commitment: { available: commitment.available, pct: Math.round(commitment.score * 100), hint: commitment.hint },
    planProgress: { available: progress.available, pct: Math.round(progress.score * 100), hint: progress.hint },
    activeErrors: { available: inp.everLoggedErrors, count: inp.activeErrors, lastErrorDaysAgo: inp.lastErrorDaysAgo },
    target: { available: inp.targetScore != null, value: inp.targetScore ?? 0 },
    countdown: { available: daysLeft != null, daysLeft: daysLeft ?? 0 },
    finish: finishForecast({ remaining: Math.max(0, inp.totalItems - inp.doneItems), done: inp.doneItems, elapsedDays: inp.elapsedDays, today: inp.today }),
    suggestedDate: inp.examDate ? { available: false, date: null, hint: "" } : suggestedExamDate({ windows: inp.examWindows, today: inp.today }, inp.prepDays),
    examDate: inp.examDate,
    registrationDate: inp.registrationDate,
  };
}
