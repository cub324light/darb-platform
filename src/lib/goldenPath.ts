/* ─── المسار الذهبي: محرّك الأولوية الحالية (Golden Path Priority Engine) ───
   مصدر القرار الواحد لـ«أولوية الطالب الآن». يدمج: المرحلة + الصف + الفصل +
   الدرجات مقابل الأهداف + الوقت المتبقي + الجامعة/التخصص، ويُرجِع بؤرة تركيز
   واحدة واضحة + سبباً + ما نوقفه الآن. كل نظام (دويرب، البطاقة، الخطة، الملف)
   يستهلك نفس المخرجات فيتّسق التوجيه في كل مكان.

   التصميم: دالة نقيّة واحدة computeGoldenPath(input) → GoldenPathState.
   بانيان يفوّضان لها: loadGoldenPath() (عميل، من localStorage)
   و goldenPathFromProfile(profile) (خادم، من DuwairbProfile المُنظَّف). */
import { subjectsForTracks, type TrackId } from "./tracks";
import type { DuwairbProfile } from "./duwairb";
import { loadUser, loadGoals, currentScoreMap } from "./storage";
import { buildDuwairbProfile } from "./duwairb";
import { destinationNeedsEnglish } from "./darbKnowledge";
import { n as ar } from "./format";

/* ════════ الأنواع ════════ */
export type SemesterPhase = "أول" | "ثاني" | "صيف";
export type FocusKind = "track" | "school" | "foundation" | "admission";

export interface GoldenFocus { kind: FocusKind; track?: TrackId; label: string; }
export interface GoldenPaused { label: string; reason: string; }
export interface GoldenMilestone { label: string; daysAway?: number | null; }
export interface AdmissionItem { key: string; label: string; done: boolean; value?: string; }

export interface GoldenPathState {
  show: boolean;                 // نعرض البطاقة؟ (لا للجامعي/بلا بيانات)
  phaseId: string;
  phaseLabel: string;            // «ثاني ثانوي — الفصل الأول»
  primary: GoldenFocus;
  secondary?: GoldenFocus;
  paused: GoldenPaused[];
  reason: string;                // جملة دويرب الكاملة (تذكر الدرجات)
  focusTracks: TrackId[];        // مسارات بؤرة التركيز (لترجيح الخطة)
  pausedTracks: TrackId[];       // مسارات موقوفة (لخفض الخطة)
  suggestedActivate: TrackId[];  // مسارات يُقترح تفعيلها (لزر التفعيل)
  nextMilestone?: GoldenMilestone;
  admissionChecklist?: AdmissionItem[];
  englishRecommendation?: string;
}

/* ════════ المدخلات المُوحَّدة ════════ */
export interface GoldenPathInput {
  eduStatus?: string;            // ثانوي/جامعي/خريج
  grade?: string;               // أول/ثاني/ثالث ثانوي
  gapYear?: boolean;            // خريج بسنة استدراك
  uniDest?: boolean;            // الوجهة جامعية (مشتقّة من targets/الوجهة — لا goal)
  semester: SemesterPhase;
  onVacation: boolean;
  scores: { qudurat?: number; tahsili?: number; step?: number; highschool?: number };
  targets: { qudurat?: number; tahsili?: number; step?: number };
  readinessPct?: number | null;
  university?: string;
  major?: string;
  needsEnglish: boolean;        // الوجهة تتطلب إثبات إنجليزي (جامعة البترول…)
  daysToNearestExam?: number | null;
  nearestExamLabel?: string;
  /* ── حقول مرحلة الجامعي (Phase Engine) ── */
  universityYear?: string;       // الأولى/الثانية/الثالثة/الرابعة/الخامسة+
  universityGpa?: number;        // المعدل من 5
  coopDone?: boolean;            // أنجز التدريب التعاوني/الصيفي
  gradSchoolInterest?: boolean;  // اهتمام بالدراسات العليا
}

const met = (score?: number, target?: number) =>
  score != null && target != null && score >= target;

/* ════════ كشف الفصل من التاريخ ════════
   النظام السعودي ثلاثة فصول. نبسّطه لرؤية المستخدم (أول/ثاني/صيف):
   الفصل الأول → «أول»، الثاني والثالث → «ثاني»، الصيف → «صيف». */
export function currentSemester(now: Date = new Date()): SemesterPhase {
  const m = now.getMonth() + 1; // 1–12
  const d = now.getDate();
  // صيف: ١٩ يونيو → ٢٣ أغسطس تقريباً
  if (m === 7 || (m === 6 && d >= 19) || (m === 8 && d < 24)) return "صيف";
  // الفصل الأول: أواخر أغسطس → منتصف نوفمبر
  if ((m === 8 && d >= 24) || m === 9 || m === 10 || (m === 11 && d <= 14)) return "أول";
  // الباقي (نوفمبر المتأخر → منتصف يونيو): الفصل الثاني/الثالث
  return "ثاني";
}

/* الوجهة تتطلب إثبات إنجليزي؟ — يفوّض لمحرّك المعرفة (SSoT) بدل تكرار القاعدة */
function detectNeedsEnglish(university?: string, stepTarget?: number): boolean {
  return destinationNeedsEnglish({ university, stepTarget });
}

/* ════════ المحرّك النقي ════════ */
export function computeGoldenPath(inp: GoldenPathInput): GoldenPathState {
  const { scores, targets } = inp;
  const isUniGoal = !!inp.uniDest;

  const milestone = (label: string): GoldenMilestone | undefined =>
    inp.daysToNearestExam != null && inp.nearestExamLabel
      ? { label, daysAway: inp.daysToNearestExam }
      : { label };

  /* قالب أساسي يُكمَّل لكل مرحلة */
  const base = {
    show: true,
    paused: [] as GoldenPaused[],
    focusTracks: [] as TrackId[],
    pausedTracks: [] as TrackId[],
    suggestedActivate: [] as TrackId[],
  };

  /* ── الجامعي: مسار ذهبي مستقل (لا علاقة بالقياس/القبول) ── */
  if (inp.eduStatus === "جامعي") {
    return universityPhase(inp);
  }

  /* ── الخريج ── */
  if (inp.eduStatus === "خريج") {
    if (inp.gapYear) {
      // سنة استدراك: إعادة تحضير قياس
      const focus: TrackId[] = ["قدرات", "تحصيلي"];
      return {
        ...base, phaseId: "grad-gap", phaseLabel: "خريج — سنة استدراك",
        primary: { kind: "track", track: "قدرات", label: "تحسين القدرات والتحصيلي" },
        focusTracks: focus,
        reason: "سنة الاستدراك فرصتك لرفع درجات القدرات والتحصيلي قبل القبول — ركّز عليها بالكامل.",
        nextMilestone: milestone("أقرب موعد قياس"),
      };
    }
    // خريج هدفه القبول
    return admissionPhase(inp, "grad-admission", "خريج — مرحلة القبول");
  }

  /* ── ثانوي ── */
  const grade = inp.grade;

  /* أول ثانوي: المدرسة + التأسيس، لا ضغط قياس */
  if (grade === "أول ثانوي") {
    if (inp.semester === "صيف") {
      return {
        ...base, phaseId: "g1-summer", phaseLabel: "أول ثانوي — الإجازة الصيفية",
        primary: { kind: "foundation", label: "تأسيس الرياضيات والكمي" },
        secondary: { kind: "foundation", label: "مهارات الدراسة" },
        paused: [{ label: "قدرات/تحصيلي", reason: "بدري على مرحلتك — التأسيس الآن أهم" }],
        reason: "استغل الصيف لتأسيس الرياضيات والكمي وبناء مهارات مذاكرة ثابتة — هذا يصنع فرقك في القدرات لاحقاً.",
      };
    }
    return {
      ...base, phaseId: "g1", phaseLabel: "أول ثانوي",
      primary: { kind: "school", label: "رفع معدل المدرسة" },
      secondary: { kind: "foundation", label: "تأسيس الرياضيات والكمي" },
      paused: [{ label: "قدرات/تحصيلي", reason: "بدري على مرحلتك — لا ضغط اختبارات الآن" }],
      reason: "أولويتك الآن: معدلك المدرسي وتأسيس الرياضيات والكمي وبناء عادة مذاكرة — لا أوصي بضغط القدرات مبكراً.",
    };
  }

  /* ثاني ثانوي */
  if (grade === "ثاني ثانوي") {
    const quduratMet = met(scores.qudurat, targets.qudurat);

    if (inp.semester === "صيف") {
      // إجازة بين ثاني وثالث
      if (quduratMet) {
        return {
          ...base, phaseId: "g2-summer", phaseLabel: "إجازة ثاني→ثالث ثانوي",
          primary: { kind: "track", track: "تحصيلي", label: "ابدأ التحصيلي" },
          paused: [{ label: "قدرات", reason: `حققت هدفك ${ar(scores.qudurat!)}${targets.qudurat ? `/${ar(targets.qudurat)}` : ""}` }],
          focusTracks: ["تحصيلي"], suggestedActivate: ["تحصيلي"],
          reason: `قدراتك ${ar(scores.qudurat!)} ووصلت لهدفك — استثمر الصيف لبدء التحصيلي وجمع المراجع والتخطيط لثالث ثانوي.`,
        };
      }
      return {
        ...base, phaseId: "g2-summer", phaseLabel: "إجازة ثاني→ثالث ثانوي",
        primary: { kind: "track", track: "قدرات", label: "أنهِ القدرات" },
        focusTracks: ["قدرات"],
        reason: gapReason("القدرات", scores.qudurat, targets.qudurat) + " — استغل الصيف لإنهائها قبل ثالث ثانوي.",
        nextMilestone: milestone("أقرب موعد قدرات"),
      };
    }

    if (inp.semester === "أول") {
      return {
        ...base, phaseId: "g2-s1", phaseLabel: "ثاني ثانوي — الفصل الأول",
        primary: { kind: "track", track: "قدرات", label: "التحضير للقدرات" },
        secondary: { kind: "school", label: "معدل المدرسة" },
        focusTracks: ["قدرات"],
        reason: "أولويتك الآن القدرات — ابدأ تحضيرها تدريجياً، وعند جاهزيتك ادخل أول محاولة. والمدرسة تبقى أساسك.",
        nextMilestone: milestone("أقرب موعد قدرات"),
      };
    }

    // الفصل الثاني
    if (quduratMet) {
      return {
        ...base, phaseId: "g2-s2", phaseLabel: "ثاني ثانوي — الفصل الثاني",
        primary: { kind: "track", track: "تحصيلي مبكر", label: "ابدأ التحصيلي المبكر" },
        paused: [{ label: "قدرات", reason: `حققت هدفك ${ar(scores.qudurat!)}${targets.qudurat ? `/${ar(targets.qudurat)}` : ""}` }],
        focusTracks: ["تحصيلي مبكر"], suggestedActivate: ["تحصيلي مبكر"],
        reason: `قدراتك ${ar(scores.qudurat!)} ووصلت لهدفك — أوقف التركيز على القدرات وابدأ التأسيس للتحصيلي المبكر.`,
      };
    }
    return {
      ...base, phaseId: "g2-s2", phaseLabel: "ثاني ثانوي — الفصل الثاني",
      primary: { kind: "track", track: "قدرات", label: "تحسين القدرات" },
      secondary: { kind: "school", label: "معدل المدرسة" },
      focusTracks: ["قدرات"],
      reason: gapReason("القدرات", scores.qudurat, targets.qudurat) + " — أكمل تحسينها حتى تصل لهدفك، ولا أوصي بالتحصيلي بعد.",
      nextMilestone: milestone("أقرب موعد قدرات"),
    };
  }

  /* ثالث ثانوي */
  if (grade === "ثالث ثانوي") {
    // هدفه القبول صراحةً وانتهى من قياس → مرحلة القبول
    const quduratMet = met(scores.qudurat, targets.qudurat);

    if (inp.semester === "أول") {
      const paused: GoldenPaused[] = quduratMet
        ? [{ label: "قدرات", reason: `درجتك ${ar(scores.qudurat!)} ممتازة — أوقف التركيز عليها` }]
        : [];
      return {
        ...base, phaseId: "g3-s1", phaseLabel: "ثالث ثانوي — الفصل الأول",
        primary: { kind: "track", track: "تحصيلي", label: "التحصيلي" },
        secondary: { kind: "school", label: "معدل المدرسة" },
        paused,
        focusTracks: ["تحصيلي"], pausedTracks: quduratMet ? ["قدرات"] : [],
        reason: quduratMet
          ? `قدراتك ${ar(scores.qudurat!)} ممتازة — ركّز الآن على التحصيلي مع معدلك المدرسي، وأوقف التركيز على القدرات.`
          : "أولويتك التحصيلي مع معدلك المدرسي" + (scores.qudurat != null ? `، وحسّن القدرات (${ar(scores.qudurat)}) عند الحاجة فقط.` : "."),
        nextMilestone: milestone("أقرب موعد تحصيلي"),
      };
    }

    // الفصل الثاني/الثالث: التحصيلي أولوية كاملة
    return {
      ...base, phaseId: "g3-s2", phaseLabel: "ثالث ثانوي — الفصل الثاني",
      primary: { kind: "track", track: "تحصيلي", label: "التحصيلي — أولوية كاملة" },
      paused: quduratMet ? [{ label: "قدرات", reason: "أنهيتها — ركّز كلياً على التحصيلي" }] : [],
      focusTracks: ["تحصيلي"], pausedTracks: ["قدرات"],
      reason: "أولويتك الكاملة الآن: التحصيلي — أنهِ المنهج وادخل الاختبارات التجريبية. هذي الفترة الحاسمة قبل التخرج.",
      nextMilestone: milestone("أقرب موعد تحصيلي"),
    };
  }

  /* ثانوي بلا صف محدد، أو هدفه القبول صراحةً */
  if (isUniGoal) return admissionPhase(inp, "hs-admission", "مرحلة القبول");

  // افتراضي آمن
  return {
    ...base, phaseId: "hs-default", phaseLabel: "ثانوي",
    primary: { kind: "track", track: "قدرات", label: "القدرات" },
    secondary: { kind: "school", label: "معدل المدرسة" },
    focusTracks: ["قدرات"],
    reason: "ركّز على القدرات ومعدلك المدرسي، وحدّد صفّك في إعداداتك لنضبط أولويتك بدقة.",
  };
}

/* جملة الفجوة بين الدرجة والهدف */
function gapReason(name: string, score?: number, target?: number): string {
  if (score != null && target != null) return `${name} ${ar(score)} وهدفك ${ar(target)} — أولويتك تحسينها الآن`;
  if (target != null) return `هدفك ${ar(target)} في ${name} — أولويتك التحضير لها الآن`;
  return `أولويتك التحضير لـ${name} الآن`;
}

/* ════════ مرحلة القبول (خريج/نهاية ثالث) ════════ */
function admissionPhase(inp: GoldenPathInput, phaseId: string, phaseLabel: string): GoldenPathState {
  const { scores } = inp;
  const checklist: AdmissionItem[] = [
    { key: "highschool", label: "معدل الثانوية", done: scores.highschool != null, value: scores.highschool != null ? `${ar(scores.highschool)}٪` : undefined },
    { key: "qudurat", label: "القدرات", done: scores.qudurat != null, value: scores.qudurat != null ? ar(scores.qudurat) : undefined },
    { key: "tahsili", label: "التحصيلي", done: scores.tahsili != null, value: scores.tahsili != null ? ar(scores.tahsili) : undefined },
  ];
  if (inp.needsEnglish) {
    checklist.push({ key: "step", label: "إثبات إنجليزي (STEP)", done: scores.step != null, value: scores.step != null ? ar(scores.step) : undefined });
  }

  const missing = checklist.filter((c) => !c.done).map((c) => c.label);
  const reason = missing.length
    ? `أنت على أعتاب القبول — أكمل ما ينقصك: ${missing.join("، ")}. ثم احسب موزونتك وقارن فرصك في صفحة القبول.`
    : "اكتملت متطلباتك — احسب موزونتك وقارن الجامعات والتخصصات المناسبة في صفحة القبول.";

  const englishRecommendation = inp.needsEnglish
    ? "وجهتك تتطلب إثبات إنجليزي — وصّيك بأحد: STEP أو IELTS أو TOEFL أو Duolingo حسب المعلن وقت التقديم."
    : undefined;

  return {
    show: true, phaseId, phaseLabel,
    primary: { kind: "admission", label: "القبول الجامعي" },
    paused: [], focusTracks: [], pausedTracks: [], suggestedActivate: [],
    reason,
    admissionChecklist: checklist,
    englishRecommendation,
    nextMilestone: missing.length ? { label: `ناقص: ${missing.join("، ")}` } : { label: "جاهز للتقديم — احسب موزونتك" },
  };
}

/* ════════ مرحلة الجامعي (مستقلة كلياً عن القياس/القبول) ════════ */
function universityPhase(inp: GoldenPathInput): GoldenPathState {
  const { universityYear: year, universityGpa: gpa, coopDone, gradSchoolInterest } = inp;
  const base = {
    show: true,
    paused: [] as GoldenPaused[],
    focusTracks: [] as TrackId[],
    pausedTracks: [] as TrackId[],
    suggestedActivate: [] as TrackId[],
  };
  const phaseLabel = year ? `جامعي — السنة ${year}` : "طالب جامعي";
  const gpaStr = gpa != null ? ` (معدلك ${ar(gpa)} من 5)` : "";

  const isLateYear  = year === "الرابعة" || year === "الخامسة+";
  const isMidYear   = year === "الثالثة" || year === "الرابعة";
  const isEarlyYear = year === "الأولى"  || year === "الثانية";

  /* رابعة/خامسة: مشروع التخرج + التوظيف */
  if (isLateYear) {
    const secondary: GoldenFocus = gradSchoolInterest
      ? { kind: "track", label: "تجهيز ملف الدراسات العليا" }
      : { kind: "track", label: "بناء السيرة الذاتية والشبكة المهنية" };
    return {
      ...base, phaseId: "uni-late", phaseLabel,
      primary:   { kind: "track", label: "مشروع التخرج والتوظيف" },
      secondary,
      reason: `أنت في المراحل الأخيرة — ركّز على مشروع التخرج وتجهيز نفسك لسوق العمل${gpaStr}.`,
    };
  }

  /* ثالثة/رابعة بدون تدريب: التدريب أولوية */
  if (isMidYear && coopDone === false) {
    const secondary: GoldenFocus = gpa != null && gpa < 3.5
      ? { kind: "track", label: `رفع المعدل الجامعي (${ar(gpa)})` }
      : { kind: "track", label: "الشهادات المهنية والتأهيل" };
    return {
      ...base, phaseId: "uni-coop", phaseLabel,
      primary: { kind: "track", label: "التدريب التعاوني / الصيفي" },
      secondary,
      reason: `أولويتك التدريب التعاوني أو الصيفي — الوقت المناسب لتأمين تجربة عملية تفتح أبواب التوظيف${gpaStr}.`,
    };
  }

  /* أولى/ثانية: بناء القاعدة الأكاديمية */
  if (isEarlyYear || !year) {
    return {
      ...base, phaseId: "uni-early", phaseLabel: year ? phaseLabel : "جامعي — السنة الأولى",
      primary:   { kind: "track", label: gpa != null ? `رفع المعدل الجامعي (${ar(gpa)})` : "بناء المعدل الجامعي" },
      secondary: { kind: "track", label: "مهارات دراسية + أنشطة طلابية" },
      reason: `ركّز على بناء معدل جامعي قوي وعادات دراسة ثابتة — هذه السنوات الأولى تحدد مسارك كاملاً${gpaStr}.`,
    };
  }

  /* افتراضي آمن للثالثة مع تدريب منجز */
  const secondary: GoldenFocus = gradSchoolInterest
    ? { kind: "track", label: "تجهيز ملف الدراسات العليا" }
    : { kind: "track", label: "الشهادات المهنية والمهارات التقنية" };
  return {
    ...base, phaseId: "uni-mid", phaseLabel,
    primary:   { kind: "track", label: gpa != null ? `تحسين المعدل (${ar(gpa)})` : "رفع المعدل الجامعي" },
    secondary,
    reason: `طوّر كفاءتك الأكاديمية والمهنية معاً — المعدل + الشهادات + التحضير لسوق العمل${gpaStr}.`,
  };
}

/* ════════ مطابقة الدرجات/الأهداف من أسماء الاختبارات ════════ */
function pickByName<T>(map: Record<string, T>, needle: RegExp): T | undefined {
  for (const [k, v] of Object.entries(map)) if (needle.test(k)) return v;
  return undefined;
}

/* ════════ بانٍ عميلي: من localStorage (للبطاقة) ════════ */
export function loadGoldenPath(now: Date = new Date()): GoldenPathState {
  const u = loadUser();
  const goals = loadGoals();
  const scoreMap = currentScoreMap();
  const { profile } = buildDuwairbProfile();

  const qScore = pickByName(scoreMap, /قدرات/)?.score;
  const tScore = pickByName(scoreMap, /تحصيل/)?.score;
  const sScore = pickByName(scoreMap, /ستيب|step/i)?.score;

  return computeGoldenPath({
    eduStatus: u?.studyLevel,
    grade: u?.grade,
    gapYear: u?.gapYear,
    uniDest: (u?.targets ?? []).some((t) => t === "university" || t === "major"),
    semester: currentSemester(now),
    onVacation: false,
    scores: { qudurat: qScore, tahsili: tScore, step: sScore, highschool: goals.highschoolPct },
    targets: { qudurat: goals.quduratTarget, tahsili: goals.tahsiliTarget, step: goals.stepTarget },
    readinessPct: profile.readinessPct ?? null,
    university: goals.university,
    major: goals.major,
    needsEnglish: detectNeedsEnglish(goals.university, goals.stepTarget),
    universityYear: u?.universityYear,
    universityGpa: u?.universityGpa,
    coopDone: u?.coopDone,
    gradSchoolInterest: u?.gradSchoolInterest,
  });
}

/* ════════ بانٍ خادمي: من DuwairbProfile المُنظَّف (للحقن في دويرب) ════════ */
export function goldenPathFromProfile(profile: DuwairbProfile, now: Date = new Date()): GoldenPathState {
  const exams = profile.exams ?? [];
  const examTarget = (needle: RegExp) => exams.find((e) => needle.test(e.name))?.target;
  const cs = profile.currentScores ?? {};

  const sortedByDays = exams.filter((e) => e.days != null).sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
  return computeGoldenPath({
    eduStatus: profile.eduStatus,
    grade: profile.grade,
    gapYear: profile.gapYear,
    uniDest: !!(profile.university || profile.major),
    semester: currentSemester(now),
    onVacation: false,
    scores: {
      qudurat: pickByName(cs, /قدرات/),
      tahsili: pickByName(cs, /تحصيل/),
      step: pickByName(cs, /ستيب|step/i),
      highschool: profile.highschoolPct,
    },
    targets: {
      qudurat: examTarget(/قدرات/),
      tahsili: examTarget(/تحصيل/),
      step: examTarget(/ستيب|step/i),
    },
    readinessPct: profile.readinessPct ?? null,
    university: profile.university,
    major: profile.major,
    needsEnglish: detectNeedsEnglish(profile.university, examTarget(/ستيب|step/i)),
    daysToNearestExam: sortedByDays[0]?.days ?? null,
    nearestExamLabel: sortedByDays[0]?.name,
    /* حقول الجامعي */
    universityYear: profile.universityYear,
    universityGpa: profile.universityGpa,
    coopDone: profile.coopDone,
    gradSchoolInterest: profile.gradSchoolInterest,
  });
}

/* ════════ تحويل بؤرة التركيز إلى أوزان مواد (للخطة) ════════ */
export function priorityFocusSubjects(state: GoldenPathState): { boost: string[]; suppress: string[] } {
  const boost = state.focusTracks.length ? subjectsForTracks(state.focusTracks).map((s) => s.name) : [];
  const suppress = state.pausedTracks.length ? subjectsForTracks(state.pausedTracks).map((s) => s.name) : [];
  // لا تُخفِّض مادة هي أيضاً ضمن بؤرة التركيز
  const boostSet = new Set(boost);
  return { boost, suppress: suppress.filter((s) => !boostSet.has(s)) };
}

/* ════════ كتلة نصّية تُحقن في برومبت دويرب (نقيّة — خادم) ════════ */
export function formatGoldenPathBlock(s: GoldenPathState): string {
  if (!s.show) return "";
  const isUniversity = s.phaseId.startsWith("uni-") || s.phaseId === "university";
  const lines: string[] = [
    `- المرحلة: ${s.phaseLabel}`,
    `- أولوية الطالب الآن: ${s.primary.label}`,
  ];
  if (s.secondary) lines.push(`- وبعدها: ${s.secondary.label}`);
  if (s.paused.length) lines.push(`- أوقفنا مؤقتاً: ${s.paused.map((p) => `${p.label} (${p.reason})`).join("؛ ")}`);
  if (s.englishRecommendation) lines.push(`- ${s.englishRecommendation}`);
  if (s.admissionChecklist?.length) {
    const cl = s.admissionChecklist.map((c) => `${c.label}${c.done ? ` ✓${c.value ? ` ${c.value}` : ""}` : " (ناقص)"}`).join("، ");
    lines.push(`- متطلبات القبول: ${cl}`);
  }

  if (isUniversity) {
    return `أولوية الطالب الجامعي الحالية حسب «المسار الذهبي» (ابدأ ردّك بتأكيد هذه الأولوية — لا تذكر أبداً القياس أو التحصيلي أو الموزونة أو القبول الجامعي، فهذا الطالب جامعي ومرحلة القبول انتهت):
${lines.join("\n")}
السبب المعتمد: ${s.reason}`;
  }

  return `أولوية الطالب الحالية حسب «المسار الذهبي» (ابدأ ردّك بتأكيد هذه الأولوية صراحةً مع ذكر درجاته، ولا توصِ بما أوقفناه):
${lines.join("\n")}
السبب المعتمد: ${s.reason}`;
}
