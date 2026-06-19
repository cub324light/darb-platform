/* ─── المسارات — كلها باللون الأزرق الموحد ─── */

export type TrackId =
  | "قدرات" | "تحصيلي" | "تحصيلي مبكر" | "CPC" | "ITC"
  | "ايلتس" | "ستيب" | "توفل" | "دوليقو";

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
    sub: "لطلاب أول وثاني ثانوي",
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
];

/* ── تجميع المسارات حسب المرحلة ── */
export const TRACK_GROUPS: { label: string; ids: TrackId[] }[] = [
  { label: "الثانوية",      ids: ["تحصيلي", "تحصيلي مبكر", "قدرات"] },
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
};

/* مسار من عنوانه المعروض (للربط بين «نتائجي» والمسارات) */
export function trackByTitle(title: string): Track | undefined {
  const t = title.trim();
  return TRACKS.find((tr) => tr.title === t || tr.id === t);
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

