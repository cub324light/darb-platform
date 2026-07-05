/* اختبارات مصدر الحقيقة لتجربة المرحلة — تشغيل: npx tsx --test src/lib/experience.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { phaseExperience } from "./experience";
import type { DarbUser } from "./storage";

/* بانٍ مختصر لمستخدم اختبار — نملأ الحد الأدنى (الباقي لا يؤثر على المرحلة) */
const mk = (o: Partial<DarbUser>): DarbUser =>
  ({ name: "ط", track: "قدرات", onboarded: true, ...o });

/* ════════ أول ثانوي ════════ */
test("أول ثانوي: قدرات فقط، لا تحصيلي ولا مبكر، القبول استكشافي، التنقل مساري", () => {
  const e = phaseExperience(mk({ studyLevel: "ثانوي", grade: "أول ثانوي" }));
  assert.equal(e.stage, "first");
  assert.equal(e.stageLabel, "أول ثانوي");
  assert.equal(e.phase, "secondary");
  assert.equal(e.showsQudurat, true);
  assert.equal(e.showsTahsili, false);
  assert.equal(e.showsEarlyTahsili, false);
  assert.equal(e.showsStep, true);
  assert.equal(e.admission, "explore");
  assert.equal(e.showsUniLife, false);
  assert.equal(e.navMid, "roadmap");
  assert.ok(e.duwairbHint.includes("القدرات") || e.duwairbHint.includes("عادات"));
});

/* ════════ ثاني ثانوي ════════ */
test("ثاني ثانوي: المبكر يظهر، التحصيلي العادي لا، القبول استكشافي", () => {
  const e = phaseExperience(mk({ studyLevel: "ثانوي", grade: "ثاني ثانوي" }));
  assert.equal(e.stage, "second");
  assert.equal(e.showsQudurat, true);
  assert.equal(e.showsEarlyTahsili, true);
  assert.equal(e.showsTahsili, false);
  assert.equal(e.admission, "explore");
  assert.equal(e.navMid, "roadmap");
  assert.equal(e.showsUniLife, false);
});

/* ════════ ثالث ثانوي ════════ */
test("ثالث ثانوي: التحصيلي يظهر، القبول كامل، التنقل قبول", () => {
  const e = phaseExperience(mk({ studyLevel: "ثانوي", grade: "ثالث ثانوي" }));
  assert.equal(e.stage, "third");
  assert.equal(e.showsQudurat, true);
  assert.equal(e.showsTahsili, true);
  assert.equal(e.admission, "full");
  assert.equal(e.navMid, "admission");
  assert.equal(e.showsUniLife, false);
});

/* ════════ طالب جامعي (الإصلاح المُسمّى) ════════ */
test("جامعي: لا قدرات ولا تحصيلي ولا STEP، القبول مخفي، حياة جامعية، أدوات", () => {
  const e = phaseExperience(mk({ studyLevel: "جامعي", universityYear: "الثالثة" }));
  assert.equal(e.stage, "university");
  assert.equal(e.stageLabel, "طالب جامعي");
  assert.equal(e.phase, "university");
  assert.equal(e.showsQudurat, false);
  assert.equal(e.showsTahsili, false);
  assert.equal(e.showsEarlyTahsili, false);
  assert.equal(e.showsStep, false);
  assert.equal(e.admission, "hidden");
  assert.equal(e.showsUniLife, true);
  assert.equal(e.navMid, "uni-tools");
  /* لا يتحدث الاقتراح عن القياس أو القبول — عالمه جامعي */
  assert.ok(!/قدرات|تحصيلي|موزون|قبول/.test(e.duwairbHint));
});

/* ════════ خريج بحالتيه ════════ */
test("خريج مع استدراك: القياس يظهر، القبول كامل، الاقتراح عن الاستدراك", () => {
  const e = phaseExperience(mk({ studyLevel: "خريج", gapYear: true }));
  assert.equal(e.stage, "graduate");
  assert.equal(e.phase, "graduate");
  assert.equal(e.showsQudurat, true);
  assert.equal(e.showsTahsili, true);
  assert.equal(e.showsEarlyTahsili, false);
  assert.equal(e.showsStep, true);
  assert.equal(e.admission, "full");
  assert.equal(e.navMid, "admission");
  assert.equal(e.showsUniLife, false);
  assert.match(e.duwairbHint, /استدراك/);
});

test("خريج بلا استدراك: القبول كامل والاقتراح عن مقارنة الفرص لا الاستدراك", () => {
  const e = phaseExperience(mk({ studyLevel: "خريج", gapYear: false }));
  assert.equal(e.admission, "full");
  assert.equal(e.navMid, "admission");
  assert.ok(!/استدراك/.test(e.duwairbHint));
});

/* ════════ حالات دفاعية ════════ */
test("مستخدم فارغ/بلا صف: يُعامَل كأول ثانوي (الأكثر تحفّظاً)", () => {
  const empty = phaseExperience(null);
  assert.equal(empty.stage, "first");
  assert.equal(empty.phase, "secondary");
  assert.equal(empty.admission, "explore");
  assert.equal(empty.showsTahsili, false);

  const noGrade = phaseExperience(mk({ studyLevel: "ثانوي" }));
  assert.equal(noGrade.stage, "first");
  assert.equal(noGrade.admission, "explore");
});
