import type { DarbStats } from "./storage";

export interface Level {
  name: string;
  minXp: number;
  color: string;
  icon: string;
}

export const LEVELS: Level[] = [
  { name: "مبتدئ",  minXp: 0,    color: "#64748B", icon: "○" },
  { name: "طالب",   minXp: 200,  color: "#2563EB", icon: "◈" },
  { name: "متمكّن", minXp: 600,  color: "#7C3AED", icon: "◉" },
  { name: "محترف",  minXp: 1500, color: "#D97706", icon: "✦" },
  { name: "خبير",   minXp: 3500, color: "#DC2626", icon: "★" },
];

export interface BadgeDef {
  id: string;
  label: string;
  icon: string;
  desc: string;   // كيف تحصل عليها
  goal: number;   // الهدف المطلوب
  unit: string;   // وحدة القياس
}

export const BADGE_DEFS: BadgeDef[] = [
  { id: "first_session", label: "الشعلة الأولى",  icon: "🔥", desc: "أتمم أول جلسة تركيز",        goal: 1,    unit: "جلسة" },
  { id: "streak_7",      label: "أسبوع منتظم",   icon: "📅", desc: "ذاكر 7 أيام متتالية",         goal: 7,    unit: "يوم" },
  { id: "streak_30",     label: "الأسطورة",       icon: "🏆", desc: "ذاكر 30 يوماً متتالياً",      goal: 30,   unit: "يوم" },
  { id: "hours_10",      label: "عشر ساعات",      icon: "⏱",  desc: "اجمع 10 ساعات تركيز",         goal: 10,   unit: "ساعة" },
  { id: "hours_50",      label: "خمسون ساعة",     icon: "💎", desc: "اجمع 50 ساعة تركيز",          goal: 50,   unit: "ساعة" },
  { id: "silver_100",    label: "مئوي",           icon: "🥈", desc: "اجمع 100 فضة",                goal: 100,  unit: "فضة" },
  { id: "silver_1000",   label: "ملك الفضة",      icon: "👑", desc: "اجمع 1000 فضة",               goal: 1000, unit: "فضة" },
  { id: "vault_10",      label: "صيّاد الأخطاء",  icon: "🔍", desc: "سجّل 10 أخطاء في الخزنة",     goal: 10,   unit: "خطأ" },
  { id: "sessions_20",   label: "مثابر",          icon: "💪", desc: "أكمل 20 جلسة تركيز",          goal: 20,   unit: "جلسة" },
  { id: "first_plan",    label: "أول خطة",        icon: "📋", desc: "طبّق خطة دويرب على جدولك",      goal: 1,    unit: "خطة" },
  { id: "hours_100",     label: "مئة ساعة",       icon: "🏅", desc: "اجمع 100 ساعة تركيز",          goal: 100,  unit: "ساعة" },
  { id: "track_complete",label: "أتممت المسار",   icon: "🎓", desc: "أكمل 80٪ من مسارك",            goal: 80,   unit: "٪" },
];

/* القيمة الحالية للطالب تجاه كل شارة (للشريط) */
export function getBadgeCurrent(id: string, stats: DarbStats, vaultCount: number): number {
  const streak = computeStreakDays(stats);
  const hours = Math.floor(stats.totalFocusMins / 60);
  switch (id) {
    case "first_session": return Math.min(stats.sessionsCount, 1);
    case "streak_7":
    case "streak_30":     return streak;
    case "hours_10":
    case "hours_50":
    case "hours_100":     return hours;
    case "silver_100":
    case "silver_1000":   return stats.silver;
    case "vault_10":      return vaultCount;
    case "sessions_20":   return stats.sessionsCount;
    case "first_plan":    return Math.min(stats.plansCount ?? 0, 1);
    case "track_complete":return stats.trackProgress ?? 0;
    default:              return 0;
  }
}

export function computeXP(stats: DarbStats): number {
  return (
    Math.floor(stats.totalFocusMins * 2) +
    stats.sessionsCount * 15 +
    stats.silver * 3
  );
}

function computeStreakDays(stats: DarbStats): number {
  const days = new Set(stats.sessionDays);
  if (!days.size) return 0;
  const d = new Date();
  const key = (dt: Date) => dt.toISOString().slice(0, 10);
  if (!days.has(key(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(key(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

export function getLevel(xp: number): Level & { next?: Level; progress: number } {
  let current = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.minXp) current = l; }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1];
  const progress = next
    ? Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100)
    : 100;
  return { ...current, next, progress };
}

export function getUnlockedBadgeIds(stats: DarbStats, vaultCount: number): string[] {
  const ids: string[] = [];
  const streak = computeStreakDays(stats);
  if (stats.sessionsCount >= 1)        ids.push("first_session");
  if (streak >= 7)                      ids.push("streak_7");
  if (streak >= 30)                     ids.push("streak_30");
  if (stats.totalFocusMins >= 600)      ids.push("hours_10");
  if (stats.totalFocusMins >= 3000)     ids.push("hours_50");
  if (stats.silver >= 100)              ids.push("silver_100");
  if (stats.silver >= 1000)             ids.push("silver_1000");
  if (vaultCount >= 10)                 ids.push("vault_10");
  if (stats.sessionsCount >= 20)        ids.push("sessions_20");
  if ((stats.plansCount ?? 0) >= 1)    ids.push("first_plan");
  if (stats.totalFocusMins >= 6000)    ids.push("hours_100");
  if ((stats.trackProgress ?? 0) >= 80) ids.push("track_complete");
  return ids;
}
