/* ═══════════════════════════════════════════════════════════════════════
   Event Engine — الناقل (Bus) + المحرّك
   emit يُلحِق أولاً (الديمومة) ثم يوزّع على المُتفاعلين بعزل (try/catch).
   فشل مُتفاعل لا يفقد الحدث (مُلحَق مسبقاً) ولا يوقف البقيّة. حتميّ:
   ساعة ومولّد معرّفات محقونان → replay يُعيد إنتاج نفس الحالة بدقّة.
   ═══════════════════════════════════════════════════════════════════════ */
import {
  type AnyEvent, type DomainEvent, type EmitInput, type EventType,
  type EventHandler, type Subscription, type EventQuery, type TimelineEntry,
} from "./types";
import { EVENT_REGISTRY } from "./registry";
import type { EventStore } from "./store";

let _sessionSeq = 0;
function defaultSessionId(): string {
  // معرّف جلسة لكل تحميل تطبيق (يثبت داخل العملية)
  return `s-${Date.now().toString(36)}-${(_sessionSeq++).toString(36)}`;
}

export interface EventEngineOpts {
  clock?: () => number;
  idGen?: () => string;
  sessionId?: string;
}

export class EventEngine {
  private subs: Subscription[] = [];
  private clock: () => number;
  private idGen: () => string;
  private sessionId: string;
  private idCounter = 0;

  constructor(private store: EventStore, opts: EventEngineOpts = {}) {
    this.clock = opts.clock ?? (() => Date.now());
    this.sessionId = opts.sessionId ?? defaultSessionId();
    this.idGen = opts.idGen ?? (() => `${this.clock().toString(36)}-${(this.idCounter++).toString(36)}`);
  }

  /* ─────────── الإطلاق ─────────── */
  emit<T extends EventType>(input: EmitInput<T>): DomainEvent<T> {
    const def = EVENT_REGISTRY[input.eventType];
    if (def.validate && !(def.validate as (m: unknown) => boolean)(input.metadata)) {
      throw new Error(`Event metadata failed validation for "${input.eventType}"`);
    }
    const id = this.idGen();
    const event: DomainEvent<T> = {
      id,
      eventType: input.eventType,
      timestamp: input.timestamp ?? this.clock(),
      actor: input.actor ?? { kind: "student" },
      educationalStage: input.educationalStage ?? "general",
      source: input.source ?? "ui",
      metadata: input.metadata,
      correlationId: input.correlationId ?? id,
      sessionId: input.sessionId ?? this.sessionId,
      version: 1,
    };
    // 1) الديمومة أولاً — الحدث الآن في مصدر الحقيقة
    this.store.append(event as AnyEvent);
    // 2) التوزيع المعزول
    this.dispatch(event as AnyEvent);
    return event;
  }

  private dispatch(event: AnyEvent): void {
    for (const sub of this.subs) {
      if (sub.filter && !sub.filter.includes(event.eventType)) continue;
      try {
        sub.handler(event);
      } catch (err) {
        // عزل الفشل — الحدث محفوظ مسبقاً؛ نُسجّل الفشل للتدقيق بلا حلقات
        if (event.eventType !== "ReactorFailed") {
          this.store.append({
            id: this.idGen(),
            eventType: "ReactorFailed",
            timestamp: this.clock(),
            actor: { kind: "system" },
            educationalStage: "general",
            source: "system",
            metadata: { reactor: sub.name ?? "?", eventType: event.eventType, error: String((err as Error)?.message ?? err) },
            correlationId: event.correlationId,
            sessionId: event.sessionId,
            version: 1,
          });
        }
      }
    }
  }

  /* ─────────── الاشتراك ─────────── */
  subscribe(handler: EventHandler, filter?: EventType[], name?: string): () => void {
    const sub: Subscription = { handler, filter, name };
    this.subs.push(sub);
    return () => this.unsubscribe(handler);
  }
  unsubscribe(handler: EventHandler): void {
    this.subs = this.subs.filter((s) => s.handler !== handler);
  }

  /* ─────────── الاستعادة (replay) ─────────── */
  /** يعيد توزيع أحداث السجلّ — لإعادة بناء الإسقاطات/التصحيح/التدقيق.
      to: مُتفاعل محدّد (مثلاً MemoryReactor) لإعادة بناء إسقاط واحد. */
  replay(opts: { to?: EventHandler; types?: EventType[]; since?: number } = {}): number {
    let n = 0;
    for (const e of this.store.getAll()) {
      if (opts.types && !opts.types.includes(e.eventType)) continue;
      if (opts.since != null && e.timestamp < opts.since) continue;
      if (opts.to) { try { opts.to(e); } catch { /* تجاهل في الاستعادة */ } }
      else this.dispatch(e);
      n++;
    }
    return n;
  }

  /* ─────────── الاستعلام ─────────── */
  queryEvents(q: EventQuery = {}): AnyEvent[] {
    const types = toArr(q.eventType);
    const cats = toArr(q.category);
    const stages = toArr(q.stage);
    let out = this.store.getAll().filter((e) => {
      if (types && !types.includes(e.eventType)) return false;
      if (cats && !cats.includes(EVENT_REGISTRY[e.eventType].category)) return false;
      if (stages && !stages.includes(e.educationalStage)) return false;
      if (q.actorKind && e.actor.kind !== q.actorKind) return false;
      if (q.correlationId && e.correlationId !== q.correlationId) return false;
      if (q.sessionId && e.sessionId !== q.sessionId) return false;
      if (q.since != null && e.timestamp < q.since) return false;
      if (q.until != null && e.timestamp > q.until) return false;
      return true;
    });
    out = out.sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
    if (q.limit != null) out = out.slice(-q.limit);
    return out;
  }

  /* ─────────── الجدول الزمني ─────────── */
  buildTimeline(opts: { milestonesOnly?: boolean; limit?: number } = {}): TimelineEntry[] {
    const events = this.store.getAll()
      .filter((e) => !opts.milestonesOnly || EVENT_REGISTRY[e.eventType].milestone)
      .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
    const sliced = opts.limit != null ? events.slice(-opts.limit) : events;
    return sliced.map((e) => {
      const def = EVENT_REGISTRY[e.eventType];
      return {
        id: e.id,
        at: e.timestamp,
        eventType: e.eventType,
        category: def.category,
        stage: e.educationalStage,
        summary: def.label ? (def.label as (ev: AnyEvent) => string)(e) : e.eventType,
      };
    });
  }

  /* أدوات */
  getSessionId(): string { return this.sessionId; }
  all(): AnyEvent[] { return this.store.getAll(); }
  clearAll(): void { this.store.clear(); }
}

function toArr<T>(v: T | T[] | undefined): T[] | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v : [v];
}
