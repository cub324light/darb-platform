/* ─── المسارات الثلاثة — كلها باللون الأزرق الموحد ─── */

export type TrackId = "قدرات" | "تحصيلي" | "CPC";

export const TRACK_BLUE = "#2563EB";

export interface Track {
  id: TrackId;
  title: string;
  sub: string;
  icon: string;
  subjects: { name: string; icon: string; color: string }[];
}

export const TRACKS: Track[] = [
  {
    id: "قدرات",
    title: "القدرات",
    sub: "لفظي + كمي (قياس)",
    icon: "🧠",
    subjects: [
      { name: "لفظي", icon: "📖", color: "#2563EB" },
      { name: "كمي", icon: "🔢", color: "#F59E0B" },
    ],
  },
  {
    id: "تحصيلي",
    title: "التحصيلي",
    sub: "فيزياء · كيمياء · رياضيات · أحياء",
    icon: "📚",
    subjects: [
      { name: "فيزياء", icon: "⚛️", color: "#2563EB" },
      { name: "رياضيات", icon: "📐", color: "#8B5CF6" },
      { name: "كيمياء", icon: "🧪", color: "#10B981" },
      { name: "أحياء", icon: "🌿", color: "#F59E0B" },
    ],
  },
  {
    id: "CPC",
    title: "أرامكو CPC",
    sub: "إنجليزي + رياضيات",
    icon: "🏭",
    subjects: [
      { name: "إنجليزي", icon: "🇬🇧", color: "#2563EB" },
      { name: "رياضيات", icon: "📐", color: "#F59E0B" },
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
  return track.subjects.find((s) => s.name === subject)?.icon ?? "📘";
}
