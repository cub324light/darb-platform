/* اختبار الهوية الدراسية — دالة نقية على حقولٍ حقيقية.
   تشغيل: npx tsx --test src/lib/persona.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { studentPersona } from "./persona";
import type { DarbUser, DarbGoals } from "./storage";

const u = (p: Partial<DarbUser>): DarbUser => ({ name: "ط", track: "قدرات", onboarded: true, ...p } as DarbUser);

test("صفوف الثانوي الثلاثة تُشتق من grade", () => {
  assert.equal(studentPersona(u({ studyLevel: "ثانوي", grade: "أول ثانوي" })).key, "hs-first");
  assert.equal(studentPersona(u({ studyLevel: "ثانوي", grade: "ثاني ثانوي" })).key, "hs-second");
  assert.equal(studentPersona(u({ studyLevel: "ثانوي", grade: "ثالث ثانوي" })).key, "hs-third");
});

test("ثانوي بلا صف محدّد = أول ثانوي (الأكثر تحفّظاً)", () => {
  assert.equal(studentPersona(u({ studyLevel: "ثانوي" })).key, "hs-first");
  assert.equal(studentPersona(null).key, "hs-first");
});

test("سنوات الجامعي تُشتق من uniStage", () => {
  assert.equal(studentPersona(u({ studyLevel: "جامعي", universityYear: "الأولى" })).key, "uni-fresh");
  assert.equal(studentPersona(u({ studyLevel: "جامعي", universityYear: "الثالثة" })).key, "uni-mid");
  assert.equal(studentPersona(u({ studyLevel: "جامعي", universityYear: "الخامسة+", creditHoursCompleted: 130 })).key, "uni-senior");
});

test("الخريج يُقسَّم بـ gradStage: ثانوي=قبول · جامعة=مهني", () => {
  assert.equal(studentPersona(u({ studyLevel: "خريج", gradStage: "خريج ثانوي" })).key, "grad-hs");
  assert.equal(studentPersona(u({ studyLevel: "خريج", gradStage: "خريج جامعة" })).key, "grad-uni");
  /* خريج بلا نوع = خريج ثانوي (الأكثر شيوعاً: منتظر قبول) */
  assert.equal(studentPersona(u({ studyLevel: "خريج" })).key, "grad-hs");
});

test("التوجّه: جامعة من goals، شركة من cpc/itc (tilt لا حصر)", () => {
  const uni = studentPersona(u({ studyLevel: "ثانوي", grade: "ثالث ثانوي" }), { university: "جامعة الملك سعود" } as DarbGoals);
  assert.equal(uni.orientation, "university");
  assert.equal(uni.companyFocus, false);

  const aramco = studentPersona(u({ studyLevel: "ثانوي", grade: "ثالث ثانوي" }), { cpcTarget: 80 } as DarbGoals);
  assert.equal(aramco.companyFocus, true);
  assert.equal(aramco.orientation, "company");

  /* توجّهان معاً: الجامعة تغلب في التسمية، لكن companyFocus يبقى true (tilt) */
  const both = studentPersona(u({ studyLevel: "ثانوي", grade: "ثالث ثانوي" }), { university: "ksu", cpcTarget: 80 } as DarbGoals);
  assert.equal(both.orientation, "university");
  assert.equal(both.companyFocus, true);
});

test("companyFocus يُشتق من وجهات البرامج (أرامكو/ITC)", () => {
  const p = studentPersona(u({ studyLevel: "ثانوي", grade: "ثالث ثانوي", targets: ["aramco"] }));
  assert.equal(p.companyFocus, true);
});
