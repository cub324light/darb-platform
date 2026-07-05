/* ─── المسارات — كلها باللون الأزرق الموحد ─── */

export type TrackId =
  | "قدرات" | "تحصيلي" | "تحصيلي مبكر" | "CPC" | "ITC"
  | "ايلتس" | "ستيب" | "توفل" | "دوليقو" | "مدرسه";

export const TRACK_BLUE = "#2563EB";

export interface Track {
  id: TrackId;
  title: string;
  sub: string;
  icon: string;
  color: string; // لون مميز لكل مسار في الشريط والبطاقات
  subjects: { name: string; icon: string; color: string }[];
}

const SKILL_LISTEN  = { name: "استماع",  icon: "", color: "#8B5CF6" };
const SKILL_READ    = { name: "قراءة",   icon: "", color: "#10B981" };
const SKILL_WRITE   = { name: "كتابة",   icon: "", color: "#F59E0B" };
const SKILL_SPEAK   = { name: "محادثة",  icon: "", color: "#EF4444" };
const SKILL_GRAMMAR = { name: "قواعد",   icon: "", color: "#3B82F6" };

const TAHSILI_SUBJECTS = [
  { name: "أحياء",   icon: "", color: "#F59E0B" },
  { name: "فيزياء",  icon: "", color: "#8B5CF6" },
  { name: "رياضيات", icon: "", color: "#10B981" },
  { name: "كيمياء",  icon: "", color: "#EF4444" },
];

export const TRACKS: Track[] = [
  {
    id: "قدرات",
    title: "القدرات",
    sub: "لفظي + كمي (قياس)",
    icon: "",
    color: "#8B5CF6",
    subjects: [
      { name: "لفظي", icon: "", color: "#8B5CF6" },
      { name: "كمي",  icon: "", color: "#10B981" },
    ],
  },
  {
    id: "تحصيلي",
    title: "التحصيلي",
    sub: "فيزياء · كيمياء · رياضيات · أحياء",
    icon: "",
    color: "#3B82F6",
    subjects: TAHSILI_SUBJECTS,
  },
  {
    id: "تحصيلي مبكر",
    title: "التحصيلي المبكر",
    sub: "لطلاب ثاني وثالث ثانوي",
    icon: "",
    color: "#6366F1",
    subjects: TAHSILI_SUBJECTS,
  },
  {
    id: "CPC",
    title: "أرامكو CPC",
    sub: "إنجليزي + رياضيات",
    icon: "",
    color: "#06B6D4",
    subjects: [
      { name: "إنجليزي", icon: "", color: "#3B82F6" },
      { name: "رياضيات", icon: "", color: "#10B981" },
    ],
  },
  {
    id: "ITC",
    title: "ITC",
    sub: "إنجليزي · رياضيات · منطق",
    icon: "",
    color: "#F97316",
    subjects: [
      { name: "إنجليزي", icon: "", color: "#3B82F6" },
      { name: "رياضيات", icon: "", color: "#10B981" },
      { name: "منطق",    icon: "", color: "#A855F7" },
    ],
  },
  {
    id: "ايلتس",
    title: "آيلتس IELTS",
    sub: "استماع · قراءة · كتابة · محادثة",
    icon: "",
    color: "#EF4444",
    subjects: [SKILL_LISTEN, SKILL_READ, SKILL_WRITE, SKILL_SPEAK],
  },
  {
    id: "ستيب",
    title: "ستيب STEP",
    sub: "كفايات الإنجليزية (قياس)",
    icon: "",
    color: "#10B981",
    subjects: [SKILL_READ, SKILL_GRAMMAR, SKILL_LISTEN, SKILL_WRITE],
  },
  {
    id: "توفل",
    title: "توفل TOEFL",
    sub: "iBT — المهارات الأربع",
    icon: "",
    color: "#F59E0B",
    subjects: [SKILL_READ, SKILL_LISTEN, SKILL_SPEAK, SKILL_WRITE],
  },
  {
    id: "دوليقو",
    title: "دووليجو Duolingo",
    sub: "اختبار الإنجليزية السريع",
    icon: "",
    color: "#EC4899",
    subjects: [SKILL_READ, SKILL_WRITE, SKILL_LISTEN, SKILL_SPEAK],
  },
  {
    id: "مدرسه",
    title: "المدرسة",
    sub: "المواد الدراسية اليومية",
    icon: "",
    color: "#0EA5E9",
    subjects: [
      { name: "عربي",     icon: "", color: "#F59E0B" },
      { name: "إنجليزي", icon: "", color: "#3B82F6" },
      { name: "رياضيات", icon: "", color: "#10B981" },
      { name: "إسلامية", icon: "", color: "#22C55E" },
    ],
  },
];

/* ── تجميع المسارات حسب المرحلة ── */
export const TRACK_GROUPS: { label: string; ids: TrackId[] }[] = [
  { label: "الثانوية",      ids: ["تحصيلي", "تحصيلي مبكر", "قدرات", "مدرسه"] },
  { label: "الإنجليزي",    ids: ["ايلتس", "ستيب", "توفل", "دوليقو"] },
  { label: "اختبارات القبول", ids: ["CPC", "ITC"] },
];

/* ── المواد الكاملة مع التجميع والمختبِر ── */
export interface SubjectInfo {
  name: string;
  color: string;
  testedBy: string[]; // أسماء الاختبارات التي تشمل هذه المادة
}

export const SUBJECT_GROUPS: { label: string; subjects: SubjectInfo[] }[] = [
  {
    label: "الثانوية",
    subjects: [
      { name: "أحياء",   color: "#F59E0B", testedBy: ["التحصيلي"] },
      { name: "فيزياء",  color: "#8B5CF6", testedBy: ["التحصيلي"] },
      { name: "رياضيات", color: "#10B981", testedBy: ["التحصيلي", "CPC", "ITC"] },
      { name: "كيمياء",  color: "#EF4444", testedBy: ["التحصيلي"] },
    ],
  },
  {
    label: "الإنجليزي",
    subjects: [
      { name: "استماع",  color: "#8B5CF6", testedBy: ["آيلتس", "ستيب", "توفل", "دوليقو"] },
      { name: "قراءة",   color: "#10B981", testedBy: ["آيلتس", "ستيب", "توفل", "دوليقو"] },
      { name: "كتابة",   color: "#F59E0B", testedBy: ["آيلتس", "ستيب", "توفل", "دوليقو"] },
      { name: "محادثة",  color: "#EF4444", testedBy: ["آيلتس", "توفل", "دوليقو"] },
      { name: "قواعد",   color: "#3B82F6", testedBy: ["ستيب"] },
    ],
  },
  {
    label: "اختبارات القبول",
    subjects: [
      { name: "لفظي",    color: "#8B5CF6", testedBy: ["القدرات"] },
      { name: "كمي",     color: "#10B981", testedBy: ["القدرات"] },
      { name: "إنجليزي", color: "#3B82F6", testedBy: ["CPC", "ITC"] },
      { name: "منطق",    color: "#A855F7", testedBy: ["ITC"] },
    ],
  },
];

export function getTrack(id?: string | null): Track {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[1];
}

/* مواد كل الاختبارات النشطة للطالب — بدون تكرار (الكل في مكان واحد) */
export function subjectsForTracks(ids: TrackId[]): { name: string; color: string }[] {
  const map = new Map<string, { name: string; color: string }>();
  for (const id of ids) {
    const t = TRACKS.find((tr) => tr.id === id);
    if (!t) continue;
    for (const s of t.subjects) if (!map.has(s.name)) map.set(s.name, { name: s.name, color: s.color });
  }
  return [...map.values()];
}

/* لون مادة من أي اختبار نشط (ثم بحث شامل ثم اللون الافتراضي) */
export function colorForSubject(ids: TrackId[], subject: string): string {
  for (const id of ids) {
    const s = TRACKS.find((tr) => tr.id === id)?.subjects.find((su) => su.name === subject);
    if (s) return s.color;
  }
  for (const t of TRACKS) {
    const s = t.subjects.find((su) => su.name === subject);
    if (s) return s.color;
  }
  return TRACK_BLUE;
}

export function subjectColor(track: Track, subject: string): string {
  return track.subjects.find((s) => s.name === subject)?.color ?? TRACK_BLUE;
}

export function subjectIcon(track: Track, subject: string): string {
  return track.subjects.find((s) => s.name === subject)?.icon ?? "";
}

export function resolveSubjects(names: string[]): { name: string; color: string }[] {
  const all = SUBJECT_GROUPS.flatMap((g) => g.subjects);
  return names.map((n) => all.find((s) => s.name === n) ?? { name: n, color: TRACK_BLUE });
}

/* ─── نطاقات درجات الاختبارات («نتائجي») ───
   كل اختبار له سُلّم درجات مختلف — نتحقق منه قبل الحفظ.
   null = لا توجد درجة رقمية لهذا الاختبار (يُرفض إدخال درجة).

   المصادر (سلالم رسمية):
   - القدرات (GAT/قياس): من ١ إلى ١٠٠
   - التحصيلي (SAAT/قياس): من ١ إلى ١٠٠
   - ستيب STEP (كفايات الإنجليزية/قياس): من ١ إلى ١٠٠
   - آيلتس IELTS: من ١ إلى ٩ (بخطوات ٠٫٥)
   - توفل TOEFL iBT: من ٠ إلى ١٢٠
   - دوليجو Duolingo English Test: من ١٠ إلى ١٦٠ (بخطوات ٥)
   - أرامكو CPC و ITC: برامج قبول/تدريب بلا درجة رقمية موحّدة → تُرفض */
export interface ScoreRange { min: number; max: number; step: number; hint: string; }

export const EXAM_SCORE: Record<TrackId, ScoreRange | null> = {
  "قدرات":        { min: 1, max: 100, step: 1,   hint: "من ١ إلى ١٠٠" },
  "تحصيلي":       { min: 1, max: 100, step: 1,   hint: "من ١ إلى ١٠٠" },
  "تحصيلي مبكر":  { min: 1, max: 100, step: 1,   hint: "من ١ إلى ١٠٠" },
  "ستيب":         { min: 1, max: 100, step: 1,   hint: "من ١ إلى ١٠٠" },
  "ايلتس":        { min: 1, max: 9,   step: 0.5, hint: "من ١ إلى ٩ (بخطوات ٠٫٥)" },
  "توفل":         { min: 0, max: 120, step: 1,   hint: "من ٠ إلى ١٢٠" },
  "دوليقو":       { min: 10, max: 160, step: 5,  hint: "من ١٠ إلى ١٦٠" },
  "CPC":          null,
  "ITC":          null,
  "مدرسه":        null,
};

/* مسار من عنوانه المعروض (للربط بين «نتائجي» والمسارات) */
export function trackByTitle(title: string): Track | undefined {
  const t = title.trim();
  return TRACKS.find((tr) => tr.title === t || tr.id === t);
}

/* ─── الهدف الحالي + تفعيل الاختبارات الأساسية تلقائياً ───
   التسجيل الأساسي يقتصر على اختبارات قياس الأساسية (قدرات/تحصيلي/تحصيلي مبكر/STEP).
   CPC/ITC والاختبارات الإنجليزية المهنية تُضاف لاحقاً من الملف الشخصي عند الحاجة. */
export const MAX_BASIC_TRACKS = 3;

export type StudyGoalType = "qudurat" | "tahsili" | "step" | "university" | "major";

export const STUDY_GOALS: { id: StudyGoalType; label: string; icon: string }[] = [
  { id: "qudurat",    label: "رفع درجة القدرات",     icon: "📈" },
  { id: "tahsili",    label: "رفع درجة التحصيلي",    icon: "📊" },
  { id: "step",       label: "رفع درجة STEP",        icon: "🔤" },
  { id: "university", label: "دخول جامعة محددة",      icon: "🏛️" },
  { id: "major",      label: "الوصول إلى تخصص معيّن", icon: "🎯" },
];

export const goalLabel = (id?: StudyGoalType): string | undefined =>
  id ? STUDY_GOALS.find((g) => g.id === id)?.label : undefined;

/* الهدف الأساسي من قائمة أهداف متعددة — أول عنصر (SSoT للتوافق مع كل المستهلكين
   القائمين الذين يقرؤون goal مفرداً: goldenPath/duwairb/goalReality). */
export function primaryGoal(goals?: StudyGoalType[]): StudyGoalType | undefined {
  return goals && goals.length ? goals[0] : undefined;
}

/* ─── اختبارات اللغة: قسم إضافي اختياري متعدد بلا حد في تسجيل الثانوي/الخريج ───
   كلها بلا تقييد صفّي (available في trackEligibilityFor) ولا تُحسب بأي حد
   (MAX_BASIC_TRACKS لا يُطبَّق عليها) — للطالب أن يضيف أكثر من واحد بنفس الوقت. */
export const LANGUAGE_TESTS: TrackId[] = ["ستيب", "ايلتس", "توفل", "دوليقو"];

/* النواة الثابتة لطلاب الثانوي — تظهر دائماً بترتيب [القدرات · التحصيلي · المدرسة].
   شقّ «التحصيلي» يتبدّل حسب الصف: ثاني ثانوي → التحصيلي المبكر (المتاح لصفّه)،
   وأول/ثالث ثانوي → التحصيلي العادي (أول ثانوي يُعرض مقفلاً حسب الأهلية).
   نقيّة وحتمية — تُستهلَك في التسجيل لعرض النواة الثابتة وتفعيل المتاح منها. */
export function secondaryCoreTracks(grade?: string): TrackId[] {
  const tahsili: TrackId = grade === "ثاني ثانوي" ? "تحصيلي مبكر" : "تحصيلي";
  return ["قدرات", tahsili, "مدرسه"];
}

/* المسارات النهائية لطالب الثانوي: النواة المتاحة (المفعّلة تلقائياً) + اختبارات
   اللغة المختارة — بترتيب ثابت: القدرات (أو أول نواة متاحة) أولاً، ثم بقية النواة،
   ثم اختبارات اللغة (بترتيب LANGUAGE_TESTS)، ثم المدرسة أخيراً.
   لا حدّ على اختبارات اللغة إطلاقاً. المقفل من النواة (تحصيلي أول ثانوي) يُستبعَد. */
export function secondaryActiveTracks(
  grade: string | undefined,
  eligibility: TrackEligibility[],
  selectedLanguages: TrackId[],
): TrackId[] {
  const isAvail = (id: TrackId) => eligibility.some((e) => e.id === id && e.status === "available");
  const core = secondaryCoreTracks(grade).filter(isAvail);
  const langs = LANGUAGE_TESTS.filter((id) => selectedLanguages.includes(id) && isAvail(id));
  const head = core.filter((id) => id !== "مدرسه");             // القدرات + شقّ التحصيلي المتاح
  const school: TrackId[] = core.includes("مدرسه") ? ["مدرسه"] : [];
  return [...new Set([...head, ...langs, ...school])];
}

/* يحدّد المسارات النشطة تلقائياً من الحالة التعليمية + الصف + الهدف.
   نقيّة وحتمية — تُستعمل في التسجيل وعند تغيير الهدف لاحقاً. */
export function basicTracksFor(opts: { status?: string; grade?: string; goal?: StudyGoalType; gapYear?: boolean }): TrackId[] {
  /* التحصيلي المبكر لثاني ثانوي فقط — ثالث ثانوي على التحصيلي العادي، وأول ثانوي بلا تحصيلي إطلاقاً */
  const early = opts.grade === "ثاني ثانوي";
  const tahsiliTrack: TrackId = early ? "تحصيلي مبكر" : "تحصيلي";

  const primary: TrackId | null =
    opts.goal === "qudurat" ? "قدرات" :
    opts.goal === "tahsili" ? tahsiliTrack :
    opts.goal === "step"    ? "ستيب" : null;

  const dedupe = (arr: TrackId[]) => [...new Set(arr)];

  /* الجامعي: خرج من عالم القياس/القبول — لا نفعّل له قدرات/تحصيلي/ستيب إطلاقاً.
     مساره محايد (مواد دراسية عامة) يخدم لوحته دون توجيهه لاختبارات لا تخصّ مرحلته. */
  if (opts.status === "جامعي") {
    return ["مدرسه"];
  }

  /* لما يختار جامعة أو تخصص: التركيز على القبول لا إعادة الاختبارات */
  const isUniGoal = opts.goal === "university" || opts.goal === "major";

  /* الخريج: أنهى القدرات/التحصيلي — لا نعيد تفعيل حزمة التحضير إلا إذا اختار
     سنة استدراك (gapYear) لإعادة الاختبار. بدون استدراك: نفعّل فقط المسار
     الذي يخدم هدفه (إن كان رفع درجة)، وإلا اختبار أساسي واحد ليعمل التطبيق. */
  if (opts.status === "خريج") {
    if (opts.gapYear) {
      const core: TrackId[] = ["قدرات", "تحصيلي"];
      if (opts.goal === "step") core.unshift("ستيب");
      const ordered = primary ? [primary, ...core] : core;
      return dedupe(ordered).slice(0, MAX_BASIC_TRACKS);
    }
    // هدف القبول: لا نضيف قدرات أو تحصيلي
    if (isUniGoal) return ["مدرسه"];
    return primary ? [primary] : ["قدرات"];
  }

  /* ثانوي + هدف القبول: مسار المدرسة فقط (بدون قدرات أو تحصيلي) */
  if (isUniGoal) {
    return ["مدرسه"];
  }
  /* أول ثانوي: لا تحصيلي إطلاقاً (المدارس لا تبدأه قبل ثاني ثانوي) —
     الحزمة الأساسية قدرات + مدرسة، وهدف tahsili يُعامل كهدف عام */
  if (opts.grade === "أول ثانوي") {
    return opts.goal === "step" ? ["ستيب", "قدرات", "مدرسه"] : ["قدرات", "مدرسه"];
  }
  const core: TrackId[] = ["قدرات", tahsiliTrack];
  if (opts.goal === "step") core.unshift("ستيب");
  const ordered = primary ? [primary, ...core] : core;
  const examTracks = dedupe(ordered).slice(0, MAX_BASIC_TRACKS);
  // ثالث ثانوي: مسار المدرسة دائماً بجانب اختبارات قياس
  if (opts.grade === "ثالث ثانوي") return dedupe([...examTracks, "مدرسه"]);
  return examTracks;
}


/* ─── محرّك أهلية المسارات — لوحة «وش متاح ووش مقفل وليش» ───
   يعيد حالة كل مسار للطالب: متاح/مقفل + سبب القفل + نجمة «مهم لمرحلتك» السياقية.
   نفس القواعد الحاكمة في darbKnowledge (EXAM_RULES/canTake*) — معرَّفة هنا محلياً
   لتفادي الاستيراد الدائري (darbKnowledge → storage → tracks). نقي وحتمي:
   يستهلكه التسجيل وأي واجهة تعرض للطالب طريقه كاملاً بدل «هدف» مجرّد. */
export interface TrackEligibility {
  id: TrackId;
  status: "available" | "locked";
  important: boolean;   // نجمة «مهم لمرحلتك» — سياقية حسب الصف لا عامة
  reason?: string;      // سبب القفل الدقيق — موجود لكل مسار مقفل
}

export function trackEligibilityFor(opts: {
  status?: string; grade?: string; gradStage?: string; gapYear?: boolean;
}): TrackEligibility[] {
  const st = opts.status ?? "ثانوي";
  const sec  = st === "ثانوي";
  const grad = st === "خريج";
  const g1 = sec && opts.grade === "أول ثانوي";
  const g2 = sec && opts.grade === "ثاني ثانوي";
  const g3 = sec && opts.grade === "ثالث ثانوي";
  /* سنة الاستدراك: خريج ينوي إعادة قياس — القدرات والتحصيلي جوهر سنته */
  const gap = grad && opts.gapYear === true;

  const available = (important = false): Omit<TrackEligibility, "id"> =>
    ({ status: "available", important });
  const locked = (reason: string): Omit<TrackEligibility, "id"> =>
    ({ status: "locked", important: false, reason });

  const ADMISSION_ONLY = "لمرحلة القبول (ثالث ثانوي أو خريج)";

  return TRACKS.map((t): TrackEligibility => {
    switch (t.id) {
      /* القدرات: كل صفوف الثانوي + الخريج — نجمة لثالث ثانوي (سنة الاختبارات) وسنة الاستدراك */
      case "قدرات":
        return { id: t.id, ...(sec || grad ? available(g3 || gap) : locked("لطلاب الثانوي والخريجين")) };
      /* التحصيلي العادي: ثالث ثانوي + الخريج فقط */
      case "تحصيلي":
        if (g3 || grad) return { id: t.id, ...available(g3 || gap) };
        if (g1) return { id: t.id, ...locked("يبدأ من ثالث ثانوي — وتقدر تسبق دفعتك بالتحصيلي المبكر من ثاني ثانوي") };
        if (g2) return { id: t.id, ...locked("لثالث ثانوي والخريجين — التحصيلي المبكر هو المتاح لصفّك الآن") };
        return { id: t.id, ...locked("لطلاب ثالث ثانوي والخريجين") };
      /* التحصيلي المبكر: ثاني وثالث ثانوي فقط (لا خريجين) — نجمة لثاني ثانوي (جوهر مرحلته) */
      case "تحصيلي مبكر":
        if (g2 || g3) return { id: t.id, ...available(g2) };
        if (g1) return { id: t.id, ...locked("يبدأ من ثاني ثانوي") };
        return { id: t.id, ...locked("لطلاب ثاني وثالث ثانوي فقط") };
      /* CPC/ITC: برامج قبول متقدمة — لمن هو على أعتاب القبول فقط */
      case "CPC":
      case "ITC":
        return { id: t.id, ...(g3 || grad ? available() : locked(ADMISSION_ONLY)) };
      /* الإنجليزية المهنية (آيلتس/توفل/دوليقو) + ستيب + المدرسة: بلا تقييد صفّي وبلا نجمة */
      default:
        return { id: t.id, ...available() };
    }
  });
}

/* ترتيب المسارات المختارة ترتيباً قانونياً: نجوم المرحلة أولاً، ثم ترتيب TRACKS،
   والمدرسة دائماً أخيراً — يضمن أن المسار الأساسي (أول عنصر) اختبار فعلي إن وُجد. */
export function orderSelectedTracks(selected: TrackId[], eligibility: TrackEligibility[]): TrackId[] {
  const impById = new Map(eligibility.map((e) => [e.id, e.important]));
  const idx = (id: TrackId) => TRACKS.findIndex((t) => t.id === id);
  return [...new Set(selected)].sort((a, b) => {
    if ((a === "مدرسه") !== (b === "مدرسه")) return a === "مدرسه" ? 1 : -1;
    const ia = impById.get(a) ? 0 : 1;
    const ib = impById.get(b) ? 0 : 1;
    if (ia !== ib) return ia - ib;
    return idx(a) - idx(b);
  });
}

/* اشتقاق الهدف تلقائياً من أبرز مسار مختار — حتى لا يُعرض على الطالب «هدف تحسين
   درجة» لاختبار ما دخله. «مدرسة فقط» → undefined (كل المستهلكين يتقبّلونه). */
const TRACK_GOAL: Partial<Record<TrackId, StudyGoalType>> = {
  "قدرات": "qudurat", "تحصيلي": "tahsili", "تحصيلي مبكر": "tahsili", "ستيب": "step",
};
export function deriveGoalFromTracks(selected: TrackId[], eligibility: TrackEligibility[]): StudyGoalType | undefined {
  for (const id of orderSelectedTracks(selected, eligibility)) {
    const g = TRACK_GOAL[id];
    if (g) return g;
  }
  return undefined;
}

/* المبدئيات المنطقية للوحة الاختبارات: نجوم المرحلة + القدرات + المدرسة (dedupe).
   أول: قدرات+مدرسة · ثاني: مبكر+قدرات+مدرسة · ثالث: قدرات+تحصيلي+مدرسة.
   حدّ الاختبارات MAX_BASIC_TRACKS — والمدرسة لا تُحسب منه (نفس سلوك basicTracksFor). */
export function defaultTracksFromEligibility(eligibility: TrackEligibility[]): TrackId[] {
  const avail = (id: TrackId) => eligibility.some((e) => e.id === id && e.status === "available");
  const starred = eligibility.filter((e) => e.status === "available" && e.important).map((e) => e.id);
  const base = [...starred];
  if (avail("قدرات")) base.push("قدرات");
  const exams = [...new Set(base)].filter((id) => id !== "مدرسه").slice(0, MAX_BASIC_TRACKS);
  return avail("مدرسه") ? [...exams, "مدرسه"] : exams;
}

/* نطاق درجة اختبار من عنوانه — undefined لو غير معروف، null لو بلا درجة */
export function scoreRangeForTitle(title: string): ScoreRange | null | undefined {
  const tr = trackByTitle(title);
  if (!tr) return undefined;
  return EXAM_SCORE[tr.id];
}

/* التحقق من درجة اختبار: يعيد رسالة خطأ عربية أو null لو صالحة.
   - اختبار بلا درجة (CPC/ITC) + إدخال درجة → خطأ
   - درجة خارج النطاق أو ليست رقماً → خطأ */
export function validateScore(title: string, scoreRaw: string): string | null {
  const score = scoreRaw.trim();
  const range = scoreRangeForTitle(title);

  // اختبار غير معروف على المنصة — نسمح بأي درجة (نص حر احتياطي)
  if (range === undefined) return null;

  // اختبار بلا درجة رقمية
  if (range === null) {
    return score ? "هذا الاختبار ما له درجة رقمية — اتركها فارغة" : null;
  }

  // درجة اختيارية: فارغة = مقبولة
  if (!score) return null;

  const n = Number(score.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)));
  if (!Number.isFinite(n)) return "الدرجة لازم تكون رقماً";
  if (n < range.min || n > range.max) return `الدرجة لازم تكون ${range.hint}`;
  return null;
}

