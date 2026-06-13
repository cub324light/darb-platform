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
  subjects: { name: string; icon: string; color: string }[];
}

const SKILL_LISTEN  = { name: "استماع",  icon: "", color: "#8B5CF6" };
const SKILL_READ    = { name: "قراءة",   icon: "", color: "#10B981" };
const SKILL_WRITE   = { name: "كتابة",   icon: "", color: "#F59E0B" };
const SKILL_SPEAK   = { name: "محادثة",  icon: "", color: "#EF4444" };
const SKILL_GRAMMAR = { name: "قواعد",   icon: "", color: "#3B82F6" };

const TAHSILI_SUBJECTS = [
  { name: "فيزياء",  icon: "", color: "#8B5CF6" },
  { name: "رياضيات", icon: "", color: "#10B981" },
  { name: "كيمياء",  icon: "", color: "#EF4444" },
  { name: "أحياء",   icon: "", color: "#F59E0B" },
];

export const TRACKS: Track[] = [
  {
    id: "قدرات",
    title: "القدرات",
    sub: "لفظي + كمي (قياس)",
    icon: "",
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
    subjects: TAHSILI_SUBJECTS,
  },
  {
    id: "تحصيلي مبكر",
    title: "التحصيلي المبكر",
    sub: "لطلاب أول وثاني ثانوي",
    icon: "",
    subjects: TAHSILI_SUBJECTS,
  },
  {
    id: "CPC",
    title: "أرامكو CPC",
    sub: "إنجليزي + رياضيات",
    icon: "",
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
    subjects: [SKILL_LISTEN, SKILL_READ, SKILL_WRITE, SKILL_SPEAK],
  },
  {
    id: "ستيب",
    title: "ستيب STEP",
    sub: "كفايات الإنجليزية (قياس)",
    icon: "",
    subjects: [SKILL_READ, SKILL_GRAMMAR, SKILL_LISTEN, SKILL_WRITE],
  },
  {
    id: "توفل",
    title: "توفل TOEFL",
    sub: "iBT — المهارات الأربع",
    icon: "",
    subjects: [SKILL_READ, SKILL_LISTEN, SKILL_SPEAK, SKILL_WRITE],
  },
  {
    id: "دوليقو",
    title: "دووليجو Duolingo",
    sub: "اختبار الإنجليزية السريع",
    icon: "",
    subjects: [SKILL_READ, SKILL_WRITE, SKILL_LISTEN, SKILL_SPEAK],
  },
];

/* ── تجميع المسارات حسب المرحلة ── */
export const TRACK_GROUPS: { label: string; ids: TrackId[] }[] = [
  { label: "الثانوية",      ids: ["تحصيلي", "تحصيلي مبكر"] },
  { label: "الإنجليزي",    ids: ["ايلتس", "ستيب", "توفل", "دوليقو"] },
  { label: "بعد الثانوية", ids: ["قدرات", "CPC", "ITC"] },
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
      { name: "فيزياء",  color: "#8B5CF6", testedBy: ["التحصيلي"] },
      { name: "رياضيات", color: "#10B981", testedBy: ["التحصيلي", "CPC", "ITC"] },
      { name: "كيمياء",  color: "#EF4444", testedBy: ["التحصيلي"] },
      { name: "أحياء",   color: "#F59E0B", testedBy: ["التحصيلي"] },
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
    label: "بعد الثانوية",
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
