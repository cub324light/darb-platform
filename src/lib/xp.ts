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
  desc: string;
}

export const BADGE_DEFS: BadgeDef[] = [
  { id: "first_session", label: "الشعلة الأولى",  icon: "🔥", desc: "أتممت أول جلسة تركيز" },
  { id: "streak_7",      label: "أسبوع منتظم",   icon: "📅", desc: "٧ أيام ستريك متتالية" },
  { id: "streak_30",     label: "الأسطورة",       icon: "🏆", desc: "٣٠ يوماً متتالياً" },
  { id: "hours_10",      label: "عشر ساعات",      icon: "⏱",  desc: "١٠ ساعات تركيز" },
  { id: "hours_50",      label: "خمسون ساعة",     icon: "💎", desc: "٥٠ ساعة تركيز" },
  { id: "silver_100",    label: "مئوي",           icon: "🥈", desc: "١٠٠ فضة" },
  { id: "silver_1000",   label: "ملك الفضة",      icon: "👑", desc: "١٠٠٠ فضة" },
  { id: "vault_10",      label: "صيّاد الأخطاء",  icon: "🔍", desc: "١٠ أخطاء في الخزنة" },
  { id: "sessions_20",   label: "مثابر",          icon: "💪", desc: "٢٠ جلسة مكتملة" },
];

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
  return ids;
}
