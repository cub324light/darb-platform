/* ─── رؤى الأداء — منطق محض يُحسب من بيانات موجودة فقط ───
   لا UI هنا، ولا تخزين جديد: كله مشتقّ من DarbStats + سجل الجلسات.
   كل دالة قابلة للاختبار باستقلال. */
import { localDayKey, type DarbStats, type SessionLogEntry } from "./storage";

/* مفاتيح أيام للخلف بدءاً من start بعدد count (بتوقيت الجهاز المحلي) */
function dayKeysBack(start: number, count: number): string[] {
  const keys: string[] = [];
  for (let i = start; i < start + count; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(localDayKey(d));
  }
  return keys;
}

/* ── أنشط وقت دراسة: ذروة دقائق التركيز حسب ساعة اليوم ──
   يحوّل الساعة إلى فترة عربية متوافقة مع تفضيلات التعلّم. */
export type DayPeriod = "فجر" | "صباح" | "ظهر" | "مساء" | "ليل";

export function periodForHour(hour: number): DayPeriod {
  if (hour >= 3 && hour <= 5) return "فجر";
  if (hour >= 6 && hour <= 11) return "صباح";
  if (hour >= 12 && hour <= 15) return "ظهر";
  if (hour >= 16 && hour <= 20) return "مساء";
  return "ليل"; // 21..2
}

export function mostActiveTime(log: SessionLogEntry[]): { period: DayPeriod; mins: number } | null {
  if (!log.length) return null;
  const byPeriod: Record<string, number> = {};
  for (const e of log) {
    const h = new Date(e.ts).getHours();
    const p = periodForHour(h);
    byPeriod[p] = (byPeriod[p] ?? 0) + e.focusMins;
  }
  const top = Object.entries(byPeriod).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] <= 0) return null;
  return { period: top[0] as DayPeriod, mins: top[1] };
}

/* ── أطول ستريك تاريخي: أطول تسلسل أيام متتالية في sessionDays ──
   يُحسب لحظياً — لا تخزين إضافي. */
export function longestStreak(stats: DarbStats): number {
  const days = [...new Set(stats.sessionDays)].sort(); // "YYYY-MM-DD" يفرز نصياً صحيحاً
  if (!days.length) return 0;
  const dayNum = (s: string) => Math.round(new Date(s + "T12:00:00").getTime() / 86400000);
  let best = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    if (dayNum(days[i]) - dayNum(days[i - 1]) === 1) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

/* عدد الأيام النشطة ضمن آخر n يوم */
export function activeDaysWithin(stats: DarbStats, n: number): number {
  const dayMins = stats.dayMins ?? {};
  return dayKeysBack(0, n).filter((k) => (dayMins[k] ?? 0) > 0).length;
}

/* ── الجاهزية المقدّرة — مؤشر إرشادي شفّاف (0–100) ──
   مزيج: تقدّم المسار (45٪) + متوسط إتقان المهارات (45٪) + انتظام آخر شهر (10٪).
   avgSkillScore يأتي من skillProgress (محسوب أصلاً في الصفحة). */
export type ReadinessLabel = "مبكّر" | "في الطريق" | "شبه جاهز" | "جاهز";

export function estimateReadiness(
  stats: DarbStats,
  avgSkillScore: number,
): { pct: number; label: ReadinessLabel } {
  const trackProgress = Math.max(0, Math.min(100, stats.trackProgress ?? 0));
  const skill = Math.max(0, Math.min(100, avgSkillScore || 0));
  const activity = Math.min(100, Math.round((activeDaysWithin(stats, 30) / 30) * 100));
  const pct = Math.round(0.45 * trackProgress + 0.45 * skill + 0.10 * activity);
  const label: ReadinessLabel =
    pct >= 85 ? "جاهز" : pct >= 60 ? "شبه جاهز" : pct >= 30 ? "في الطريق" : "مبكّر";
  return { pct, label };
}

/* أيام متبقية لموعد الاختبار (سالب = فات) أو null */
export function daysUntil(examDate?: string | null): number | null {
  if (!examDate) return null;
  try {
    const target = new Date(examDate + "T12:00:00").getTime();
    const today = new Date(); today.setHours(12, 0, 0, 0);
    return Math.round((target - today.getTime()) / 86400000);
  } catch { return null; }
}
