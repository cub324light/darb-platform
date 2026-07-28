/* ═══════════ 🗓️ جدول اليوم — محرّكٌ نقيّ ═══════════
   ▸ `ScheduleEvent` حدثٌ متكرّر (يوميّ/أسبوعيّ/أيامٌ مختارة/مرّةً واحدة)، فمعرفةُ «ما جدول
     يومي؟» تحتاج توسيعَ التكرار على تاريخٍ بعينه. هذا المنطق كان مكرّراً في موضعين:
     `DayScheduler.tsx:getEventsForDate` (داخل مكوّن `"use client"`) و`calendar/plan.ts:occursOn`.
     نسختان تتفرّقان مع الوقت — فوحّدناهما هنا.
   ▸ نقيٌّ 100٪: لا localStorage ولا window ولا Date «الآن». التاريخ يأتي وسيطاً دائماً. */
import type { ScheduleEvent } from "@/lib/storage";

/** يوم الأسبوع (0 الأحد – 6 السبت) لتاريخٍ نصّيّ. ظهراً لا منتصف الليل: يتجنّب انزياح المنطقة الزمنية. */
export function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00`).getDay();
}

/** هل ينطبق حدثٌ متكرّر على هذا التاريخ؟ */
export function occursOn(ev: ScheduleEvent, date: string, dow = dayOfWeek(date)): boolean {
  const r = ev.recurrence;
  if (r.kind === "once") return r.date === date;
  if (r.kind === "weekly") return r.dayOfWeek === dow;
  if (r.kind === "daily") return r.fromDate <= date;
  if (r.kind === "multiweekly") return r.days.includes(dow);
  return false;
}

/** أحداثُ يومٍ بعينه مرتّبةً بالوقت. */
export function getEventsForDate(date: string, events: ScheduleEvent[]): ScheduleEvent[] {
  const dow = dayOfWeek(date);
  return events.filter((ev) => occursOn(ev, date, dow)).sort((a, b) => a.fromHour - b.fromHour);
}

/** دقائقُ المذاكرة المجدولة في يوم — لقياس حِمل اليوم في عرض الأسبوع. */
export function studyMinutesOn(date: string, events: ScheduleEvent[]): number {
  return getEventsForDate(date, events)
    .filter((e) => e.type === "study")
    .reduce((sum, e) => sum + Math.max(0, (e.toHour - e.fromHour) * 60), 0);
}

/** الجلسة الجارية في ساعةٍ عشرية بعينها (أو `null`). */
export function currentEvent(events: ScheduleEvent[], hour: number): ScheduleEvent | null {
  return events.find((e) => hour >= e.fromHour && hour < e.toHour) ?? null;
}

/** أوّلُ جلسةٍ قادمة بعد ساعةٍ عشرية بعينها (أو `null`). الأحداث مرتّبةٌ سلفاً. */
export function nextEvent(events: ScheduleEvent[], hour: number): ScheduleEvent | null {
  return events.find((e) => e.fromHour > hour) ?? null;
}
