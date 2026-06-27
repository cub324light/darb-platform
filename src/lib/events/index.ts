/* ═══════════════════════════════════════════════════════════════════════
   Events — طبقة الوصول (السطح العام الموحّد)
   نقطة الاستيراد الوحيدة: import { events, emit } from "@/lib/events"
   تُسجّل المُتفاعلات الأساسية (الذاكرة + التوصيات) مرة واحدة. التحليلات تُوصَّل
   من التطبيق (مزوّد محدّد) فيبقى المحرّك مستقلاً عن أي مزوّد.
   ═══════════════════════════════════════════════════════════════════════ */
import { EventEngine } from "./engine";
import { LocalEventStore } from "./store";
import { makeMemoryReactor, makeRecommendationReactor, makeAnalyticsReactor } from "./reactors";
import { memory } from "../memory";
import type { AnalyticsSink, EmitInput, EventType, DomainEvent } from "./types";

let _engine: EventEngine | null = null;
let _analyticsWired = false;

/** المحرّك الافتراضي — مع المُتفاعلات الأساسية مسجَّلة. */
export function events(): EventEngine {
  if (!_engine) {
    _engine = new EventEngine(new LocalEventStore());
    const mem = memory();
    const memReactor = makeMemoryReactor(mem);
    const recReactor = makeRecommendationReactor(mem);
    _engine.subscribe(memReactor.react, memReactor.handles, memReactor.name);
    _engine.subscribe(recReactor.react, recReactor.handles, recReactor.name);
  }
  return _engine;
}

/** اختصار إطلاق. */
export function emit<T extends EventType>(input: EmitInput<T>): DomainEvent<T> {
  return events().emit(input);
}

/** يوصّل مغذّي تحليلات (من التطبيق) — مرة واحدة. يُبقي المحرّك مستقلاً عن المزوّد. */
export function wireAnalytics(sink: AnalyticsSink): void {
  if (_analyticsWired) return;
  const r = makeAnalyticsReactor(sink);
  events().subscribe(r.react, r.handles, r.name);
  _analyticsWired = true;
}

/* لإعادة الضبط في الاختبارات */
export function __resetEvents(): void { _engine = null; _analyticsWired = false; }

export { EventEngine } from "./engine";
export { InMemoryEventStore, LocalEventStore, EVENT_LOG_KEY, MAX_LOCAL_EVENTS, MAX_LOCAL_AGE_DAYS } from "./store";
export type { EventStore } from "./store";
export { EVENT_REGISTRY, ALL_EVENT_TYPES, eventCategoryOf } from "./registry";
export { makeMemoryReactor, makeRecommendationReactor, makeAnalyticsReactor, NoopAnalyticsSink } from "./reactors";
export type { Reactor } from "./reactors";
export type {
  DomainEvent, AnyEvent, EventType, EventCategory, EventMetaMap, EmitInput,
  EventActor, EventSource, EventHandler, Subscription, EventQuery, TimelineEntry,
  AnalyticsSink, ImportSnapshot, EventTypeDef, EventRegistry,
} from "./types";
