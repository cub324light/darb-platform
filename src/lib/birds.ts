/* ─── الطيور الرفيقة: البيانات واللوحات اللونية ───
   لكل طير لوحتان: ليلي (أسطوري متوهج) ونهاري (طبيعي دافئ) */

export type BirdId = "falcon" | "hoopoe" | "swan" | "raven" | "peacock" | "phoenix";

export interface BirdPalette {
  b1: string;   // تدرج الجسم — فاتح
  b2: string;   // تدرج الجسم — غامق
  w1: string;   // تدرج الجناح — فاتح
  w2: string;   // تدرج الجناح — غامق
  acc: string;  // لون مميز (قمة، صدر، عيون الذيل)
  beak: string; // المنقار
  glow: string; // توهج الظل
}

export interface BirdMeta {
  id: BirdId;
  name: string;
  nameEn: string;
  symbol: string;
  plan: "free" | "shaheen" | "anqa";
  planName: string;
  palette: { dark: BirdPalette; light: BirdPalette };
}

export const BIRDS: BirdMeta[] = [
  {
    id: "falcon",
    name: "الصقر",
    nameEn: "Falcon",
    symbol: "السرعة والحدة",
    plan: "free",
    planName: "مجاني",
    palette: {
      dark: { b1: "#60A5FA", b2: "#1E40AF", w1: "#3B82F6", w2: "#172554", acc: "#BFDBFE", beak: "#F59E0B", glow: "rgba(59,130,246,0.45)" },
      light: { b1: "#C49A6C", b2: "#8A5A2B", w1: "#A97842", w2: "#5C3D1A", acc: "#EFD9B4", beak: "#D97706", glow: "rgba(170,115,45,0.32)" },
    },
  },
  {
    id: "hoopoe",
    name: "الهدهد",
    nameEn: "Hoopoe",
    symbol: "الذكاء والبصيرة",
    plan: "shaheen",
    planName: "شاهين",
    palette: {
      dark: { b1: "#C4B5FD", b2: "#6D28D9", w1: "#312E81", w2: "#10082E", acc: "#F59E0B", beak: "#4C1D95", glow: "rgba(139,92,246,0.42)" },
      light: { b1: "#E8B57E", b2: "#BC7634", w1: "#3F3F46", w2: "#18181B", acc: "#F97316", beak: "#57534E", glow: "rgba(188,118,52,0.30)" },
    },
  },
  {
    id: "swan",
    name: "البجعة",
    nameEn: "Swan",
    symbol: "الجمال والصبر",
    plan: "shaheen",
    planName: "شاهين",
    palette: {
      dark: { b1: "#F0FBFF", b2: "#7DD3FC", w1: "#E0F2FE", w2: "#38BDF8", acc: "#06B6D4", beak: "#F59E0B", glow: "rgba(125,211,252,0.45)" },
      light: { b1: "#FFFFFF", b2: "#D8E1EC", w1: "#F8FAFC", w2: "#B6C2D2", acc: "#7C8DA3", beak: "#EA580C", glow: "rgba(148,163,184,0.35)" },
    },
  },
  {
    id: "raven",
    name: "الغراب",
    nameEn: "Raven",
    symbol: "الذكاء والغموض",
    plan: "shaheen",
    planName: "شاهين",
    palette: {
      dark: { b1: "#4B4B6A", b2: "#0B0B16", w1: "#2C2C44", w2: "#05050C", acc: "#8B5CF6", beak: "#71717A", glow: "rgba(139,92,246,0.38)" },
      light: { b1: "#5B5B66", b2: "#1C1C22", w1: "#44444E", w2: "#101014", acc: "#0EA5E9", beak: "#3F3F46", glow: "rgba(28,28,34,0.32)" },
    },
  },
  {
    id: "peacock",
    name: "الطاووس",
    nameEn: "Peacock",
    symbol: "الطموح",
    plan: "shaheen",
    planName: "شاهين",
    palette: {
      dark: { b1: "#38BDF8", b2: "#1E3A8A", w1: "#10B981", w2: "#053B2C", acc: "#F5B40A", beak: "#9CA3AF", glow: "rgba(16,185,129,0.40)" },
      light: { b1: "#2563EB", b2: "#1E3A8A", w1: "#059669", w2: "#054F3B", acc: "#D97706", beak: "#6B7280", glow: "rgba(5,150,105,0.32)" },
    },
  },
  {
    id: "phoenix",
    name: "الفينكس",
    nameEn: "Phoenix",
    symbol: "البعث والنخبة",
    plan: "anqa",
    planName: "عنقاء",
    palette: {
      dark: { b1: "#FDE68A", b2: "#F59E0B", w1: "#FB923C", w2: "#DC2626", acc: "#FEF3C7", beak: "#B45309", glow: "rgba(249,115,22,0.55)" },
      light: { b1: "#FBBF24", b2: "#D97706", w1: "#F97316", w2: "#B91C1C", acc: "#FDE68A", beak: "#92400E", glow: "rgba(217,119,6,0.42)" },
    },
  },
];

export function getBird(id?: string): BirdMeta {
  return BIRDS.find((b) => b.id === id) ?? BIRDS[0];
}
