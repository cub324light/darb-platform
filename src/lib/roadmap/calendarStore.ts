/* ═══════════ محوّل تخزين التقويم — طبقة IO رقيقة (المحرّك يبقى نقيّاً) ═══════════
   الوحيد الذي يلمس التخزين لأحداث التقويم. لا منطق هنا (المنطق في calendar.ts). */
import type { CalendarEvent } from "./calendar";

const KEY = "darb_calendar";

export function loadCalendar(): CalendarEvent[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(KEY); const arr = raw ? JSON.parse(raw) : null; return Array.isArray(arr) ? arr : []; }
  catch { return []; }
}

export function saveCalendar(events: CalendarEvent[]): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(events)); } catch { /* تجاهل تجاوز الحصّة */ }
}

export function addCalendarEvent(ev: CalendarEvent): CalendarEvent[] {
  const next = [...loadCalendar(), ev];
  saveCalendar(next); return next;
}

export function updateCalendarEvent(id: string, patch: Partial<CalendarEvent>): CalendarEvent[] {
  const next = loadCalendar().map((e) => (e.id === id ? { ...e, ...patch } : e));
  saveCalendar(next); return next;
}

export function removeCalendarEvent(id: string): CalendarEvent[] {
  const next = loadCalendar().filter((e) => e.id !== id);
  saveCalendar(next); return next;
}
