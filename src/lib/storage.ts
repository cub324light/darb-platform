/* ─── تخزين حقيقي في localStorage — صفر بيانات وهمية ─── */
import type { TrackId } from "./tracks";

export interface DarbUser {
  name: string;
  track: TrackId;
  examDate?: string;
  onboarded: boolean;
}

export interface DarbStats {
  silver: number;
  totalFocusMins: number;
  sessionDays: string[]; // أيام فيها جلسة منجزة "YYYY-MM-DD"
  sessionsCount: number;
  todayFocusMins: number;
  todayKey: string;
}

const USER_KEY = "darb_user";
const STATS_KEY = "darb_stats";

const todayKey = () => new Date().toISOString().slice(0, 10);

/* ── المستخدم ── */
export function loadUser(): DarbUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as DarbUser) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: DarbUser) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

/* ── الإحصاءات ── */
const EMPTY_STATS: DarbStats = {
  silver: 0,
  totalFocusMins: 0,
  sessionDays: [],
  sessionsCount: 0,
  todayFocusMins: 0,
  todayKey: "",
};

export function loadStats(): DarbStats {
  if (typeof window === "undefined") return { ...EMPTY_STATS };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const s = raw ? ({ ...EMPTY_STATS, ...JSON.parse(raw) } as DarbStats) : { ...EMPTY_STATS };
    if (s.todayKey !== todayKey()) {
      s.todayFocusMins = 0;
      s.todayKey = todayKey();
    }
    return s;
  } catch {
    return { ...EMPTY_STATS };
  }
}

function saveStats(s: DarbStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {}
}

/* تُستدعى عند إكمال جلسة Orbit كاملة */
export function recordSession(focusMins: number, silverEarned: number): DarbStats {
  const s = loadStats();
  const day = todayKey();
  s.silver += silverEarned;
  s.totalFocusMins += focusMins;
  s.todayFocusMins += focusMins;
  s.todayKey = day;
  s.sessionsCount += 1;
  if (!s.sessionDays.includes(day)) s.sessionDays.push(day);
  saveStats(s);
  return s;
}

/* ستريك حقيقي: أيام متتالية تنتهي اليوم أو أمس */
export function computeStreak(stats: DarbStats): number {
  const days = new Set(stats.sessionDays);
  if (days.size === 0) return 0;
  const d = new Date();
  const key = (dt: Date) => dt.toISOString().slice(0, 10);
  // لو ما فيه جلسة اليوم، نبدأ العد من أمس
  if (!days.has(key(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(key(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/* ── تخزين عام لأي قائمة (الخزنة / المراجعة / الدروس) ── */
export function loadList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function saveList<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

/* ── الثيم ── */
export type Theme = "dark" | "light";

export function loadTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("darb_theme") as Theme) || "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("darb_theme", theme);
  } catch {}
}

export function resetAll() {
  try {
    ["darb_user", "darb_stats", "darb_vault", "darb_cards", "darb_lessons", "darb_posts"].forEach((k) =>
      localStorage.removeItem(k)
    );
  } catch {}
}
