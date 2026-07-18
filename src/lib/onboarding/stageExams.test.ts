/* اختبار أهلية الاختبارات حسب المرحلة — تشغيل: npx tsx --test src/lib/onboarding/stageExams.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { stageExams, openStageExams, EXAM_TO_TRACK, EXAM_SCORE_KEY, type OnbStage } from "./stageExams";

const stateOf = (stage: OnbStage, id: string) => stageExams(stage).find((e) => e.id === id)!.state;

test("كل مرحلة تعرض الاختبارات التسعة بالترتيب الرسمي (لا يُخفى المقفل)", () => {
  const ids = stageExams("first").map((e) => e.id);
  assert.deepEqual(ids, ["qudurat", "tahsili", "step", "tahsiliEarly", "itc", "cpc", "ielts", "toefl", "duolingo"]);
  /* حتى في أول ثانوي تظهر التسعة كلها (بعضها مقفل) */
  assert.equal(stageExams("first").length, 9);
});

test("أول ثانوي: اللغة مفتوحة، والقياس والبرامج مقفلة", () => {
  assert.equal(stateOf("first", "step"), "open");
  assert.equal(stateOf("first", "ielts"), "open");
  assert.equal(stateOf("first", "qudurat"), "locked");
  assert.equal(stateOf("first", "tahsili"), "locked");
  assert.equal(stateOf("first", "tahsiliEarly"), "locked");
  assert.equal(stateOf("first", "cpc"), "locked");
});

test("الإجازة قبل ثاني + ثاني ثانوي: القدرات تفتح، التحصيلي والمبكر مقفلان", () => {
  for (const s of ["summer2", "second"] as OnbStage[]) {
    assert.equal(stateOf(s, "qudurat"), "open", `${s}: القدرات مفتوحة`);
    assert.equal(stateOf(s, "tahsili"), "locked", `${s}: التحصيلي مقفل`);
    assert.equal(stateOf(s, "tahsiliEarly"), "locked", `${s}: المبكر مقفل`);
    assert.equal(stateOf(s, "itc"), "locked", `${s}: ITC مقفل`);
    assert.equal(stateOf(s, "step"), "open", `${s}: STEP مفتوح`);
  }
});

test("الإجازة قبل ثالث + ثالث + خريج: كل الاختبارات مفتوحة", () => {
  for (const s of ["summer3", "third", "graduate"] as OnbStage[]) {
    assert.equal(openStageExams(s).length, 9, `${s}: التسعة مفتوحة`);
    assert.equal(stateOf(s, "tahsili"), "open");
    assert.equal(stateOf(s, "tahsiliEarly"), "open");
    assert.equal(stateOf(s, "cpc"), "open");
    assert.equal(stateOf(s, "itc"), "open");
  }
});

test("الجامعي يتخطّى الخطوة (لا اختبارات مفتوحة)", () => {
  assert.equal(openStageExams("university").length, 0);
});

test("خرائط الاختبار → مسار قديم ومفتاح درجة", () => {
  assert.equal(EXAM_TO_TRACK.qudurat, "قدرات");
  assert.equal(EXAM_TO_TRACK.tahsiliEarly, "تحصيلي مبكر");
  assert.equal(EXAM_TO_TRACK.cpc, "CPC");
  assert.equal(EXAM_SCORE_KEY.qudurat, "qudurat");
  assert.equal(EXAM_SCORE_KEY.tahsiliEarly, "tahsili"); // المبكر يُدخَل كتحصيلي
  assert.equal(EXAM_SCORE_KEY.ielts, undefined);        // لا إدخال درجة للغة الدولية بالتسجيل
});
