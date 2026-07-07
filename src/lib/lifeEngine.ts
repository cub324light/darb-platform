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
import { loadUser, loadGoals, loadTrackExamDates, loadCalendarConfig } from "./storage";

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
  /* التقويم */
  inSchoolFinals: boolean;
  daysToSchoolFinals: number | null;
  qiyas: { kind: "qudurat" | "tahsili" | "step"; label: string; days: number; weeks: number; approximate: boolean } | null;
  uniFinalsInDays: number | null;
  termLabel: string | null;
  inStudyTerm: boolean;
}

export type PriorityKey =
  | "uni-finals" | "gpa" | "research" | "cv" | "coop" | "cert" | "foundation" | "study-routine"
  | "school-finals-now" | "school-finals-soon" | "qiyas" | "admission" | "early";

export type PriorityArea = "urgent" | "gpa" | "career" | "admission" | "study" | "growth";

/* قاعدة أطلقتها الأولوية — أساس التفسير */
export interface FiredRule { id: number; label: string; weight: number; }

/* أولوية = قرار كامل + تفسيره */
export interface Priority {
  rank: number;
  key: PriorityKey;
  area: PriorityArea;
  icon: string;
  title: string;
  why: string;
  benefit: string;
  time: string;
  next: string;
  cta: string;
  href: string;
  urgent: boolean;
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
  qiyas: {
    area: "study", icon: "🧭",
    title: (c) => `الاستعداد لـ${c.qiyas?.label ?? "اختبار القياس"}`,
    why: (c) => `باقي ${c.qiyas?.weeks ?? "—"} أسبوع${c.qiyas?.approximate ? " تقريباً" : ""} على موعده.`,
    benefit: "درجتك ترفع نسبتك الموزونة للقبول.",
    time: (c) => `${c.qiyas?.weeks ?? "—"} أسبوع`,
    next: "بطاقات ومحاكاة أسبوعية.", cta: "ابدأ مذاكرة مساري", href: "/roadmap",
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
    title: (c) => (c.stage === "second" ? "اسبق دفعتك — القدرات والتحصيلي المبكر" : "ابدأ القدرات وابنِ عادتك"),
    why: () => "أنت مبكّر — كل أسبوع تبدأ فيه اليوم يسبقك خطوة.",
    benefit: "تدخل سنة القبول وأنت متقدّم على دفعتك.",
    time: () => "مستمر",
    next: "نظّم جدول مذاكرتك.", cta: "ابدأ من مساري", href: "/roadmap",
  },
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
  { id: 30, label: "اختبارات مدرسية جارية الآن", priority: "school-finals-now", weight: 100, when: (c) => c.stage !== "university" && c.inSchoolFinals },
  { id: 31, label: "اختبارات مدرسية خلال ٢١ يوماً", priority: "school-finals-soon", weight: 90, when: (c) => c.stage !== "university" && !c.inSchoolFinals && inRange(c.daysToSchoolFinals, 0, 21) },
  { id: 32, label: "قياس قادم يراه الطالب خلال ٤٥ يوماً", priority: "qiyas", weight: 40, when: (c) => c.stage !== "university" && c.qiyas != null && c.qiyas.days <= 45 },
  { id: 33, label: "سنة القبول (ثالث ثانوي/خريج)", priority: "admission", weight: 45, when: (c) => c.stage === "third" || c.stage === "graduate" },
  { id: 34, label: "مرحلة مبكّرة (أول/ثاني ثانوي)", priority: "early", weight: 30, when: (c) => c.stage === "first" || c.stage === "second" },
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
      key, area: def.area, icon: def.icon, urgent: !!def.urgent,
      title: def.title(c), why: def.why(c), benefit: def.benefit,
      time: def.time(c), next: def.next, cta: def.cta, href: def.href,
      score, confidence: confidenceOf(score),
      firedRules: rules, reasons: rules.map((r) => r.label),
    };
  });

  /* رتّب بالوزن (الأعلى أولاً)، ثم بمعرّف ثابت عند التساوي */
  built.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  return built.map((p, i) => ({ rank: i + 1, ...p }));
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

  const seesExam = (k: NextExamInfo["kind"]) =>
    k === "qudurat" ? exp.showsQudurat : k === "tahsili" ? exp.showsTahsili : k === "step" ? exp.showsStep : false;
  const e = cal.nextExam;
  const qiyas = e && e.daysUntil >= 0 && seesExam(e.kind)
    ? { kind: e.kind as "qudurat" | "tahsili" | "step", label: e.label, days: e.daysUntil, weeks: e.weeksUntil, approximate: e.approximate }
    : null;

  const isUni = exp.stage === "university";
  const sem = isUni ? semesterInfo(now) : null;
  const m = findMajor(goals.majorId ?? undefined);

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
    inSchoolFinals: cal.inSchoolFinals,
    daysToSchoolFinals: cal.nextSchoolFinals ? cal.nextSchoolFinals.daysUntil : null,
    qiyas,
    uniFinalsInDays: sem?.daysToFinals ?? null,
    termLabel: sem?.termLabel ?? null,
    inStudyTerm: cal.inStudyTerm,
  };
}
