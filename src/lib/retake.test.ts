import { test } from "node:test";
import assert from "node:assert/strict";
import { retakeAvailability, achievableRetakes, bestNextStep } from "./retake";

/* اليوم المرجعي: 1447هـ انتهت، 1448هـ بلا تواريخ (pending) — يطابق examProvider */
const TODAY = "2026-07-13";

test("أول ثانوي: لا إعادة (مبكّر) — السبب stage", () => {
  const r = retakeAvailability("qudurat", "first", TODAY);
  assert.equal(r.possible, false);
  assert.equal(r.reason, "stage");
});

test("ثاني ثانوي: القدرات فقط قابلة للإعادة (المحوسب مفتوح طوال السنة)", () => {
  const q = retakeAvailability("qudurat", "second", TODAY);
  assert.equal(q.possible, true);
  assert.equal(q.reason, "ok"); // القدرات المحوسب مفتوح دائماً — لا «بانتظار»
  const t = retakeAvailability("tahsili", "second", TODAY);
  assert.equal(t.possible, false);
  assert.equal(t.reason, "stage");
});

test("ثالث ثانوي: كل اختبارات القياس قابلة للإعادة", () => {
  for (const k of ["qudurat", "tahsili", "step"] as const) {
    const r = retakeAvailability(k, "third", TODAY);
    assert.equal(r.possible, true, `${k} يجب أن تكون ممكنة`);
  }
});

test("خريج الثانوي (القبول مفتوح): الإعادة ممكنة", () => {
  const r = retakeAvailability("qudurat", "graduate", TODAY, { admissionOpen: true });
  assert.equal(r.possible, true);
});

test("خريج الجامعة (القبول مخفي): لا إعادة أبداً — السبب stage", () => {
  const r = retakeAvailability("qudurat", "graduate", TODAY, { admissionOpen: false });
  assert.equal(r.possible, false);
  assert.equal(r.reason, "stage");
});

test("الجامعي: لا إعادة قياس", () => {
  const r = retakeAvailability("tahsili", "university", TODAY, { admissionOpen: true });
  assert.equal(r.possible, false);
  assert.equal(r.reason, "stage");
});

test("النافذة المعلّقة تحمل تسمية السنة بلا تاريخ مُخمَّن (التحصيلي موسمي)", () => {
  const r = retakeAvailability("tahsili", "third", TODAY);
  assert.equal(r.windowStatus, "pending");
  assert.match(r.windowLabel ?? "", /1448/);
});

test("achievableRetakes: يُسقط ما تتعذّر إعادته حسب المرحلة", () => {
  const stored = ["القدرات", "التحصيلي"];
  /* أول ثانوي: كلاهما يسقط */
  assert.deepEqual(achievableRetakes(stored, "first", TODAY), []);
  /* ثاني ثانوي: القدرات فقط تبقى */
  assert.deepEqual(achievableRetakes(stored, "second", TODAY), ["القدرات"]);
  /* ثالث ثانوي: كلاهما يبقى */
  assert.deepEqual(achievableRetakes(stored, "third", TODAY), ["القدرات", "التحصيلي"]);
  /* خريج الجامعة: كلاهما يسقط */
  assert.deepEqual(achievableRetakes(stored, "graduate", TODAY, { admissionOpen: false }), []);
});

test("achievableRetakes: اختبار خارج قياس (CPC) يمرّ بلا حكم نافذة", () => {
  assert.deepEqual(achievableRetakes(["CPC"], "third", TODAY), ["CPC"]);
});

test("bestNextStep: المبكّر يبدأ من مساري، الثالث يحسب موزونته", () => {
  assert.equal(bestNextStep("first", "qudurat").href, "/roadmap");
  assert.equal(bestNextStep("second", "qudurat").href, "/roadmap");
  assert.equal(bestNextStep("third", "qudurat").href, "/university");
  assert.equal(bestNextStep("graduate", "tahsili").href, "/university");
});
