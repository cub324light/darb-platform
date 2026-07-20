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
  lastScore: number | null; scoreMax: number; waitingResult: boolean; // النتائج
  elapsedDays: number;           // منذ أوّل نشاط — لتقدير المعدّل
  examWindows: { start: string; end: string }[]; // نوافذ التسجيل القادمة (examProvider)
  prepDays: number;              // مدّة التحضير المقترحة (من الساعات/العمل المتبقّي)
}

/* ── توقّع الانتهاء: تاريخٌ بمعدّل الطالب الحقيقيّ (لا «تبقى N درساً») ── */
export interface FinishForecast { available: boolean; date: string | null; days: number; hint: string; }
export function finishForecast(i: { remaining: number; done: number; elapsedDays: number; today: string }): FinishForecast {
  const enough = i.elapsedDays >= 3 && i.done >= 3 && i.remaining > 0;
  if (!enough) return { available: false, date: null, days: 0, hint: "أنجز دروساً لأيامٍ متتالية وسنقدّر تاريخ انتهائك." };
  const ratePerDay = i.done / i.elapsedDays;
  const days = Math.max(1, Math.ceil(i.remaining / ratePerDay));
  return { available: true, date: addDays(i.today, days), days, hint: "" };
}

/* ── التاريخ المقترح للتسجيل: أقرب نافذةٍ تعطي وقتَ تحضيرٍ كافياً ── */
export interface SuggestedDate { available: boolean; date: string | null; hint: string; }
export function suggestedExamDate(i: { windows: { start: string; end: string }[]; prepDays: number; today: string }): SuggestedDate {
  const future = i.windows.filter((w) => w.end >= i.today).sort((a, b) => a.start.localeCompare(b.start));
  if (future.length === 0) return { available: false, date: null, hint: "لا نوافذ تسجيلٍ قادمة معروفة الآن." };
  const readyBy = addDays(i.today, Math.max(0, i.prepDays));
  const pick = future.find((w) => w.end >= readyBy) ?? future[future.length - 1];
  const date = pick.start >= readyBy ? pick.start : readyBy <= pick.end ? readyBy : pick.end;
  return { available: true, date, hint: "" };
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
  activeErrors: { available: boolean; count: number };
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
  const prediction = computePrediction({ results, progress, errors });

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
    activeErrors: { available: inp.everLoggedErrors, count: inp.activeErrors },
    target: { available: inp.targetScore != null, value: inp.targetScore ?? 0 },
    countdown: { available: daysLeft != null, daysLeft: daysLeft ?? 0 },
    finish: finishForecast({ remaining: Math.max(0, inp.totalItems - inp.doneItems), done: inp.doneItems, elapsedDays: inp.elapsedDays, today: inp.today }),
    suggestedDate: inp.examDate ? { available: false, date: null, hint: "" } : suggestedExamDate({ windows: inp.examWindows, prepDays: inp.prepDays, today: inp.today }),
    examDate: inp.examDate,
    registrationDate: inp.registrationDate,
  };
}
