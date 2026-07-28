/* ─── 🎓 أدوات الجامعة — منطق نقي حتمي (معدل/غياب/فاينل/تحويل) ───
   كل الدوال هنا نقية بلا أي IO — تُستهلك من صفحة /uni-tools وتُختبر في
   uniTools.test.ts. ⚖️ كل السلالم والحدود استرشادية: الجامعات السعودية تتفاوت
   قليلاً في سلم التقديرات وحد الحرمان — القرار النهائي للوائح جامعة الطالب. */

export const UNI_TOOLS_DISCLAIMER = "استرشادي — راجع لوائح جامعتك";

/* ════════ سلم التقديرات السعودي (النظامان) ════════
   من 5 (الأشيع): A+‏=5، A=4.75، B+‏=4.5، B=4، C+‏=3.5، C=3، D+‏=2.5، D=2، F=1.
   من 4 (الشائع): A+‏=4، A=3.75، B+‏=3.5، B=3، C+‏=2.5، C=2، D+‏=1.5، D=1، F=0.
   بعض الجامعات تعتمد قيماً مختلفة قليلاً — السلم هنا استرشادي. */
export type GpaSystem = 4 | 5;
export type GpaScaleId = GpaSystem | 100;
export type GradeLetter = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "F";

export const GRADE_SCALE: readonly { letter: GradeLetter; g5: number; g4: number; label: string }[] = [
  { letter: "A+", g5: 5,    g4: 4,    label: "ممتاز مرتفع" },
  { letter: "A",  g5: 4.75, g4: 3.75, label: "ممتاز" },
  { letter: "B+", g5: 4.5,  g4: 3.5,  label: "جيد جداً مرتفع" },
  { letter: "B",  g5: 4,    g4: 3,    label: "جيد جداً" },
  { letter: "C+", g5: 3.5,  g4: 2.5,  label: "جيد مرتفع" },
  { letter: "C",  g5: 3,    g4: 2,    label: "جيد" },
  { letter: "D+", g5: 2.5,  g4: 1.5,  label: "مقبول مرتفع" },
  { letter: "D",  g5: 2,    g4: 1,    label: "مقبول" },
  { letter: "F",  g5: 1,    g4: 0,    label: "راسب" },
];

/* أقصى معدل لكل نظام */
export const GPA_MAX: Record<GpaSystem, number> = { 4: 4, 5: 5 };

/* نقاط التقدير الحرفي حسب النظام — حرف غير معروف ⇒ 0 (حارس، لا يحدث من الواجهة) */
export function gradePoints(letter: GradeLetter, system: GpaSystem): number {
  const row = GRADE_SCALE.find((g) => g.letter === letter);
  if (!row) return 0;
  return system === 5 ? row.g5 : row.g4;
}

/* ════════ المعدل الفصلي ════════
   مجموع (النقاط × الساعات) ÷ مجموع الساعات. المواد بساعات ≤ 0 أو نقاط غير
   منتهية تُتجاهل. لا ساعات صالحة ⇒ null (لا يوجد معدل). */
export interface CoursePoints { hours: number; points: number }
export function semesterGpa(courses: CoursePoints[]): number | null {
  let hours = 0;
  let weighted = 0;
  for (const c of courses) {
    if (!(c.hours > 0) || !Number.isFinite(c.points)) continue;
    hours += c.hours;
    weighted += c.hours * c.points;
  }
  return hours > 0 ? weighted / hours : null;
}

/* ════════ التراكمي بعد فصل ════════
   المتوسط الموزون بالساعات بين التراكمي السابق والفصل الجديد.
   مجموع الساعات صفر ⇒ null. */
export function cumulativeAfter(
  prev: { gpa: number; hours: number },
  semester: { gpa: number; hours: number },
): number | null {
  const prevH = Math.max(0, prev.hours);
  const semH = Math.max(0, semester.hours);
  const total = prevH + semH;
  if (total <= 0) return null;
  return (prev.gpa * prevH + semester.gpa * semH) / total;
}

/* ════════ «وش أحتاج؟» — المعدل الفصلي المطلوب لبلوغ هدف ════════
   يحل: هدف = (تراكمي×ساعاته + مطلوب×ساعات الفصل) ÷ المجموع.
   - "impossible": المطلوب يتجاوز سقف السلم — غير ممكن هذا الفصل.
   - "achieved":   الهدف محقق مهما كان معدل الفصل (المطلوب ≤ 0).
   - "possible":   المطلوب ضمن السلم. ساعات فصل ≤ 0 ⇒ null. */
export type RequiredGpaStatus = "possible" | "impossible" | "achieved";
export interface RequiredGpaResult { required: number; status: RequiredGpaStatus; max: number }
export function requiredSemesterGpa(
  current: { gpa: number; hours: number },
  targetGpa: number,
  nextHours: number,
  system: GpaSystem = 5,
): RequiredGpaResult | null {
  if (!(nextHours > 0)) return null;
  const max = GPA_MAX[system];
  const currH = Math.max(0, current.hours);
  const raw = (targetGpa * (currH + nextHours) - current.gpa * currH) / nextHours;
  if (raw > max) return { required: raw, status: "impossible", max };
  if (raw <= 0) return { required: 0, status: "achieved", max };
  return { required: raw, status: "possible", max };
}

/* ════════ تحويل المعدل بين السلالم (4/5/100) ════════
   ⚖️ تحويل خطي تناسبي تقريبي (قيمة ÷ السلم المصدر × السلم الهدف) — الجامعات
   تعتمد جداول تحويل خاصة بها؛ النتيجة استرشادية فقط. القيمة تُقص إلى حدود
   السلم المصدر قبل التحويل. */
export function convertGpa(value: number, from: GpaScaleId, to: GpaScaleId): number {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.min(Math.max(value, 0), from);
  return (clamped / from) * to;
}

/* ════════ حاسبة الغياب ════════
   إجمالي ساعات المادة = ساعاتها الأسبوعية × أسابيع الفصل.
   سقف الغياب = الإجمالي × حد الحرمان (الافتراضي 25٪). عدد المحاضرات = السقف
   بالساعات ÷ مدة المحاضرة (الافتراضي ساعة). ⚖️ الحد النهائي بيد الجامعة.
   مدخل رئيسي غير موجب ⇒ null. */
export interface AbsenceInput {
  weeklyHours: number;   // ساعات المادة في الأسبوع
  weeks?: number;        // أسابيع الفصل (افتراضي 15)
  limitPct?: number;     // حد الحرمان كنسبة 0..1 (افتراضي 0.25)
  absent?: number;       // الساعات التي غابها الطالب فعلاً
  lectureHours?: number; // مدة المحاضرة الواحدة بالساعات (افتراضي 1)
}
export interface AbsenceResult {
  totalHours: number;         // إجمالي ساعات المادة في الفصل
  maxAbsenceHours: number;    // سقف الغياب بالساعات
  maxAbsenceLectures: number; // سقف الغياب بعدد المحاضرات (تقريب لأسفل)
  remainingHours: number;     // المتبقي من السقف بعد الغياب الحالي
  usedOfLimit: number;        // نسبة استهلاك السقف (0 = ما غاب، 1 = وصل الحد)
  exceeded: boolean;          // تجاوز حد الحرمان فعلاً
}
export function absenceBudget({
  weeklyHours,
  weeks = 15,
  limitPct = 0.25,
  absent = 0,
  lectureHours = 1,
}: AbsenceInput): AbsenceResult | null {
  if (!(weeklyHours > 0) || !(weeks > 0) || !(limitPct > 0)) return null;
  const totalHours = weeklyHours * weeks;
  const maxAbsenceHours = totalHours * limitPct;
  const lecLen = lectureHours > 0 ? lectureHours : 1;
  /* إبسيلون صغير يقي أخطاء الفاصلة العائمة عند القسمة على مدد مثل 1.5 */
  const maxAbsenceLectures = Math.floor(maxAbsenceHours / lecLen + 1e-9);
  const absentHours = Math.max(0, absent);
  const remainingHours = Math.max(0, maxAbsenceHours - absentHours);
  return {
    totalHours,
    maxAbsenceHours,
    maxAbsenceLectures,
    remainingHours,
    usedOfLimit: absentHours / maxAbsenceHours,
    exceeded: absentHours > maxAbsenceHours + 1e-9,
  };
}

/* ════════ حاسبة الفاينل ════════
   درجة الطالب الحالية (currentScore من currentOutOf) تمثل الأعمال الفصلية
   التي وزنها (100 − وزن الفاينل). المطلوب في الفاينل يُعاد من 100:
   - "guaranteed": الهدف مضمون حتى بصفر في الفاينل.
   - "impossible": المطلوب فوق 100 — الهدف غير قابل للتحقق.
   نسبة الأعمال تُقص إلى [0..1] والهدف إلى [0..100] حمايةً من مدخلات شاذة.
   مقام غير موجب أو وزن فاينل خارج (0..100] ⇒ null. */
export type FinalStatus = "possible" | "guaranteed" | "impossible";
export interface FinalResult {
  neededPct: number;        // المطلوب في الفاينل من 100 (قد يتجاوز 100 عند الاستحالة)
  earned: number;           // ما حصّله الطالب فعلاً من وزن الأعمال (من 100)
  courseworkWeight: number; // وزن الأعمال الفصلية (100 − وزن الفاينل)
  status: FinalStatus;
}
export function neededOnFinal({
  currentScore,
  currentOutOf,
  finalWeight,
  targetTotal,
}: {
  currentScore: number;
  currentOutOf: number;
  finalWeight: number;
  targetTotal: number;
}): FinalResult | null {
  if (!(currentOutOf > 0) || !(finalWeight > 0) || finalWeight > 100) return null;
  const courseworkWeight = 100 - finalWeight;
  const ratio = Math.min(Math.max(currentScore / currentOutOf, 0), 1);
  const earned = ratio * courseworkWeight;
  const target = Math.min(Math.max(targetTotal, 0), 100);
  const neededRaw = ((target - earned) / finalWeight) * 100;
  const status: FinalStatus =
    neededRaw <= 0 ? "guaranteed" : neededRaw > 100 + 1e-9 ? "impossible" : "possible";
  return { neededPct: Math.max(0, neededRaw), earned, courseworkWeight, status };
}
