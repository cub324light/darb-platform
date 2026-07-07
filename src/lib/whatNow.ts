/* ─── «ماذا أفعل الآن؟» — إجابةٌ واحدة تبدأ من المشكلة لا من القراءة ───
   الطالب لا يدخل ليقرأ رحلة؛ يدخل ومعه مشكلة (اختبار بعد أسبوع، تخرّج قريب،
   لا يعرف من أين يبدأ). هذه الدالة النقيّة تُجيب سؤالاً واحداً يختلف بكل مرحلة:
   العنوان = الحالة/الضغط الحقيقي، ثم إجراءٌ رئيسٌ واحد، ثم سلسلة خطوات مرتّبة
   كلٌّ منها يقود إلى وجهة حقيقية داخل درب (لا محتوى مُلفَّق، لا رابط ميت).

   لا IO ولا شبكة: نستهلك مخرجات الأنظمة القائمة (phaseExperience للمرحلة،
   resolveCalendar للتقويم، uniStage للمرحلة الجامعية) — مصدر الحقيقة يبقى فيها. */
import type { PhaseExperience } from "./experience";
import type { CalendarSnapshot, NextExamInfo } from "./academicCalendar";
import type { UniStage } from "./uniJourney";

export interface NowStep {
  icon: string;
  text: string;
  href: string; // وجهة حقيقية داخل درب
}

export interface NowAnswer {
  urgency: "high" | "normal";
  accent: "danger" | "gold" | "accent" | "success"; // لونٌ بمعنى: أحمر=عاجل، ذهبي=قريب، أزرق=إجراء، أخضر=إنجاز
  eyebrow: string;   // «ماذا أفعل الآن؟» أو تأطير الضغط («اختبارك قريب»)
  headline: string;  // الحالة/المشكلة بلغة الطالب
  sub: string;       // سطر سياق واحد
  primary: { label: string; href: string; icon: string }; // الإجراء الأهمّ الآن
  steps: NowStep[];  // ٢–٣ خطوات مرتّبة، كلٌّ يقود للذي بعده
}

/* إشارات المرحلة الجامعية (يمرّرها المكوّن من semesterInfo/uniStage) */
export interface NowUni {
  stage: UniStage;
  finalsInDays?: number | null; // أيام حتى اختبارات الفصل (من semesterInfo)
  termLabel?: string | null;
  majorName?: string | null;
  coopDone?: boolean;           // أنجز التدريب التعاوني (يغيّر إجابة منتصف المرحلة)
}

export interface NowInput {
  exp: PhaseExperience;
  cal: CalendarSnapshot;
  uni?: NowUni | null;
}

/* ثوابت النوافذ الزمنية — بعدها لا يُعدّ الموعد «ضاغطاً» */
const FINALS_WINDOW = 21; // يوماً: اختبارات مدرسية/فصل تصير عدّاداً عاجلاً
const QIYAS_WINDOW = 45;  // يوماً: قدرات/تحصيلي تُبرَز كموعد قادم

/* لون الإلحاح حسب قرب الموعد */
function urgencyAccent(days: number): NowAnswer["accent"] {
  return days <= 3 ? "danger" : days <= 10 ? "gold" : "accent";
}

/* هل يرى الطالب هذا الاختبار أصلاً؟ (لا نُبرِز تحصيلياً لمن لا يراه) */
function stageSeesExam(exp: PhaseExperience, kind: NextExamInfo["kind"]): boolean {
  if (kind === "qudurat") return exp.showsQudurat;
  if (kind === "tahsili") return exp.showsTahsili;
  if (kind === "step") return exp.showsStep;
  return false;
}

/* أقرب اختبار قياس يراه الطالب (وإلا null) */
function pressingQiyas(exp: PhaseExperience, cal: CalendarSnapshot): NextExamInfo | null {
  const e = cal.nextExam;
  return e && e.daysUntil >= 0 && stageSeesExam(exp, e.kind) ? e : null;
}

/* الأقرب زمنياً بين موعدين محتملين */
function nearest(a: NextExamInfo | null, b: NextExamInfo | null): NextExamInfo | null {
  if (!a) return b;
  if (!b) return a;
  return a.daysUntil <= b.daysUntil ? a : b;
}

/* ════════ إجابات الثانوي/الخريج ════════ */

/* اختبارات مدرسية جارية الآن */
function schoolFinalsNow(): NowAnswer {
  return {
    urgency: "high",
    accent: "danger",
    eyebrow: "اختباراتك الآن",
    headline: "اختباراتك النهائية بدأت — ركّز على القادم",
    sub: "راجع أخطاءك السابقة وأكثر الأسئلة تكراراً قبل كل مادة.",
    primary: { label: "راجع أخطائي", href: "/vault", icon: "🎯" },
    steps: [
      { icon: "📓", text: "راجع أخطاءك المحفوظة", href: "/vault" },
      { icon: "🃏", text: "بطاقات المراجعة السريعة", href: "/review" },
      { icon: "🗓", text: "رتّب مواد اليوم في خطتك", href: "/plan" },
    ],
  };
}

/* عدّاد ضاغط (اختبار مدرسي أو قياس قريب) */
function countdownAnswer(e: NextExamInfo): NowAnswer {
  const d = e.daysUntil;
  const when = d === 0 ? "اليوم" : d === 1 ? "بكرة" : `باقي ${d} يوم`;
  return {
    urgency: "high",
    accent: urgencyAccent(d),
    eyebrow: "اختبارك قريب",
    headline: `${when} على ${e.label || "اختبارك"}`,
    sub: "ابدأ اليوم بالمراجعة، ثم درّب نفسك على أكثر الأسئلة تكراراً.",
    primary: { label: "راجع خطتك اليوم", href: "/plan", icon: "🗓" },
    steps: [
      { icon: "🗓", text: "راجع خطة اليوم", href: "/plan" },
      { icon: "🃏", text: "درّب على البطاقات وأكثر الأسئلة", href: "/review" },
      { icon: "⚔️", text: "قيّم نفسك بمحاكاة سريعة", href: "/arena" },
    ],
  };
}

/* قياس قادم (خارج نافذة العدّاد لكنه قريب) */
function qiyasSoonAnswer(e: NextExamInfo): NowAnswer {
  const approx = e.approximate ? " تقريباً" : "";
  return {
    urgency: "normal",
    accent: "accent",
    eyebrow: "استعد من الآن",
    headline: `باقي ${e.weeksUntil} أسبوع${approx} على ${e.label || "اختبارك"}`,
    sub: "التبكير يصنع الفرق — ابدأ مذاكرة منظّمة وبطاقات تدريجية.",
    primary: { label: "ابدأ مذاكرة مساري", href: "/roadmap", icon: "🧭" },
    steps: [
      { icon: "🧭", text: "ذاكر حسب مسارك", href: "/roadmap" },
      { icon: "🃏", text: "بطاقات ومراجعة يومية", href: "/review" },
      { icon: "⚔️", text: "محاكاة أسبوعية", href: "/arena" },
    ],
  };
}

/* لا موعد ضاغط → إجابة المرحلة الثانوية/الخريج */
function secondaryDefault(exp: PhaseExperience): NowAnswer {
  switch (exp.stage) {
    case "first":
      return {
        urgency: "normal", accent: "accent",
        eyebrow: "ماذا أفعل الآن؟",
        headline: "ابدأ بالقدرات وابنِ عادتك الدراسية",
        sub: "أنت مبكّر — كل أسبوع تبدأ فيه اليوم يسبقك خطوة على دفعتك.",
        primary: { label: "ابدأ اختبار القدرات", href: "/roadmap", icon: "🧭" },
        steps: [
          { icon: "🧭", text: "ابدأ مذاكرة القدرات", href: "/roadmap" },
          { icon: "🗓", text: "ابنِ جدول مذاكرة بسيط", href: "/plan" },
        ],
      };
    case "second":
      return {
        urgency: "normal", accent: "accent",
        eyebrow: "ماذا أفعل الآن؟",
        headline: "اسبق دفعتك — القدرات والتحصيلي المبكر",
        sub: "التحصيلي المبكر يوفّر عليك ضغط السنة الأخيرة.",
        primary: { label: "ابدأ من مساري", href: "/roadmap", icon: "🧭" },
        steps: [
          { icon: "🧭", text: "ذاكر القدرات", href: "/roadmap" },
          { icon: "🃏", text: "بطاقات التحصيلي المبكر", href: "/review" },
        ],
      };
    case "third":
      return {
        urgency: "normal", accent: "gold",
        eyebrow: "ماذا أفعل الآن؟",
        headline: "رتّب رغباتك واحسب نسبتك الموزونة",
        sub: "القبول يبدأ بمعرفة أين تقف وما الذي تقدر تقدّم عليه.",
        primary: { label: "احسب موزونتك وقدّم", href: "/university", icon: "🏛️" },
        steps: [
          { icon: "🧮", text: "احسب نسبتك الموزونة", href: "/university" },
          { icon: "🎓", text: "وش تقدر تقدّم عليه", href: "/opportunities" },
        ],
      };
    default: // graduate (خريج ثانوي بانتظار القبول)
      return {
        urgency: "normal", accent: "gold",
        eyebrow: "ماذا أفعل الآن؟",
        headline: "قارن فرص قبولك وابدأ التقديم",
        sub: exp.showsQudurat
          ? "سنة استدراكك فرصة: ارفع القدرات والتحصيلي ثم قدّم."
          : "رتّب أوراقك وقارن ما يقبلك من الجامعات.",
        primary: { label: "وش تقدر تقدّم عليه", href: "/opportunities", icon: "🎓" },
        steps: [
          { icon: "🎓", text: "الفرص المتاحة لك", href: "/opportunities" },
          { icon: "🏛️", text: "قارن القبول الجامعي", href: "/university" },
        ],
      };
  }
}

/* ════════ إجابات الجامعي ════════ */

function uniFinals(uni: NowUni): NowAnswer {
  const d = uni.finalsInDays ?? 0;
  const when = d <= 0 ? "اليوم" : d === 1 ? "بكرة" : `باقي ${d} يوم`;
  const term = uni.termLabel ? ` ${uni.termLabel}` : "";
  return {
    urgency: "high",
    accent: urgencyAccent(d),
    eyebrow: "اختبارات الفصل قريبة",
    headline: `${when} على اختبارات${term}`,
    sub: "راجع خطتك، ونظّم مصادر موادّك، ودرّب على الأسئلة السابقة.",
    primary: { label: "راجع خطتك", href: "/plan", icon: "🗓" },
    steps: [
      { icon: "🗓", text: "راجع خطة المذاكرة", href: "/plan" },
      { icon: "🎛️", text: "نظّم معدّلك ومصادرك", href: "/uni-tools" },
      { icon: "🧠", text: "أسئلة ومشاريع تخصصك", href: "/career" },
    ],
  };
}

function uniStageAnswer(uni: NowUni): NowAnswer {
  const major = uni.majorName ? ` — ${uni.majorName}` : "";
  if (uni.stage === "senior") {
    return {
      urgency: "normal", accent: "success",
      eyebrow: "أنت قريب من التخرّج",
      headline: `ابدأ بسيرتك الذاتية${major}`,
      sub: "السوق يبدأ قبل التخرّج بأشهر — جهّز نفسك من الآن.",
      primary: { label: "جهّز سيرتك ومسارك", href: "/career", icon: "📄" },
      steps: [
        { icon: "📄", text: "جهّز سيرتك الذاتية", href: "/career" },
        { icon: "🔗", text: "حدّث ملف لينكدإن", href: "/career" },
        { icon: "🏢", text: "الشركات التي توظّف تخصصك", href: "/career#sec-companies" },
      ],
    };
  }
  if (uni.stage === "mid") {
    return {
      urgency: "normal", accent: "accent",
      eyebrow: "ماذا أفعل الآن؟",
      headline: uni.coopDone ? `ابدأ أول شهادة احترافية${major}` : `قدّم على التدريب وابدأ أول شهادة${major}`,
      sub: "منتصف الطريق وقتُ بناء الخبرة: تدريب، شهادة، ومشروع حقيقي.",
      primary: uni.coopDone
        ? { label: "ابدأ شهادة تخصصك", href: "/career#sec-certs", icon: "🎓" }
        : { label: "قدّم على تدريب صيفي", href: "/career", icon: "🧭" },
      steps: [
        uni.coopDone
          ? { icon: "🎓", text: "ابدأ أول شهادة احترافية", href: "/career#sec-certs" }
          : { icon: "🧭", text: "قدّم على تدريب تعاوني/صيفي", href: "/career" },
        { icon: "🚀", text: "ابنِ مشروعاً من تخصصك", href: "/career#sec-projects" },
        { icon: "🎛️", text: "تابع معدّلك", href: "/uni-tools" },
      ],
    };
  }
  // start
  return {
    urgency: "normal", accent: "accent",
    eyebrow: "ماذا أفعل الآن؟",
    headline: `نظّم وقتك وارفع معدّلك${major}`,
    sub: "أساسك في أول سنتين يحدّد فرصك لاحقاً — ابدأ منظّماً.",
    primary: { label: "افتح أدوات الجامعة", href: "/uni-tools", icon: "🎛️" },
    steps: [
      { icon: "🎛️", text: "تابع معدّلك وغيابك", href: "/uni-tools" },
      { icon: "🗓", text: "نظّم جدول مذاكرتك", href: "/plan" },
      { icon: "🧭", text: "استكشف عالم تخصصك", href: "/career" },
    ],
  };
}

/* ════════ الإجابة الواحدة ════════ */
export function whatNow({ exp, cal, uni }: NowInput): NowAnswer {
  /* الجامعي: عالمه المهني — لا عدّاد قياس ولا قبول */
  if (exp.stage === "university" && uni) {
    if (uni.finalsInDays != null && uni.finalsInDays >= 0 && uni.finalsInDays <= FINALS_WINDOW) {
      return uniFinals(uni);
    }
    return uniStageAnswer(uni);
  }

  /* الثانوي/الخريج: المشكلة الأقرب أولاً */
  if (cal.inSchoolFinals) return schoolFinalsNow();

  const qiyas = pressingQiyas(exp, cal);
  const school = cal.nextSchoolFinals;
  const pressing = nearest(school, qiyas);
  if (pressing && pressing.daysUntil <= FINALS_WINDOW) return countdownAnswer(pressing);
  if (qiyas && qiyas.daysUntil <= QIYAS_WINDOW) return qiyasSoonAnswer(qiyas);

  return secondaryDefault(exp);
}
