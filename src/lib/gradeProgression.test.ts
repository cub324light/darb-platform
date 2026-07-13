import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceGradeByCalendar } from "./gradeProgression";

test("الجامعي/الخريج لا يترقّى", () => {
  assert.equal(advanceGradeByCalendar({ studyLevel: "جامعي", grade: undefined, anchorYearId: "1447", currentYearId: "1449" }).advanced, false);
  assert.equal(advanceGradeByCalendar({ studyLevel: "خريج", grade: undefined, anchorYearId: "1447", currentYearId: "1449" }).advanced, false);
});

test("نفس العام: لا ترقية", () => {
  const r = advanceGradeByCalendar({ studyLevel: "ثانوي", grade: "أول ثانوي", anchorYearId: "1447", currentYearId: "1447" });
  assert.equal(r.advanced, false);
  assert.equal(r.grade, "أول ثانوي");
});

test("أول ثانوي +عام → ثاني ثانوي", () => {
  const r = advanceGradeByCalendar({ studyLevel: "ثانوي", grade: "أول ثانوي", anchorYearId: "1447", currentYearId: "1448" });
  assert.equal(r.advanced, true);
  assert.equal(r.grade, "ثاني ثانوي");
  assert.equal(r.studyLevel, "ثانوي");
});

test("أول ثانوي +عامين → ثالث ثانوي", () => {
  const r = advanceGradeByCalendar({ studyLevel: "ثانوي", grade: "أول ثانوي", anchorYearId: "1447", currentYearId: "1449" });
  assert.equal(r.grade, "ثالث ثانوي");
});

test("أول ثانوي +٣ أعوام → خريج ثانوي", () => {
  const r = advanceGradeByCalendar({ studyLevel: "ثانوي", grade: "أول ثانوي", anchorYearId: "1447", currentYearId: "1450" });
  assert.equal(r.advanced, true);
  assert.equal(r.studyLevel, "خريج");
  assert.equal(r.gradStage, "خريج ثانوي");
  assert.equal(r.grade, undefined);
});

test("ثالث ثانوي +عام → خريج ثانوي", () => {
  const r = advanceGradeByCalendar({ studyLevel: "ثانوي", grade: "ثالث ثانوي", anchorYearId: "1447", currentYearId: "1448" });
  assert.equal(r.studyLevel, "خريج");
  assert.equal(r.gradStage, "خريج ثانوي");
});

test("ثالث ثانوي +عامين → خريج (لا يتجاوز)", () => {
  const r = advanceGradeByCalendar({ studyLevel: "ثانوي", grade: "ثالث ثانوي", anchorYearId: "1447", currentYearId: "1449" });
  assert.equal(r.studyLevel, "خريج");
});

test("صف غير معروف أو مرساة ناقصة: لا ترقية", () => {
  assert.equal(advanceGradeByCalendar({ studyLevel: "ثانوي", grade: "تمهيدي", anchorYearId: "1447", currentYearId: "1449" }).advanced, false);
  assert.equal(advanceGradeByCalendar({ studyLevel: "ثانوي", grade: "أول ثانوي", anchorYearId: null, currentYearId: "1449" }).advanced, false);
});

test("العام الحالي أقدم من المرساة (ساعة الجهاز خاطئة): لا ترقية للخلف", () => {
  const r = advanceGradeByCalendar({ studyLevel: "ثانوي", grade: "ثاني ثانوي", anchorYearId: "1448", currentYearId: "1447" });
  assert.equal(r.advanced, false);
});
