/* ─── محرّك استراتيجية المذاكرة (Study Strategy Engine) ───
   مصدر القرار الموحّد للتخطيط. كل نظام (دويرب، منشئ اليوم، الخريطة،
   تحليل التقدّم، المدرّب الأسبوعي، التقارير) يستهلك نفس كائن الاستراتيجية
   فيحصل الطالب على نفس التوجيه في كل مكان.

   التصميم: دالة نقية واحدة buildStrategy(inputs) → StudyStrategy.
   نفس المدخلات ⇒ نفس المخرجات (حتمية)، فالعميل والخادم يتّفقان دائماً.

   getStrategy() (عميل فقط) يجمع المدخلات من التخزين الموجود — لا تخزين مكرّر:
   يعيد استخدام buildDuwairbProfile (الجاهزية/الهدف/الأقوى/الأحوج) + التفضيلات. */
import { loadPrefs, type DarbPrefs } from "./storage";
import { buildDuwairbProfile, sessionIntervalRule, type DuwairbProfile } from "./duwairb";
import { loadUser } from "./storage";
import { subjectsForTracks, type TrackId } from "./tracks";

/* ── أنواع القرار ── */
export type StudyIntensity = "light" | "moderate" | "intensive";
export type SubjectAllocation = "single" | "parallel" | "rotating";
export type ReviewFrequency = "daily" | "everyOtherDay" | "twiceWeek" | "weekly";
export type CalendarStatus = "دراسة" | "إجازة" | "اختبارات";
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
  const readinessPct = inp.readinessPct ?? null;
  const targetScore = inp.targetScore ?? null;
  const studyHours = inp.studyHours ?? null;
  const vacation = inp.vacationMode === true;

  const studyDaysPerWeek = clamp(Math.round(inp.studyDaysPerWeek ?? (vacation ? 6 : 5)), 1, 7);

  /* حالة التقويم الأكاديمي: إجازة (تفضيل) ← اختبارات (قرب الموعد) ← دراسة */
  const calendarStatus: CalendarStatus =
    vacation ? "إجازة" : (daysToExam != null && daysToExam <= 14 ? "اختبارات" : "دراسة");

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
  if (daysToExam != null && daysToExam <= 7) intensity = "intensive"; // الاختبار وشيك — لا تهاون

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
  const perDay = studyHours ?? (intensity === "intensive" ? 4 : intensity === "moderate" ? 2.5 : 1.5);
  const weeklyHoursTotal = Math.round(perDay * studyDaysPerWeek);
  const weightFor = (name: string) =>
    name === inp.weakest ? 1.6 : name === inp.strongest ? 0.8 : 1.0;
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

  /* مبرّر شفّاف يربط القرار بالمدخلات */
  const bits: string[] = [];
  if (daysToExam != null) bits.push(`${daysToExam} يوماً للاختبار`);
  if (readinessPct != null) bits.push(`جاهزية ${readinessPct}٪`);
  if (studyHours != null) bits.push(`${studyHours} ساعات يومياً`);
  if (vacation) bits.push("وضع الإجازة");
  const rationale = bits.length
    ? `بُنيت على: ${bits.join("، ")}.`
    : "ابدأ بإيقاع خفيف حتى نتعرّف على بياناتك ونرفع التوصية.";

  return {
    intensity, allocation, weeklyHoursTotal, perSubject, reviewFrequency, session,
    studyDaysPerWeek, preferredTime: inp.preferredTime, transitionRule, calendarStatus,
    daysToExam, targetScore, readinessPct, weakest: inp.weakest, strongest: inp.strongest,
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
): StudyStrategy {
  const exam = nearestExam(profile);
  return buildStrategy({
    targetScore: exam?.target ?? null,
    daysToExam: exam?.days ?? null,
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
  });
}

/* ── المُجمِّع العميلي: مصدر الحقيقة الواحد للواجهة ── */
export function getStrategy(): StudyStrategy {
  const { profile } = buildDuwairbProfile();
  const prefs: DarbPrefs = loadPrefs();
  const u = loadUser();
  const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
  const subjects = subjectsForTracks(ids.length ? ids : (["تحصيلي"] as TrackId[])).map((s) => s.name);
  return strategyFromProfile(
    profile,
    { studyDays: prefs.studyDays, vacationMode: prefs.vacationMode, subjectFocus: prefs.subjectFocus },
    subjects,
  );
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
  const lines = [
    `- الكثافة: ${s.labels.intensity}`,
    `- توزيع المواد: ${s.labels.allocation}`,
    `- إجمالي الساعات الأسبوعية: ${s.weeklyHoursTotal} ساعة على ${s.studyDaysPerWeek} أيام`,
    s.perSubject.length ? `- ساعات كل مادة أسبوعياً: ${alloc}` : "",
    `- بنية الجلسة: ${s.session.label}`,
    `- تكرار المراجعة: ${s.labels.review}`,
    `- قاعدة الانتقال: ${s.transitionRule}`,
    s.preferredTime ? `- وقت المذاكرة المفضّل: ${s.preferredTime}` : "",
  ].filter(Boolean);
  return `استراتيجية المذاكرة المعتمدة لهذا الطالب (هي مصدر القرار الموحّد — التزم بها حرفياً ولا تقترح كثافة أو توزيعاً مختلفاً):
${lines.join("\n")}`;
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
