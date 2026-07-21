/* ═══════════ طبقة تجريد مزوّد التقويم (Calendar Provider) ═══════════
   ▸ لماذا؟ ليعمل التقويم على التخزين المحليّ الآن، ويُضاف Google/Apple/Microsoft لاحقاً
     بلا لمس منطق الخطة — كلٌّ يُطبّع أحداثه لنفس CalendarEvent (source/externalId جاهزان).
   ▸ الآن: localCalendarProvider فقط (فوق calendarStore). المزوّدات الخارجية تنفّذ نفس الواجهة. */
import type { CalendarEvent, EventSource } from "./calendar";
import { loadCalendar, addCalendarEvent, updateCalendarEvent, removeCalendarEvent } from "./calendarStore";

export interface CalendarProvider {
  readonly source: EventSource;
  list(): CalendarEvent[] | Promise<CalendarEvent[]>;
  create(ev: CalendarEvent): CalendarEvent[] | Promise<CalendarEvent[]>;
  update(id: string, patch: Partial<CalendarEvent>): CalendarEvent[] | Promise<CalendarEvent[]>;
  remove(id: string): CalendarEvent[] | Promise<CalendarEvent[]>;
}

/* المزوّد المحليّ — مصدر الحقيقة الحاليّ. */
export const localCalendarProvider: CalendarProvider = {
  source: "local",
  list: () => loadCalendar(),
  create: (ev) => addCalendarEvent(ev),
  update: (id, patch) => updateCalendarEvent(id, patch),
  remove: (id) => removeCalendarEvent(id),
};
