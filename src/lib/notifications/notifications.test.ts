/* اختبارات محرّك الإشعارات — حتميّة (TZ=UTC للساعات الثابتة).
   التشغيل: TZ=UTC npx tsx --test src/lib/notifications/notifications.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEngine } from "../events/engine";
import { InMemoryEventStore } from "../events/store";
import { NotificationEngine } from "./engine";
import { buildTimingBuckets, bestDeliveryTime } from "./scoring";
import { DEFAULT_QUIET_WINDOWS, type DeliveryContext } from "./types";
import type { Recommendation, RecSource } from "../recommendation";
import type { AnyEvent } from "../events/types";

const H = (h: number, day = 1) => Date.UTC(2026, 5, day, h, 0, 0); // ساعة UTC ثابتة
const HOUR = 3_600_000;

function rec(p: { id: string; source: RecSource; priority: number; confidence?: number; expiresAt?: number | null }): Recommendation {
  return {
    id: p.id, kind: "nudge", priority: p.priority, confidence: p.confidence ?? 0.9,
    reason: "سبب", source: p.source, expiresAt: p.expiresAt ?? null,
    action: { kind: "navigate", label: "افتح", href: "/x" }, targetPage: "/x",
    title: `إشعار ${p.id}`, tone: "accent",
  };
}

interface Opts {
  now?: number; recs: Recommendation[]; isInApp?: () => boolean;
  seed?: (ev: EventEngine, now: number) => void; config?: Record<string, number>;
  mem?: () => { bestStudyWindow?: "صباح" | "ظهر" | "مساء" | "ليل" } | null;
}
function setup(o: Opts) {
  const store = new InMemoryEventStore();
  const t = o.now ?? H(17);
  let eid = 0, nid = 0;
  const ev = new EventEngine(store, { clock: () => t, idGen: () => `evt-${eid++}`, sessionId: "s" });
  if (o.seed) o.seed(ev, t);
  const delivered: { id: string; type: string }[] = [];
  const eng = new NotificationEngine({
    events: ev, getRecommendations: () => o.recs,
    transport: { name: "test", deliver: (n) => delivered.push({ id: n.id, type: n.type }) },
    clock: () => t, isInApp: o.isInApp, idGen: () => `nid-${nid++}`,
    getMemoryContext: o.mem ? (() => o.mem!() as never) : undefined,
    config: o.config,
  });
  return { ev, eng, delivered, store, types: () => store.getAll().map((e) => e.eventType) };
}

test("sends a valuable recommendation at an acceptable hour", () => {
  const { eng, delivered, types } = setup({ now: H(17), recs: [rec({ id: "g", source: "goldenPath", priority: 80 })] });
  const out = eng.evaluate();
  assert.equal(out[0].decision.action, "send");
  assert.equal(delivered.length, 1);
  assert.ok(types().includes("NotificationSent"));
});

test("QUIET: never pushes while the student is inside Darb", () => {
  const { eng, delivered, types } = setup({ recs: [rec({ id: "g", source: "goldenPath", priority: 90 })], isInApp: () => true });
  const out = eng.evaluate();
  assert.equal(out[0].decision.action, "cancel");
  assert.equal(delivered.length, 0);
  assert.ok(types().includes("NotificationCancelled"));
});

test("QUIET: delays during a quiet window (sleep)", () => {
  const { eng, delivered, types } = setup({ now: H(3), recs: [rec({ id: "g", source: "goldenPath", priority: 80 })] });
  const out = eng.evaluate();
  assert.equal(out[0].decision.action, "delay");
  assert.equal(delivered.length, 0);
  assert.ok(types().includes("NotificationScheduled"));
  assert.ok((out[0].decision.deliverAt ?? 0) > H(3), "rescheduled to the future");
});

test("URGENCY OVERRIDE: streak about to break sends even in a quiet window", () => {
  const { eng, delivered } = setup({ now: H(3), recs: [rec({ id: "s", source: "streak", priority: 96 })] });
  const out = eng.evaluate();
  assert.equal(out[0].decision.action, "send", "urgent streak overrides quiet hours");
  assert.equal(delivered.length, 1);
});

test("COOLDOWN: a recent send delays the next non-urgent notification", () => {
  const { eng, delivered } = setup({
    now: H(17),
    recs: [rec({ id: "g", source: "goldenPath", priority: 80 })],
    seed: (ev, now) => ev.emit({ eventType: "NotificationSent", metadata: { notificationId: "prev", notifType: "goalProgress", transport: "t" }, timestamp: now - HOUR, source: "system", actor: { kind: "system" } }),
  });
  const out = eng.evaluate();
  assert.equal(out[0].decision.action, "delay");
  assert.equal(delivered.length, 0);
});

test("MERGE: two similar reminders → one sent, the other merged", () => {
  const { eng, delivered, types } = setup({
    now: H(20),
    recs: [rec({ id: "r1", source: "review", priority: 75 }), rec({ id: "r2", source: "review", priority: 70 })],
  });
  const out = eng.evaluate();
  assert.equal(delivered.length, 1, "only one delivered");
  assert.ok(out.some((o) => o.decision.action === "merge"), "the similar one merged");
  assert.ok(types().includes("NotificationMerged"));
});

test("DAILY CAP: does not exceed the cap for non-urgent notifications", () => {
  const { eng, delivered } = setup({
    now: H(17),
    recs: [rec({ id: "g", source: "goldenPath", priority: 70 })],
    seed: (ev, now) => { for (let i = 0; i < 4; i++) ev.emit({ eventType: "NotificationSent", metadata: { notificationId: `p${i}`, notifType: "studyReminder", transport: "t" }, timestamp: now - (i + 2) * HOUR, source: "system", actor: { kind: "system" } }); },
    config: { cooldownMs: 0 }, // اعزل أثر المهلة لاختبار السقف
  });
  const out = eng.evaluate();
  assert.equal(out[0].decision.action, "cancel");
  assert.equal(delivered.length, 0);
});

test("ADAPTIVE TIMING: ignored at 8AM, opened at 9PM → best time moves to 9PM", () => {
  const seedEvents: AnyEvent[] = [];
  const mk = (type: AnyEvent["eventType"], hour: number, meta: Record<string, unknown>, day = 1): AnyEvent =>
    ({ id: `${type}-${hour}-${meta.notificationId ?? hour}-${day}`, eventType: type, timestamp: H(hour, day), actor: { kind: "student" }, educationalStage: "general", source: "system", metadata: meta, correlationId: "c", sessionId: "s", version: 1 } as unknown as AnyEvent);
  // 8 صباحاً: 5 إرسالات بلا فتح ؛ 21 مساءً: 5 إرسالات + فتح + نشاط مذاكرة
  for (let i = 0; i < 5; i++) { seedEvents.push(mk("NotificationSent", 8, { notificationId: `m${i}`, notifType: "studyReminder", transport: "t" }, i + 1)); }
  for (let i = 0; i < 5; i++) {
    seedEvents.push(mk("NotificationSent", 21, { notificationId: `e${i}`, notifType: "studyReminder", transport: "t" }, i + 1));
    seedEvents.push(mk("NotificationOpened", 21, { notificationId: `e${i}` }, i + 1));
    seedEvents.push(mk("StudentFinishedSession", 21, { minutes: 50 }, i + 1));
  }
  const { openRateByHour, studyActivityByHour } = buildTimingBuckets(seedEvents);
  assert.ok(openRateByHour[8] < openRateByHour[21], "8AM open-rate collapsed vs 9PM");

  const ctx: DeliveryContext = {
    now: H(12, 10), hour: 12, inApp: false, lastSentAt: null, sentLast24h: 0,
    openRateByHour, studyActivityByHour, fatigue: 0, quietWindows: DEFAULT_QUIET_WINDOWS, pendingTypes: new Set(),
  };
  const best = new Date(bestDeliveryTime(ctx)).getUTCHours();
  assert.equal(best, 21, "engine learns to deliver at 9PM");
  assert.notEqual(best, 8, "engine stopped using 8AM");
});

test("lifecycle events are emitted in order on send", () => {
  const { eng, store } = setup({ now: H(17), recs: [rec({ id: "g", source: "goldenPath", priority: 85 })] });
  eng.evaluate();
  const notif = store.getAll().filter((e) => e.eventType.startsWith("Notification")).map((e) => e.eventType);
  assert.deepEqual(notif, ["NotificationCreated", "NotificationScheduled", "NotificationSent"]);
});

test("low-value candidate is cancelled (default bias: do not interrupt)", () => {
  const { eng, delivered } = setup({ now: H(17), recs: [rec({ id: "weak", source: "orbit", priority: 20, confidence: 0.4 })] });
  const out = eng.evaluate();
  assert.equal(out[0].decision.action, "cancel");
  assert.equal(delivered.length, 0);
});
