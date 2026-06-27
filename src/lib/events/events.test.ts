/* اختبارات محرّك الأحداث — حتميّة، باستقلال (مخازن في الذاكرة + ساعة/معرّفات محقونة).
   التشغيل: npx tsx --test src/lib/events/events.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEngine } from "./engine";
import { InMemoryEventStore } from "./store";
import { MemoryEngine } from "../memory/engine";
import { InMemoryStore } from "../memory/store";
import { makeMemoryReactor, makeRecommendationReactor, makeAnalyticsReactor } from "./reactors";
import type { AnyEvent } from "./types";

const T0 = 1_700_000_000_000;
function det() {
  let id = 0, t = T0;
  return {
    engine: (store: InMemoryEventStore) => new EventEngine(store, {
      clock: () => t, idGen: () => `evt-${id++}`, sessionId: "test-session",
    }),
    advanceDays: (d: number) => { t += d * 86_400_000; },
  };
}

test("emit builds a complete event, appends, and dispatches", () => {
  const store = new InMemoryEventStore();
  const eng = det().engine(store);
  const seen: AnyEvent[] = [];
  eng.subscribe((e) => seen.push(e));
  const ev = eng.emit({ eventType: "StudentStartedSession", metadata: { subject: "كيمياء" } });
  assert.equal(ev.id, "evt-0");
  assert.equal(ev.sessionId, "test-session");
  assert.equal(ev.correlationId, "evt-0");
  assert.equal(store.getAll().length, 1, "appended to log");
  assert.equal(seen.length, 1, "dispatched to subscriber");
});

test("invalid metadata is rejected", () => {
  const eng = det().engine(new InMemoryEventStore());
  assert.throws(() => eng.emit({ eventType: "ScoreUpdated", metadata: { exam: "", score: NaN } }));
});

test("append-before-dispatch: a throwing reactor does not lose the event; logs ReactorFailed", () => {
  const store = new InMemoryEventStore();
  const eng = det().engine(store);
  let okRan = false;
  eng.subscribe(() => { throw new Error("boom"); }, undefined, "BadReactor");
  eng.subscribe(() => { okRan = true; }, undefined, "GoodReactor");
  eng.emit({ eventType: "StudentStartedSession", metadata: {} });
  assert.ok(okRan, "other reactors still run");
  const types = store.getAll().map((e) => e.eventType);
  assert.ok(types.includes("StudentStartedSession"), "original event preserved");
  assert.ok(types.includes("ReactorFailed"), "failure recorded for audit");
});

test("unsubscribe + filtered subscription", () => {
  const eng = det().engine(new InMemoryEventStore());
  let n = 0;
  const off = eng.subscribe(() => n++, ["ScoreUpdated"]);
  eng.emit({ eventType: "StudentStartedSession", metadata: {} }); // غير مطابِق
  eng.emit({ eventType: "ScoreUpdated", metadata: { exam: "قدرات", score: 88 } });
  assert.equal(n, 1, "filter honored");
  off();
  eng.emit({ eventType: "ScoreUpdated", metadata: { exam: "تحصيلي", score: 90 } });
  assert.equal(n, 1, "unsubscribed");
});

test("queryEvents + buildTimeline (milestones only)", () => {
  const eng = det().engine(new InMemoryEventStore());
  eng.emit({ eventType: "StudentStartedSession", metadata: {} });
  eng.emit({ eventType: "ExamCompleted", metadata: { exam: "تحصيلي", score: 95 } });
  eng.emit({ eventType: "GoalChanged", metadata: { field: "major", value: "طب" } });
  assert.equal(eng.queryEvents({ category: "exam" }).length, 1);
  assert.equal(eng.queryEvents({ eventType: "GoalChanged" }).length, 1);
  const tl = eng.buildTimeline({ milestonesOnly: true });
  assert.equal(tl.length, 2, "only milestone events");
  assert.ok(tl.some((t) => t.summary.includes("تحصيلي")));
  assert.ok(tl.some((t) => t.summary.includes("طب")));
});

test("MemoryReactor: events drive memory (the cascade) — nothing writes memory directly", () => {
  const eng = det().engine(new InMemoryEventStore());
  const mem = new MemoryEngine(new InMemoryStore(), () => T0);
  const r = makeMemoryReactor(mem);
  eng.subscribe(r.react, r.handles, r.name);

  eng.emit({ eventType: "StudentRegistered", source: "migration", metadata: { snapshot: {
    name: "محمد", studyLevel: "ثانوي", grade: "ثالث ثانوي",
    targets: [{ exam: "تحصيلي", target: 92 }], university: "جامعة الملك فهد للبترول والمعادن", major: "علوم حاسب",
  } } });
  eng.emit({ eventType: "ScoreUpdated", metadata: { exam: "تحصيلي", score: 80 } });
  eng.emit({ eventType: "GoalChanged", metadata: { field: "major", value: "طب" } });

  const ctx = mem.buildStudentContext();
  assert.equal(ctx.identity.name, "محمد");
  assert.equal(ctx.currentGoal.major, "طب", "GoalChanged updated the goal");
  assert.deepEqual(ctx.currentGoal.targets, [{ exam: "تحصيلي", target: 92 }]);
  assert.ok(mem.all().some((m) => m.type === "learning.subjectMastery"), "ScoreUpdated → mastery memory");
});

test("RecommendationReactor: accept/dismiss updates behavior.nudgeResponse (closes the loop)", () => {
  const eng = det().engine(new InMemoryEventStore());
  const mem = new MemoryEngine(new InMemoryStore(), () => T0);
  const r = makeRecommendationReactor(mem);
  eng.subscribe(r.react, r.handles, r.name);

  eng.emit({ eventType: "RecommendationDismissed", metadata: { recId: "due-review", source: "review" } });
  eng.emit({ eventType: "RecommendationAccepted", metadata: { recId: "due-review", source: "review" } });

  const nr = mem.all().find((m) => m.id === "behavior.nudgeResponse:review")!;
  assert.ok(nr, "nudge response memory created");
  assert.equal((nr.value as { samples: number }).samples, 2);
  assert.equal((nr.value as { acceptedRate: number }).acceptedRate, 0.5, "1 of 2 accepted");
});

test("AnalyticsReactor forwards to a pluggable sink (provider-independent)", () => {
  const eng = det().engine(new InMemoryEventStore());
  const captured: { type: string; props: Record<string, unknown> }[] = [];
  const r = makeAnalyticsReactor({ capture: (type, props) => captured.push({ type, props }) });
  eng.subscribe(r.react, r.handles, r.name);
  eng.emit({ eventType: "ScoreUpdated", metadata: { exam: "قدرات", score: 88 } });
  assert.equal(captured.length, 1);
  assert.equal(captured[0].type, "ScoreUpdated");
  assert.equal(captured[0].props.exam, "قدرات");
});

test("REPLAY CORRECTNESS: rebuilding memory from the log reproduces identical state", () => {
  const store = new InMemoryEventStore();
  const eng = det().engine(store);
  const mem = new MemoryEngine(new InMemoryStore(), () => T0);
  const r = makeMemoryReactor(mem);
  eng.subscribe(r.react, r.handles, r.name);

  eng.emit({ eventType: "StudentRegistered", source: "migration", metadata: { snapshot: { name: "ريم", major: "طب", studyLevel: "ثانوي" } } });
  eng.emit({ eventType: "ExamCompleted", metadata: { exam: "قدرات", score: 91 } });
  eng.emit({ eventType: "StudentFinishedSession", metadata: { minutes: 50, subject: "كيمياء" } });

  const before = JSON.stringify(mem.all().sort((a, b) => a.id.localeCompare(b.id)));

  // امسح الإسقاط وأعد البناء من السجلّ فقط
  mem.clearAll();
  assert.equal(mem.all().length, 0);
  eng.replay({ to: r.react });
  const after = JSON.stringify(mem.all().sort((a, b) => a.id.localeCompare(b.id)));

  assert.equal(after, before, "replay reproduces identical memory (event sourcing)");
});

test("LocalEventStore window is bounded by count (prunes oldest)", async () => {
  const { LocalEventStore, MAX_LOCAL_EVENTS } = await import("./store");
  // محاكاة localStorage بسيطة
  const g = globalThis as { window?: unknown; localStorage?: Storage };
  const mock: Record<string, string> = {};
  g.window = {};
  g.localStorage = {
    getItem: (k: string) => mock[k] ?? null,
    setItem: (k: string, v: string) => { mock[k] = v; },
    removeItem: (k: string) => { delete mock[k]; },
    clear: () => { for (const k of Object.keys(mock)) delete mock[k]; },
    key: () => null, length: 0,
  } as Storage;
  let t = T0;
  const store = new LocalEventStore(() => t);
  for (let i = 0; i < MAX_LOCAL_EVENTS + 50; i++) {
    store.append({ id: `e${i}`, eventType: "StudentStartedSession", timestamp: t, actor: { kind: "student" }, educationalStage: "general", source: "ui", metadata: {}, correlationId: `e${i}`, sessionId: "s", version: 1 });
    t += 1000;
  }
  assert.equal(store.getAll().length, MAX_LOCAL_EVENTS, "count-bounded ring buffer");
  delete g.window; delete g.localStorage;
});
