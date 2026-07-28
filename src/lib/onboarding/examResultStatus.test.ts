/* اختبار حالة النتيجة + تقدير الموعد — تشغيل: TZ=UTC npx tsx --test src/lib/onboarding/examResultStatus.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateResult, remainingDays, remainingToResult, addDays, daysBetween } from "./examResultStatus";

test("مساعدات التاريخ: إضافة أيام وفارقها", () => {
  assert.equal(addDays("2026-07-18", 3), "2026-07-21");
  assert.equal(addDays("2026-07-30", 7), "2026-08-06");   // عبور الشهر
  assert.equal(daysBetween("2026-07-18", "2026-08-08"), 21);
  assert.equal(addDays("bad", 3), "bad");                 // مدخلٌ خاطئ يُعاد كما هو
});

test("القدرات المحوسب: متوسط 3 أيام وأقصى أسبوع + نصّه", () => {
  const e = estimateResult("qudurat", "computer", "2026-07-18");
  assert.equal(e.avgDays, 3);
  assert.equal(e.maxDays, 7);
  assert.equal(e.expectedDate, "2026-07-21");
  assert.equal(e.maxDate, "2026-07-25");
  assert.ok(e.text.includes("3 أيام") && e.text.includes("أسبوع"));
});

test("القدرات الورقي: حوالي شهر + نصّه (لا حدّ أقصى)", () => {
  const e = estimateResult("qudurat", "paper", "2026-07-18");
  assert.equal(e.avgDays, 30);
  assert.equal(e.maxDays, undefined);
  assert.equal(e.expectedDate, "2026-08-17");
  assert.ok(e.text.includes("شهر"));
});

test("التحصيلي ورقيٌّ دائماً (يتجاهل النمط) + نصّه الخاص", () => {
  const a = estimateResult("tahsili", "computer", "2026-07-18"); // حتى لو مُرّر محوسب
  const b = estimateResult("tahsili", "paper", "2026-07-18");
  assert.equal(a.avgDays, 30);
  assert.equal(a.expectedDate, b.expectedDate);
  assert.ok(a.text.includes("التحصيلي") && a.text.includes("شهر"));
});

test("العدّ التنازلي: الأيام المتبقّية حتى الموعد المتوقّع (لا يقلّ عن صفر)", () => {
  /* اختبار محوسب 2026-07-18 → متوقّع 2026-07-21 */
  assert.equal(remainingToResult("qudurat", "computer", "2026-07-18", "2026-07-18"), 3);
  assert.equal(remainingToResult("qudurat", "computer", "2026-07-18", "2026-07-20"), 1);
  assert.equal(remainingToResult("qudurat", "computer", "2026-07-18", "2026-07-25"), 0); // مضى الموعد → صفر
  /* تحصيلي: مثال 21 يوماً متبقّية */
  assert.equal(remainingDays("2026-08-08", "2026-07-18"), 21);
});
