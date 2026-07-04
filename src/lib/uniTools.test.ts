/* اختبارات أدوات الجامعة — تشغيل: npx tsx --test src/lib/uniTools.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GRADE_SCALE, GPA_MAX,
  gradePoints, semesterGpa, cumulativeAfter, requiredSemesterGpa,
  convertGpa, absenceBudget, neededOnFinal,
  type GradeLetter,
} from "./uniTools";

/* ════════ سلم التقديرات ════════ */
test("سلم التقديرات: تسعة أحرف بقيم متناقصة تماماً في النظامين", () => {
  assert.equal(GRADE_SCALE.length, 9);
  for (let i = 1; i < GRADE_SCALE.length; i++) {
    assert.ok(GRADE_SCALE[i - 1].g5 > GRADE_SCALE[i].g5, `g5 انكسر عند ${GRADE_SCALE[i].letter}`);
    assert.ok(GRADE_SCALE[i - 1].g4 > GRADE_SCALE[i].g4, `g4 انكسر عند ${GRADE_SCALE[i].letter}`);
  }
});

test("gradePoints: القيم المرجعية للنظامين (A+‏/A/B/F)", () => {
  assert.equal(gradePoints("A+", 5), 5);
  assert.equal(gradePoints("A", 5), 4.75);
  assert.equal(gradePoints("B", 5), 4);
  assert.equal(gradePoints("F", 5), 1);
  assert.equal(gradePoints("A+", 4), 4);
  assert.equal(gradePoints("A", 4), 3.75);
  assert.equal(gradePoints("B", 4), 3);
  assert.equal(gradePoints("F", 4), 0);
});

test("gradePoints: كل حرف ضمن حدود سلمه", () => {
  for (const { letter } of GRADE_SCALE) {
    const p5 = gradePoints(letter as GradeLetter, 5);
    const p4 = gradePoints(letter as GradeLetter, 4);
    assert.ok(p5 >= 1 && p5 <= GPA_MAX[5], `${letter} خارج سلم 5`);
    assert.ok(p4 >= 0 && p4 <= GPA_MAX[4], `${letter} خارج سلم 4`);
  }
});

/* ════════ المعدل الفصلي ════════ */
test("semesterGpa: متوسط موزون بالساعات", () => {
  /* 3 ساعات A+ (5) + 3 ساعات B (4) = (15+12)/6 = 4.5 */
  assert.equal(semesterGpa([{ hours: 3, points: 5 }, { hours: 3, points: 4 }]), 4.5);
  /* الوزن يفرق: 4 ساعات × 5 + 2 ساعة × 2 = 24/6 = 4 */
  assert.equal(semesterGpa([{ hours: 4, points: 5 }, { hours: 2, points: 2 }]), 4);
});

test("semesterGpa: قائمة فارغة أو ساعات صفرية/سالبة ⇒ null، والمواد غير الصالحة تُتجاهل", () => {
  assert.equal(semesterGpa([]), null);
  assert.equal(semesterGpa([{ hours: 0, points: 5 }]), null);
  assert.equal(semesterGpa([{ hours: -3, points: 5 }]), null);
  /* مادة صالحة + مادة بساعات صفر ⇒ تُحسب الصالحة فقط */
  assert.equal(semesterGpa([{ hours: 3, points: 4 }, { hours: 0, points: 5 }]), 4);
  assert.equal(semesterGpa([{ hours: 3, points: NaN }, { hours: 3, points: 3 }]), 3);
});

/* ════════ التراكمي بعد فصل ════════ */
test("cumulativeAfter: متوسط موزون بين التراكمي والفصل", () => {
  /* 100 ساعة بمعدل 4 + فصل 20 ساعة بمعدل 5 = (400+100)/120 = 4.1666... */
  const cum = cumulativeAfter({ gpa: 4, hours: 100 }, { gpa: 5, hours: 20 });
  assert.ok(cum !== null && Math.abs(cum - 500 / 120) < 1e-12);
});

test("cumulativeAfter: طالب مستجد (صفر ساعات سابقة) ⇒ التراكمي = الفصلي", () => {
  assert.equal(cumulativeAfter({ gpa: 0, hours: 0 }, { gpa: 4.5, hours: 15 }), 4.5);
});

test("cumulativeAfter: مجموع الساعات صفر ⇒ null، والسالب يُعامل صفراً", () => {
  assert.equal(cumulativeAfter({ gpa: 4, hours: 0 }, { gpa: 5, hours: 0 }), null);
  assert.equal(cumulativeAfter({ gpa: 4, hours: -10 }, { gpa: 5, hours: 15 }), 5);
});

/* ════════ «وش أحتاج؟» ════════ */
test("requiredSemesterGpa: حساب المطلوب الصحيح (نظام 5)", () => {
  /* تراكمي 4 على 90 ساعة، هدف 4.1، فصل 15 ساعة:
     المطلوب = (4.1×105 − 4×90) / 15 = (430.5 − 360)/15 = 4.7 */
  const r = requiredSemesterGpa({ gpa: 4, hours: 90 }, 4.1, 15, 5);
  assert.ok(r && r.status === "possible");
  assert.ok(Math.abs(r.required - 4.7) < 1e-9);
  assert.equal(r.max, 5);
});

test("requiredSemesterGpa: مستحيل عندما يتجاوز المطلوب سقف السلم", () => {
  /* تراكمي 2 على 120 ساعة، هدف 4.5، فصل 12 ساعة ⇒ مطلوب فلكي */
  const r = requiredSemesterGpa({ gpa: 2, hours: 120 }, 4.5, 12, 5);
  assert.ok(r && r.status === "impossible");
  assert.ok(r.required > 5);
  /* نفس المنطق على نظام 4: مطلوب 4.7 فوق سقفه */
  const r4 = requiredSemesterGpa({ gpa: 3.2, hours: 90 }, 3.28, 15, 4);
  assert.ok(r4 && Math.abs(r4.required - 3.76) < 1e-9 && r4.status === "possible");
  const r4b = requiredSemesterGpa({ gpa: 3, hours: 100 }, 3.2, 10, 4);
  assert.ok(r4b && r4b.status === "impossible");
});

test("requiredSemesterGpa: هدف محقق سلفاً ⇒ achieved والمطلوب 0", () => {
  const r = requiredSemesterGpa({ gpa: 4.8, hours: 100 }, 3, 15, 5);
  assert.ok(r && r.status === "achieved" && r.required === 0);
});

test("requiredSemesterGpa: حد السقف بالضبط possible، وساعات فصل صفر ⇒ null", () => {
  /* مستجد (0 ساعات) هدفه 5 ⇒ المطلوب 5 بالضبط = ممكن */
  const r = requiredSemesterGpa({ gpa: 0, hours: 0 }, 5, 15, 5);
  assert.ok(r && r.status === "possible" && r.required === 5);
  assert.equal(requiredSemesterGpa({ gpa: 4, hours: 90 }, 4.5, 0, 5), null);
});

/* ════════ تحويل المعدل ════════ */
test("convertGpa: تحويل خطي تناسبي بين السلالم الثلاثة", () => {
  assert.equal(convertGpa(5, 5, 4), 4);
  assert.equal(convertGpa(2.5, 5, 100), 50);
  assert.equal(convertGpa(3, 4, 5), 3.75);
  assert.equal(convertGpa(90, 100, 5), 4.5);
  /* نفس السلم ⇒ نفس القيمة */
  assert.equal(convertGpa(3.2, 4, 4), 3.2);
});

test("convertGpa: قص القيم خارج السلم المصدر + مدخلات شاذة", () => {
  assert.equal(convertGpa(7, 5, 100), 100);   // فوق السلم ⇒ سقفه
  assert.equal(convertGpa(-2, 5, 4), 0);      // سالب ⇒ صفر
  assert.equal(convertGpa(NaN, 5, 4), 0);     // غير رقم ⇒ صفر
});

test("convertGpa: ذهاب وإياب يعيد نفس القيمة (ضمن حدود السلم)", () => {
  const v = 3.67;
  assert.ok(Math.abs(convertGpa(convertGpa(v, 5, 100), 100, 5) - v) < 1e-12);
});

/* ════════ حاسبة الغياب ════════ */
test("absenceBudget: الافتراضات (15 أسبوعاً، 25٪) — مادة 3 ساعات", () => {
  const r = absenceBudget({ weeklyHours: 3 });
  assert.ok(r);
  assert.equal(r.totalHours, 45);
  assert.equal(r.maxAbsenceHours, 11.25);
  assert.equal(r.maxAbsenceLectures, 11); // بمحاضرات مدتها ساعة
  assert.equal(r.remainingHours, 11.25);
  assert.equal(r.usedOfLimit, 0);
  assert.equal(r.exceeded, false);
});

test("absenceBudget: غياب جزئي، وبلوغ الحد بالضبط ليس تجاوزاً، وما فوقه تجاوز", () => {
  const half = absenceBudget({ weeklyHours: 4, absent: 7.5 }); // إجمالي 60، سقف 15
  assert.ok(half && half.usedOfLimit === 0.5 && half.remainingHours === 7.5 && !half.exceeded);
  const atLimit = absenceBudget({ weeklyHours: 4, absent: 15 });
  assert.ok(atLimit && atLimit.usedOfLimit === 1 && atLimit.remainingHours === 0 && !atLimit.exceeded);
  const over = absenceBudget({ weeklyHours: 4, absent: 16 });
  assert.ok(over && over.exceeded && over.remainingHours === 0 && over.usedOfLimit > 1);
});

test("absenceBudget: حد حرمان ومدة محاضرة مخصّصان", () => {
  /* 2 ساعة أسبوعياً × 16 أسبوعاً = 32، حد 20٪ = 6.4 ساعة، محاضرات ساعتين ⇒ 3 */
  const r = absenceBudget({ weeklyHours: 2, weeks: 16, limitPct: 0.2, lectureHours: 2 });
  assert.ok(r);
  assert.equal(r.totalHours, 32);
  assert.ok(Math.abs(r.maxAbsenceHours - 6.4) < 1e-9);
  assert.equal(r.maxAbsenceLectures, 3);
});

test("absenceBudget: مدخلات غير موجبة ⇒ null، والغياب السالب يُعامل صفراً", () => {
  assert.equal(absenceBudget({ weeklyHours: 0 }), null);
  assert.equal(absenceBudget({ weeklyHours: -3 }), null);
  assert.equal(absenceBudget({ weeklyHours: 3, weeks: 0 }), null);
  assert.equal(absenceBudget({ weeklyHours: 3, limitPct: 0 }), null);
  const r = absenceBudget({ weeklyHours: 3, absent: -5 });
  assert.ok(r && r.usedOfLimit === 0 && r.remainingHours === r.maxAbsenceHours);
});

/* ════════ حاسبة الفاينل ════════ */
test("neededOnFinal: الحالة النموذجية — 52 من 60 وهدف 85 وفاينل 40", () => {
  const r = neededOnFinal({ currentScore: 52, currentOutOf: 60, finalWeight: 40, targetTotal: 85 });
  assert.ok(r && r.status === "possible");
  assert.equal(r.earned, 52);
  assert.equal(r.courseworkWeight, 60);
  assert.ok(Math.abs(r.neededPct - 82.5) < 1e-9); // (85−52)/40×100
});

test("neededOnFinal: تطبيع الأعمال المرصودة من مقام مختلف عن وزنها", () => {
  /* 26 من 30 تعادل 52 من وزن 60 ⇒ نفس نتيجة الحالة النموذجية */
  const r = neededOnFinal({ currentScore: 26, currentOutOf: 30, finalWeight: 40, targetTotal: 85 });
  assert.ok(r && Math.abs(r.neededPct - 82.5) < 1e-9 && Math.abs(r.earned - 52) < 1e-9);
});

test("neededOnFinal: مضمون عندما يكفي الرصيد الحالي (المطلوب 0)", () => {
  const r = neededOnFinal({ currentScore: 58, currentOutOf: 60, finalWeight: 40, targetTotal: 55 });
  assert.ok(r && r.status === "guaranteed" && r.neededPct === 0);
});

test("neededOnFinal: مستحيل عندما يتجاوز المطلوب 100، و100 بالضبط ممكن", () => {
  const impossible = neededOnFinal({ currentScore: 30, currentOutOf: 60, finalWeight: 40, targetTotal: 90 });
  assert.ok(impossible && impossible.status === "impossible" && impossible.neededPct > 100);
  /* earned 50 + فاينل كامل 40 = 90 بالضبط ⇒ possible بمطلوب 100 */
  const exact = neededOnFinal({ currentScore: 50, currentOutOf: 60, finalWeight: 40, targetTotal: 90 });
  assert.ok(exact && exact.status === "possible" && Math.abs(exact.neededPct - 100) < 1e-9);
});

test("neededOnFinal: قص النسب الشاذة وحراس المدخلات", () => {
  /* درجة أعلى من مقامها تُقص إلى كامل وزن الأعمال */
  const over = neededOnFinal({ currentScore: 70, currentOutOf: 60, finalWeight: 40, targetTotal: 80 });
  assert.ok(over && over.earned === 60);
  /* هدف فوق 100 يُقص إلى 100 */
  const target = neededOnFinal({ currentScore: 60, currentOutOf: 60, finalWeight: 40, targetTotal: 120 });
  assert.ok(target && Math.abs(target.neededPct - 100) < 1e-9 && target.status === "possible");
  /* مدخلات غير صالحة ⇒ null */
  assert.equal(neededOnFinal({ currentScore: 50, currentOutOf: 0, finalWeight: 40, targetTotal: 80 }), null);
  assert.equal(neededOnFinal({ currentScore: 50, currentOutOf: 60, finalWeight: 0, targetTotal: 80 }), null);
  assert.equal(neededOnFinal({ currentScore: 50, currentOutOf: 60, finalWeight: 120, targetTotal: 80 }), null);
});

test("حتمية: نفس المدخلات ⇒ نفس المخرجات تماماً", () => {
  const inp = { currentScore: 41, currentOutOf: 50, finalWeight: 30, targetTotal: 88 };
  assert.deepEqual(neededOnFinal(inp), neededOnFinal(inp));
  assert.deepEqual(absenceBudget({ weeklyHours: 3, absent: 4 }), absenceBudget({ weeklyHours: 3, absent: 4 }));
  assert.deepEqual(
    requiredSemesterGpa({ gpa: 3.9, hours: 60 }, 4.2, 14, 5),
    requiredSemesterGpa({ gpa: 3.9, hours: 60 }, 4.2, 14, 5),
  );
});
