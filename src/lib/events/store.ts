/* ═══════════════════════════════════════════════════════════════════════
   Event Store — سجلّ الأحداث (append-only، قابل للتبديل)
   النافذة المحلية محدودة (عدد + زمن): الذاكرة تحمل الخلاصة الدائمة، والجهاز
   يحتفظ بالإشارة الحديثة فقط. عند التوسّع يُستبدَل بمخزن خادمي مُجزّأ
   حسب studentId دون لمس المحرّك.
   ═══════════════════════════════════════════════════════════════════════ */
import type { AnyEvent } from "./types";

export interface EventStore {
  append(e: AnyEvent): void;
  getAll(): AnyEvent[];                 // مُرتَّبة زمنياً (الأقدم أولاً)
  byCorrelation(correlationId: string): AnyEvent[];
  clear(): void;
}

/* حدود النافذة المحلية */
export const MAX_LOCAL_EVENTS = 500;
export const MAX_LOCAL_AGE_DAYS = 90;
const DAY_MS = 86_400_000;

function prune(list: AnyEvent[], now: number): AnyEvent[] {
  const cutoff = now - MAX_LOCAL_AGE_DAYS * DAY_MS;
  // احتفظ بالأحدث ضمن النافذة الزمنية، ثم بحدّ العدد (الأحدث)
  const within = list.filter((e) => e.timestamp >= cutoff);
  return within.length > MAX_LOCAL_EVENTS ? within.slice(-MAX_LOCAL_EVENTS) : within;
}

/* ── مخزن في الذاكرة — للاختبارات (غير محدود، حتمي) ── */
export class InMemoryEventStore implements EventStore {
  private list: AnyEvent[] = [];
  constructor(seed?: AnyEvent[]) { if (seed) this.list = [...seed]; }
  append(e: AnyEvent): void { this.list.push(e); }
  getAll(): AnyEvent[] { return [...this.list]; }
  byCorrelation(id: string): AnyEvent[] { return this.list.filter((e) => e.correlationId === id); }
  clear(): void { this.list = []; }
}

/* ── مخزن محلي — نافذة دوّارة محدودة (عدد + زمن) مع مزامنة سحابية ── */
export const EVENT_LOG_KEY = "darb_event_log_v1";
const ENVELOPE_VERSION = 1;
interface EventEnvelope { v: number; events: AnyEvent[] }

export class LocalEventStore implements EventStore {
  private list: AnyEvent[] = [];
  private loaded = false;
  constructor(private clock: () => number = () => Date.now()) {}

  private ensure(): void {
    if (this.loaded || typeof window === "undefined") { this.loaded = true; return; }
    try {
      const raw = localStorage.getItem(EVENT_LOG_KEY);
      if (raw) {
        const env = JSON.parse(raw) as EventEnvelope;
        if (env && Array.isArray(env.events)) this.list = env.events;
      }
    } catch { /* تلف — ابدأ نظيفاً */ }
    this.loaded = true;
  }
  private persist(): void {
    if (typeof window === "undefined") return;
    try {
      const env: EventEnvelope = { v: ENVELOPE_VERSION, events: this.list };
      localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(env));
    } catch { /* الحصّة ممتلئة — القصّ يعالجها */ }
  }

  append(e: AnyEvent): void {
    this.ensure();
    this.list.push(e);
    this.list = prune(this.list, this.clock());
    this.persist();
  }
  getAll(): AnyEvent[] { this.ensure(); return [...this.list]; }
  byCorrelation(id: string): AnyEvent[] { this.ensure(); return this.list.filter((e) => e.correlationId === id); }
  clear(): void { this.ensure(); this.list = []; this.persist(); }
}
