/* اختبارات محرّك الذاكرة — حتميّة، باستقلال (InMemoryStore + ساعة محقونة).
   التشغيل: npx tsx --test src/lib/memory/memory.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryEngine } from "./engine";
import { InMemoryStore } from "./store";

const DAY = 86_400_000;
/* ساعة قابلة للتقديم */
function clockAt(start: number) {
  let t = start;
  return { now: () => t, advanceDays: (d: number) => { t += d * DAY; } };
}
function makeEngine(start = 1_700_000_000_000) {
  const clk = clockAt(start);
  return { eng: new MemoryEngine(new InMemoryStore(), clk.now), clk, start };
}

test("remember validates and rejects bad values", () => {
  const { eng } = makeEngine();
  assert.throws(() => eng.remember({ type: "identity.age", value: { age: -5 }, source: "explicit" }));
  const m = eng.remember({ type: "identity.name", value: { name: "محمد" }, source: "onboarding" });
  assert.equal(m.value.name, "محمد");
  assert.equal(m.category, "identity");
  assert.equal(m.status, "active");
  assert.equal(m.version, 1);
});

test("merge by natural key reinforces confidence and bumps version (no duplicate)", () => {
  const { eng } = makeEngine();
  const a = eng.remember({ type: "learning.weakSubject", value: { subject: "كيمياء" }, source: "inferred", confidence: 0.5 });
  const b = eng.remember({ type: "learning.weakSubject", value: { subject: "كيمياء" }, source: "inferred", confidence: 0.5 });
  assert.equal(a.id, b.id, "same natural key → same id");
  assert.equal(eng.all().filter((m) => m.type === "learning.weakSubject").length, 1, "no duplicate");
  assert.ok(b.confidence > a.confidence, "confidence reinforced");
  assert.equal(b.version, 2);
});

test("confidence decays with age for inferred memory; pinned identity does not", () => {
  const { eng, clk } = makeEngine();
  const weak = eng.remember({ type: "learning.weakSubject", value: { subject: "فيزياء" }, source: "inferred", confidence: 0.8 });
  const name = eng.remember({ type: "identity.name", value: { name: "سارة" }, source: "onboarding" });
  const conf0 = eng.effectiveConfidence(weak);
  clk.advanceDays(120); // = نصف عمر weakSubject
  const confAged = eng.effectiveConfidence(weak);
  assert.ok(confAged < conf0 * 0.7, "weak subject confidence decayed");
  assert.equal(eng.effectiveConfidence(name), name.confidence, "pinned identity does not decay");
});

test("retrieval ranks by relevance and always includes core (pinned) memories", () => {
  const { eng } = makeEngine();
  eng.remember({ type: "identity.name", value: { name: "ندى" }, source: "onboarding" });
  eng.remember({ type: "goal.targetMajor", value: { major: "طب" }, source: "explicit" });
  // أغرق المخزن بذاكرات محادثة منخفضة الأهمية
  for (let i = 0; i < 20; i++) {
    eng.remember({ type: "conversation.salientFact", value: { text: `حقيقة ${i}` }, source: "duwairb", importance: 0.2 });
  }
  const top = eng.retrieveRelevantMemory({ limit: 3 });
  const types = top.map((m) => m.type);
  assert.ok(types.includes("identity.name"), "core identity always retrieved");
  assert.ok(types.includes("goal.targetMajor"), "core goal always retrieved");
});

test("search filters by category/type/tags and excludes archived by default", () => {
  const { eng } = makeEngine();
  eng.remember({ type: "learning.weakSubject", value: { subject: "أحياء" }, source: "inferred" });
  const strong = eng.remember({ type: "learning.strongSubject", value: { subject: "رياضيات" }, source: "inferred" });
  assert.equal(eng.searchMemory({ category: "learning" }).length, 2);
  assert.equal(eng.searchMemory({ type: "learning.weakSubject" }).length, 1);
  assert.equal(eng.searchMemory({ tags: ["رياضيات"] }).length, 1);
  eng.forget(strong.id);
  assert.equal(eng.searchMemory({ category: "learning" }).length, 1, "archived excluded");
  assert.equal(eng.searchMemory({ category: "learning", status: "archived" }).length, 1);
});

test("expiry: expired memory is not live; sweepExpired archives it", () => {
  const { eng, clk, start } = makeEngine();
  eng.remember({ type: "goal.examDeadline", value: { exam: "تحصيلي", date: "2026-11-01" }, source: "explicit", expiresAt: start + 5 * DAY });
  assert.equal(eng.searchMemory({ type: "goal.examDeadline" }).length, 1);
  clk.advanceDays(6);
  assert.equal(eng.searchMemory({ type: "goal.examDeadline" }).length, 0, "expired not live");
  assert.equal(eng.sweepExpired(), 1);
});

test("invalidate keeps record (archived as invalidated) with explainable reason", () => {
  const { eng } = makeEngine();
  const g = eng.remember({ type: "goal.targetMajor", value: { major: "هندسة" }, source: "explicit" });
  eng.invalidateMemory(g.id, "غيّر الطالب تخصصه إلى الطب");
  assert.equal(eng.searchMemory({ type: "goal.targetMajor" }).length, 0, "invalidated excluded from active");
  const rec = eng.all().find((m) => m.id === g.id)!;
  assert.equal(rec.status, "invalidated");
  assert.ok(rec.evidence.some((e) => e.note?.includes("الطب")), "reason recorded (explainable)");
});

test("buildStudentContext composes a compact relationship snapshot", () => {
  const { eng } = makeEngine();
  eng.remember({ type: "identity.name", value: { name: "خالد" }, source: "onboarding" });
  eng.remember({ type: "identity.studyLevel", value: { level: "ثانوي" }, source: "onboarding" });
  eng.remember({ type: "goal.targetUniversity", value: { university: "جامعة الملك فهد للبترول والمعادن" }, source: "explicit" });
  eng.remember({ type: "goal.targetScore", value: { exam: "تحصيلي", target: 92 }, source: "explicit" });
  eng.remember({ type: "learning.weakSubject", value: { subject: "كيمياء" }, source: "inferred" });
  eng.remember({ type: "learning.explanationStyle", value: { style: "بالأمثلة" }, source: "duwairb" });
  eng.remember({ type: "relationship.lifeEvent", value: { text: "اختبار قدرات بعد أسبوع", sentiment: "neutral" }, source: "event" });

  const ctx = eng.buildStudentContext();
  assert.equal(ctx.identity.name, "خالد");
  assert.equal(ctx.identity.studyLevel, "ثانوي");
  assert.equal(ctx.currentGoal.university, "جامعة الملك فهد للبترول والمعادن");
  assert.deepEqual(ctx.currentGoal.targets, [{ exam: "تحصيلي", target: 92 }]);
  assert.deepEqual(ctx.weakSubjects, ["كيمياء"]);
  assert.equal(ctx.preferredStyle, "بالأمثلة");
  assert.ok(ctx.recentLifeEvents.includes("اختبار قدرات بعد أسبوع"));
  assert.ok(ctx.memoryCount >= 7);
});

test("compressMemory rolls up old conversation facts into a summary", () => {
  const { eng } = makeEngine();
  for (let i = 0; i < 20; i++) {
    eng.remember({ type: "conversation.salientFact", value: { text: `ملاحظة ${i}` }, source: "duwairb" });
  }
  const before = eng.searchMemory({ type: "conversation.salientFact" }).length;
  const { compressed } = eng.compressMemory();
  assert.ok(compressed > 0, "some facts compressed");
  const after = eng.searchMemory({ type: "conversation.salientFact" }).length;
  assert.ok(after < before, "active facts reduced");
  assert.equal(eng.searchMemory({ type: "conversation.summary" }).length, 1, "summary created");
});

test("maintain bounds growth: prunes old archived, keeps active & pinned", () => {
  const { eng, clk } = makeEngine();
  // ذاكرات نشِطة مثبَّتة (هوية/هدف) + محادثات تتراكم ثم تُؤرشَف
  eng.remember({ type: "identity.name", value: { name: "ليان" }, source: "onboarding" });
  eng.remember({ type: "goal.targetMajor", value: { major: "طب" }, source: "explicit" });
  for (let i = 0; i < 30; i++) eng.remember({ type: "conversation.salientFact", value: { text: `حقيقة ${i}` }, source: "duwairb" });

  const c = eng.compressMemory();            // يؤرشِف القديمة الآن (updatedAt = T0)
  assert.ok(c.compressed > 0, "old conversation facts compressed → archived");
  clk.advanceDays(90);                        // الآن المؤرشفة تجاوزت نافذة الاحتفاظ
  const res = eng.maintain();
  assert.ok(res.pruned > 0, "archived-and-old facts pruned");

  const ctx = eng.buildStudentContext();
  assert.equal(ctx.identity.name, "ليان", "pinned identity survives maintenance");
  assert.equal(ctx.currentGoal.major, "طب", "pinned goal survives maintenance");
});

test("capTotal is a hard ceiling that drops archived before active, never pinned", () => {
  const { eng } = makeEngine();
  eng.remember({ type: "identity.name", value: { name: "نواف" }, source: "onboarding" }); // pinned
  // أنشئ ذاكرات نشِطة غير مثبَّتة (إتقان مواد) ومؤرشفة
  for (let i = 0; i < 20; i++) {
    const m = eng.remember({ type: "learning.subjectMastery", value: { subject: `مادة${i}`, mastery: 0.5 }, source: "event" });
    if (i < 10) eng.forget(m.id); // أرشِف النصف
  }
  const before = eng.all().length;
  const capped = eng.capTotal(8);
  assert.ok(capped > 0 && eng.all().length <= 8, "capped to the ceiling");
  assert.ok(eng.all().some((m) => m.type === "identity.name"), "pinned identity never dropped");
  assert.ok(capped <= before, "sane");
});

test("returning-student standard: identity + goals survive heavy decay window", () => {
  const { eng, clk } = makeEngine();
  eng.remember({ type: "identity.name", value: { name: "ريم" }, source: "onboarding" });
  eng.remember({ type: "goal.targetMajor", value: { major: "طب" }, source: "explicit" });
  eng.remember({ type: "relationship.lifeEvent", value: { text: "حلمها كلية الطب" }, source: "duwairb" });
  clk.advanceDays(5 * 365); // خمس سنوات
  const ctx = eng.buildStudentContext();
  assert.equal(ctx.identity.name, "ريم", "remembers the student after 5 years");
  assert.equal(ctx.currentGoal.major, "طب", "remembers the long-term ambition");
  assert.ok(ctx.recentLifeEvents.length >= 1, "remembers the relationship");
});
