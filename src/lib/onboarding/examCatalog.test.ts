/* اختبار ترتيب الاختبارات + كتالوج «ما أدري» — تشغيل: npx tsx --test src/lib/onboarding/examCatalog.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { EXAM_ORDER, recExamRank, UNDECIDED_EXAM_CARDS } from "./examCatalog";

test("الترتيب الرسمي: القدرات ثم التحصيلي ثم STEP ثم المبكر ثم ITC ثم CPC ثم اللغات", () => {
  assert.ok(EXAM_ORDER.qudurat < EXAM_ORDER.tahsili);
  assert.ok(EXAM_ORDER.tahsili < EXAM_ORDER.step);
  assert.ok(EXAM_ORDER.step < EXAM_ORDER.tahsiliEarly);
  assert.ok(EXAM_ORDER.tahsiliEarly < EXAM_ORDER.itc);
  assert.ok(EXAM_ORDER.itc < EXAM_ORDER.cpc);
  assert.ok(EXAM_ORDER.cpc < EXAM_ORDER.ielts);
  assert.ok(EXAM_ORDER.ielts < EXAM_ORDER.toefl);
  assert.ok(EXAM_ORDER.toefl < EXAM_ORDER.duolingo);
});

test("recExamRank يرتّب المُوصى بها: قدرات<تحصيلي<لغة<مبكر<itc<cpc", () => {
  assert.equal(recExamRank({ kind: "qudurat" }), 1);
  assert.equal(recExamRank({ kind: "tahsili", boardId: "tahsiliRegular" }), 2);
  assert.equal(recExamRank({ kind: "language" }), 3); // STEP
  assert.equal(recExamRank({ kind: "tahsili", boardId: "tahsiliEarly" }), 4);
  assert.equal(recExamRank({ kind: "itc" }), 5);
  assert.equal(recExamRank({ kind: "aramco" }), 6);

  const rec = [{ kind: "aramco" }, { kind: "qudurat" }, { kind: "language" }, { kind: "tahsili", boardId: "tahsiliRegular" }];
  const sorted = [...rec].sort((a, b) => recExamRank(a) - recExamRank(b)).map((e) => e.kind);
  assert.deepEqual(sorted, ["qudurat", "tahsili", "language", "aramco"]);
});

test("كتالوج «ما أدري»: ثمانية اختبارات بالترتيب الرسمي، كلٌّ بفرصه", () => {
  assert.deepEqual(UNDECIDED_EXAM_CARDS.map((c) => c.id), ["qudurat", "tahsili", "step", "itc", "cpc", "ielts", "toefl", "duolingo"]);
  assert.ok(UNDECIDED_EXAM_CARDS.every((c) => c.opens.length > 0), "كل بطاقةٍ لها فرص");
  const cpc = UNDECIDED_EXAM_CARDS.find((c) => c.id === "cpc")!;
  assert.ok(cpc.opens.some((o) => o.includes("الإعداد الجامعي")));
  const ielts = UNDECIDED_EXAM_CARDS.find((c) => c.id === "ielts")!;
  assert.ok(ielts.opens.includes("الابتعاث"));
});
