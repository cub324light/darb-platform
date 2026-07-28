import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSessionPlan } from "./session";

test("buildSessionPlan: وقتٌ غير كافٍ ⇒ لا جلسة + رسالةٌ لطيفة", () => {
  const p = buildSessionPlan({ subjects: ["لفظي"], remainingLessons: 5, remainingDrills: 5, activeErrors: 2, availableMinutes: 5 });
  assert.equal(p.available, false);
  assert.equal(p.tasks.length, 0);
  assert.ok(p.hint.includes("غداً"));
});

test("buildSessionPlan: 3 مهامّ بأهداف، المجموع ≈ الوقت المتاح", () => {
  const p = buildSessionPlan({
    subjects: ["لفظي", "كمي"], remainingLessons: 5, remainingDrills: 20, activeErrors: 3, availableMinutes: 70,
  });
  assert.equal(p.available, true);
  assert.equal(p.tasks.length, 3);
  assert.equal(p.tasks[0].kind, "review");
  assert.equal(p.tasks[0].subject, "لفظي");
  assert.equal(p.tasks[0].goalMins, 35);
  assert.equal(p.tasks[1].kind, "drill");
  assert.equal(p.tasks[1].goalCount, 20);
  assert.equal(p.tasks[2].kind, "errors");
  assert.equal(p.totalMins, 70);
  assert.ok(p.motivation.includes("جاهزيتك"));
});

test("buildSessionPlan: يبدأ بالمادة الأضعف؛ بلا تدريب/أخطاء ⇒ مراجعة فقط", () => {
  const weak = buildSessionPlan({ subjects: ["لفظي", "كمي"], weakestSubject: "كمي", remainingLessons: 3, remainingDrills: 0, activeErrors: 0, availableMinutes: 40 });
  assert.equal(weak.tasks[0].subject, "كمي");
  assert.equal(weak.tasks.length, 1);
  assert.equal(weak.tasks[0].kind, "review");
});
