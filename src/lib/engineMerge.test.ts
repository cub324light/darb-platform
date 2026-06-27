/* اختبارات الدمج على مستوى الكيان — يثبت عدم فقد العمل عبر الأجهزة (بديل LWW).
   التشغيل: npx tsx --test src/lib/engineMerge.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeMemories, mergeEvents } from "./engineMerge";
import type { AnyMemory } from "./memory/types";
import type { AnyEvent } from "./events/types";

const mem = (id: string, version: number, updatedAt: number, name = "x"): AnyMemory =>
  ({ id, type: "identity.name", category: "identity", value: { name }, confidence: 1, importance: 1,
     source: "onboarding", createdAt: 0, updatedAt, expiresAt: null, educationalStage: "general",
     tags: [], evidence: [], status: "active", version } as AnyMemory);

const evt = (id: string, ts: number): AnyEvent =>
  ({ id, eventType: "StudentStartedSession", timestamp: ts, actor: { kind: "student" },
     educationalStage: "general", source: "ui", metadata: {}, correlationId: id, sessionId: "s", version: 1 } as AnyEvent);

test("mergeMemories: higher version wins, disjoint ids union (no loss)", () => {
  const local = [mem("a", 3, 300, "local-a"), mem("b", 1, 100)];          // a v3, b
  const cloud = [mem("a", 2, 999, "cloud-a"), mem("c", 1, 100)];          // a v2 (older version), c
  const merged = mergeMemories(local, cloud);
  const byId = new Map(merged.map((m) => [m.id, m]));
  assert.equal(merged.length, 3, "union of a,b,c — nothing lost");
  assert.equal((byId.get("a")!.value as { name: string }).name, "local-a", "higher version wins regardless of updatedAt");
  assert.ok(byId.has("b") && byId.has("c"), "both devices' unique memories preserved");
});

test("mergeMemories: equal version → newer updatedAt wins", () => {
  const merged = mergeMemories([mem("a", 2, 500, "newer")], [mem("a", 2, 100, "older")]);
  assert.equal((merged[0].value as { name: string }).name, "newer");
});

test("mergeMemories simulates two devices: neither side's work is destroyed", () => {
  // الجهاز A أضاف a؛ الجهاز B أضاف b؛ السحابة بدأت فارغة
  const deviceA = [mem("a", 1, 100)];
  const deviceB = [mem("b", 1, 100)];
  const cloudAfterA = mergeMemories(deviceA, []);        // A يرفع
  const cloudAfterB = mergeMemories(deviceB, cloudAfterA); // B يرفع بدمج
  assert.equal(cloudAfterB.length, 2, "both a and b survive (LWW would have dropped a)");
});

test("mergeEvents: union by id (immutable), sorted, deduped, window-pruned", () => {
  const local = [evt("e1", 100), evt("e2", 200), evt("e3", 300)];
  const cloud = [evt("e2", 200), evt("e4", 400)]; // e2 shared
  const merged = mergeEvents(local, cloud, 1000);
  const ids = merged.map((e) => e.id);
  assert.deepEqual(ids, ["e1", "e2", "e3", "e4"], "union, deduped, time-sorted");
});

test("mergeEvents prunes events older than the 90-day window", () => {
  const now = 100 * 86_400_000;
  const old = evt("old", 0);                 // > 90 يوماً
  const fresh = evt("fresh", now - 1000);
  const merged = mergeEvents([old], [fresh], now);
  assert.deepEqual(merged.map((e) => e.id), ["fresh"], "stale event dropped by window");
});
