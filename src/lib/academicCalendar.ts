/* ─── محرّك التقويم الدراسي السعودي (Academic Calendar Engine) ───
   يربط استراتيجية المذاكرة بالتقويم الحقيقي: الدراسة، الإجازات،
   الاختبارات المدرسية، ومواعيد قياس (قدرات/تحصيلي/STEP).

   ▓▓▓ التحديث السنوي ▓▓▓
   لتحديث التقويم كل عام: عدّل SAUDI_ACADEMIC_YEARS فقط — أضِف كائن السنة
   الجديدة (الفصول، الإجازات، الاختبارات النهائية) وحدّث UPDATED_FOR.
   كل المنطق مشتقّ من هذه البيانات، فلا حاجة لتعديل الدوال.
   التواريخ ميلادية (YYYY-MM-DD) شاملة الطرفين. */
import { weeks, days } from "./format";

export type StudentType = "ثانوي" | "جامعي";

export type PeriodKind =
  | "term"           // فصل دراسي
  | "break"          // إجازة بين الفصول/مطوّلة
  | "summer"         // إجازة صيفية
  | "school_finals"  // اختبارات نهائية مدرسية
  | "qudurat"        // القدرات العامة (قياس)
  | "tahsili"        // التحصيلي (قياس)
  | "step";          // STEP (قياس)

export interface CalendarPeriod {
  kind: PeriodKind;
  label: string;
  start: string;       // YYYY-MM-DD
  end: string;         // YYYY-MM-DD (شامل)
  approximate?: boolean; // مواعيد قياس تقديرية تُحدَّث عند إعلانها رسمياً
}

export interface AcademicYearData {
  id: string;            // السنة الهجرية، مثل "1447"
  gregorianLabel: string; // "2025–2026"
  schoolStart: string;
  schoolEnd: string;     // آخر يوم دراسة قبل الصيف
  periods: CalendarPeriod[];
  source: string;
}

/* آخر عام دراسي حُدِّثت بياناته (للعرض «مُحدَّث لعام ...») */
export const CALENDAR_UPDATED_FOR = "1448هـ (2026–2027)";

/* ════════════════════════════════════════════════════════════════
   بيانات الأعوام الدراسية — حدّث هنا سنوياً.
   النظام يتغيّر بتغيّر العام، فلا تفترضه: 1443–1447 ثلاثةُ فصول، و1448 فما بعدها
   **فصلان** (عودةٌ أقرّها مجلس الوزراء للأعوام 1447–1450). المنطق كلّه مشتقٌّ من
   `periods` فلا يعنيه العدد — لكن مَن يقرأ الملفّ يظنّه ثابتاً، فنصّصنا عليه.
   ملاحظة: مواعيد قياس تقريبية وتُضبط عند إعلان «قياس» الرسمي.

   ⚠ يحرسه `academicCalendar.test.ts`: يسقط البناء حين تقترب تغطيةُ آخر عامٍ من
   النفاد — فلا يبقى الطلاب على تقويمٍ ميّت بصمت كما حصل مع 1447.
   ════════════════════════════════════════════════════════════════ */
export const SAUDI_ACADEMIC_YEARS: AcademicYearData[] = [
  {
    id: "1447",
    gregorianLabel: "2025–2026",
    schoolStart: "2025-08-24",
    schoolEnd: "2026-06-18",
    source: "وزارة التعليم — التقويم الدراسي (ثلاثة فصول)",
    periods: [
      /* ── الفصل الأول ── */
      { kind: "term",          label: "الفصل الدراسي الأول",  start: "2025-08-24", end: "2025-11-13" },
      { kind: "school_finals", label: "اختبارات الفصل الأول", start: "2025-11-04", end: "2025-11-13" },
      { kind: "break",         label: "إجازة الفصل الأول",    start: "2025-11-14", end: "2025-11-23" },
      /* ── الفصل الثاني ── */
      { kind: "term",          label: "الفصل الدراسي الثاني",  start: "2025-11-24", end: "2026-02-26" },
      { kind: "break",         label: "إجازة منتصف الفصل الثاني", start: "2026-01-19", end: "2026-01-25" },
      { kind: "school_finals", label: "اختبارات الفصل الثاني", start: "2026-02-17", end: "2026-02-26" },
      { kind: "break",         label: "إجازة الفصل الثاني",    start: "2026-02-27", end: "2026-03-08" },
      /* ── الفصل الثالث ── */
      { kind: "term",          label: "الفصل الدراسي الثالث",  start: "2026-03-09", end: "2026-06-18" },
      { kind: "break",         label: "إجازة منتصف الفصل الثالث", start: "2026-04-27", end: "2026-05-03" },
      { kind: "school_finals", label: "اختبارات الفصل الثالث", start: "2026-06-09", end: "2026-06-18" },
      /* ── الصيف ── */
      { kind: "summer",        label: "الإجازة الصيفية",      start: "2026-06-19", end: "2026-08-22" },

      /* ── مواعيد قياس: لا نُخمّنها هنا (قاعدة درب: لا تاريخ مُخمَّن) ──
         عدّاد القياس يظهر فقط من موعدٍ سجّله الطالب فعلاً (darb_track_exam_dates)،
         وإلا فالمصدر الرسمي examProvider يعرض «بانتظار إعلان هيئة تقويم التعليم
         والتدريب». حين تُعلن الهيئة مواعيد 1448، تُضاف هنا كنوافذ حقيقية. */
    ],
  },
  {
    /* ⚠ تغيّرٌ بنيويّ لا مجرّد تواريخ: 1448 عادت إلى **فصلين** بموافقة مجلس الوزراء
       (معتمَدةٌ للأعوام 1447–1450)، بعد ثلاثة فصولٍ منذ 1443. فالفصل الأول يمتدّ
       من بداية العام إلى إجازة منتصف العام، والثاني منها إلى نهاية العام. */
    id: "1448",
    gregorianLabel: "2026–2027",
    schoolStart: "2026-08-23",
    schoolEnd: "2027-06-24",
    source: "وزارة التعليم — التقويم الدراسي 1448 (نظام الفصلين)",
    periods: [
      /* ── الفصل الأول ── */
      { kind: "term",   label: "الفصل الدراسي الأول",  start: "2026-08-23", end: "2027-01-07" },
      { kind: "break",  label: "إجازة اليوم الوطني",    start: "2026-09-23", end: "2026-09-26" },
      { kind: "break",  label: "إجازة الخريف",          start: "2026-11-20", end: "2026-11-28" },
      { kind: "break",  label: "إجازة منتصف العام",     start: "2027-01-08", end: "2027-01-16" },
      /* ── الفصل الثاني ── */
      { kind: "term",   label: "الفصل الدراسي الثاني",  start: "2027-01-17", end: "2027-06-24" },
      { kind: "break",  label: "إجازة يوم التأسيس",     start: "2027-02-19", end: "2027-02-22" },
      { kind: "break",  label: "إجازة عيد الفطر",       start: "2027-02-26", end: "2027-03-13" },
      { kind: "break",  label: "إجازة عيد الأضحى",      start: "2027-04-30", end: "2027-05-22" },
      /* ── الصيف ── */
      { kind: "summer", label: "الإجازة الصيفية",       start: "2027-06-25", end: "2027-08-28" },

      /* ── الاختبارات النهائية المدرسية: لم تُعلَن بعد لـ1448 ──
         الوزارة لم تنشر نوافذ الاختبارات وقت كتابة هذا (العام لم يبدأ). ولأن
         «لا تاريخ مُخمَّن» قاعدةٌ لا استثناء لها، نتركها غائبة: البطاقة تُخفي
         عدّاد «اختبارات مدرسية» بدل أن تعد الطالب لموعدٍ اخترعناه. تُضاف فور الإعلان.
         ── ومواعيد قياس: كسابقتها، تُنتظر من الهيئة. */
    ],
  },
];

/* ── تفضيلات الطالب للتقويم (تُخزَّن في darb_calendar؛ كلها اختيارية) ──
   تُشتقّ تلقائياً من ملف الطالب إن لم يُدخِلها (لا يعتمد على إدخال يدوي). */
export interface CalendarConfig {
  studentType?: StudentType;
  region?: string;
  graduationYear?: number;
  /* تجاوزات يدوية تُضاف فوق التقويم الرسمي */
  customBreaks?: { label: string; start: string; end: string }[];
  customFinals?: { label: string; start: string; end: string }[];
}

/* ════════ أدوات تاريخ ════════ */
const DAY = 86_400_000;
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function toTs(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getTime();
}
function within(today: string, p: { start: string; end: string }): boolean {
  const t = toTs(today);
  return t >= toTs(p.start) && t <= toTs(p.end);
}
function daysUntilDate(today: string, target: string): number {
  return Math.round((toTs(target) - toTs(today)) / DAY);
}

/* ════════ نتيجة القراءة ════════ */
export type CalendarPhase = "study" | "break" | "summer" | "school_finals";

export interface NextExamInfo {
  kind: PeriodKind;
  label: string;
  date: string;        // بداية النافذة (أو موعد الطالب المسجّل)
  daysUntil: number;
  weeksUntil: number;
  approximate: boolean;
  registered: boolean; // موعد سجّله الطالب فعلاً (له الأولوية)
}

export interface CalendarSnapshot {
  hasData: boolean;
  yearId: string | null;
  yearLabel: string | null;
  phase: CalendarPhase;
  phaseLabel: string;
  onVacation: boolean;
  inSchoolFinals: boolean;
  inStudyTerm: boolean;
  activePeriods: CalendarPeriod[];
  nextExam: NextExamInfo | null;          // أقرب قدرات/تحصيلي/STEP
  nextSchoolFinals: NextExamInfo | null;  // أقرب اختبارات مدرسية
  weeksToNextExam: number | null;
  updatedFor: string;
}

const PHASE_LABEL: Record<CalendarPhase, string> = {
  study: "دراسة", break: "إجازة", summer: "إجازة صيفية", school_finals: "اختبارات مدرسية",
};

const EXAM_KINDS: PeriodKind[] = ["qudurat", "tahsili", "step"];

/* يختار العام الدراسي الذي يغطّي «اليوم» (أو الأقرب) */
function pickYear(today: string): AcademicYearData | null {
  if (!SAUDI_ACADEMIC_YEARS.length) return null;
  const t = toTs(today);
  for (const y of SAUDI_ACADEMIC_YEARS) {
    const lastPeriod = y.periods.reduce((mx, p) => Math.max(mx, toTs(p.end)), toTs(y.schoolEnd));
    if (t >= toTs(y.schoolStart) && t <= lastPeriod) return y;
  }
  /* خارج النطاق — أعِد الأحدث كأساس مرجعي */
  return SAUDI_ACADEMIC_YEARS[SAUDI_ACADEMIC_YEARS.length - 1];
}

/* ════════ القراءة النقيّة (now + المدخلات) ════════ */
export function resolveCalendar(
  now: Date,
  input?: { examDates?: Record<string, string>; config?: CalendarConfig },
): CalendarSnapshot {
  const today = ymd(now);
  const year = pickYear(today);
  const cfg = input?.config;

  if (!year) {
    return {
      hasData: false, yearId: null, yearLabel: null, phase: "study", phaseLabel: PHASE_LABEL.study,
      onVacation: false, inSchoolFinals: false, inStudyTerm: true, activePeriods: [],
      nextExam: null, nextSchoolFinals: null, weeksToNextExam: null, updatedFor: CALENDAR_UPDATED_FOR,
    };
  }

  /* دمج التجاوزات اليدوية */
  const periods: CalendarPeriod[] = [
    ...year.periods,
    ...(cfg?.customBreaks ?? []).map((b) => ({ kind: "break" as const, label: b.label, start: b.start, end: b.end })),
    ...(cfg?.customFinals ?? []).map((f) => ({ kind: "school_finals" as const, label: f.label, start: f.start, end: f.end })),
  ];

  const activePeriods = periods.filter((p) => within(today, p));

  const inSchoolFinals = activePeriods.some((p) => p.kind === "school_finals");
  const inSummer       = activePeriods.some((p) => p.kind === "summer");
  const inBreak        = activePeriods.some((p) => p.kind === "break");
  const inTerm         = activePeriods.some((p) => p.kind === "term");

  /* الأولوية: اختبارات مدرسية ← صيف ← إجازة ← دراسة */
  const phase: CalendarPhase =
    inSchoolFinals ? "school_finals" :
    inSummer ? "summer" :
    inBreak ? "break" :
    inTerm ? "study" : "study";

  const onVacation = phase === "summer" || phase === "break";
  const inStudyTerm = phase === "study";

  /* أقرب اختبار قياس: موعد الطالب المسجّل له الأولوية على النافذة التقديرية */
  const examCandidates: NextExamInfo[] = [];

  /* مواعيد الطالب المسجّلة (من darb_track_exam_dates) */
  const reg = input?.examDates ?? {};
  const REG_LABEL: Record<string, PeriodKind> = {
    "قدرات": "qudurat", "تحصيلي": "tahsili", "تحصيلي مبكر": "tahsili", "ستيب": "step",
  };
  for (const [track, dateStr] of Object.entries(reg)) {
    if (!dateStr) continue;
    const du = daysUntilDate(today, dateStr);
    if (du < 0) continue;
    examCandidates.push({
      kind: REG_LABEL[track] ?? "qudurat", label: track, date: dateStr,
      daysUntil: du, weeksUntil: Math.ceil(du / 7), approximate: false, registered: true,
    });
  }

  /* نوافذ قياس من المزوّد (تقديرية) — فقط للأنواع التي لم يسجّل الطالب موعدها */
  const registeredKinds = new Set(examCandidates.map((e) => e.kind));
  for (const p of periods) {
    if (!EXAM_KINDS.includes(p.kind)) continue;
    if (registeredKinds.has(p.kind)) continue;
    const du = daysUntilDate(today, p.start);
    if (du < 0) continue;
    examCandidates.push({
      kind: p.kind, label: p.label, date: p.start,
      daysUntil: du, weeksUntil: Math.ceil(du / 7), approximate: p.approximate ?? false, registered: false,
    });
  }
  examCandidates.sort((a, b) => a.daysUntil - b.daysUntil);
  const nextExam = examCandidates[0] ?? null;

  /* أقرب اختبارات مدرسية قادمة */
  const finalsUpcoming = periods
    .filter((p) => p.kind === "school_finals" && daysUntilDate(today, p.start) >= 0)
    .map((p) => {
      const du = daysUntilDate(today, p.start);
      return { kind: p.kind, label: p.label, date: p.start, daysUntil: du, weeksUntil: Math.ceil(du / 7), approximate: false, registered: false };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
  const nextSchoolFinals = finalsUpcoming[0] ?? null;

  return {
    hasData: true,
    yearId: year.id,
    yearLabel: year.gregorianLabel,
    phase,
    phaseLabel: PHASE_LABEL[phase],
    onVacation,
    inSchoolFinals,
    inStudyTerm,
    activePeriods,
    nextExam,
    nextSchoolFinals,
    weeksToNextExam: nextExam ? nextExam.weeksUntil : null,
    updatedFor: CALENDAR_UPDATED_FOR,
  };
}

/* ════════ مرجع زمني للترقية التلقائية وأهلية الاختبارات ════════
   العام الدراسي الحالي (id هجري) + هل تجاوزنا الفصل الأول؟ — كلاهما من التقويم
   الرسمي فقط (لا تخمين). يستهلكهما: الترقية التلقائية للصفوف + جدول أهلية القياس. */

/** معرّف العام الدراسي (الهجري) الذي يغطّي «الآن» — أو الأحدث كمرجع. null إن لا بيانات. */
export function currentAcademicYearId(now: Date = new Date()): string | null {
  return pickYear(ymd(now))?.id ?? null;
}

/** هل تجاوز «اليوم» نهايةَ الفصل الدراسي الأول؟ (فصل ثانٍ/ثالث/صيف → true).
    يخدم قاعدة «ثاني ثانوي: لا تحصيلي في الفصل الأول، ويظهر بعده». */
export function isAfterFirstTerm(now: Date = new Date()): boolean {
  const today = ymd(now);
  const year = pickYear(today);
  if (!year) return false;
  const firstTerm = year.periods.find((p) => p.kind === "term" && p.label.includes("الأول"));
  return firstTerm ? today > firstTerm.end : false;
}

/** الفصل الحالي المُقترَح من التقويم — قيمة افتراضية لسؤال التسجيل (يؤكّده الطالب). */
export type TermGuess = "first" | "second" | "summer";
export function currentTermGuess(now: Date = new Date()): TermGuess {
  const today = ymd(now);
  const year = pickYear(today);
  if (!year) return "first";
  if (year.periods.some((p) => p.kind === "summer" && within(today, p))) return "summer";
  return isAfterFirstTerm(now) ? "second" : "first";
}

/* ── إشارات مختصرة تُمرَّر لمحرّك الاستراتيجية (عميل ⇄ خادم) ── */
export interface CalendarSignals {
  onVacation?: boolean;
  inSchoolFinals?: boolean;
  daysToNextExam?: number | null;
}

export function calendarSignals(snap: CalendarSnapshot): CalendarSignals {
  return {
    onVacation: snap.onVacation,
    inSchoolFinals: snap.inSchoolFinals,
    daysToNextExam: snap.nextExam ? snap.nextExam.daysUntil : null,
  };
}

/* ── حقائق التقويم لدويرب (يجيب على: إجازة؟ اختبارات قريبة؟ دراسة؟ كم أسبوع؟) ── */
export function calendarFactsForDuwairb(snap: CalendarSnapshot): string {
  if (!snap.hasData) return "";
  const lines = [
    `- الوضع الدراسي الآن: ${snap.phaseLabel}`,
    `- هل الطالب في إجازة؟ ${snap.onVacation ? "نعم" : "لا"}`,
    `- هل توجد اختبارات مدرسية حالياً؟ ${snap.inSchoolFinals ? "نعم — قدّم اختبارات المدرسة" : "لا"}`,
  ];
  if (snap.nextExam) {
    const approx = snap.nextExam.approximate ? " (تقديري)" : "";
    lines.push(`- أقرب اختبار: ${snap.nextExam.label} بعد ${weeks(snap.nextExam.weeksUntil)} تقريباً${approx}`);
  }
  if (snap.nextSchoolFinals && snap.nextSchoolFinals.daysUntil <= 30) {
    lines.push(`- اختبارات مدرسية قادمة خلال ${days(snap.nextSchoolFinals.daysUntil)}`);
  }
  return `حالة التقويم الدراسي السعودي (استعملها لمواءمة خطتك مع واقع الطالب):\n${lines.join("\n")}`;
}

/* ═══════════ خطُّ الزمن المدرسيّ — للعرض في «المدرسة» ═══════════
   الطالب يفتح «المدرسة» فيسأل سؤالين: «كم باقي؟» و«وشو الجاي؟». وكان الجواب
   مبعثراً بين التقويم والخطة. هذه الدالّة تجمعه من `periods` نفسها لا من مصدرٍ
   ثانٍ — فما يُصحَّح في بيانات العام يظهر هنا تلقائياً.

   نقيّةٌ تماماً: تأخذ اليومَ نصّاً ولا تقرأ ساعةَ النظام (قاعدة P1). */

export interface TimelineEntry {
  period: CalendarPeriod;
  /** أيامٌ حتى بدايتها (موجب = لم تبدأ) أو حتى نهايتها (للجارية) */
  daysAway: number;
  days: number;   // طولها بالأيام (شامل الطرفين)
}

export interface SchoolTimeline {
  yearId: string;
  yearLabel: string;
  /** ما نحن فيه اليوم — قد تتداخل فترتان (فصلٌ واختباراتُه) فنُعيدها كلَّها */
  today: CalendarPeriod[];
  /** أقربُ فترةٍ قادمة وكم يوماً حتى تبدأ — جوابُ «كم باقي؟» */
  next: TimelineEntry | null;
  upcoming: TimelineEntry[];
  past: TimelineEntry[];
  source: string;
}

const DAY_MS = 86_400_000;
const asUtc = (d: string): number => Date.parse(`${d}T00:00:00Z`);
/** فرقُ الأيام بين تاريخين (b − a) — بالتقويم لا بالساعات، فلا يفسده التوقيت الصيفي. */
export const daysBetween = (a: string, b: string): number =>
  Math.round((asUtc(b) - asUtc(a)) / DAY_MS);

const spanDays = (p: CalendarPeriod): number => daysBetween(p.start, p.end) + 1;

/** خطُّ زمن العام الذي يقع فيه `todayStr` — أو أقربُ عامٍ يليه إن كنّا قبل بدايته. */
export function schoolTimeline(todayStr: string): SchoolTimeline | null {
  const years = SAUDI_ACADEMIC_YEARS;
  if (years.length === 0) return null;

  /* العام الحالي: الذي يقع اليوم بين بدايته ونهاية آخر فتراته (الصيف داخلٌ فيها) */
  const endOf = (y: AcademicYearData) =>
    y.periods.reduce((m, p) => (asUtc(p.end) > asUtc(m) ? p.end : m), y.schoolEnd);

  const year =
    years.find((y) => asUtc(todayStr) >= asUtc(y.schoolStart) && asUtc(todayStr) <= asUtc(endOf(y)))
    ?? years.find((y) => asUtc(y.schoolStart) > asUtc(todayStr))
    ?? years[years.length - 1];

  const entry = (p: CalendarPeriod): TimelineEntry => ({
    period: p,
    daysAway: daysBetween(todayStr, p.start),
    days: spanDays(p),
  });

  const today = year.periods.filter(
    (p) => asUtc(todayStr) >= asUtc(p.start) && asUtc(todayStr) <= asUtc(p.end),
  );

  /* ▓ «القادم» يعبر حدّ العام: الطالبُ في الإجازة الصيفية يسأل «كم باقي على
     الدراسة؟»، وجوابُه في العام **التالي** لا في عامه. فلو اقتصرنا على فترات
     عامه لاختفى العدّاد في الشهرين اللذين يحتاجه فيهما أكثر من غيرهما. */
  const nextYear = years[years.indexOf(year) + 1];
  const upcoming = [...year.periods, ...(nextYear?.periods ?? [])]
    .filter((p) => asUtc(p.start) > asUtc(todayStr))
    .sort((a, b) => asUtc(a.start) - asUtc(b.start))
    .map(entry);
  const past = year.periods
    .filter((p) => asUtc(p.end) < asUtc(todayStr))
    .sort((a, b) => asUtc(b.end) - asUtc(a.end))
    .map(entry);

  return {
    yearId: year.id,
    yearLabel: year.gregorianLabel,
    today,
    next: upcoming[0] ?? null,
    upcoming,
    past,
    source: year.source,
  };
}
