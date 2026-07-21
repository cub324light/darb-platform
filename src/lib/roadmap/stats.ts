/* ═══════════ محرّك الإحصائيات (Stats Engine) — نقيٌّ ١٠٠٪ · صادق ═══════════
   ▸ لماذا؟ صفحة إحصائياتٍ جميلة (نمط GitHub) تبدأ ببطاقة «هذا الأسبوع» ثم Heatmap فرسوم.
   ▸ المصدر: دقائق اليوم (dayMins) + سجلّ الجلسات (StudySessionLog) — يجمّعها القارئ.
   ▸ الهدف: ملخّصٌ أسبوعيّ + خريطة نشاط + قممٌ (أكثر مادة/ساعة/اختبار · أطول سلسلة · أفضل أسبوع).
   ▸ الصدق: أيّ إحصاءٍ بلا بياناتٍ حقيقية ⇒ available:false (لا رقمٌ مخترَع). أكثر مادة/ساعة/اختبار
     تحتاج جلساتٍ مسجّلة؛ قبلها حالةٌ فارغةٌ صادقة. */
import { daysBetween, addDays } from "./metrics";
import { ROADMAP_TUNING } from "./config";
import type { StudySessionLog } from "./session";

export interface StatValue<T> { available: boolean; value: T | null; }
const some = <T,>(v: T): StatValue<T> => ({ available: true, value: v });
const none = <T,>(): StatValue<T> => ({ available: false, value: null });

export interface WeekSummary { hours: number; sessions: number; streakDays: number; commitmentPct: number | null; }
export interface HeatCell { day: string; mins: number; level: 0 | 1 | 2 | 3 | 4; }
export interface StatsResult {
  week: WeekSummary;
  heatmap: HeatCell[];
  monthHours: number;
  vsLastMonthPct: StatValue<number>;
  bestWeek: StatValue<{ start: string; hours: number }>;
  breakDays: number;
  longestStreak: number;
  topSubject: StatValue<{ subject: string; mins: number }>;
  topHour: StatValue<{ hour: number; mins: number }>;
  topExam: StatValue<{ examId: string; mins: number }>;
}

const round1 = (x: number): number => Math.round(x * 10) / 10;
const levelOf = (mins: number, t: readonly [number, number, number, number]): HeatCell["level"] =>
  mins >= t[3] ? 4 : mins >= t[2] ? 3 : mins >= t[1] ? 2 : mins >= t[0] ? 1 : 0;

function maxEntry<K extends string>(m: Record<K, number>): { key: K; mins: number } | null {
  let best: { key: K; mins: number } | null = null;
  for (const k in m) if (!best || m[k] > best.mins) best = { key: k, mins: m[k] };
  return best;
}

export function computeStats(
  i: { dayMins: Record<string, number>; sessions: StudySessionLog[]; today: string; plannedDailyMins?: number | null },
  cfg = ROADMAP_TUNING.stats,
): StatsResult {
  const dm = i.dayMins ?? {};
  const minsOn = (day: string): number => dm[day] ?? 0;

  /* ── هذا الأسبوع (آخر ٧ أيام حتى اليوم) ── */
  const weekDays = Array.from({ length: 7 }, (_, k) => addDays(i.today, -(6 - k)));
  const weekMins = weekDays.reduce((a, d) => a + minsOn(d), 0);
  const weekSessions = i.sessions.filter((s) => {
    const d = new Date(s.startedAt).toISOString().slice(0, 10);
    return d >= weekDays[0] && d <= i.today;
  }).length;
  let streakDays = 0;
  for (let k = 0; ; k++) { if (minsOn(addDays(i.today, -k)) > 0) streakDays++; else break; }
  const commitmentPct = i.plannedDailyMins && i.plannedDailyMins > 0
    ? Math.min(100, Math.round((weekMins / (i.plannedDailyMins * 7)) * 100)) : null;
  const week: WeekSummary = { hours: round1(weekMins / 60), sessions: weekSessions, streakDays, commitmentPct };

  /* ── Heatmap (آخر heatmapDays يوماً) ── */
  const start = addDays(i.today, -(cfg.heatmapDays - 1));
  const heatmap: HeatCell[] = [];
  for (let k = 0; k < cfg.heatmapDays; k++) {
    const day = addDays(start, k); const mins = minsOn(day);
    heatmap.push({ day, mins, level: levelOf(mins, cfg.heatThresholds) });
  }

  /* ── الشهر + مقارنة بالسابق ── */
  const monthKey = (d: string) => d.slice(0, 7);
  const [yy, mm] = i.today.split("-").map(Number);
  const thisM = `${yy}-${String(mm).padStart(2, "0")}`;
  const prevM = mm === 1 ? `${yy - 1}-12` : `${yy}-${String(mm - 1).padStart(2, "0")}`;
  let thisMonthMins = 0, prevMonthMins = 0;
  for (const d in dm) { if (monthKey(d) === thisM) thisMonthMins += dm[d]; else if (monthKey(d) === prevM) prevMonthMins += dm[d]; }
  const monthHours = round1(thisMonthMins / 60);
  const vsLastMonthPct = prevMonthMins > 0
    ? some(Math.round(((thisMonthMins - prevMonthMins) / prevMonthMins) * 100)) : none<number>();

  /* ── أفضل أسبوع (نافذة ٧ أيام متحرّكة على مدى الـHeatmap) ── */
  let bestSum = 0, bestStart = "";
  for (let k = 0; k + 7 <= heatmap.length; k++) {
    const s = heatmap.slice(k, k + 7).reduce((a, c) => a + c.mins, 0);
    if (s > bestSum) { bestSum = s; bestStart = heatmap[k].day; }
  }
  const bestWeek = bestSum > 0 ? some({ start: bestStart, hours: round1(bestSum / 60) }) : none<{ start: string; hours: number }>();

  /* ── أطول سلسلة + أيام الانقطاع (آخر ٣٠ يوماً) ── */
  const activeDays = Object.keys(dm).filter((d) => dm[d] > 0).sort();
  let longestStreak = 0, run = 0, prev = "";
  for (const d of activeDays) { run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1; longestStreak = Math.max(longestStreak, run); prev = d; }
  let breakDays = 0; let sawActive = false;
  for (let k = 29; k >= 0; k--) { const day = addDays(i.today, -k); const on = minsOn(day) > 0; if (on) sawActive = true; else if (sawActive) breakDays++; }

  /* ── القمم من سجلّ الجلسات (تحتاج بياناتٍ حقيقية) ── */
  const bySubject: Record<string, number> = {}, byHour: Record<string, number> = {}, byExam: Record<string, number> = {};
  for (const s of i.sessions) {
    if (s.subject) bySubject[s.subject] = (bySubject[s.subject] ?? 0) + s.durationMins;
    const hr = String(new Date(s.startedAt).getHours());
    byHour[hr] = (byHour[hr] ?? 0) + s.durationMins;
    byExam[s.examId] = (byExam[s.examId] ?? 0) + s.durationMins;
  }
  const ts = maxEntry(bySubject), th = maxEntry(byHour), te = maxEntry(byExam);
  const topSubject = ts ? some({ subject: ts.key, mins: ts.mins }) : none<{ subject: string; mins: number }>();
  const topHour = th ? some({ hour: Number(th.key), mins: th.mins }) : none<{ hour: number; mins: number }>();
  const topExam = te ? some({ examId: te.key, mins: te.mins }) : none<{ examId: string; mins: number }>();

  return { week, heatmap, monthHours, vsLastMonthPct, bestWeek, breakDays, longestStreak, topSubject, topHour, topExam };
}
