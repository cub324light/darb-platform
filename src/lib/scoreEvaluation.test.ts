/* اختبار التقييم العام للدرجات (توزيع قياس الرسمي) — تشغيل: npx tsx --test src/lib/scoreEvaluation.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getQuduratEval, getTahsiliEval, getStepEval, evalBand, percentileText, evalBarPct, QIYAS_BANDS,
} from "./scoreEvaluation";

test("توزيع قياس للقدرات: حدود المستويات الرسمية", () => {
  assert.equal(getQuduratEval(59)!.tier, "below");     // أقل من 60
  assert.equal(getQuduratEval(59)!.icon, "🔴");
  assert.equal(getQuduratEval(60)!.tier, "average");   // 60 إلى دون 70
  assert.equal(getQuduratEval(69)!.tier, "average");
  assert.equal(getQuduratEval(60)!.icon, "🟡");
  assert.equal(getQuduratEval(70)!.tier, "good");      // 70 إلى دون 78
  assert.equal(getQuduratEval(77)!.tier, "good");
  assert.equal(getQuduratEval(78)!.tier, "high");      // 78 إلى دون 81
  assert.equal(getQuduratEval(80)!.tier, "high");
  assert.equal(getQuduratEval(81)!.tier, "excellent"); // 81 فأعلى
  assert.equal(getQuduratEval(95)!.tier, "excellent");
});

test("النِّسب المئوية الرسمية للقدرات (70/90/95) — جيد فأعلى فقط", () => {
  assert.equal(getQuduratEval(72)!.percentile, 70);
  assert.equal(getQuduratEval(79)!.percentile, 90);
  assert.equal(getQuduratEval(85)!.percentile, 95);
  /* المتوسط وأقل منه: بلا نسبةٍ رسمية */
  assert.equal(getQuduratEval(65)!.percentile, undefined);
  assert.equal(getQuduratEval(50)!.percentile, undefined);
});

test("التحصيلي يتشارك توزيع قياس نفسه", () => {
  assert.equal(getTahsiliEval(78)!.tier, "high");
  assert.equal(getTahsiliEval(78)!.percentile, 90);
  assert.deepEqual([...QIYAS_BANDS], [...QIYAS_BANDS]); // مصدرٌ واحد
});

test("STEP اختبار لغة: مستوياتٌ بلا نسبةٍ مئوية رسمية", () => {
  assert.equal(getStepEval(92)!.tier, "excellent");
  assert.equal(getStepEval(92)!.percentile, undefined);
  assert.equal(getStepEval(40)!.tier, "below");
  assert.equal(percentileText(getStepEval(92)), null); // لا نصّ نسبة لـ STEP
});

test("percentileText: نصٌّ عربي حين وُجدت النسبة، وإلا null", () => {
  assert.ok(percentileText(getQuduratEval(85))!.includes("٪"));
  assert.ok(percentileText(getQuduratEval(85))!.includes("95"));
  assert.equal(percentileText(getQuduratEval(65)), null);
  assert.equal(percentileText(null), null);
});

test("evalBarPct: نسبة الامتلاء مقصوصة 0–100", () => {
  assert.equal(evalBarPct(88), 88);
  assert.equal(evalBarPct(0), 0);
  assert.equal(evalBarPct(120), 100);
  assert.equal(evalBarPct(null), 0);
  assert.equal(evalBarPct(NaN), 0);
});

test("evalBand: درجةٌ فارغة → null", () => {
  assert.equal(evalBand("qudurat", null), null);
  assert.equal(evalBand("qudurat", undefined), null);
});
