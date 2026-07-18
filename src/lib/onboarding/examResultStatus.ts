/* ─── حالة نتيجة الاختبار + تقدير موعد الظهور — منطقٌ نقيّ (مصدر الحقيقة) ───
   ثلاث حالاتٍ مستقلّة لكل اختبار (لا نعامل «انتظار النتيجة» كأنه «لم أختبر»):
     • not_taken     — لم يختبر بعد.
     • taken         — اختبر ولديه درجة.
     • waiting_result — اختبر وينتظر ظهور النتيجة (له تاريخ + نمط اختبار).

   نوافذ ظهور النتيجة (تقريبية رسمية):
     • القدرات المحوسب: المتوسط ٣ أيام، الحدّ الأقصى أسبوع.
     • القدرات الورقي:  حوالي شهرٍ من تاريخ الاختبار.
     • التحصيلي (ورقيٌّ دائماً، لا محوسب): حوالي شهرٍ من آخر اختبار.

   مصمّمٌ ليُستخدم لاحقاً خارج التسجيل (بطاقة عدٍّ تنازلي): النظام يعرف تاريخ الاختبار
   ويحسب المتبقّي تلقائياً عبر remainingDays — دون إعادة كتابة. */

export type ExamMode = "computer" | "paper";
export type ResultStatus = "not_taken" | "taken" | "waiting_result";
export type EstimableExam = "qudurat" | "tahsili";

/* نوافذ الأيام التقريبية */
export const RESULT_WINDOWS = { computerAvg: 3, computerMax: 7, paper: 30 } as const;

export interface ResultEstimate {
  avgDays: number;         // المتوسط المتوقّع (أيام)
  maxDays?: number;        // الحدّ الأقصى (للمحوسب فقط)
  expectedDate: string;    // testDate + avgDays (YYYY-MM-DD) — أساس العدّ التنازلي
  maxDate?: string;        // testDate + maxDays (YYYY-MM-DD)
  text: string;            // النص المعروض للطالب
}

/* ── مساعدات تاريخ نقية (UTC ليتطابق حساب الأيام مع الاختبارات) ── */
export function addDays(isoDate: string, days: number): string {
  const t = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(t)) return isoDate;
  return new Date(t + days * 86400000).toISOString().slice(0, 10);
}
export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

/** تقدير موعد ظهور النتيجة من نوع الاختبار ونمطه وتاريخه. التحصيلي ورقيٌّ دائماً. */
export function estimateResult(exam: EstimableExam, mode: ExamMode, testDate: string): ResultEstimate {
  const isPaper = exam === "tahsili" || mode === "paper";
  if (isPaper) {
    const text = exam === "tahsili"
      ? "نتائج التحصيلي الورقي تظهر غالباً بعد حوالي شهر من آخر اختبار."
      : "غالباً ستصدر النتيجة بعد حوالي شهر من تاريخ الاختبار.";
    return { avgDays: RESULT_WINDOWS.paper, expectedDate: addDays(testDate, RESULT_WINDOWS.paper), text };
  }
  return {
    avgDays: RESULT_WINDOWS.computerAvg,
    maxDays: RESULT_WINDOWS.computerMax,
    expectedDate: addDays(testDate, RESULT_WINDOWS.computerAvg),
    maxDate: addDays(testDate, RESULT_WINDOWS.computerMax),
    text: "غالباً ستصدر نتيجتك خلال ٣ أيام، وبحد أقصى أسبوع.",
  };
}

/** الأيام المتبقّية حتى الموعد المتوقّع (لا يقلّ عن صفر) — للعدّ التنازلي المستقبلي. */
export function remainingDays(expectedDate: string, today: string): number {
  return Math.max(0, daysBetween(today, expectedDate));
}

/** المتبقّي المتوقّع مباشرةً من مدخلات الاختبار — واجهةٌ جاهزة لبطاقة العدّ التنازلي. */
export function remainingToResult(exam: EstimableExam, mode: ExamMode, testDate: string, today: string): number {
  return remainingDays(estimateResult(exam, mode, testDate).expectedDate, today);
}
