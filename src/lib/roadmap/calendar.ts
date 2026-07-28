/* ═══════════ محرّك التقويم (Calendar Engine) — نقيٌّ 100٪ ═══════════
   ▸ لماذا؟ التقويم قلب مساري: أيّ شيءٍ في حياة الطالب يُسجَّل هنا، ودويرب يبني الخطة حوله.
   ▸ المصدر: أحداثٌ يُدخِلها الطالب (CalendarEvent) — يجمّعها القارئ (calendarStore) خارج المحرّك.
   ▸ الهدف: (1) عرض «القريب» (اليوم/غداً/الأسبوع) قبل الشهر. (2) تحويل الأحداث إلى وقتٍ متاحٍ
     للمذاكرة عبر block/reduce/busy — فيتكيّف buildSessionPlan تلقائياً.
   ▸ نقاءٌ تام: لا localStorage ولا واجهة. المدخلات تُمرَّر، والإعداد من config.ts. */
import { daysBetween } from "./metrics";
import { ROADMAP_TUNING } from "./config";

/* أنواع الأحداث — تغطّي حياة الطالب. لكلٍّ أيقونةٌ وتأثيرٌ افتراضيّ على الخطة. */
export type EventKind =
  | "prayer" | "work" | "school" | "university" | "exam" | "occasion"
  | "visit" | "family" | "hospital" | "travel" | "club" | "meeting" | "outing" | "other";

/* تأثير الحدث على الخطة: يمنع الجلسات · يخفّفها · ينقلها حسب الوقت. */
export type EventImpact = "block" | "reduce" | "busy";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";
export type EventSource = "local" | "google" | "apple" | "microsoft";

export interface CalendarEvent {
  id: string;
  title: string;
  kind: EventKind;
  start: string;            // ISO datetime (YYYY-MM-DDTHH:mm)
  end: string;              // ISO datetime
  allDay?: boolean;         // سفر/يومٌ كامل
  recurrence: Recurrence;   // التكرار (أحادي اليوم للمتكرّر؛ المتعدّد allDay = none)
  color?: string;
  notes?: string;
  impact: EventImpact;
  source: EventSource;      // local الآن؛ الحقول جاهزةٌ لمزامنةٍ لاحقة
  externalId?: string;
}

export interface KindMeta { label: string; icon: string; defaultImpact: EventImpact; color: string; }
export const EVENT_KIND_META: Record<EventKind, KindMeta> = {
  prayer:     { label: "صلاة",        icon: "🕌", defaultImpact: "busy",   color: "#10B981" },
  work:       { label: "دوام",        icon: "💼", defaultImpact: "block",  color: "#3B82F6" },
  school:     { label: "مدرسة",       icon: "🏫", defaultImpact: "block",  color: "#3B82F6" },
  university: { label: "جامعة",       icon: "🎓", defaultImpact: "block",  color: "#6366F1" },
  exam:       { label: "اختبار",      icon: "📝", defaultImpact: "block",  color: "#EF4444" },
  occasion:   { label: "مناسبة",      icon: "🎉", defaultImpact: "reduce", color: "#F59E0B" },
  visit:      { label: "زيارة",       icon: "👋", defaultImpact: "reduce", color: "#F59E0B" },
  family:     { label: "أهل",         icon: "👨‍👩‍👧", defaultImpact: "reduce", color: "#F59E0B" },
  hospital:   { label: "مستشفى",      icon: "🏥", defaultImpact: "busy",   color: "#EF4444" },
  travel:     { label: "سفر",         icon: "✈️", defaultImpact: "block",  color: "#8B5CF6" },
  club:       { label: "نادي",        icon: "🏟️", defaultImpact: "busy",   color: "#14B8A6" },
  meeting:    { label: "اجتماع",      icon: "👥", defaultImpact: "busy",   color: "#3B82F6" },
  outing:     { label: "طلعة",        icon: "🚗", defaultImpact: "reduce", color: "#F59E0B" },
  other:      { label: "أخرى",        icon: "📌", defaultImpact: "busy",   color: "var(--text-muted)" },
};

export const kindMeta = (k: EventKind): KindMeta => EVENT_KIND_META[k] ?? EVENT_KIND_META.other;

/* هل يستحقّ الحدث تحذير «سيتم تعديل خطتك تلقائياً»؟ (يمسّ الخطة فعلاً) */
export function warnsPlanChange(ev: Pick<CalendarEvent, "kind" | "impact">): boolean {
  return ev.impact === "block" || ev.impact === "reduce" || ev.kind === "travel" || ev.kind === "occasion";
}

/* ── مساعدات زمنية نقيّة (UTC) ── */
const dayOf = (iso: string): string => iso.slice(0, 10);
const weekdayOf = (day: string): number => new Date(Date.parse(day + "T00:00:00Z")).getUTCDay();
const domOf = (day: string): number => new Date(Date.parse(day + "T00:00:00Z")).getUTCDate();
export function minutesBetween(startIso: string, endIso: string): number {
  const ms = Date.parse(endIso) - Date.parse(startIso);
  return ms > 0 ? Math.round(ms / 60000) : 0;
}

/* هل يقع الحدث في يومٍ بعينه؟ (المتكرّر أحاديُّ اليوم؛ المتعدّد allDay recurrence=none). */
export function occursOnDay(ev: CalendarEvent, day: string): boolean {
  const s = dayOf(ev.start), e = dayOf(ev.end || ev.start);
  if (day < s) return false;
  switch (ev.recurrence) {
    case "none":    return day >= s && day <= e;               // نطاقٌ متّصل (سفر يومين…)
    case "daily":   return true;                               // كل يومٍ من البداية
    case "weekly":  return weekdayOf(day) === weekdayOf(s);    // نفس يوم الأسبوع
    case "monthly": return domOf(day) === domOf(s);            // نفس يوم الشهر
    default:        return false;
  }
}

/* أحداث يومٍ واحد. */
export function eventsOnDay(events: CalendarEvent[], day: string): CalendarEvent[] {
  return events.filter((ev) => occursOnDay(ev, day));
}

/* أقرب يومٍ يقع فيه الحدث ابتداءً من today (لتصنيف «القريب»). */
export function nextOccurrence(ev: CalendarEvent, today: string, horizon = 60): string | null {
  for (let i = 0; i < horizon; i++) {
    const day = addDaysLocal(today, i);
    if (occursOnDay(ev, day)) return day;
  }
  return null;
}
const addDaysLocal = (day: string, n: number): string =>
  new Date(Date.parse(day + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

/* ── «القريب»: اليوم · غداً · هذا الأسبوع · لاحقاً (يُعرض قبل التقويم الشهري) ── */
export interface UpcomingGroups {
  today: CalendarEvent[];
  tomorrow: CalendarEvent[];
  week: CalendarEvent[];   // خلال 7 أيام (بعد الغد)
  later: CalendarEvent[];  // أبعد
}
export function groupUpcoming(events: CalendarEvent[], today: string, horizon = 60): UpcomingGroups {
  const g: UpcomingGroups = { today: [], tomorrow: [], week: [], later: [] };
  for (const ev of events) {
    const day = nextOccurrence(ev, today, horizon);
    if (!day) continue;
    const d = daysBetween(today, day);
    if (d === 0) g.today.push(ev);
    else if (d === 1) g.tomorrow.push(ev);
    else if (d <= 7) g.week.push(ev);
    else g.later.push(ev);
  }
  return g;
}

/* ═══════════ التقويم → الخطة: الوقت المتاح للمذاكرة في يومٍ ما ═══════════
   ▸ block (يومٌ كامل) ⇒ لا مذاكرة. block/busy (بفترة) ⇒ يُطرح زمنه. reduce ⇒ يخفّض المتاح.
   ▸ يقرؤه buildSessionPlan فيتكيّف حجم الجلسة تلقائياً. */
export interface DayAvailability { availableMinutes: number; adjusted: boolean; blocked: boolean; }
export function availableStudyMinutes(
  i: { baseMinutes: number; dayEvents: Pick<CalendarEvent, "impact" | "start" | "end" | "allDay">[] },
  cfg = ROADMAP_TUNING.planning,
): DayAvailability {
  let mins = i.baseMinutes;
  let reduced = false, adjusted = false, blocked = false;
  for (const ev of i.dayEvents) {
    if (ev.allDay && (ev.impact === "block" || ev.impact === "busy")) { blocked = true; adjusted = true; return { availableMinutes: 0, adjusted, blocked }; }
    if (ev.impact === "block" || ev.impact === "busy") { mins -= minutesBetween(ev.start, ev.end); adjusted = true; }
    else if (ev.impact === "reduce") { reduced = true; adjusted = true; }
  }
  if (reduced) mins *= cfg.reduceFactor;
  return { availableMinutes: Math.max(0, Math.round(mins)), adjusted, blocked };
}
