/* ─── محرّك استراتيجية المذاكرة (Study Strategy Engine) ───
   مصدر القرار الموحّد للتخطيط. كل نظام (دويرب، منشئ اليوم، الخريطة،
   تحليل التقدّم، المدرّب الأسبوعي، التقارير) يستهلك نفس كائن الاستراتيجية
   فيحصل الطالب على نفس التوجيه في كل مكان.

   التصميم: دالة نقية واحدة buildStrategy(inputs) → StudyStrategy.
   نفس المدخلات ⇒ نفس المخرجات (حتمية)، فالعميل والخادم يتّفقان دائماً.

   getStrategy() (عميل فقط) يجمع المدخلات من التخزين الموجود — لا تخزين مكرّر:
   يعيد استخدام buildDuwairbProfile (الجاهزية/الهدف/الأقوى/الأحوج) + التفضيلات. */
import { loadPrefs, loadCalendarConfig, loadTrackExamDates, loadGoals, type DarbPrefs } from "./storage";
import { buildDuwairbProfile, sessionIntervalRule, type DuwairbProfile } from "./duwairb";
import { loadUser } from "./storage";
import { subjectsForTracks, type TrackId } from "./tracks";
import { resolveCalendar, calendarSignals, type CalendarSignals, type CalendarConfig } from "./academicCalendar";
import { findMajor, type MajorCategory } from "./university";
import { loadGoldenPath, priorityFocusSubjects } from "./goldenPath";

/* ── أنواع القرار ── */
export type StudyIntensity = "light" | "moderate" | "intensive";
export type SubjectAllocation = "single" | "parallel" | "rotating";
export type ReviewFrequency = "daily" | "everyOtherDay" | "twiceWeek" | "weekly";
export type CalendarStatus = "دراسة" | "إجازة" | "اختبارات" | "اختبارات مدرسية";
export type AllocationPref = "auto" | SubjectAllocation;

export interface SubjectWeeklyHours { name: string; hoursPerWeek: number; }

export interface SessionStructure { focusMin: number; breakMin: number; label: string; }

export interface StudyStrategy {
  intensity: StudyIntensity;
  allocation: SubjectAllocation;
  weeklyHoursTotal: number;
  perSubject: SubjectWeeklyHours[];
  reviewFrequency: ReviewFrequency;
  session: SessionStructure;
  studyDaysPerWeek: number;
  preferredTime?: string;
  transitionRule: string;
  calendarStatus: CalendarStatus;
  daysToExam: number | null;
  weeksToExam: number | null;
  onVacation: boolean;
  inSchoolFinals: boolean;
  schoolFinalsNote?: string;       // إرشاد عند فترة الاختبارات المدرسية
  targetScore: number | null;
  readinessPct: number | null;
  weakest?: string;
  strongest?: string;
  rationale: string;
  labels: { intensity: string; allocation: string; review: string };
}

/* ── مدخلات المحرّك (كلها مشتقّة من بيانات موجودة) ── */
export interface StrategyInputs {
  targetScore?: number | null;
  daysToExam?: number | null;
  readinessPct?: number | null;
  studyHours?: number | null;          // ساعات يومياً
  preferredTime?: string;
  sessionLen?: number;
  subjects: string[];                  // أسماء المواد النشطة
  weakest?: string;
  strongest?: string;
  studyDaysPerWeek?: number | null;
  vacationMode?: boolean;
  allocationOverride?: AllocationPref;
  /* إشارات التقويم الدراسي (تُحقن من academicCalendar — عميل وخادم) */
  onVacation?: boolean;
  inSchoolFinals?: boolean;
  /* تعزيز التخصص الجامعي — يرفع وزن المواد ذات الصلة تلقائياً */
  majorCategory?: MajorCategory;
  /* بؤرة المسار الذهبي — ترفع مواد الأولوية الحالية وتخفّض مواد المسارات الموقوفة */
  priorityFocus?: { boost: string[]; suppress: string[] };
}

/* تفضيلات التخطيط القابلة للضبط — تُخزَّن في DarbPrefs */
export interface PlanningPrefs {
  studyDays?: number;
  vacationMode?: boolean;
  subjectFocus?: AllocationPref;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

/* بنية الجلسة من مدة التفضيل (تعيد استخدام sessionIntervalRule للنص العربي) */
export function sessionStructure(len?: number): SessionStructure {
  const map: Record<number, { focusMin: number; breakMin: number }> = {
    25: { focusMin: 25, breakMin: 5 },
    45: { focusMin: 45, breakMin: 10 },
    60: { focusMin: 60, breakMin: 12 },
    90: { focusMin: 90, breakMin: 18 },
  };
  const s = (len && map[len]) || { focusMin: 50, breakMin: 10 };
  return { ...s, label: sessionIntervalRule(len) };
}

const INTENSITY_LABEL: Record<StudyIntensity, string> = {
  light: "خفيفة", moderate: "متوازنة", intensive: "مكثّفة",
};
const ALLOCATION_LABEL: Record<SubjectAllocation, string> = {
  single: "مادة واحدة حتى الإتقان", parallel: "مادتان بالتوازي", rotating: "تدوير على كل المواد",
};
const REVIEW_LABEL: Record<ReviewFrequency, string> = {
  daily: "يومياً", everyOtherDay: "يوم بعد يوم", twiceWeek: "مرتين بالأسبوع", weekly: "أسبوعياً",
};
const TRANSITION_RULE: Record<SubjectAllocation, string> = {
  single: "أتقن المادة الحالية (إتقان ≥ ٨٠٪ أو إنهاء وحدتها) قبل الانتقال للتالية — ابدأ بأضعف مادة.",
  parallel: "اشتغل على مادتين بالتوازي وبدّل بينهما بين الجلسات، وانتقل لمادة جديدة عند إنهاء وحدة كاملة.",
  rotating: "دوّر على كل موادك خلال الأسبوع ولا تترك أي مادة أكثر من يومين بلا مراجعة — ابدأ يومك بالأحوج.",
};

/* ════════ المحرّك النقي ════════ */
export function buildStrategy(inp: StrategyInputs): StudyStrategy {
  const subjects = inp.subjects.filter(Boolean);
  const daysToExam = inp.daysToExam ?? null;
  const weeksToExam = daysToExam != null ? Math.ceil(daysToExam / 7) : null;
  const readinessPct = inp.readinessPct ?? null;
  const targetScore = inp.targetScore ?? null;
  const studyHours = inp.studyHours ?? null;
  /* إجازة = تفضيل يدوي أو إجازة فعلية في التقويم */
  const vacation = inp.vacationMode === true || inp.onVacation === true;
  const schoolFinals = inp.inSchoolFinals === true;
  /* اختبار قياس وشيك يتجاوز تخفيف الاختبارات المدرسية */
  const qiyasImminent = daysToExam != null && daysToExam <= 14;

  const studyDaysPerWeek = clamp(Math.round(inp.studyDaysPerWeek ?? (vacation ? 6 : 5)), 1, 7);

  /* ١) الكثافة — مزيج إلحاح الموعد + عجز الجاهزية + الطاقة المتاحة */
  let score = 0;
  if (daysToExam != null) {
    if (daysToExam <= 14) score += 3;
    else if (daysToExam <= 30) score += 2;
    else if (daysToExam <= 60) score += 1;
  }
  if (readinessPct != null) {
    if (readinessPct < 40) score += 2;
    else if (readinessPct < 60) score += 1;
  }
  const hrs = studyHours ?? 0;
  if (hrs >= 5) score += 2; else if (hrs >= 3) score += 1;
  if (vacation) score += 1;

  let intensity: StudyIntensity = score >= 4 ? "intensive" : score >= 2 ? "moderate" : "light";
  /* (٣) قاعدة التقويم: أقل من ٣٠ يوماً على الاختبار ⇒ مكثّفة تلقائياً */
  if (daysToExam != null && daysToExam <= 30) intensity = "intensive";
  /* (٤) فترة اختبارات مدرسية بلا اختبار قياس وشيك ⇒ خفِّف على قياس */
  if (schoolFinals && !qiyasImminent && intensity === "intensive") intensity = "moderate";

  /* حالة التقويم: اختبارات مدرسية ← اختبار قياس قريب ← إجازة ← دراسة */
  const calendarStatus: CalendarStatus =
    schoolFinals && !qiyasImminent ? "اختبارات مدرسية" :
    (daysToExam != null && daysToExam <= 14 ? "اختبارات" :
    (vacation ? "إجازة" : "دراسة"));

  /* ٢) توزيع المواد */
  let allocation: SubjectAllocation;
  const override = inp.allocationOverride;
  if (override && override !== "auto") {
    allocation = override;
  } else if (subjects.length <= 1) {
    allocation = "single";
  } else if (daysToExam != null && daysToExam <= 30) {
    allocation = "rotating";            // قرب الاختبار: أبقِ كل المواد حيّة
  } else if (intensity === "light") {
    allocation = "single";              // مبكّر ومرتاح: أتقن مادة مادة
  } else {
    allocation = "parallel";
  }

  /* ٣) ساعات أسبوعية إجمالية وتوزيعها على المواد (الأحوج يأخذ أكثر) */
  const basePerDay = studyHours ?? (intensity === "intensive" ? 4 : intensity === "moderate" ? 2.5 : 1.5);
  /* (٢) في الإجازة: ارفع الساعات المقترحة تلقائياً (+٣٠٪)
     (٤) في الاختبارات المدرسية بلا قياس وشيك: خفّض ساعات قياس (لصالح المدرسة) */
  const vacationBoost = vacation ? 1.3 : 1;
  const schoolFinalsCut = schoolFinals && !qiyasImminent ? 0.55 : 1;
  const perDay = basePerDay * vacationBoost * schoolFinalsCut;
  const weeklyHoursTotal = Math.round(perDay * studyDaysPerWeek);
  /* أوزان تعزيز التخصص الجامعي — تُضاف فوق weakest/strongest */
  const majorBoost = majorSubjectBoost(inp.majorCategory);
  /* بؤرة المسار الذهبي: رفع مواد الأولوية، خفض مواد المسارات الموقوفة */
  const boostSet = new Set(inp.priorityFocus?.boost ?? []);
  const suppressSet = new Set(inp.priorityFocus?.suppress ?? []);
  const weightFor = (name: string) => {
    const base = name === inp.weakest ? 1.6 : name === inp.strongest ? 0.8 : 1.0;
    const focus = boostSet.has(name) ? 1.5 : suppressSet.has(name) ? 0.35 : 1.0;
    return base * (majorBoost[name] ?? 1.0) * focus;
  };
  const sumW = subjects.reduce((s, n) => s + weightFor(n), 0) || 1;
  const perSubject: SubjectWeeklyHours[] = subjects.map((name) => ({
    name,
    hoursPerWeek: round1((weeklyHoursTotal * weightFor(name)) / sumW),
  }));

  /* ٤) تكرار المراجعة */
  let reviewFrequency: ReviewFrequency;
  if (intensity === "intensive" || (daysToExam != null && daysToExam <= 21)) reviewFrequency = "daily";
  else if (intensity === "moderate") reviewFrequency = "everyOtherDay";
  else reviewFrequency = "twiceWeek";

  /* ٥) بنية الجلسة */
  const session = sessionStructure(inp.sessionLen);

  /* ٦) قاعدة الانتقال */
  const transitionRule = TRANSITION_RULE[allocation];

  /* إرشاد فترة الاختبارات المدرسية */
  const schoolFinalsNote = schoolFinals && !qiyasImminent
    ? "أنت في فترة اختباراتك المدرسية — قدّمها الآن وخفّفنا تركيز قياس مؤقتاً، ونعود للإيقاع الكامل بعدها."
    : schoolFinals && qiyasImminent
    ? "لديك اختبارات مدرسية واختبار قياس قريب معاً — وازِن بينهما وأعطِ الأقرب موعداً الأولوية."
    : undefined;

  /* مبرّر شفّاف يربط القرار بالمدخلات والتقويم */
  const bits: string[] = [];
  if (daysToExam != null) bits.push(`${weeksToExam} أسبوع للاختبار`);
  if (readinessPct != null) bits.push(`جاهزية ${readinessPct}٪`);
  if (studyHours != null) bits.push(`${studyHours} ساعات يومياً`);
  if (vacation) bits.push("إجازة (ساعات أعلى)");
  if (schoolFinals) bits.push("اختبارات مدرسية");
  const rationale = bits.length
    ? `بُنيت على: ${bits.join("، ")}.`
    : "ابدأ بإيقاع خفيف حتى نتعرّف على بياناتك ونرفع التوصية.";

  return {
    intensity, allocation, weeklyHoursTotal, perSubject, reviewFrequency, session,
    studyDaysPerWeek, preferredTime: inp.preferredTime, transitionRule, calendarStatus,
    daysToExam, weeksToExam, onVacation: vacation, inSchoolFinals: schoolFinals, schoolFinalsNote,
    targetScore, readinessPct, weakest: inp.weakest, strongest: inp.strongest,
    rationale,
    labels: {
      intensity: INTENSITY_LABEL[intensity],
      allocation: ALLOCATION_LABEL[allocation],
      review: REVIEW_LABEL[reviewFrequency],
    },
  };
}

/* ── أقرب اختبار له موعد (الأصغر أياماً) — يحدّد الإلحاح والهدف ── */
function nearestExam(profile: DuwairbProfile): { target?: number; days?: number } | null {
  const withDays = (profile.exams ?? []).filter((e) => e.days != null);
  if (!withDays.length) {
    const withTarget = (profile.exams ?? []).find((e) => e.target != null);
    return withTarget ? { target: withTarget.target } : null;
  }
  withDays.sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
  return { target: withDays[0].target, days: withDays[0].days };
}

/* ── يبني الاستراتيجية من ملف دويرب + تفضيلات التخطيط ──
   نقيّة: يستعملها العميل (ملف حيّ) والخادم (ملف مُنظَّف) بنفس المنطق. */
export function strategyFromProfile(
  profile: DuwairbProfile,
  planning: PlanningPrefs | undefined,
  subjects: string[],
  calendar?: CalendarSignals,
  majorCategory?: MajorCategory,
  priorityFocus?: { boost: string[]; suppress: string[] },
): StudyStrategy {
  const exam = nearestExam(profile);
  /* موعد الطالب المسجّل له الأولوية؛ وإلا نافذة التقويم التقديرية */
  const daysToExam = exam?.days ?? calendar?.daysToNextExam ?? null;
  return buildStrategy({
    targetScore: exam?.target ?? null,
    daysToExam,
    readinessPct: profile.readinessPct ?? null,
    studyHours: profile.studyHours ?? null,
    preferredTime: profile.preferredTime,
    sessionLen: profile.sessionLen,
    subjects,
    weakest: profile.weakest,
    strongest: profile.strongest,
    studyDaysPerWeek: planning?.studyDays ?? null,
    vacationMode: planning?.vacationMode,
    allocationOverride: planning?.subjectFocus,
    onVacation: calendar?.onVacation,
    inSchoolFinals: calendar?.inSchoolFinals,
    majorCategory,
    priorityFocus,
  });
}

/* ── يقرأ تقويم الطالب من التخزين ويُرجع اللقطة الكاملة (للواجهة) ── */
export function currentCalendarSnapshot() {
  const cfg = loadCalendarConfig<CalendarConfig>();
  return resolveCalendar(new Date(), { examDates: loadTrackExamDates(), config: cfg });
}

/* ── يقرأ تقويم الطالب من التخزين ويُرجع إشارات الاستراتيجية ── */
export function currentCalendarSignals(): CalendarSignals {
  return calendarSignals(currentCalendarSnapshot());
}

/* ── المُجمِّع العميلي: مصدر الحقيقة الواحد للواجهة ── */
export function getStrategy(): StudyStrategy {
  const { profile } = buildDuwairbProfile();
  const prefs: DarbPrefs = loadPrefs();
  const u = loadUser();
  const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
  const subjects = subjectsForTracks(ids.length ? ids : (["تحصيلي"] as TrackId[])).map((s) => s.name);
  /* التخصص يُضخّ تلقائياً من الأهداف، وإلا من نوع المسار المختار في التسجيل */
  const goals = loadGoals();
  const majorCategory = findMajor(goals.majorId)?.category ?? (u?.trackType as MajorCategory | undefined);
  /* بؤرة المسار الذهبي — تعكس الأولوية الحالية في توزيع ساعات الخطة */
  const gp = loadGoldenPath();
  const priorityFocus = gp.show ? priorityFocusSubjects(gp) : undefined;
  return strategyFromProfile(
    profile,
    { studyDays: prefs.studyDays, vacationMode: prefs.vacationMode, subjectFocus: prefs.subjectFocus },
    subjects,
    currentCalendarSignals(),
    majorCategory,
    priorityFocus,
  );
}

/* ─── تعزيز التخصص الجامعي: يرفع وزن المواد ذات الصلة تلقائياً ───
   الرابط بين university.ts والاستراتيجية — بلا تدخّل المستخدم. */
export function majorSubjectBoost(cat?: MajorCategory): Record<string, number> {
  if (!cat) return {};
  switch (cat) {
    case "صحي":
      return { "كمي": 1.35, "لفظي": 1.15, "أحياء": 1.4, "كيمياء": 1.3, "فيزياء": 1.1 };
    case "هندسي":
      return { "رياضيات": 1.4, "فيزياء": 1.4, "كمي": 1.25 };
    case "حاسب":
      return { "رياضيات": 1.4, "كمي": 1.35, "إنجليزي": 1.2, "قراءة": 1.1 };
    case "إداري":
    case "قانوني":
      return { "لفظي": 1.35, "قراءة": 1.3, "إنجليزي": 1.25, "كمي": 1.1 };
    default:
      return {};
  }
}

/* يقرأ تفضيلات التخطيط فقط (لإرسالها للراوت مع الطلب) */
export function loadPlanningPrefs(): PlanningPrefs {
  const p = loadPrefs();
  return { studyDays: p.studyDays, vacationMode: p.vacationMode, subjectFocus: p.subjectFocus };
}

/* ── نص يُحقن في برومبت النظام (نقي — يعمل على الخادم) ── */
export function formatStrategyBlock(s: StudyStrategy): string {
  const alloc = s.perSubject.length
    ? s.perSubject.map((x) => `${x.name} ${x.hoursPerWeek}`).join("، ")
    : "—";
  const priority = subjectPriorityOrder(s);
  const lines = [
    `- الوضع الدراسي الآن: ${s.calendarStatus}${s.onVacation ? " (إجازة — ساعات أعلى)" : ""}`,
    s.inSchoolFinals ? `- اختبارات مدرسية حالياً: نعم — قدّم المدرسة` : "",
    s.weeksToExam != null ? `- المتبقّي لأقرب اختبار: ${s.weeksToExam} أسبوع تقريباً` : "",
    `- الكثافة: ${s.labels.intensity}`,
    `- توزيع المواد: ${s.labels.allocation}`,
    `- إجمالي الساعات الأسبوعية: ${s.weeklyHoursTotal} ساعة على ${s.studyDaysPerWeek} أيام`,
    s.perSubject.length ? `- ساعات كل مادة أسبوعياً: ${alloc}` : "",
    priority.length > 1 ? `- ترتيب أولوية المواد (الأحوج أولاً): ${priority.join(" ← ")}` : "",
    `- بنية الجلسة: ${s.session.label}`,
    `- تكرار المراجعة: ${s.labels.review}`,
    `- قاعدة الانتقال: ${s.transitionRule}`,
    s.schoolFinalsNote ? `- ملاحظة: ${s.schoolFinalsNote}` : "",
    s.preferredTime ? `- وقت المذاكرة المفضّل: ${s.preferredTime}` : "",
  ].filter(Boolean);
  return `استراتيجية المذاكرة المعتمدة لهذا الطالب (هي مصدر القرار الموحّد — التزم بها حرفياً ولا تقترح كثافة أو توزيعاً مختلفاً):
${lines.join("\n")}`;
}

/* ── ترتيب أولوية المواد حسب الاستراتيجية المعتمدة ──
   يُستهلَك في: منشئ اليوم (DayScheduler) + برومبت دويرب.
   المنطق: الأحوج دائماً أولاً، ثم الأقوى أخيراً لدعم الثقة. */
export function subjectPriorityOrder(strategy: StudyStrategy): string[] {
  if (!strategy.perSubject.length) return [];
  // ترتيب تنازلي بالساعات (الأحوج → الأكثر ساعات → أول قائمة)
  const sorted = [...strategy.perSubject].sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);
  return sorted.map((s) => s.name);
}

/* ── نص عادي مختصر (للتقارير/الإيميل المستقبلي) ── */
export function strategyPlainText(s: StudyStrategy): string {
  return [
    `الكثافة: ${s.labels.intensity}`,
    `التوزيع: ${s.labels.allocation}`,
    `${s.weeklyHoursTotal} ساعة أسبوعياً على ${s.studyDaysPerWeek} أيام`,
    `الجلسة: ${s.session.label}`,
    `المراجعة: ${s.labels.review}`,
  ].join(" · ");
}
