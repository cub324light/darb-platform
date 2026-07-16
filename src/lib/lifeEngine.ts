/* ═══════════════ Life Engine — العقل المركزي الواحد ═══════════════
   درب لا يجعل كل صفحة تقرّر لنفسها. محرّكٌ واحد يقرأ حياة الطالب كلها (المرحلة،
   المعدّل، السنة، التخصص، الساعات، الاختبارات، التدريب، نشاطه) ويُخرج شيئاً
   واحداً: أولوياته مرتّبة. كل صفحات درب تقرأ هذه الأولويات — لا تعيد الحساب.

   ▓▓ قابلية التفسير أولاً ▓▓
   «العقل الذي لا يمكن تفسيره لا يمكن الوثوق به». لذلك القرار ليس شروطاً مخفية،
   بل قواعد صريحة: لكل قاعدة معرّفٌ وسببٌ ووزن. كل أولوية تُراكِم أوزان القواعد
   التي أطلقتها، فتُرتَّب بالوزن، وتُحسب لها ثقة. الأولوية تكشف: لماذا ظهرت (القواعد
   التي أطلقتها بأوزانها)، وسببها وفائدتها ووقتها وما بعدها. نراجع العقل لا النتيجة.

   إذا وُجد قرار غريب، نعدّل قاعدةً هنا — لا صفحة. دالّة نقيّة حتمية (readLifeContext
   منفصلة تقرأ التخزين). */
import type { Stage } from "./experience";
import { phaseExperience } from "./experience";
import type { UniStage } from "./uniJourney";
import { semesterInfo, uniStage } from "./uniJourney";
import { resolveCalendar, type CalendarConfig, type NextExamInfo } from "./academicCalendar";
import { findMajor } from "./university";
import { hasMajorWorld } from "./majors";
import { loadUser, loadGoals, loadTrackExamDates, loadCalendarConfig, localDayKey } from "./storage";
import { loadHomework, homeworkPressure } from "./homework";
import { achievableRetakes } from "./retake";
import { recommendedExamsForUser, type RecommendedExam } from "./recommendedExams";

/* ── سياق الطالب الكامل — يُجمَّع مرّة من كل الأنظمة القائمة ── */
export interface LifeContext {
  stage: Stage;
  uniStage: UniStage | null;
  gpa: number | null;            // من ٥
  hours: number | null;          // ساعات منجزة
  year: string | null;
  majorId: string | null;
  majorName: string | null;
  coopDone: boolean;
  gradInterest: boolean;
  highschoolPct: number | null;  // نسبة الثانوية العامة (لتفريق ثالث ثانوي)
  /* التقويم */
  inSchoolFinals: boolean;
  daysToSchoolFinals: number | null;
  qiyas: { kind: "qudurat" | "tahsili" | "step"; label: string; days: number; weeks: number; approximate: boolean } | null;
  uniFinalsInDays: number | null;
  termLabel: string | null;
  inStudyTerm: boolean;
  /* ضغط الواجبات الحقيقي — من مذكرة الواجبات (لا الاختبارات وحدها) */
  hwOverdue: number;
  hwDueToday: number;
  hwPending: number;
  /* اختبارات اختار الطالب إعادتها — قرارٌ صريح يرفع أولوية الاستعداد ويغيّر التوصيات */
  retakeExams: string[];
  /* هل عالم القبول/القياس مفتوح لهذا الطالب؟ (false: جامعي/خريج جامعة → لا قبول) */
  admissionOpen: boolean;
  /* الطبقة الأولى (Domain, ADR-0001): الاختبارات المطلوبة المشتقّة من الوجهة —
     المصدر الوحيد؛ لا تشتقّ أي شاشة/قاعدة اختباراتها بنفسها. */
  recommendedExams: RecommendedExam[];
  /* التركيز الأول (ADR-0001 §2.6) — يبني الخطة الأولى، لا يغيّر الوجهة. */
  focus: string | null;
}

export type PriorityKey =
  | "uni-finals" | "gpa" | "research" | "cv" | "coop" | "cert" | "foundation" | "study-routine"
  | "school-finals-now" | "school-finals-soon" | "qiyas-soon" | "qiyas" | "school-grades" | "admission" | "early"
  | "homework" | "retake";

export type PriorityArea = "urgent" | "gpa" | "career" | "admission" | "study" | "growth";

/* تصنيف الأولوية — لا تختلط: عاجل (وقتٌ يفوت) · مهم (يفتح أبواباً) · استراتيجي (بعيد المدى) */
export type Tier = "urgent" | "important" | "strategic";

/* قاعدة أطلقتها الأولوية — أساس التفسير */
export interface FiredRule { id: number; label: string; weight: number; }

/* أولوية = قرار كامل + تفسيره + تكلفته/عائده + تصنيفه */
export interface Priority {
  rank: number;
  key: PriorityKey;
  area: PriorityArea;
  tier: Tier;
  icon: string;
  title: string;
  why: string;
  benefit: string;
  time: string;
  next: string;
  cta: string;
  href: string;
  urgent: boolean;
  /* التكلفة والعائد — الطالب يرى: كم سأدفع؟ وماذا سأكسب؟ */
  costHours: number;         // ساعات تقديرية (٠ = مستمر/يومي)
  payoff: string;            // العائد المتوقّع
  /* التفسير */
  score: number;             // مجموع أوزان القواعد التي أطلقتها
  confidence: number;        // ٠..٩٩ (دالّة رتيبة في score)
  firedRules: FiredRule[];   // القواعد التي أطلقتها هذه الأولوية بأوزانها
  reasons: string[];         // «لماذا؟» = تسميات القواعد نفسها
}

const fmtGpa = (g: number) => g.toFixed(2).replace(/\.?0+$/, "");
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/* الثقة: دالّة رتيبة موثّقة في الوزن المتراكم — قابلة للمراجعة، لا سحر */
const confidenceOf = (score: number) => clamp(Math.round(45 + 0.6 * score), 5, 99);

/* ── تعريف ثابت لكل أولوية (المحتوى) — منفصل عن القواعد (متى تظهر) ── */
interface PDef {
  area: PriorityArea; icon: string; urgent?: boolean;
  title: (c: LifeContext) => string;
  why: (c: LifeContext) => string;
  benefit: string;
  time: (c: LifeContext) => string;
  next: string;
  cta: string;
  href: string;
}
const major = (c: LifeContext) => (c.majorName ? ` — ${c.majorName}` : "");

const PRIORITY_DEFS: Record<PriorityKey, PDef> = {
  retake: {
    area: "study", icon: "🔁", urgent: false,
    title: (c) => `الاستعداد لإعادة ${c.retakeExams[0] ?? "اختبارك"}`,
    why: (c) => c.retakeExams.length > 1
      ? `اخترت إعادة ${c.retakeExams.length} اختبارات لرفع فرصك.`
      : `اخترت إعادة ${c.retakeExams[0] ?? "الاختبار"} لرفع درجتك.`,
    benefit: "درجةٌ أعلى تفتح لك تخصصاتٍ وجامعاتٍ أكثر.",
    time: () => "خطة إعادة",
    next: "ابدأ خطة الإعادة وركّز على نقاط ضعفك.", cta: "ابدأ خطة الإعادة", href: "/roadmap",
  },
  homework: {
    area: "study", icon: "📝", urgent: false,
    title: () => "إنجاز واجباتك المدرسية",
    why: (c) => c.hwOverdue > 0
      ? `عندك ${c.hwOverdue} واجب متأخّر${c.hwDueToday > 0 ? ` و${c.hwDueToday} مستحق اليوم` : ""}.`
      : c.hwDueToday > 0 ? `${c.hwDueToday} واجب مستحق اليوم.` : `${c.hwPending} واجب بلا إنجاز.`,
    benefit: "درجات الواجبات والمشاركة جزءٌ من معدّلك — ولا تتراكم عليك.",
    time: () => "اليوم",
    next: "راجع مذكرتك وابدأ بالأقرب تسليماً.", cta: "افتح مذكرة الواجبات", href: "/school",
  },
  "uni-finals": {
    area: "urgent", icon: "⏳", urgent: true,
    title: (c) => `مذاكرة اختبارات${c.termLabel ? ` ${c.termLabel}` : ""}`,
    why: (c) => `باقي ${c.uniFinalsInDays} يوم على اختبارات فصلك.`,
    benefit: "درجاتك الآن ترفع معدّلك التراكمي مباشرة.",
    time: (c) => `${c.uniFinalsInDays} يوم`,
    next: "راجع أخطاءك ونظّم الفصل القادم.", cta: "راجع خطتك", href: "/plan",
  },
  gpa: {
    area: "gpa", icon: "📊",
    title: () => "رفع المعدّل",
    why: (c) => `لأن معدّلك (${c.gpa != null ? fmtGpa(c.gpa) : "—"}) أقل من ٢٫٧٥.`,
    benefit: "يفتح لك التدريب التعاوني والقبول والوظائف لاحقاً.",
    time: () => "هذا الفصل",
    next: "التقديم على التدريب التعاوني.", cta: "احسب معدّلك واستهدف", href: "/uni-tools",
  },
  research: {
    area: "growth", icon: "🧪",
    title: (c) => `البحث والدراسات العليا${major(c)}`,
    why: (c) => `معدّلك ممتاز (${c.gpa != null ? fmtGpa(c.gpa) : "—"}) — استثمره.`,
    benefit: "منح ومؤتمرات وتبادل وقبول للدراسات العليا.",
    time: () => "مستمر",
    next: "ابنِ ملفك البحثي ولينكدإن.", cta: "خطّط لدراساتك العليا", href: "/career",
  },
  cv: {
    area: "career", icon: "📄",
    title: (c) => `تجهيز سيرتك الذاتية${major(c)}`,
    why: () => "أنت قريب من التخرّج والسوق يبدأ قبله بأشهر.",
    benefit: "تبدأ التقديم على الوظائف مبكراً وبثقة.",
    time: () => "أسبوع",
    next: "حدّث لينكدإن وقدّم على الشركات.", cta: "جهّز سيرتك ومسارك", href: "/career",
  },
  coop: {
    area: "career", icon: "🧭",
    title: () => "التقديم على التدريب التعاوني",
    why: () => "لم تُنجز تدريبك بعد — وهو أسرع طريق للخبرة.",
    benefit: "خبرة حقيقية تسبق الشهادة وتفتح باب التوظيف.",
    time: () => "قدّم الآن للفصل القادم",
    next: "ابدأ أول شهادة احترافية.", cta: "استكشف التدريب", href: "/career",
  },
  cert: {
    area: "growth", icon: "🎓",
    title: () => "بدء أول شهادة احترافية",
    why: () => "أنجزت تدريبك — الوقت مناسب لشهادة تخصصك.",
    benefit: "تثبّت مهارتك وتميّز سيرتك عن أقرانك.",
    time: () => "٤–٨ أسابيع",
    next: "ابنِ مشروعاً يطبّقها.", cta: "ابدأ شهادة تخصصك", href: "/career#sec-certs",
  },
  foundation: {
    area: "study", icon: "🎛️",
    title: () => "بناء أساسك: معدّلك وتنظيمك",
    why: () => "أول سنتين تحدّدان فرصك لاحقاً.",
    benefit: "معدّل قوي مبكّر يفتح كل الأبواب بعده.",
    time: () => "مستمر",
    next: "استكشف عالم تخصصك.", cta: "افتح أدوات الجامعة", href: "/uni-tools",
  },
  "study-routine": {
    area: "study", icon: "📚",
    title: () => "مذاكرة موادك بانتظام",
    why: () => "أنت داخل الفصل الدراسي الآن.",
    benefit: "الانتظام يمنع تراكم المواد قبل الاختبارات.",
    time: () => "يومياً",
    next: "راجع أخطاءك أسبوعياً.", cta: "نظّم خطتك", href: "/plan",
  },
  "school-finals-now": {
    area: "urgent", icon: "⏳", urgent: true,
    title: () => "مراجعة اختباراتك النهائية",
    why: () => "اختباراتك بدأت الآن.",
    benefit: "كل مراجعة قبل المادة ترفع درجتك.",
    time: () => "أيام الاختبارات",
    next: "بعد كل مادة: راجع أخطاءك للتي بعدها.", cta: "راجع أخطائي", href: "/vault",
  },
  "school-finals-soon": {
    area: "urgent", icon: "⏳", urgent: true,
    title: () => "الاستعداد لاختبارات الفصل",
    why: (c) => `باقي ${c.daysToSchoolFinals} يوم على اختباراتك.`,
    benefit: "درجاتك المدرسية جزء من نسبتك الموزونة.",
    time: (c) => `${c.daysToSchoolFinals} يوم`,
    next: "احسب موزونتك ورتّب رغباتك.", cta: "راجع خطتك", href: "/plan",
  },
  "qiyas-soon": {
    area: "urgent", icon: "⏳", urgent: true,
    title: (c) => `اقترب ${c.qiyas?.label ?? "اختبار القياس"} — استعد الآن`,
    why: (c) => `باقي ${c.qiyas?.days ?? "—"} يوم على موعده${c.qiyas?.approximate ? " (تقديري)" : ""}.`,
    benefit: "درجتك ترفع نسبتك الموزونة للقبول — والوقت يضيق.",
    time: (c) => `${c.qiyas?.days ?? "—"} يوم`,
    next: "بطاقات ومحاكاة مكثّفة قبل الموعد.", cta: "ذاكر لاختبارك الآن", href: "/roadmap",
  },
  qiyas: {
    area: "study", icon: "🧭",
    title: (c) => `الاستعداد لـ${c.qiyas?.label ?? "اختبار القياس"}`,
    why: (c) => `باقي ${c.qiyas?.weeks ?? "—"} أسبوع${c.qiyas?.approximate ? " تقريباً" : ""} على موعده.`,
    benefit: "درجتك ترفع نسبتك الموزونة للقبول.",
    time: (c) => `${c.qiyas?.weeks ?? "—"} أسبوع`,
    next: "بطاقات ومحاكاة أسبوعية.", cta: "ابدأ مذاكرة مساري", href: "/roadmap",
  },
  "school-grades": {
    area: "gpa", icon: "📈",
    title: () => "قوِّ درجاتك ونسبتك",
    why: (c) => `نسبتك المدرسية (${c.highschoolPct != null ? `${c.highschoolPct}%` : "—"}) تحسّن موزونتك — وكل درجة تفتح تخصصات أكثر.`,
    benefit: "ترفع نسبتك الموزونة وتوسّع خياراتك في القبول.",
    time: () => "هذا الفصل",
    next: "ثم رتّب رغباتك واحسب موزونتك.", cta: "نظّم مذاكرتك", href: "/plan",
  },
  admission: {
    area: "admission", icon: "🏛️",
    title: () => "ترتيب رغباتك وحساب موزونتك",
    why: (c) => (c.stage === "graduate" ? "أنت في مرحلة التقديم للقبول." : "أنت في سنة القبول الجامعي."),
    benefit: "تعرف أين تُقبل وما الذي تقدّم عليه.",
    time: () => "هذا الموسم",
    next: "قدّم على ما يناسبك.", cta: "احسب موزونتك وقدّم", href: "/university",
  },
  early: {
    area: "study", icon: "🧭",
    title: (c) => (c.stage === "second" ? "اسبق دفعتك — القدرات والتحصيلي المبكر" : "ابنِ أساسك المدرسي وعاداتك الدراسية"),
    why: () => "أنت مبكّر — كل أسبوع تبدأ فيه اليوم يسبقك خطوة.",
    benefit: "تدخل سنة القبول وأنت متقدّم على دفعتك.",
    time: () => "مستمر",
    next: "نظّم جدول مذاكرتك.", cta: "ابدأ من مساري", href: "/roadmap",
  },
};

/* ── تصنيف كل أولوية (عاجل/مهم/استراتيجي) — لا تختلط الأنواع ── */
const TIER: Record<PriorityKey, Tier> = {
  "uni-finals": "urgent", "school-finals-now": "urgent", "school-finals-soon": "urgent", "qiyas-soon": "urgent",
  gpa: "important", cv: "important", coop: "important", admission: "important",
  qiyas: "important", "study-routine": "important", "school-grades": "important", homework: "important", retake: "important",
  research: "strategic", cert: "strategic", foundation: "strategic", early: "strategic",
};

/* ── تكلفة كل قرار وعائده — كم سأدفع؟ وماذا سأكسب؟ (تقديري، قابل للمراجعة) ── */
const COST: Record<PriorityKey, { hours: number; payoff: string }> = {
  "uni-finals": { hours: 40, payoff: "درجات ترفع معدّلك التراكمي مباشرة" },
  gpa: { hours: 40, payoff: "يرفع فرص التدريب والقبول بشكل كبير" },
  research: { hours: 60, payoff: "يفتح المنح والدراسات العليا" },
  cv: { hours: 8, payoff: "تبدأ التقديم على الوظائف مبكراً" },
  coop: { hours: 12, payoff: "خبرة حقيقية تسبق الشهادة وتفتح التوظيف" },
  cert: { hours: 50, payoff: "يميّز سيرتك ويفتح وظائف أكثر" },
  foundation: { hours: 0, payoff: "أساس قوي لبقية سنواتك" },
  "study-routine": { hours: 0, payoff: "يمنع تراكم المواد قبل الاختبارات" },
  "school-finals-now": { hours: 30, payoff: "ترفع درجاتك المدرسية" },
  "school-finals-soon": { hours: 30, payoff: "ترفع درجاتك ونسبتك الموزونة" },
  "qiyas-soon": { hours: 30, payoff: "يرفع نسبتك الموزونة قبل فوات الموعد" },
  qiyas: { hours: 30, payoff: "يرفع نسبتك الموزونة للقبول" },
  "school-grades": { hours: 40, payoff: "توسّع خياراتك في القبول" },
  admission: { hours: 6, payoff: "تعرف أين تُقبل وتقدّم بثقة" },
  early: { hours: 0, payoff: "تسبق دفعتك وتدخل القبول متقدّماً" },
  homework: { hours: 0, payoff: "درجات الواجبات محفوظة ولا تتراكم عليك" },
  retake: { hours: 6, payoff: "درجة أعلى تفتح تخصصاتٍ وجامعاتٍ أكثر" },
};

/* ── القواعد: صريحة، كلٌّ بمعرّف وسبب ووزن وشرط ── */
export interface Rule {
  id: number;
  label: string;         // السبب المقروء («المعدّل أقل من ٢٫٧٥»)
  priority: PriorityKey; // الأولوية التي تدعمها
  weight: number;
  when: (c: LifeContext) => boolean;
}

const inRange = (n: number | null, lo: number, hi: number) => n != null && n >= lo && n <= hi;
/* مرحلة مدرسية (ثانوي) — «المدرسة»/الواجبات عالمُها، لا الجامعي/الخريج */
const isSchoolStage = (s: Stage) => s === "first" || s === "second" || s === "third";

export const RULES: Rule[] = [
  /* ── الجامعي ── */
  { id: 10, label: "اختبارات الفصل خلال ٢١ يوماً", priority: "uni-finals", weight: 100, when: (c) => c.stage === "university" && inRange(c.uniFinalsInDays, 0, 21) },
  { id: 11, label: "المعدّل أقل من ٢٫٧٥", priority: "gpa", weight: 50, when: (c) => c.stage === "university" && c.gpa != null && c.gpa < 2.75 },
  { id: 12, label: "تعثّر شديد (المعدّل أقل من ٢٫٠)", priority: "gpa", weight: 20, when: (c) => c.stage === "university" && c.gpa != null && c.gpa < 2.0 },
  { id: 13, label: "معدّل منخفض قرب التخرّج", priority: "gpa", weight: 20, when: (c) => c.stage === "university" && c.gpa != null && c.gpa < 2.75 && c.uniStage === "senior" },
  { id: 14, label: "معدّل ممتاز (≥ ٤٫٥) في مرحلة متقدّمة", priority: "research", weight: 45, when: (c) => c.stage === "university" && c.gpa != null && c.gpa >= 4.5 && (c.uniStage === "mid" || c.uniStage === "senior") },
  { id: 15, label: "قرب التخرّج", priority: "cv", weight: 40, when: (c) => c.uniStage === "senior" },
  { id: 16, label: "لا يوجد تدريب تعاوني", priority: "coop", weight: 35, when: (c) => (c.uniStage === "mid" || c.uniStage === "senior") && !c.coopDone },
  { id: 17, label: "أنجز التدريب (وقت الشهادة)", priority: "cert", weight: 30, when: (c) => c.uniStage === "mid" && c.coopDone },
  { id: 18, label: "بداية المشوار الجامعي", priority: "foundation", weight: 30, when: (c) => c.uniStage === "start" },
  { id: 19, label: "داخل الفصل الدراسي (بلا اختبارات قريبة)", priority: "study-routine", weight: 15, when: (c) => c.stage === "university" && c.inStudyTerm && !inRange(c.uniFinalsInDays, 0, 21) },
  /* ── الثانوي/الخريج ── */
  /* اختبارات المدرسة النهائية للثانوي فقط — الخريج (ثانوي أو جامعة) لم يعُد في مدرسة */
  { id: 30, label: "اختبارات مدرسية جارية الآن", priority: "school-finals-now", weight: 100, when: (c) => isSchoolStage(c.stage) && c.inSchoolFinals },
  { id: 31, label: "اختبارات مدرسية خلال ٢١ يوماً", priority: "school-finals-soon", weight: 90, when: (c) => isSchoolStage(c.stage) && !c.inSchoolFinals && inRange(c.daysToSchoolFinals, 0, 21) },
  { id: 32, label: "قياس قادم يراه الطالب خلال ٤٥ يوماً", priority: "qiyas", weight: 40, when: (c) => c.stage !== "university" && c.qiyas != null && c.qiyas.days > 21 && c.qiyas.days <= 45 },
  { id: 35, label: "قياس عاجل يراه الطالب خلال ٢١ يوماً", priority: "qiyas-soon", weight: 88, when: (c) => c.stage !== "university" && c.qiyas != null && inRange(c.qiyas.days, 0, 21) },
  { id: 33, label: "سنة القبول (ثالث ثانوي/خريج ثانوي)", priority: "admission", weight: 45, when: (c) => c.admissionOpen && (c.stage === "third" || c.stage === "graduate") },
  { id: 36, label: "ثالث ثانوي بدرجات منخفضة (تحت ٨٥٪)", priority: "school-grades", weight: 50, when: (c) => c.stage === "third" && c.highschoolPct != null && c.highschoolPct < 85 },
  { id: 34, label: "مرحلة مبكّرة (أول/ثاني ثانوي)", priority: "early", weight: 30, when: (c) => c.stage === "first" || c.stage === "second" },
  /* ── الواجبات المدرسية (للثانوي فقط — «المدرسة» عالمُ الثانوي، لا الجامعي/الخريج) ── */
  { id: 40, label: "واجبات متأخّرة", priority: "homework", weight: 68, when: (c) => isSchoolStage(c.stage) && c.hwOverdue > 0 },
  { id: 41, label: "واجبات مستحقة اليوم", priority: "homework", weight: 52, when: (c) => isSchoolStage(c.stage) && c.hwDueToday > 0 },
  { id: 42, label: "واجبات قادمة بلا إنجاز", priority: "homework", weight: 26, when: (c) => isSchoolStage(c.stage) && c.hwPending > 0 },

  /* اختار الطالب إعادة اختبار — قرارٌ صريح يرفع أولوية الاستعداد (لا يظهر للجامعي) */
  { id: 45, label: "اختار إعادة اختبار", priority: "retake", weight: 85, when: (c) => c.stage !== "university" && c.admissionOpen && c.retakeExams.length > 0 },
];

/* ════════ العقل: أولويات الطالب مرتّبة ومُفسَّرة ════════ */
export function lifeEngine(c: LifeContext): Priority[] {
  /* أطلِق كل القواعد، وجمّع أوزانها حسب الأولوية */
  const fired = new Map<PriorityKey, FiredRule[]>();
  for (const r of RULES) {
    if (!r.when(c)) continue;
    const arr = fired.get(r.priority) ?? [];
    arr.push({ id: r.id, label: r.label, weight: r.weight });
    fired.set(r.priority, arr);
  }

  /* ابنِ أولوية لكل مفتاح أطلق قاعدة، مع score/confidence/التفسير */
  const built = [...fired.entries()].map(([key, rules]) => {
    const def = PRIORITY_DEFS[key];
    const score = rules.reduce((s, r) => s + r.weight, 0);
    return {
      key, area: def.area, tier: TIER[key], icon: def.icon, urgent: !!def.urgent,
      title: def.title(c), why: def.why(c), benefit: def.benefit,
      time: def.time(c), next: def.next, cta: def.cta, href: def.href,
      costHours: COST[key].hours, payoff: COST[key].payoff,
      score, confidence: confidenceOf(score),
      firedRules: rules, reasons: rules.map((r) => r.label),
    };
  });

  /* رتّب بالوزن (الأعلى أولاً)، ثم بمعرّف ثابت عند التساوي */
  built.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  return built.map((p, i) => ({ rank: i + 1, ...p }));
}

/* ════════ Timeline Intelligence — العقل يرى المستقبل ════════
   لا يقول «افعل» فقط، بل يرسم أثر القرار: اليوم ← ثم ← ثم ← النتيجة. */
export interface TimelineNode { horizon: string; title: string; note?: string; }

export function projectTimeline(c: LifeContext): TimelineNode[] {
  const key = lifeEngine(c)[0]?.key;

  if (c.stage === "university") {
    if (key === "gpa") {
      const target = c.gpa != null ? Math.min(5, c.gpa + 0.5).toFixed(1) : "2.8";
      return [
        { horizon: "الآن", title: `ارفع معدّلك إلى ${target}`, note: "ركّز على موادك الصعبة" },
        { horizon: "الفصل القادم", title: "يفتح لك التدريب التعاوني" },
        { horizon: "قبل التخرّج", title: "جهّز سيرتك الذاتية" },
        { horizon: "التخرّج", title: "التقديم على الوظائف" },
        { horizon: "بعده", title: "أول وظيفة" },
      ];
    }
    if (c.uniStage === "senior") {
      return [
        { horizon: "الآن", title: "جهّز سيرتك الذاتية" },
        { horizon: "هذا الشهر", title: "حدّث لينكدإن وابنِ مشروعاً" },
        { horizon: "قبل التخرّج", title: "التقديم على الشركات والتدريب" },
        { horizon: "التخرّج", title: "أول وظيفة" },
      ];
    }
    return [
      { horizon: "الآن", title: c.uniStage === "start" ? "ثبّت أساسك ومعدّلك" : "ابنِ خبرتك" },
      { horizon: "هذا العام", title: c.coopDone ? "ابدأ أول شهادة احترافية" : "قدّم على التدريب التعاوني" },
      { horizon: "السنة الأخيرة", title: "السيرة والتقديم على الوظائف" },
      { horizon: "التخرّج", title: "أول وظيفة" },
    ];
  }

  if (c.stage === "first" || c.stage === "second") {
    return [
      { horizon: c.stage === "first" ? "أول ثانوي" : "الآن", title: "أتقن القدرات" },
      { horizon: "ثاني/ثالث ثانوي", title: "التحصيلي" },
      { horizon: "التخرّج", title: "احسب نسبتك الموزونة" },
      { horizon: "القبول", title: "اختر جامعتك وتخصصك" },
      { horizon: "بعدها", title: "رحلتك الجامعية" },
    ];
  }
  return [
    { horizon: "الآن", title: "أكمل القدرات والتحصيلي" },
    { horizon: "هذا الموسم", title: "احسب موزونتك ورتّب رغباتك" },
    { horizon: "القبول", title: "قدّم على جامعتك وتخصصك" },
    { horizon: "بعدها", title: "رحلتك الجامعية" },
  ];
}

/* ════════ Life Score — مؤشرات جاهزية (لا منافسة، بل موقع) ════════
   ليست Gamification: يعرف الطالب أين هو، والعقل يسعى لرفعها مع الوقت.
   صيغٌ شفّافة من إشارات حقيقية (تُعرَض في أداة التحقّق لمراجعتها). */
export interface LifeScore { key: string; label: string; pct: number; hint: string; }
const pctOf = (n: number) => clamp(Math.round(n), 0, 100);

export function lifeScore(c: LifeContext): LifeScore[] {
  const hoursPct = c.hours != null ? c.hours / 132 : 0;
  const gpaPct = c.gpa != null ? c.gpa / 5 : 0;
  const seniorW = c.uniStage === "senior" ? 1 : c.uniStage === "mid" ? 0.5 : 0;

  if (c.stage === "university") {
    return [
      { key: "academic", label: "جاهزيتك الأكاديمية", pct: pctOf(gpaPct * 100), hint: "من معدّلك التراكمي" },
      { key: "graduation", label: "جاهزية التخرّج", pct: pctOf(hoursPct * 100), hint: "من الساعات المنجزة (÷ ١٣٢)" },
      { key: "job", label: "جاهزية سوق العمل", pct: pctOf(25 * hoursPct + 25 * gpaPct + 25 * (c.coopDone ? 1 : 0) + 25 * seniorW), hint: "الساعات + المعدّل + التدريب + قرب التخرّج (٢٥٪ لكلٍّ)" },
    ];
  }
  const stageBase: Record<string, number> = { first: 25, second: 45, third: 70, graduate: 80 };
  const uni = Math.min(95, (stageBase[c.stage] ?? 25) + (c.qiyas ? 5 : 0));
  return [
    { key: "university", label: "جاهزية القبول الجامعي", pct: pctOf(uni), hint: "من مرحلتك وبدء رحلة القياس" },
  ];
}

/* ════════ قارئ السياق — يجمّع كل الإشارات من الأنظمة القائمة ════════
   آمن على الخادم (المُحمِّلات تُعيد فراغاً، وphaseExperience يقبل null). نقطة
   الدخول الموحّدة التي تستهلكها الصفحات: readLifeContext ثم lifeEngine. */
export function readLifeContext(now: Date = new Date()): LifeContext {
  const user = loadUser();
  const goals = loadGoals();
  const exp = phaseExperience(user);
  const cal = resolveCalendar(now, {
    examDates: loadTrackExamDates(),
    config: loadCalendarConfig<CalendarConfig>(),
  });

  /* الطبقة الأولى (Domain) — المصدر الوحيد لِما يخصّ الطالب من اختبارات (من الوجهة). */
  const recExams = recommendedExamsForUser(user, localDayKey(now));
  const seesExam = (k: NextExamInfo["kind"]) =>
    k === "step" ? recExams.some((r) => r.kind === "language") : recExams.some((r) => r.kind === k);
  const e = cal.nextExam;
  const qiyas = e && e.daysUntil >= 0 && seesExam(e.kind)
    ? { kind: e.kind as "qudurat" | "tahsili" | "step", label: e.label, days: e.daysUntil, weeks: e.weeksUntil, approximate: e.approximate }
    : null;

  const isUni = exp.stage === "university";
  const sem = isUni ? semesterInfo(now) : null;
  const m = findMajor(goals.majorId ?? undefined);
  const hw = homeworkPressure(loadHomework(), localDayKey(now));

  /* نوايا الإعادة المُحقَّقة فقط: المرحلة تسمح + باب التسجيل غير منتهٍ.
     فلا يقترح العقل إعادةً مستحيلة، ويظهر تلقائياً أفضل خطوةٍ تالية (الأولوية التي تليها). */
  const admissionOpen = exp.admission !== "hidden";
  const retakeExams = achievableRetakes(user?.retakeExams ?? [], exp.stage, localDayKey(now), { admissionOpen });

  return {
    stage: exp.stage,
    uniStage: isUni ? uniStage(user?.universityYear, user?.creditHoursCompleted) : null,
    gpa: user?.universityGpa ?? null,
    hours: user?.creditHoursCompleted ?? null,
    year: user?.universityYear ?? null,
    majorId: goals.majorId ?? null,
    majorName: hasMajorWorld(goals.majorId) && m ? m.name : null,
    coopDone: !!user?.coopDone,
    gradInterest: !!user?.gradSchoolInterest,
    highschoolPct: goals.highschoolPct ?? null,
    inSchoolFinals: cal.inSchoolFinals,
    daysToSchoolFinals: cal.nextSchoolFinals ? cal.nextSchoolFinals.daysUntil : null,
    qiyas,
    uniFinalsInDays: sem?.daysToFinals ?? null,
    termLabel: sem?.termLabel ?? null,
    inStudyTerm: cal.inStudyTerm,
    retakeExams,
    admissionOpen,
    recommendedExams: recExams,
    focus: user?.focus ?? null,
    hwOverdue: hw.overdue,
    hwDueToday: hw.dueToday,
    hwPending: hw.pending,
  };
}
