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
import { getTrack, type TrackId } from "./tracks";

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

/* رقم عربي للعرض في الواجهة */
const ar = (n: number) => n.toLocaleString("ar");

/* ── يبني ملف دويرب من التخزين (عميل فقط) ── */
export function buildDuwairbProfile(): { profile: DuwairbProfile; goalLine: string | null; personalized: boolean } {
  const u = loadUser();
  if (!u) return { profile: {}, goalLine: null, personalized: false };

  const stats = loadStats();
  const prefs = loadPrefs();
  const goals = loadGoals();
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
  };

  /* جملة الهدف للواجهة — أولوية للاختبار صاحب الهدف الأقرب موعداً */
  const goalLine = buildGoalLine(profile);

  const personalized = Boolean(
    profile.exams?.some((e) => e.target != null) ||
    profile.university || profile.major || profile.studyHours ||
    profile.preferredTime || profile.learningStyles || profile.strongest ||
    profile.trackType || profile.currentScores,
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
   يستقبل ملفاً مُقيَّداً (يُنظَّف على الخادم قبل الاستدعاء). يعيد "" إن لا بيانات. */
export function formatProfileBlock(p: DuwairbProfile): string {
  const lines: string[] = [];
  if (p.name) lines.push(`- الاسم: ${p.name}`);

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
  return `معلومات الطالب (استخدمها لتخصيص ردّك ضمنياً؛ واربط اقتراحك بهدفه عند المناسبة، مثل «بما أن هدفك ... فإن ...»):
${lines.join("\n")}

مهم: لا تعرض هذه المعلومات كقائمة للطالب ولا تكررها حرفياً؛ وظّفها داخل صياغة ردّك فقط ليبدو مفصّلاً له شخصياً.`;
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
