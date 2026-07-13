import { test } from "node:test";
import assert from "node:assert/strict";
import { examBoard, type ExamBoardId } from "./examEligibility";

const ids = (b: { id: ExamBoardId }[]) => b.map((e) => e.id);
const byId = (b: ReturnType<typeof examBoard>, id: ExamBoardId) => b.find((e) => e.id === id);

test("أول ثانوي: لا اختبارات قياس إطلاقاً", () => {
  assert.deepEqual(examBoard({ stage: "first" }), []);
});

test("الجامعي وخريج الجامعة: لا قياس", () => {
  assert.deepEqual(examBoard({ stage: "university" }), []);
  assert.deepEqual(examBoard({ stage: "graduate", isUniGrad: true }), []);
});

test("ثاني ثانوي — الفصل الأول: القدرات فقط، لا تحصيلي", () => {
  const b = examBoard({ stage: "second", afterFirstTerm: false, isTargeted: true, windows: { qudurat: "open", tahsiliEarly: "open" } });
  assert.deepEqual(ids(b), ["qudurat"]);
});

test("ثاني ثانوي — بعد الفصل الأول + مُستهدَف + نافذة مفتوحة: يظهر المبكر", () => {
  const b = examBoard({ stage: "second", afterFirstTerm: true, isTargeted: true, windows: { qudurat: "open", tahsiliEarly: "open" } });
  assert.deepEqual(ids(b), ["qudurat", "tahsiliEarly"]);
  assert.equal(byId(b, "tahsiliEarly")!.mode, "register-open");
});

test("ثاني ثانوي — بعد الفصل الأول لكن غير مُستهدَف: لا مبكر", () => {
  const b = examBoard({ stage: "second", afterFirstTerm: true, isTargeted: false, windows: { tahsiliEarly: "open" } });
  assert.deepEqual(ids(b), ["qudurat"]);
});

test("ثاني ثانوي — مُستهدَف لكن نافذة المبكر معلّقة: لا يظهر (لا يُعرَض كمتاح)", () => {
  const b = examBoard({ stage: "second", afterFirstTerm: true, isTargeted: true, windows: { tahsiliEarly: "pending" } });
  assert.deepEqual(ids(b), ["qudurat"]);
});

test("ثالث ثانوي — نافذة المبكر مفتوحة: قدرات + مبكر (لا عادي)", () => {
  const b = examBoard({ stage: "third", windows: { qudurat: "open", tahsiliEarly: "open", tahsiliRegular: "pending" } });
  assert.deepEqual(ids(b), ["qudurat", "tahsiliEarly"]);
});

test("ثالث ثانوي — نافذة المبكر انتهت: يتحوّل للعادي تلقائياً", () => {
  const b = examBoard({ stage: "third", windows: { qudurat: "open", tahsiliEarly: "passed", tahsiliRegular: "open" } });
  assert.deepEqual(ids(b), ["qudurat", "tahsiliRegular"]);
  assert.equal(byId(b, "tahsiliRegular")!.mode, "register-open");
});

test("خريج الثانوية: قدرات + تحصيلي عادي، ولا مبكر إطلاقاً", () => {
  const b = examBoard({ stage: "graduate", windows: { qudurat: "open", tahsiliEarly: "open", tahsiliRegular: "open" } });
  assert.deepEqual(ids(b), ["qudurat", "tahsiliRegular"]);
});

test("خريج الثانوية — التحصيلي العادي معلّق: «بانتظار فتح التسجيل»", () => {
  const b = examBoard({ stage: "graduate", windows: { qudurat: "passed", tahsiliRegular: "pending" } });
  assert.equal(byId(b, "tahsiliRegular")!.mode, "pending");
  assert.match(byId(b, "tahsiliRegular")!.hint, /بانتظار فتح التسجيل/);
  assert.equal(byId(b, "qudurat")!.mode, "prepare"); // passed → استعد له
});

test("خريطة حالات النافذة → وضع العرض", () => {
  const mk = (w: "open" | "upcoming" | "pending" | "passed") =>
    byId(examBoard({ stage: "graduate", windows: { qudurat: w } }), "qudurat")!.mode;
  assert.equal(mk("open"), "register-open");
  assert.equal(mk("upcoming"), "register-upcoming");
  assert.equal(mk("pending"), "pending");
  assert.equal(mk("passed"), "prepare");
});
