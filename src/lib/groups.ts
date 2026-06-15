/* قروبات المجلس — مصدر واحد مشترك بين صفحة المجلس ولوحة الأدمن */

export interface ChatGroup {
  id: string;
  name: string;
  icon: string;
  description: string;
  trackId?: string;
}

export const CHAT_GROUPS: ChatGroup[] = [
  { id: "general",       name: "عام",          icon: "💬", description: "نقاش عام لجميع الطلاب" },
  { id: "tahsili",       name: "تحصيلي",       icon: "📚", description: "طلاب مسار التحصيلي",          trackId: "تحصيلي" },
  { id: "tahsili-early", name: "تحصيلي مبكر",  icon: "🌱", description: "طلاب التحصيلي المبكر",        trackId: "تحصيلي مبكر" },
  { id: "qudurat",       name: "قدرات",        icon: "💡", description: "طلاب مسار القدرات",            trackId: "قدرات" },
  { id: "cpc",           name: "أرامكو CPC",   icon: "🏆", description: "Computer Programming Contest", trackId: "CPC" },
  { id: "itc",           name: "ITC",          icon: "💻", description: "طلاب اختبار ITC",              trackId: "ITC" },
  { id: "ielts",         name: "آيلتس",        icon: "🌍", description: "IELTS preparation group",      trackId: "ايلتس" },
  { id: "step",          name: "ستيب",         icon: "📖", description: "STEP preparation group",       trackId: "ستيب" },
  { id: "toefl",         name: "توفل",         icon: "🗽", description: "TOEFL preparation group",      trackId: "توفل" },
  { id: "duolingo",      name: "دووليجو",      icon: "🦉", description: "Duolingo English Test",        trackId: "دوليقو" },
];

/* تسمية مقروءة للقروب من معرّفه (للأدمن) */
export function groupName(id: string): string {
  if (id === "all") return "الكل";
  return CHAT_GROUPS.find((g) => g.id === id)?.name ?? id;
}
