import { test } from "node:test";
import assert from "node:assert/strict";
import { canAddModule } from "./eligibility";

/* اليوم المرجعي يطابق examProvider: 1447هـ انتهت، 1448هـ بلا تواريخ (pending)،
   والقدرات محوسبة مفتوحة طوال السنة (alwaysOpen). */
const today = "2026-07-13";

test("Core لا يُضاف يدوياً — يشرح أنها تلقائية", () => {
  const s = canAddModule("school", { stage: "first", today });
  assert.equal(s.allowed, false);
  assert.match(s.reason ?? "", /أساسية/);
});

test("القدرات: ممنوعة لأول ثانوي، متاحة لثالث/خريج (محوسب مفتوح)", () => {
  const first = canAddModule("qudurat", { stage: "first", today });
  assert.equal(first.allowed, false);
  assert.match(first.reason ?? "", /ثاني ثانوي/);

  const third = canAddModule("qudurat", { stage: "third", today });
  assert.equal(third.allowed, true);
  assert.equal(third.label, "القدرات");

  assert.equal(canAddModule("qudurat", { stage: "graduate", today }).allowed, true);
});

test("التحصيلي: خريج الثانوية يُتاح دائماً (نافذة أو بانتظار)؛ الجامعي لا قياس", () => {
  const grad = canAddModule("tahsili", { stage: "graduate", today });
  assert.equal(grad.allowed, true);
  assert.equal(grad.label, "التحصيلي");

  const uni = canAddModule("tahsili", { stage: "university", today });
  assert.equal(uni.allowed, false);
  assert.match(uni.reason ?? "", /خارج/);
});

test("اللغة بلا حدّ ولا تقييد صفّي — متاحة لكل المراحل", () => {
  for (const stage of ["first", "second", "third", "graduate", "university"] as const) {
    assert.equal(canAddModule("ielts", { stage, today }).allowed, true, `IELTS يجب أن تُتاح لـ ${stage}`);
  }
  assert.equal(canAddModule("step", { stage: "first", today }).allowed, true);
});

test("برامج القبول: لمرحلة القبول فقط (ثالث/خريج ثانوي)", () => {
  assert.equal(canAddModule("aramco", { stage: "second", today }).allowed, false);
  assert.equal(canAddModule("aramco", { stage: "third", today }).allowed, true);
  assert.equal(canAddModule("itc", { stage: "graduate", today }).allowed, true);
  // خريج جامعة: لا برامج قبول
  assert.equal(canAddModule("niti", { stage: "graduate", isUniGrad: true, today }).allowed, false);
});
