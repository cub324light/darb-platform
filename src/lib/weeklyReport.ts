/* ─── تقرير أسبوعي تلقائي — يُحسب من الإحصاءات وسجل الجلسات الموجودة ─── */
import { localDayKey, computeStreak, type DarbStats, type SessionLogEntry } from "./storage";

export interface WeeklyReportData {
  mins: number;          // دقائق التركيز هذا الأسبوع
  prevMins: number;      // الأسبوع السابق
  deltaPct: number | null;
  sessions: number;      // جلسات هذا الأسبوع
  streak: number;        // الستريك الحالي
  activeDays: number;    // أيام نشطة من 7
  topSubject: { name: string; mins: number } | null;
  lowSubject: { name: string; mins: number } | null;
  hasData: boolean;
}

function dayKeysBack(start: number, count: number): string[] {
  const keys: string[] = [];
  for (let i = start; i < start + count; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(localDayKey(d));
  }
  return keys;
}

export function computeWeeklyReport(stats: DarbStats, log: SessionLogEntry[]): WeeklyReportData {
  const dayMins = stats.dayMins ?? {};
  const sum = (keys: string[]) => keys.reduce((n, k) => n + (dayMins[k] ?? 0), 0);

  const thisKeys = dayKeysBack(0, 7);
  const mins = sum(thisKeys);
  const prevMins = sum(dayKeysBack(7, 7));
  const activeDays = thisKeys.filter((k) => (dayMins[k] ?? 0) > 0).length;

  const weekAgo = Date.now() - 7 * 86400000;
  const recent = log.filter((e) => e.ts >= weekAgo);
  const bySubject: Record<string, number> = {};
  for (const e of recent) {
    if (e.subject) bySubject[e.subject] = (bySubject[e.subject] ?? 0) + e.focusMins;
  }
  const subjArr = Object.entries(bySubject)
    .map(([name, m]) => ({ name, mins: m }))
    .sort((a, b) => b.mins - a.mins);

  const deltaPct = prevMins > 0
    ? Math.round(((mins - prevMins) / prevMins) * 100)
    : (mins > 0 ? 100 : null);

  return {
    mins,
    prevMins,
    deltaPct,
    sessions: recent.length,
    streak: computeStreak(stats),
    activeDays,
    topSubject: subjArr[0] ?? null,
    lowSubject: subjArr.length > 1 ? subjArr[subjArr.length - 1] : null,
    hasData: mins > 0 || recent.length > 0,
  };
}

export function fmtMins(m: number): string {
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} س ${r} د` : `${h} س`;
}
