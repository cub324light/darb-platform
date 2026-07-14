import { test } from "node:test";
import assert from "node:assert/strict";
import { recommendedExams, requirementsOf } from "./recommendedExams";

/* اليوم المرجعي يطابق examProvider: القدرات محوسبة مفتوحة، التحصيلي موسمي. */
const today = "2026-07-13";
const kindsOf = (dests: string[], stage: Parameters<typeof recommendedExams>[0]["stage"], extra = {}) =>
  new Set(recommendedExams({ destinations: dests, stage, today, ...extra }).map((e) => e.kind));

test("requirementsOf: الوجهة تحدّد الوسائل (لا أهداف)", () => {
  assert.deepEqual([...requirementsOf(["university"])].sort(), ["qudurat", "tahsili"]);
  assert.deepEqual([...requirementsOf(["english"])], ["language"]);
  assert.deepEqual([...requirementsOf(["itc"])].sort(), ["itc", "qudurat"]);
  assert.deepEqual([...requirementsOf(["nope"])], []);
});

test("جامعة @ ثالث ثانوي ⇒ قدرات + تحصيلي", () => {
  const k = kindsOf(["university"], "third");
  assert.ok(k.has("qudurat") && k.has("tahsili"));
});

test("أول ثانوي: لا قياس مهما كانت الوجهة (يبني أساسه)", () => {
  const k = kindsOf(["university", "aramco"], "first");
  assert.ok(!k.has("qudurat") && !k.has("tahsili"));
  assert.ok(!k.has("aramco"), "البرامج لمرحلة القبول فقط");
});

test("تطوير الإنجليزية ⇒ اللغة فقط، بلا قياس مفروض", () => {
  assert.deepEqual([...kindsOf(["english"], "third")], ["language"]);
  assert.deepEqual([...kindsOf(["english"], "first")], ["language"]);
});

test("ابتعاث @ ثالث ⇒ قدرات + تحصيلي + لغة", () => {
  const k = kindsOf(["scholarship"], "third");
  assert.ok(k.has("qudurat") && k.has("tahsili") && k.has("language"));
});

test("ITC: البرنامج لمرحلة القبول — يظهر لثالث لا لثاني", () => {
  const third = kindsOf(["itc"], "third");
  assert.ok(third.has("itc") && third.has("qudurat"));
  assert.ok(!third.has("tahsili"), "ITC لا يتطلّب تحصيلي");
  const second = kindsOf(["itc"], "second");
  assert.ok(second.has("qudurat"), "القدرات تبقى لثاني");
  assert.ok(!second.has("itc"), "برنامج ITC لا يظهر قبل مرحلة القبول");
});

test("أرامكو @ خريج ⇒ قدرات + تحصيلي + أرامكو", () => {
  const k = kindsOf(["aramco"], "graduate");
  assert.ok(k.has("qudurat") && k.has("tahsili") && k.has("aramco"));
});

test("خريج جامعة: لا قياس ولا برامج", () => {
  const k = kindsOf(["university", "itc"], "graduate", { isUniGrad: true });
  assert.equal(k.size, 0);
});

test("بلا وجهة ⇒ لا اختبارات مقترحة (الوجهة هي المدخل)", () => {
  assert.deepEqual(recommendedExams({ destinations: [], stage: "third", today }), []);
});

test("القياس يحمل حالة النافذة واسمها (المبكر/العادي)", () => {
  const rec = recommendedExams({ destinations: ["university"], stage: "third", today });
  const q = rec.find((e) => e.kind === "qudurat");
  assert.ok(q && q.label === "القدرات" && q.boardId === "qudurat");
  const t = rec.find((e) => e.kind === "tahsili");
  assert.ok(t && (t.boardId === "tahsiliEarly" || t.boardId === "tahsiliRegular"));
});
