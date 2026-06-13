/* ─── المسارات — كلها باللون الأزرق الموحد ─── */

export type TrackId =
  | "قدرات" | "تحصيلي" | "تحصيلي مبكر" | "CPC"
  | "ايلتس" | "ستيب" | "توفل" | "دوليقو";

export const TRACK_BLUE = "#2563EB";

export interface Track {
  id: TrackId;
  title: string;
  sub: string;
  icon: string;
  subjects: { name: string; icon: string; color: string }[];
}

/* مهارات اختبارات اللغة الإنجليزية — أسماء عربية موحدة */
const SKILL_LISTEN  = { name: "استماع",  icon: "", color: "#8B5CF6" };
const SKILL_READ    = { name: "قراءة",   icon: "", color: "#10B981" };
const SKILL_WRITE   = { name: "كتابة",   icon: "", color: "#F59E0B" };
const SKILL_SPEAK   = { name: "محادثة",  icon: "", color: "#EF4444" };
const SKILL_GRAMMAR = { name: "قواعد",   icon: "", color: "#3B82F6" };

const TAHSILI_SUBJECTS = [
  { name: "فيزياء", icon: "", color: "#8B5CF6" },
  { name: "رياضيات", icon: "", color: "#10B981" },
  { name: "كيمياء", icon: "", color: "#EF4444" },
  { name: "أحياء", icon: "", color: "#F59E0B" },
];

export const TRACKS: Track[] = [
  {
    id: "قدرات",
    title: "القدرات",
    sub: "لفظي + كمي (قياس)",
    icon: "",
    subjects: [
      { name: "لفظي", icon: "", color: "#8B5CF6" },
      { name: "كمي", icon: "", color: "#10B981" },
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
    title: "دوولينجو Duolingo",
    sub: "اختبار الإنجليزية السريع",
    icon: "",
    subjects: [SKILL_READ, SKILL_WRITE, SKILL_LISTEN, SKILL_SPEAK],
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
