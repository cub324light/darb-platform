/* ─── نظام العودة (Retention) — كل منطق نقاط العودة اليومية في مكان واحد ───
   لا UI هنا. يقرأ من التخزين الموجود (DarbStats/سجل الجلسات) ويدير حالة خفيفة
   في مفتاحين: darb_daily (تسجيل اليوم) و darb_retention (آخر فتح/معالم/أسبوعي/استعادة).
   كل دالة نقية وقابلة للاختبار، وتُحرس بـ typeof window. */
import {
  loadStats, loadUser, localDayKey, computeStreak, addSessionDay,
  type DarbStats,
} from "./storage";

/* ── أدوات تاريخ ── */
const DAY = 86400000;
function dayKeyOffset(n: number): string { const d = new Date(); d.setDate(d.getDate() - n); return localDayKey(d); }
function daysBetween(a: string, b: string): number {
  const ta = new Date(a + "T12:00:00").getTime();
  const tb = new Date(b + "T12:00:00").getTime();
  return Math.round((tb - ta) / DAY);
}
/* معرّف أسبوع ISO — للبوابة «مرة كل أسبوع» */
export function weekId(d: Date = new Date()): string {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (dt.getUTCDay() + 6) % 7;          // الإثنين = 0
  dt.setUTCDate(dt.getUTCDate() - dayNum + 3);       // خميس هذا الأسبوع
  const firstThu = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((dt.getTime() - firstThu.getTime()) / DAY - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/* ════════ 1) تسجيل اليوم (Daily Check-in) ════════ */
export interface DailyCheckin { day: string; goalHours: number; subject: string; }
const DAILY_KEY = "darb_daily";

export function loadDailyCheckin(): DailyCheckin | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as DailyCheckin;
    return d.day === localDayKey() ? d : null; // اليوم فقط
  } catch { return null; }
}
export function saveDailyCheckin(goalHours: number, subject: string): void {
  try { localStorage.setItem(DAILY_KEY, JSON.stringify({ day: localDayKey(), goalHours, subject })); } catch {}
}
/* تخطّي تسجيل اليوم — لا نُلحّ على الطالب مجدداً اليوم */
export function skipDailyCheckin(): void {
  try { localStorage.setItem(DAILY_KEY, JSON.stringify({ day: localDayKey(), goalHours: 0, subject: "" })); } catch {}
}
/* يحتاج تسجيلاً إن كان مستخدماً مكتمل التهيئة ولم يسجّل اليوم */
export function needsDailyCheckin(): boolean {
  const u = loadUser();
  if (!u?.onboarded) return false;
  return loadDailyCheckin() === null;
}

/* ════════ حالة العودة العامة ════════ */
interface RetentionState {
  lastOpen?: string;          // YYYY-MM-DD — آخر يوم فُتح فيه الداشبورد
  milestonesSeen?: number[];  // معالم المسار المحتفى بها [25,50,75,100]
  weeklySeenWeek?: string;    // آخر أسبوع عُرض فيه التقرير
  recoveryLastUsed?: string;  // آخر استخدام لبطاقة استعادة الستريك
}
const RET_KEY = "darb_retention";
function loadRet(): RetentionState {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(RET_KEY) ?? "{}") as RetentionState; } catch { return {}; }
}
function saveRet(s: RetentionState): void {
  try { localStorage.setItem(RET_KEY, JSON.stringify(s)); } catch {}
}

/* ════════ 5) الغياب (Absence) ════════
   عدد الأيام منذ آخر فتح. يُقرأ قبل recordOpenToday. */
export function daysAway(): number {
  const last = loadRet().lastOpen;
  if (!last) return 0;            // أول مرة — لا ترحيب كاذب
  const diff = daysBetween(last, localDayKey());
  return diff > 0 ? diff : 0;
}
export function recordOpenToday(): void {
  const s = loadRet();
  s.lastOpen = localDayKey();
  saveRet(s);
}
/* ملخّص «ما فاتك» للترحيب بالعودة */
export function comebackSummary(): { daysAway: number; streakBroke: boolean; dueCards: number; lastStudyDaysAgo: number | null } {
  const stats = loadStats();
  const away = daysAway();
  const brk = streakBreak(stats);
  let dueCards = 0;
  try {
    const cards = JSON.parse(localStorage.getItem("darb_cards") ?? "[]") as { dueDate?: number }[];
    const now = Date.now();
    dueCards = Array.isArray(cards) ? cards.filter((c) => (c.dueDate ?? Infinity) <= now).length : 0;
  } catch {}
  const days = [...new Set(stats.sessionDays)].sort();
  const last = days[days.length - 1];
  const lastStudyDaysAgo = last ? daysBetween(last, localDayKey()) : null;
  return { daysAway: away, streakBroke: brk.broke, dueCards, lastStudyDaysAgo };
}

/* ════════ 3) استعادة الستريك (Streak Recovery) ════════ */
const RECOVERY_COOLDOWN_DAYS = 30;
/* هل انكسر ستريك حقيقي؟ (فات الأمس فقط، وكان هناك سلسلة ≥ يومين) */
export function streakBreak(stats: DarbStats): { broke: boolean; missedDay: string | null; priorStreak: number } {
  const set = new Set(stats.sessionDays);
  const today = localDayKey();
  const yesterday = dayKeyOffset(1);
  const dayBefore = dayKeyOffset(2);
  // الستريك سليم إن وُجدت جلسة اليوم أو الأمس
  if (set.has(today) || set.has(yesterday)) return { broke: false, missedDay: null, priorStreak: 0 };
  // كسر: آخر جلسة كانت أول أمس (فات الأمس)، ونحسب السلسلة المنتهية عندها
  if (!set.has(dayBefore)) return { broke: false, missedDay: null, priorStreak: 0 };
  let run = 0;
  const d = new Date(); d.setDate(d.getDate() - 2);
  while (set.has(localDayKey(d))) { run++; d.setDate(d.getDate() - 1); }
  if (run < 2) return { broke: false, missedDay: null, priorStreak: 0 };
  return { broke: true, missedDay: yesterday, priorStreak: run };
}
export function canUseRecovery(): boolean {
  const last = loadRet().recoveryLastUsed;
  if (!last) return true;
  return daysBetween(last, localDayKey()) >= RECOVERY_COOLDOWN_DAYS;
}
/* يطبّق الاستعادة: يضيف اليوم المفقود فيتّصل الستريك، ويسجّل وقت الاستخدام */
export function applyRecovery(): { ok: boolean; restored: number } {
  const stats = loadStats();
  const brk = streakBreak(stats);
  if (!brk.broke || !brk.missedDay || !canUseRecovery()) return { ok: false, restored: 0 };
  addSessionDay(brk.missedDay);
  const s = loadRet(); s.recoveryLastUsed = localDayKey(); saveRet(s);
  return { ok: true, restored: computeStreak(loadStats()) };
}

/* ════════ 4) معالم المسار (Milestones) ════════ */
export const MILESTONES = [25, 50, 75, 100] as const;
/* أعلى معلم تجاوزه الطالب ولم يُحتفل به بعد (أو null) */
export function pendingMilestone(stats: DarbStats): number | null {
  const pct = stats.trackProgress ?? 0;
  const seen = new Set(loadRet().milestonesSeen ?? []);
  let hit: number | null = null;
  for (const m of MILESTONES) if (pct >= m && !seen.has(m)) hit = m;
  return hit;
}
export function markMilestoneSeen(pct: number): void {
  const s = loadRet();
  const seen = new Set(s.milestonesSeen ?? []);
  // علِّم كل المعالم حتى هذا المستوى لتفادي تتابع الاحتفالات
  for (const m of MILESTONES) if (m <= pct) seen.add(m);
  s.milestonesSeen = [...seen].sort((a, b) => a - b);
  saveRet(s);
}

/* ════════ 2) التقرير الأسبوعي (Weekly — كل جمعة) ════════ */
export function shouldShowWeekly(hasData: boolean): boolean {
  if (!hasData) return false;
  const dow = new Date().getDay();          // الجمعة = 5، السبت = 6
  if (dow !== 5 && dow !== 6) return false;   // نهاية الأسبوع السعودي
  return loadRet().weeklySeenWeek !== weekId();
}
export function markWeeklySeen(): void {
  const s = loadRet(); s.weeklySeenWeek = weekId(); saveRet(s);
}
