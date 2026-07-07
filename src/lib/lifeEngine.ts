/* ═══════════════ Life Engine — العقل المركزي الواحد ═══════════════
   درب لا يجعل كل صفحة تقرّر لنفسها. محرّكٌ واحد يقرأ حياة الطالب كلها (المرحلة،
   المعدّل، السنة، التخصص، الساعات، الاختبارات، التدريب، السيرة، الشهادات، نشاطه)
   ويُخرج شيئاً واحداً فقط: أولوياته مرتّبة. كل صفحات درب (الرئيسية، دويرب، شبكة
   التخصص، الجامعة، الأدوات) تقرأ هذه الأولويات — لا تعيد الحساب.

   إذا تغيّر شيء واحد (نجح في التدريب، ارتفع معدّله، اقترب تخرّجه، أنهى STEP)
   يُعيد المحرّك الحساب فتتغيّر المنصة كلها — بلا كتابة شروط جديدة في الصفحات.

   وكل أولوية ليست نصاً فقط، بل قرار كامل: سببها، فائدتها، وقتها، وما بعدها
   مباشرة. فلا يقول درب «ذاكِر»، بل «لماذا تذاكر، وماذا يحدث بعدها».

   دالّة نقيّة حتمية: نفس السياق ⇒ نفس الأولويات. لا IO (readLifeContext منفصلة). */
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

export type PriorityArea = "urgent" | "gpa" | "career" | "admission" | "study" | "growth";

/* أولوية واحدة = قرار كامل، لا نص */
export interface Priority {
  rank: number;        // ١، ٢، ٣...
  key: string;         // معرّف ثابت (تقرؤه الصفحات)
  area: PriorityArea;  // لونٌ بمعنى + تجميع
  icon: string;
  title: string;       // «رفع المعدّل»
  why: string;         // سبب ظهورها الآن
  benefit: string;     // ماذا تستفيد إن أنجزتها
  time: string;        // كم تأخذ
  next: string;        // ماذا بعدها مباشرة
  cta: string;         // نصّ الإجراء
  href: string;        // وجهة حقيقية
  urgent: boolean;
}

/* مرشّح داخلي قبل الترتيب (order أصغر = أهمّ) */
type Cand = { order: number } & Omit<Priority, "rank">;

const fmtGpa = (g: number) => g.toFixed(2).replace(/\.?0+$/, "");
const MAX_PRIORITIES = 4;

/* ════════ مرشّحات الجامعي ════════ */
function uniCandidates(c: LifeContext): Cand[] {
  const out: Cand[] = [];
  const major = c.majorName ? ` في ${c.majorName}` : "";
  const gpaTxt = c.gpa != null ? fmtGpa(c.gpa) : null;

  /* اختبارات الفصل قريبة → عاجل يتصدّر */
  if (c.uniFinalsInDays != null && c.uniFinalsInDays >= 0 && c.uniFinalsInDays <= 21) {
    const term = c.termLabel ? ` ${c.termLabel}` : "";
    out.push({
      order: 0, key: "uni-finals", area: "urgent", icon: "⏳",
      title: `مذاكرة اختبارات${term}`,
      why: `باقي ${c.uniFinalsInDays} يوم على اختبارات فصلك.`,
      benefit: "درجاتك الآن ترفع معدّلك التراكمي مباشرة.",
      time: `${c.uniFinalsInDays} يوم`,
      next: "راجع أخطاءك ونظّم الفصل القادم.",
      cta: "راجع خطتك", href: "/plan", urgent: true,
    });
  }

  /* متعثّر → رفع المعدّل يتقدّم على كل شيء */
  if (c.gpa != null && c.gpa < 2.75) {
    out.push({
      order: 1, key: "gpa", area: "gpa", icon: "📊",
      title: "رفع المعدّل",
      why: `لأن معدّلك (${gpaTxt}) أقل من ٢٫٧٥.`,
      benefit: "يفتح لك التدريب التعاوني والقبول والوظائف لاحقاً.",
      time: "هذا الفصل",
      next: "التقديم على التدريب التعاوني.",
      cta: "احسب معدّلك واستهدف", href: "/uni-tools", urgent: false,
    });
  }

  /* متميّز في المنتصف/قرب التخرّج → البحث والدراسات العليا */
  if (c.gpa != null && c.gpa >= 4.5 && (c.uniStage === "mid" || c.uniStage === "senior")) {
    out.push({
      order: 1, key: "research", area: "growth", icon: "🧪",
      title: "البحث والدراسات العليا",
      why: `معدّلك ممتاز (${gpaTxt}) — استثمره.`,
      benefit: "منح ومؤتمرات وتبادل وقبول للدراسات العليا.",
      time: "مستمر",
      next: "ابنِ ملفك البحثي ولينكدإن.",
      cta: "خطّط لدراساتك العليا", href: "/career", urgent: false,
    });
  }

  /* قرب التخرّج → السوق: السيرة والتقديم */
  if (c.uniStage === "senior") {
    out.push({
      order: 2, key: "cv", area: "career", icon: "📄",
      title: `تجهيز سيرتك الذاتية${major}`,
      why: "أنت قريب من التخرّج والسوق يبدأ قبله بأشهر.",
      benefit: "تبدأ التقديم على الوظائف مبكراً وبثقة.",
      time: "أسبوع",
      next: "حدّث لينكدإن وقدّم على الشركات.",
      cta: "جهّز سيرتك ومسارك", href: "/career", urgent: false,
    });
  }

  /* المنتصف/قرب التخرّج بلا تدريب → التدريب التعاوني */
  if ((c.uniStage === "mid" || c.uniStage === "senior") && !c.coopDone) {
    out.push({
      order: 3, key: "coop", area: "career", icon: "🧭",
      title: "التقديم على التدريب التعاوني",
      why: "لم تُنجز تدريبك بعد — وهو أسرع طريق للخبرة.",
      benefit: "خبرة حقيقية تسبق الشهادة وتفتح باب التوظيف.",
      time: "قدّم الآن للفصل القادم",
      next: "ابدأ أول شهادة احترافية.",
      cta: "استكشف التدريب", href: "/career", urgent: false,
    });
  }

  /* المنتصف مع تدريب مُنجَز → أول شهادة */
  if (c.uniStage === "mid" && c.coopDone) {
    out.push({
      order: 3, key: "cert", area: "growth", icon: "🎓",
      title: "بدء أول شهادة احترافية",
      why: "أنجزت تدريبك — الوقت مناسب لشهادة تخصصك.",
      benefit: "تثبّت مهارتك وتميّز سيرتك عن أقرانك.",
      time: "٤–٨ أسابيع",
      next: "ابنِ مشروعاً يطبّقها.",
      cta: "ابدأ شهادة تخصصك", href: "/career#sec-certs", urgent: false,
    });
  }

  /* البداية → الأساس: المعدّل والتنظيم */
  if (c.uniStage === "start") {
    out.push({
      order: 3, key: "foundation", area: "study", icon: "🎛️",
      title: "بناء أساسك: معدّلك وتنظيمك",
      why: "أول سنتين تحدّدان فرصك لاحقاً.",
      benefit: "معدّل قوي مبكّر يفتح كل الأبواب بعده.",
      time: "مستمر",
      next: "استكشف عالم تخصصك.",
      cta: "افتح أدوات الجامعة", href: "/uni-tools", urgent: false,
    });
  }

  /* خلفية دائمة: مذاكرة منتظمة داخل الفصل (أقلّ أولوية) */
  if (c.inStudyTerm && (c.uniFinalsInDays == null || c.uniFinalsInDays > 21)) {
    out.push({
      order: 5, key: "study-routine", area: "study", icon: "📚",
      title: "مذاكرة موادك بانتظام",
      why: "أنت داخل الفصل الدراسي الآن.",
      benefit: "الانتظام يمنع تراكم المواد قبل الاختبارات.",
      time: "يومياً",
      next: "راجع أخطاءك أسبوعياً.",
      cta: "نظّم خطتك", href: "/plan", urgent: false,
    });
  }

  return out;
}

/* ════════ مرشّحات الثانوي/الخريج ════════ */
function schoolCandidates(c: LifeContext): Cand[] {
  const out: Cand[] = [];

  /* اختبارات مدرسية الآن أو قريبة → عاجل */
  if (c.inSchoolFinals) {
    out.push({
      order: 0, key: "school-finals-now", area: "urgent", icon: "⏳",
      title: "مراجعة اختباراتك النهائية",
      why: "اختباراتك بدأت الآن.",
      benefit: "كل مراجعة قبل المادة ترفع درجتك.",
      time: "أيام الاختبارات",
      next: "بعد كل مادة: راجع أخطاءك للتي بعدها.",
      cta: "راجع أخطائي", href: "/vault", urgent: true,
    });
  } else if (c.daysToSchoolFinals != null && c.daysToSchoolFinals >= 0 && c.daysToSchoolFinals <= 21) {
    out.push({
      order: 0, key: "school-finals-soon", area: "urgent", icon: "⏳",
      title: "الاستعداد لاختبارات الفصل",
      why: `باقي ${c.daysToSchoolFinals} يوم على اختباراتك.`,
      benefit: "درجاتك المدرسية جزء من نسبتك الموزونة.",
      time: `${c.daysToSchoolFinals} يوم`,
      next: "احسب موزونتك ورتّب رغباتك.",
      cta: "راجع خطتك", href: "/plan", urgent: true,
    });
  }

  /* قياس قادم يراه الطالب */
  if (c.qiyas && c.qiyas.days <= 45) {
    const approx = c.qiyas.approximate ? " تقريباً" : "";
    out.push({
      order: 1, key: "qiyas", area: "study", icon: "🧭",
      title: `الاستعداد لـ${c.qiyas.label}`,
      why: `باقي ${c.qiyas.weeks} أسبوع${approx} على موعده.`,
      benefit: "درجتك ترفع نسبتك الموزونة للقبول.",
      time: `${c.qiyas.weeks} أسبوع`,
      next: "بطاقات ومحاكاة أسبوعية.",
      cta: "ابدأ مذاكرة مساري", href: "/roadmap", urgent: false,
    });
  }

  /* ثالث ثانوي/خريج → القبول */
  if (c.stage === "third" || c.stage === "graduate") {
    out.push({
      order: 2, key: "admission", area: "admission", icon: "🏛️",
      title: "ترتيب رغباتك وحساب موزونتك",
      why: c.stage === "graduate" ? "أنت في مرحلة التقديم للقبول." : "أنت في سنة القبول الجامعي.",
      benefit: "تعرف أين تُقبل وما الذي تقدّم عليه.",
      time: "هذا الموسم",
      next: "قدّم على ما يناسبك.",
      cta: "احسب موزونتك وقدّم", href: "/university", urgent: false,
    });
  }

  /* أول/ثاني ثانوي → التبكير */
  if (c.stage === "first" || c.stage === "second") {
    out.push({
      order: 3, key: "early", area: "study", icon: "🧭",
      title: c.stage === "second" ? "اسبق دفعتك — القدرات والتحصيلي المبكر" : "ابدأ القدرات وابنِ عادتك",
      why: "أنت مبكّر — كل أسبوع تبدأ فيه اليوم يسبقك خطوة.",
      benefit: "تدخل سنة القبول وأنت متقدّم على دفعتك.",
      time: "مستمر",
      next: "نظّم جدول مذاكرتك.",
      cta: "ابدأ من مساري", href: "/roadmap", urgent: false,
    });
  }

  return out;
}

/* ════════ قارئ السياق — يجمّع كل الإشارات من الأنظمة القائمة ════════
   آمن على الخادم (كل المُحمِّلات تُعيد فراغاً، وphaseExperience يقبل null). نقطة
   الدخول الموحّدة التي تستهلكها كل الصفحات: readLifeContext ثم lifeEngine. */
export function readLifeContext(now: Date = new Date()): LifeContext {
  const user = loadUser();
  const goals = loadGoals();
  const exp = phaseExperience(user);
  const cal = resolveCalendar(now, {
    examDates: loadTrackExamDates(),
    config: loadCalendarConfig<CalendarConfig>(),
  });

  /* قياس يراه الطالب فقط (لا نُبرِز تحصيلياً لمن لا يراه) */
  const seesExam = (k: NextExamInfo["kind"]) =>
    k === "qudurat" ? exp.showsQudurat : k === "tahsili" ? exp.showsTahsili : k === "step" ? exp.showsStep : false;
  const e = cal.nextExam;
  const qiyas = e && e.daysUntil >= 0 && seesExam(e.kind)
    ? { kind: e.kind as "qudurat" | "tahsili" | "step", label: e.label, days: e.daysUntil, weeks: e.weeksUntil, approximate: e.approximate }
    : null;

  const isUni = exp.stage === "university";
  const sem = isUni ? semesterInfo(now) : null;
  const major = findMajor(goals.majorId ?? undefined);

  return {
    stage: exp.stage,
    uniStage: isUni ? uniStage(user?.universityYear, user?.creditHoursCompleted) : null,
    gpa: user?.universityGpa ?? null,
    hours: user?.creditHoursCompleted ?? null,
    year: user?.universityYear ?? null,
    majorId: goals.majorId ?? null,
    majorName: hasMajorWorld(goals.majorId) && major ? major.name : null,
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

/* ════════ العقل: أولويات الطالب مرتّبة ════════ */
export function lifeEngine(c: LifeContext): Priority[] {
  const cands = c.stage === "university" ? uniCandidates(c) : schoolCandidates(c);
  /* ترتيب ثابت: الأهمّ (order أصغر) أولاً، ثم ترتيب الإضافة */
  const sorted = cands
    .map((cand, i) => ({ cand, i }))
    .sort((a, b) => a.cand.order - b.cand.order || a.i - b.i)
    .slice(0, MAX_PRIORITIES)
    .map(({ cand }, idx) => {
      const { order: _order, ...rest } = cand;
      void _order;
      return { rank: idx + 1, ...rest } as Priority;
    });
  return sorted;
}
