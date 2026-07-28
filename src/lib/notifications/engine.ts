/* ═══════════════════════════════════════════════════════════════════════
   Notification Engine — خطّ القرار (event-driven, deterministic)
   يجمع السياق من الأحداث/الذاكرة/التوصيات، يُسجّل كل مُرشّح، يقرّر
   (أرسل/أجّل/ادمج/ألغِ)، ويُطلق دورة حياة الإشعار كأحداث. لا حالة موازية.
   ═══════════════════════════════════════════════════════════════════════ */
import type { EventEngine } from "../events/engine";
import type { AnyEvent } from "../events/types";
import type { Recommendation } from "../recommendation";
import type { StudentContext } from "../memory/types";
import {
  type NotificationCandidate, type NotificationType, type DeliveryContext,
  type ScoredCandidate, type NotificationTransport, type NotificationConfig,
  type QuietWindow, DEFAULT_CONFIG, DEFAULT_QUIET_WINDOWS,
} from "./types";
import { buildTimingBuckets, computeFatigue, scoreCandidate, decide } from "./scoring";

const DAY_MS = 86_400_000;
const INAPP_WINDOW_MS = 30_000; // نشاط واجهة خلال 30 ثانية = داخل درب

export interface NotificationEngineDeps {
  events: EventEngine;
  getRecommendations: () => Recommendation[];
  transport: NotificationTransport;
  clock?: () => number;
  getMemoryContext?: () => StudentContext | null;
  isInApp?: () => boolean;
  quietWindows?: QuietWindow[];
  config?: Partial<NotificationConfig>;
  idGen?: () => string;
}

/* مصدر التوصية → نوع الإشعار (بلا منطق تعليمي مكرّر) */
function notifTypeForSource(source: string): NotificationType {
  switch (source) {
    case "streak": return "streakRecovery";
    case "exam": return "examCountdown";
    case "review": case "vault": return "reviewReminder";
    case "university": return "universityDeadline";
    case "goldenPath": return "goalProgress";
    default: return "studyReminder";
  }
}

export class NotificationEngine {
  private events: EventEngine;
  private getRecommendations: () => Recommendation[];
  private transport: NotificationTransport;
  private clock: () => number;
  private getMemoryContext: () => StudentContext | null;
  private isInAppFn?: () => boolean;
  private quietWindows: QuietWindow[];
  private cfg: NotificationConfig;
  private idGen: () => string;
  private idCounter = 0;

  constructor(d: NotificationEngineDeps) {
    this.events = d.events;
    this.getRecommendations = d.getRecommendations;
    this.transport = d.transport;
    this.clock = d.clock ?? (() => Date.now());
    this.getMemoryContext = d.getMemoryContext ?? (() => null);
    this.isInAppFn = d.isInApp;
    this.quietWindows = d.quietWindows ?? DEFAULT_QUIET_WINDOWS;
    this.cfg = { ...DEFAULT_CONFIG, ...d.config };
    this.idGen = d.idGen ?? (() => `n-${(this.idCounter++).toString(36)}`);
  }

  /* هل الطالب نشِط داخل درب الآن؟ (حدث واجهة حديث) */
  private detectInApp(events: AnyEvent[], now: number): boolean {
    if (this.isInAppFn) return this.isInAppFn();
    return events.some((e) => e.source === "ui" && now - e.timestamp <= INAPP_WINDOW_MS);
  }

  /* أنواع الإشعارات المعلّقة (مجدولة بعد الآن، بلا إرسال/إلغاء) — للدمج */
  private pendingTypes(events: AnyEvent[], now: number): Set<NotificationType> {
    const createdType = new Map<string, string>();
    const scheduledFuture = new Map<string, number>();
    const sent = new Set<string>();
    const cancelled = new Set<string>();
    for (const e of events) {
      if (e.eventType === "NotificationCreated") createdType.set(e.metadata.notificationId, e.metadata.notifType);
      else if (e.eventType === "NotificationScheduled" && e.metadata.deliverAt > now) scheduledFuture.set(e.metadata.notificationId, e.metadata.deliverAt);
      else if (e.eventType === "NotificationSent") sent.add(e.metadata.notificationId);
      else if (e.eventType === "NotificationCancelled") cancelled.add(e.metadata.notificationId);
    }
    const out = new Set<NotificationType>();
    for (const [id, t] of createdType) {
      if (scheduledFuture.has(id) && !sent.has(id) && !cancelled.has(id)) out.add(t as NotificationType);
    }
    return out;
  }

  /* يجمع سياق التسليم من الأحداث + الذاكرة */
  gatherContext(now: number): DeliveryContext {
    const events = this.events.all();
    const { openRateByHour, studyActivityByHour } = buildTimingBuckets(events);
    const { fatigue, sentLast24h, lastSentAt } = computeFatigue(events, now, this.cfg);
    const mem = this.getMemoryContext();
    return {
      now,
      hour: new Date(now).getHours(),
      inApp: this.detectInApp(events, now),
      lastSentAt,
      sentLast24h,
      openRateByHour,
      studyActivityByHour,
      preferredWindow: mem?.bestStudyWindow,
      fatigue,
      quietWindows: this.quietWindows,
      pendingTypes: this.pendingTypes(events, now),
    };
  }

  /* توصية → مُرشّح إشعار */
  private toCandidate(r: Recommendation, now: number): NotificationCandidate {
    const type = notifTypeForSource(r.source);
    const deadlineDays = (type === "examCountdown" || type === "universityDeadline") && r.expiresAt != null
      ? Math.max(0, Math.round((r.expiresAt - now) / DAY_MS)) : null;
    return {
      id: r.id, type, title: r.title, body: r.reason, recId: r.id, source: r.source,
      priority: r.priority, confidence: r.confidence, targetPage: r.targetPage, deadlineDays,
    };
  }

  /* التقييم الكامل: سجّل، قرّر، أطلق دورة الحياة. يُعيد القرارات (للتشخيص/الاختبار). */
  evaluate(now: number = this.clock()): ScoredCandidate[] {
    const ctx = this.gatherContext(now);
    const candidates = this.getRecommendations().map((r) => this.toCandidate(r, now));

    // رتّب تنازلياً بالدرجة الحاكمة، وطبّق القرارات بسياق متغيّر داخل الجولة
    const scored = candidates
      .map((c) => ({ c, score: scoreCandidate(c, ctx, this.cfg) }))
      .sort((a, b) => b.score.composite - a.score.composite);

    const running: DeliveryContext = { ...ctx, pendingTypes: new Set(ctx.pendingTypes) };
    const out: ScoredCandidate[] = [];

    for (const { c, score } of scored) {
      const decision = decide(score, c, running, this.cfg);
      out.push({ candidate: c, score, decision });

      const nid = this.idGen();
      const ev = (extra: Record<string, unknown> = {}) => ({
        source: "system" as const, actor: { kind: "system" as const }, correlationId: c.id, timestamp: now, ...extra,
      });

      if (decision.action === "send") {
        this.events.emit({ eventType: "NotificationCreated", metadata: { notificationId: nid, notifType: c.type, recId: c.recId, composite: round2(score.composite) }, ...ev() });
        this.events.emit({ eventType: "NotificationScheduled", metadata: { notificationId: nid, deliverAt: now }, ...ev() });
        this.events.emit({ eventType: "NotificationSent", metadata: { notificationId: nid, notifType: c.type, transport: this.transport.name }, ...ev() });
        this.transport.deliver({ id: nid, type: c.type, title: c.title, body: c.body, targetPage: c.targetPage });
        running.lastSentAt = now;
        running.sentLast24h += 1;
        running.pendingTypes.add(c.type); // مشابه لاحق في الجولة يُدمَج
      } else if (decision.action === "delay") {
        this.events.emit({ eventType: "NotificationCreated", metadata: { notificationId: nid, notifType: c.type, recId: c.recId, composite: round2(score.composite) }, ...ev() });
        this.events.emit({ eventType: "NotificationScheduled", metadata: { notificationId: nid, deliverAt: decision.deliverAt ?? now }, ...ev() });
        running.pendingTypes.add(c.type);
      } else if (decision.action === "merge") {
        this.events.emit({ eventType: "NotificationMerged", metadata: { notificationId: nid, into: decision.mergeInto ?? c.type }, ...ev() });
      } else {
        this.events.emit({ eventType: "NotificationCancelled", metadata: { notificationId: nid, reason: decision.reason }, ...ev() });
      }
    }
    return out;
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
