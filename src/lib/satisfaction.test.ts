/* اختبار مؤشّر الرضا — دالة نقية.
   تشغيل: npx tsx --test src/lib/satisfaction.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateSatisfaction, examKeyOf, satisfactionForResult } from "./satisfaction";
import type { DarbGoals } from "./storage";

test("examKeyOf يطابق بالتضمين", () => {
  assert.equal(examKeyOf("القدرات"), "qudurat");
  assert.equal(examKeyOf("التحصيلي"), "tahsili");
  assert.equal(examKeyOf("STEP"), "step");
  assert.equal(examKeyOf("CPC أرامكو"), null);
});

test("evaluateSatisfaction مع عتبة: أخضر/أصفر/أحمر", () => {
  assert.equal(evaluateSatisfaction(90, 85).band, "green");   // ≥ العتبة
  assert.equal(evaluateSatisfaction(85, 85).band, "green");   // = العتبة
  assert.equal(evaluateSatisfaction(82, 85).band, "yellow");  // خلال 5 تحت
  assert.equal(evaluateSatisfaction(70, 85).band, "red");     // أقل بكثير
});

test("بلا هدف: تقديرٌ عام لا يدّعي هدفاً — ولا يذكر «هدفك» إطلاقاً", () => {
  assert.equal(evaluateSatisfaction(88, null).band, "green");
  assert.equal(evaluateSatisfaction(78, null).band, "yellow");
  assert.equal(evaluateSatisfaction(60, null).band, "red");
  for (const v of [88, 78, 60]) {
    const s = evaluateSatisfaction(v, null);
    assert.match(s.note, /حدّد/);
    assert.ok(!s.title.includes("هدفك"), "لا يُنسب إلى هدفٍ لم يحدّده الطالب");
    assert.ok(!s.note.includes("متطلّب"), "ولا يُدّعى متطلّبُ تخصّص");
  }
});

test("العتبة هدفُ الطالب وحدَه — والتخصّصُ لا يولّد عتبة", () => {
  const goals = { quduratTarget: 90 } as DarbGoals;
  const s = satisfactionForResult("القدرات", "86", goals);
  assert.ok(s);
  assert.equal(s!.band, "yellow");         // 86 ضمن 5 تحت 90
  assert.equal(s!.threshold, 90);
  assert.equal(s!.note, "هدفك 90.");

  /* الطبُّ متطلّبُه «مرتفع» — وكان يُترجَم 85 فيصير عتبةً. الآن: لا عتبة. */
  const medOnly = satisfactionForResult("التحصيلي", "80", { majorId: "medicine" } as DarbGoals);
  assert.ok(medOnly);
  assert.equal(medOnly!.threshold, null, "لا عتبةَ من التخصّص بعد اليوم");
});

test("satisfactionForResult يعيد null لاختبار بلا مفتاح أو درجة غير صالحة", () => {
  assert.equal(satisfactionForResult("CPC", "80", {} as DarbGoals), null);
  assert.equal(satisfactionForResult("القدرات", "بلا", {} as DarbGoals), null);
});
