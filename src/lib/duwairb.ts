/* ─── دويرب: محرّك التخصيص + السياق + التحليلات ───
   مصدر واحد لكل ما يجعل ردود دويرب شخصية: يقرأ ملف الطالب (الأهداف،
   التفضيلات، المهارات، الجاهزية) ويبني:
     • DuwairbProfile — كائن مُنظَّم يُرسَل للراوت (آمن من الحقن، حقول مُقيَّدة).
     • goalLine — جملة عربية تذكّر الطالب بهدفه في الواجهة.
     • formatProfileBlock — نص يُحقن في برومبت النظام (يعمل على الخادم).
   كما يوفّر التبويب المقترح حسب الصفحة، وأسماء أحداث التحليلات. */
import {
  loadUser, loadStats, loadPrefs, loadGoals, loadTrackExamDates, currentScoreMap,
  type DarbGoals,
} from "./storage";
import { loadSkillProgress, overallStats } from "./skillProgress";
import { skillsForTracks, SKILL_BY_ID } from "./globalSkills";
import { estimateReadiness, daysUntil } from "./insights";
import { getTrack, type TrackId, type StudyGoalType } from "./tracks";
import { findMajor, requirementsText } from "./university";
import { duwairbState } from "./lifeEngine";

/* ── القدرات الخمس الأساسية + المواضيع ── */
export type DuwairbTab = "schedule" | "progress" | "quiz" | "explain" | "file" | "topics";

/* ── كائن الملف الذي يُرسَل للراوت (حقول مُقيَّدة فقط) ── */
export interface DuwairbExam { name: string; target?: number; days?: number; }
export interface DuwairbProfile {
  name?: string;
  exams?: DuwairbExam[];
  university?: string;
  major?: string;
  grade?: string;
  studyHours?: number;
  preferredTime?: string;
  sessionLen?: number;
  learningStyles?: string[];
  device?: string;
  strongest?: string;
  weakest?: string;
  readinessPct?: number;
  readinessLabel?: string;
  /* حقول جديدة */
  currentScores?: Record<string, number>; // أعلى درجة لكل اختبار (من نتائج الطالب)
  attemptCount?: number;                  // مجموع المحاولات السابقة (خبرة)
  trackType?: string;                     // نوع المسار الجامعي: صحي/هندسي/حاسب/إداري/عام
  majorRequirements?: string;             // متطلبات التخصص المستهدف الإرشادية (نص)
  /* ── الحالة الجاهزة المقطّرة من Life Engine (ADR-0001 §6) —
     الترتيب الملزِم: Profile → recommendedExams → Life Engine → Duwairb.
     الذكاء يشرح هذا القرار ولا يعيد اشتقاق مرحلة الطالب أو وجهته. ── */
  currentPriority?: { title: string; why: string }; // أولوية Life Engine الحالية (القرار المعتمد)
  focus?: string;                         // تركيز الطالب الأول (تسمية عربية) — ADR §2.6
  retakeIntent?: string[];                // اختبارات اختار إعادتها (من Life Engine، لا من u.gapYear)
  stage?: string;                         // المرحلة الجاهزة (first/second/third/university/graduate)
  goalType?: StudyGoalType;               // توافق مؤقّت: يقرأه «المسار الذهبي» فقط (يُزال معه)
  eduStatus?: string;                     // الحالة التعليمية: ثانوي/جامعي/خريج
  universityYear?: string;                // السنة الدراسية (للجامعي)
  gapYear?: boolean;                      // توافق مؤقّت: يقرأه «المسار الذهبي» فقط (يُزال معه)
  highschoolPct?: number;                 // نسبة الثانوية العامة — لمتطلبات القبول
  /* ── حقول الجامعي (Phase Engine) — لا تُرسَل للثانوي ── */
  universityGpa?: number;                 // المعدل الجامعي من 5
  creditHoursCompleted?: number;          // الساعات المعتمدة المنجزة
  coopDone?: boolean;                     // أنجز التدريب التعاوني/الصيفي
  gradSchoolInterest?: boolean;           // اهتمام بالدراسات العليا
}

/* قاعدة فترة التركيز/الراحة حسب تفضيل الطالب — مصدر واحد يستعمله
   برومبت الجدول (الخادم) ومنشئ اليوم (DayScheduler) فلا يتعارضان. */
export function sessionIntervalRule(len?: number): string {
  if (len === 25) return "25 دقيقة تركيز + 5 راحة (بومودورو قصير)";
  if (len === 45) return "45 دقيقة تركيز + 10 راحة";
  if (len === 60) return "60 دقيقة تركيز + 12 راحة";
  if (len === 90) return "90 دقيقة تركيز + 18 راحة (جلسة عميقة)";
  return "50 دقيقة تركيز + 10 راحة";
}

/* المسار → حقل الدرجة المستهدفة في DarbGoals */
function targetForTrack(id: TrackId, goals: DarbGoals): number | undefined {
  switch (id) {
    case "قدرات":                       return goals.quduratTarget;
    case "تحصيلي": case "تحصيلي مبكر":   return goals.tahsiliTarget;
    case "ستيب":                        return goals.stepTarget;
    case "CPC":                         return goals.cpcTarget;
    case "ITC":                         return goals.itcTarget;
    default:                            return undefined; // آيلتس/توفل/دوليقو — لا هدف رقمي مخزّن
  }
}

/* تسمية التركيز الأول (ADR §2.6) — تطابق خيارات التسجيل حرفياً */
const FOCUS_LABEL: Record<string, string> = {
  qudurat: "تحسين القدرات", tahsili: "تحسين التحصيلي", english: "اللغة الإنجليزية",
  university: "القبول الجامعي", programs: "البرامج",
};

/* رقم عربي للعرض في الواجهة */
const ar = (n: number) => n.toLocaleString("ar");

/* ── يبني ملف دويرب من التخزين (عميل فقط) ── */
export function buildDuwairbProfile(): { profile: DuwairbProfile; goalLine: string | null; personalized: boolean } {
  const u = loadUser();
  if (!u) return { profile: {}, goalLine: null, personalized: false };

  const stats = loadStats();
  const prefs = loadPrefs();
  const goals = loadGoals();
  /* الحالة الجاهزة المقطّرة من العقل — Profile → recommendedExams → Life Engine → Duwairb.
     دويرب لا يفسّر مرحلة الطالب/وجهته؛ يستقبلها مقرّرةً ويشرحها فقط. */
  const state = duwairbState();
  /* توافق مؤقّت: قائمة الاختبارات (اسم/هدف/أيام) ما زالت تُبنى من activeTracks —
     وهي View مادّي مشتقّ من recommendedExams عند التسجيل. تُصنَّف دَيناً تقنياً في التقرير. */
  const ids = (u.activeTracks?.length ? u.activeTracks : (u.track ? [u.track] : [])) as TrackId[];
  const trackDates = loadTrackExamDates();

  /* الاختبارات النشطة مع الهدف والأيام المتبقية */
  const exams: DuwairbExam[] = ids.map((id) => {
    const t = getTrack(id);
    const target = targetForTrack(id, goals);
    const dateStr = trackDates[id] ?? u.examDate ?? null;
    const days = daysUntil(dateStr);
    return { name: t.title, ...(target != null ? { target } : {}), ...(days != null && days >= 0 ? { days } : {}) };
  });

  /* أقوى/أحوج مادة + الجاهزية — من تقدّم المهارات */
  const skillIds = skillsForTracks(ids).map((sk) => sk.id);
  const progress = loadSkillProgress();
  const rated = skillIds
    .filter((id) => progress[id])
    .map((id) => ({ name: SKILL_BY_ID.get(id)?.name ?? id, score: progress[id].masteryScore }))
    .sort((a, b) => b.score - a.score);
  const avg = rated.length ? overallStats(progress, skillIds).avgScore : 0;
  const readiness = estimateReadiness(stats, avg);

  /* درجات الاختبارات السابقة وعدد المحاولات */
  const scoreMap = currentScoreMap();
  const currentScores = Object.keys(scoreMap).length
    ? Object.fromEntries(Object.entries(scoreMap).map(([k, v]) => [k, v.score]))
    : undefined;
  const attemptCount = Object.values(scoreMap).reduce((s, v) => s + v.attempts, 0) || undefined;

  /* متطلبات التخصص المستهدف الإرشادية (من مصدر الجامعات الواحد) */
  const major = findMajor(goals.majorId);
  const majorRequirements = major && requirementsText(major.requirements)
    ? requirementsText(major.requirements)
    : undefined;

  const profile: DuwairbProfile = {
    name: u.name || undefined,
    exams: exams.length ? exams : undefined,
    university: goals.university || undefined,
    major: goals.major || undefined,
    grade: u.grade || undefined,
    studyHours: u.studyHours || undefined,
    preferredTime: prefs.studyTime || undefined,
    sessionLen: prefs.sessionLen || undefined,
    learningStyles: prefs.learningStyle?.length ? prefs.learningStyle : undefined,
    device: prefs.device || undefined,
    strongest: rated[0]?.name,
    weakest: rated.length > 1 ? rated[rated.length - 1].name : undefined,
    readinessPct: rated.length || (stats.trackProgress ?? 0) > 0 ? readiness.pct : undefined,
    readinessLabel: rated.length || (stats.trackProgress ?? 0) > 0 ? readiness.label : undefined,
    currentScores,
    attemptCount,
    trackType: u.trackType || undefined,
    majorRequirements,
    /* الحالة الجاهزة من Life Engine (يشرحها الذكاء، لا يعيد قرارها) */
    currentPriority: state.currentPriority
      ? { title: state.currentPriority.title, why: state.currentPriority.why }
      : undefined,
    focus: state.focus ? (FOCUS_LABEL[state.focus] ?? state.focus) : undefined,
    retakeIntent: state.retakeIntent.length ? state.retakeIntent : undefined,
    stage: state.stage,
    goalType: u.goal || undefined, // توافق مؤقّت: يقرأه «المسار الذهبي» فقط
    eduStatus: u.studyLevel || undefined,
    universityYear: u.universityYear || undefined,
    gapYear: u.gapYear || undefined,
    highschoolPct: goals.highschoolPct ?? undefined,
    /* حقول الجامعي — تُرسَل فقط للجامعي (لا تلوّث ملف الثانوي) */
    universityGpa: u.studyLevel === "جامعي" ? u.universityGpa ?? undefined : undefined,
    creditHoursCompleted: u.studyLevel === "جامعي" ? u.creditHoursCompleted ?? undefined : undefined,
    coopDone: u.studyLevel === "جامعي" ? u.coopDone ?? undefined : undefined,
    gradSchoolInterest: u.studyLevel === "جامعي" ? u.gradSchoolInterest ?? undefined : undefined,
  };

  /* جملة الهدف للواجهة — أولوية للاختبار صاحب الهدف الأقرب موعداً */
  const goalLine = buildGoalLine(profile);

  const personalized = Boolean(
    profile.exams?.some((e) => e.target != null) ||
    profile.university || profile.major || profile.studyHours ||
    profile.preferredTime || profile.learningStyles || profile.strongest ||
    profile.trackType || profile.currentScores || profile.majorRequirements ||
    profile.currentPriority || profile.focus || profile.eduStatus,
  );

  return { profile, goalLine, personalized };
}

/* جملة عربية تذكّر الطالب بهدفه — للعرض في الواجهة */
export function buildGoalLine(p: DuwairbProfile): string | null {
  const withTarget = (p.exams ?? []).filter((e) => e.target != null);
  if (withTarget.length) {
    // الأقرب موعداً أولاً (إن توفّرت الأيام)، وإلا الأول
    withTarget.sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
    const e = withTarget[0];
    return `هدفك ${ar(e.target!)} في ${e.name}`;
  }
  if (p.major && p.university) return `هدفك ${p.major} في ${p.university}`;
  if (p.major) return `هدفك دخول ${p.major}`;
  if (p.university) return `وجهتك ${p.university}`;
  return null;
}

/* ── منسّق نص يُحقن في برومبت النظام (نقي — يعمل على الخادم) ──
   يستقبل ملفاً مُقيَّداً (يُنظَّف على الخادم قبل الاستدعاء). يعيد "" إن لا بيانات.
   يتفرع حسب المرحلة: الجامعي يحصل على حقله الخاص + حظر صريح لمفاهيم القياس/القبول. */
export function formatProfileBlock(p: DuwairbProfile): string {
  const isUni = p.eduStatus === "جامعي";
  const lines: string[] = [];

  if (p.name) lines.push(`- الاسم: ${p.name}`);
  if (p.eduStatus) lines.push(`- الحالة التعليمية: ${p.eduStatus}${p.universityYear ? ` (السنة ${p.universityYear})` : ""}`);

  /* أولوية Life Engine — القرار المعتمد الذي يشرحه الذكاء (لا يعيد اشتقاقه). مشتركة للمرحلتين. */
  if (p.currentPriority) {
    lines.push(`- أولوية الطالب الآن (قرار Life Engine المعتمد — اشرحها وابنِ عليها، لا تُعِد تحليل مرحلته من الصفر): ${p.currentPriority.title}${p.currentPriority.why ? ` — ${p.currentPriority.why}` : ""}`);
  }

  if (isUni) {
    /* ── الجامعي: عالم المعدل / التدريب / المشاريع / سوق العمل ── */
    if (p.university || p.major) {
      lines.push(`- الجامعة والتخصص: ${[p.major, p.university].filter(Boolean).join(" — ")}`);
    }
    if (p.universityGpa != null) lines.push(`- المعدل الجامعي الحالي: ${p.universityGpa} من 5`);
    if (p.creditHoursCompleted != null) lines.push(`- الساعات المعتمدة المنجزة: ${p.creditHoursCompleted}`);
    if (p.coopDone != null) {
      lines.push(`- التدريب التعاوني/الصيفي: ${p.coopDone ? "أنجزه ✓" : "لم ينجزه بعد — أولوية قريبة"}`);
    }
    if (p.gradSchoolInterest) {
      lines.push(`- الاهتمام بالدراسات العليا: نعم — وجّه توصياتك للتميّز الأكاديمي والبحث العلمي`);
    }
    if (p.studyHours != null) lines.push(`- ساعات الدراسة المتاحة يومياً: ${p.studyHours}`);
    if (p.preferredTime || p.sessionLen != null) {
      const t = [p.preferredTime ? `الوقت المفضّل ${p.preferredTime}` : "", p.sessionLen != null ? `مدة الجلسة ${p.sessionLen} دقيقة` : ""].filter(Boolean).join("، ");
      lines.push(`- نمط الدراسة: ${t}`);
    }
    if (p.learningStyles?.length) lines.push(`- أسلوب التعلّم المفضّل: ${p.learningStyles.join("، ")}`);
    if (p.device) lines.push(`- الجهاز: ${p.device}`);
    if (p.readinessPct != null) lines.push(`- مستوى الأداء الأكاديمي المقدّر: ${p.readinessPct}٪`);

    if (!lines.length) return "";
    return `معلومات الطالب الجامعي (خصّص ردّك بناءً عليها):
${lines.join("\n")}

حكم أساسي لا استثناء فيه: هذا الطالب جامعي — لا تذكر أبداً القدرات أو التحصيلي أو الموزونة أو القبول الجامعي أو فرص القبول. مرحلة القياس والقبول انتهت وانقضت. ركّز فقط على: المعدل الجامعي، التدريب، المشاريع، الشهادات المهنية، المهارات، وسوق العمل.
لا تعرض هذه المعلومات كقائمة للطالب — وظّفها داخل صياغة ردّك فقط.`;
  }

  /* ── الثانوي والخريج: عالم القياس والمدرسة والقبول ── */
  if (p.focus) lines.push(`- تركيزه الأول المختار: ${p.focus} (رتّب توصيتك حوله دون تغيير وجهته)`);
  if (p.retakeIntent?.length) lines.push(`- اختار إعادة: ${p.retakeIntent.join("، ")} — ارفع أولوية الاستعداد لها`);

  if (p.exams?.length) {
    const exStr = p.exams.map((e) => {
      const bits = [e.name];
      if (e.target != null) bits.push(`الهدف ${e.target}`);
      if (e.days != null) bits.push(`باقٍ ${e.days} يوماً`);
      return bits.join(" — ");
    }).join("؛ ");
    lines.push(`- الاختبارات وأهدافها: ${exStr}`);
  }
  if (p.university || p.major) {
    lines.push(`- الوجهة الجامعية: ${[p.major, p.university].filter(Boolean).join(" — ")}`);
  }
  if (p.majorRequirements) {
    lines.push(`- متطلبات هذا التخصص الإرشادية: ${p.majorRequirements} (اربط توصياتك بها صراحةً، مثل «بما أن ${p.major ?? "تخصصك"} يتطلب قدرات مرتفع، ركّز على...»)`);
  }
  if (p.grade) lines.push(`- الصف: ${p.grade}`);
  if (p.studyHours != null) lines.push(`- ساعات المذاكرة المتاحة يومياً: ${p.studyHours}`);
  if (p.preferredTime || p.sessionLen != null) {
    const t = [p.preferredTime ? `الوقت المفضّل ${p.preferredTime}` : "", p.sessionLen != null ? `مدة الجلسة ${p.sessionLen} دقيقة` : ""].filter(Boolean).join("، ");
    lines.push(`- نمط المذاكرة: ${t}`);
  }
  if (p.learningStyles?.length) lines.push(`- أسلوب التعلّم المفضّل: ${p.learningStyles.join("، ")}`);
  if (p.device) lines.push(`- جهاز المذاكرة: ${p.device}`);
  if (p.strongest || p.weakest) {
    const s = [p.strongest ? `أقوى مادة ${p.strongest}` : "", p.weakest ? `أحوج مادة لتقوية ${p.weakest}` : ""].filter(Boolean).join("، ");
    lines.push(`- المهارات: ${s}`);
  }
  if (p.readinessPct != null) lines.push(`- الجاهزية المقدّرة: ${p.readinessPct}٪${p.readinessLabel ? ` (${p.readinessLabel})` : ""}`);
  if (p.trackType) lines.push(`- التخصص المستهدف: ${p.trackType}`);
  if (p.attemptCount) lines.push(`- محاولات اختبارات سابقة: ${p.attemptCount}`);
  if (p.currentScores && Object.keys(p.currentScores).length) {
    const scStr = Object.entries(p.currentScores).map(([k, v]) => `${k} ${v}`).join("، ");
    lines.push(`- أعلى درجات سابقة: ${scStr}`);
  }

  if (!lines.length) return "";
  return `معلومات الطالب (استخدمها لتخصيص ردّك ضمنياً؛ اربط اقتراحك بأولويته الحالية أعلاه، مثل «بما أن أولويتك الآن ... فإن ...»):
${lines.join("\n")}

مهم: أولوية Life Engine أعلاه هي القرار المعتمد — اشرحها وابنِ عليها ولا تُعِد استنتاج مرحلته أو وجهته. لا تعرض هذه المعلومات كقائمة للطالب ولا تكررها حرفياً؛ وظّفها داخل صياغة ردّك فقط.`;
}

/* ── التبويب المقترح حسب الصفحة (وعي بالسياق) ── */
export function suggestedTabForPath(pathname: string): DuwairbTab | "menu" {
  if (pathname.startsWith("/vault"))   return "explain";
  if (pathname.startsWith("/roadmap")) return "schedule";
  if (pathname.startsWith("/review"))  return "quiz";
  if (pathname.startsWith("/orbit"))   return "progress";
  if (pathname.startsWith("/profile")) return "progress";
  return "menu";
}

/* جملة اقتراح تظهر فوق الهَب حسب الصفحة */
export function contextHintForPath(pathname: string): string | null {
  if (pathname.startsWith("/vault"))   return "أنت في خزنة الأخطاء — جرّب «اشرح» لفهم أخطائك.";
  if (pathname.startsWith("/roadmap")) return "أنت في خريطتك — دع دويرب يخطّط أسبوعك.";
  if (pathname.startsWith("/review"))  return "أنت في المراجعة — ولّد أسئلة تدريب سريعة.";
  if (pathname.startsWith("/orbit"))   return "بعد جلستك — اطلب تحليل تقدّمك ونصيحة اليوم.";
  if (pathname.startsWith("/profile")) return "حلّل تقدّمك واعرف جاهزيتك لهدفك.";
  return null;
}
