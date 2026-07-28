/* ═══════════ محوّل تخزين التقويم — طبقة IO رقيقة (المحرّك يبقى نقيّاً) ═══════════
   الوحيد الذي يلمس التخزين لأحداث التقويم. لا منطق هنا (المنطق في calendar.ts). */
import type { CalendarEvent } from "./calendar";

/* ⚠️ كان هذا المفتاح `darb_calendar` — وهو نفسه مفتاح `saveCalendarConfig` في `storage.ts`
   (تفضيلات التقويم الدراسي: نوع الطالب/المنطقة/سنة التخرّج). مخزنان مختلفا الشكل على مفتاحٍ
   واحد: كائنٌ ومصفوفة. فمَن حفظ تفضيلاته محا أحداث تقويمه (`Array.isArray` ⇒ `[]`)، ومَن
   أضاف حدثاً محا تفضيلاته (فتُفقد إشارات «اختبارات مدرسية/إجازة» في الاستراتيجية بصمت).
   الأحداث الآن على مفتاحها الخاصّ، والتفضيلات تبقى على القديم. */
const KEY = "darb_calendar_events";
const LEGACY_KEY = "darb_calendar";

/** ترحيلٌ لمرّةٍ واحدة: إن كان المفتاح القديم يحمل مصفوفةً فهي أحداثٌ لا تفضيلات. */
function migrateLegacy(): CalendarEvent[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null; // كائنٌ ⇒ تفضيلاتٌ، لا تلمسها
    localStorage.setItem(KEY, raw);
    localStorage.removeItem(LEGACY_KEY);     // يُخلي المفتاح للتفضيلات
    return parsed as CalendarEvent[];
  } catch { return null; }
}

export function loadCalendar(): CalendarEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return migrateLegacy() ?? [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }
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
