/* ─── تحويل خطة المذاكرة (ScheduleEvent[]) إلى أحداث تقويم ───
   نوسّع التكرارات على مدى أيام قادمة، فكل جلسة مذاكرة تصبح حدثاً مستقلاً
   (يطابق متطلب «كل جلسة مذاكرة تنشأ كحدث مستقل»). */
import type { ScheduleEvent } from "@/lib/storage";
import { localDayKey } from "@/lib/storage";
import { occursOn } from "@/lib/schedule";
import type { CalEvent } from "./types";

/* ساعة (قد تكون 24) + تاريخ → Date محلي */
function atHour(date: string, hour: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  const base = new Date(y, m - 1, d, 0, 0, 0, 0);
  base.setHours(hour);
  return base;
}

export interface PlanToCalOptions {
  /** عدد الأيام القادمة لتوسيع التكرارات (افتراضي 14) */
  days?: number;
  /** ابدأ من هذا التاريخ (افتراضي اليوم) */
  fromDate?: Date;
  /** تضمين الأحداث المشغولة (busy) إضافةً للمذاكرة؟ (افتراضي: مذاكرة فقط) */
  includeBusy?: boolean;
}

export function planToCalEvents(
  events: ScheduleEvent[],
  opts: PlanToCalOptions = {},
): CalEvent[] {
  const days = opts.days ?? 14;
  const start = opts.fromDate ?? new Date();
  const includeBusy = opts.includeBusy ?? false;
  const out: CalEvent[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateKey = localDayKey(d);
    const dow = d.getDay();

    for (const ev of events) {
      if (ev.type !== "study" && !includeBusy) continue;
      if (!occursOn(ev, dateKey, dow)) continue;

      const title = ev.type === "study"
        ? `مذاكرة: ${ev.subject ?? "جلسة"}`
        : (ev.label ?? "مشغول");
      const description = ev.type === "study"
        ? "جلسة مذاكرة من منصة درب 🟦"
        : "وقت مشغول — من منصة درب";

      out.push({
        uid: `${ev.id}-${dateKey}@darb`,
        title,
        start: atHour(dateKey, ev.fromHour),
        end: atHour(dateKey, ev.toHour),
        description,
      });
    }
  }

  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
