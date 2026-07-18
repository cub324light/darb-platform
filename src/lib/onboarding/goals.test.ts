/* اختبار تحويل الهدف الهرمي — تشغيل: npx tsx --test src/lib/onboarding/goals.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveGoals } from "./goals";

test("جامعة + ميل تخصص → وجهة university + trackType", () => {
  const r = resolveGoals({ primary: ["university"], majorLean: "هندسة" });
  assert.deepEqual(r.targets, ["university"]);
  assert.equal(r.trackType, "هندسي");
  assert.equal(r.undecided, false);
});

test("جامعة بلا ميل (أو ميل «ما أدري») → بلا trackType", () => {
  assert.equal(resolveGoals({ primary: ["university"] }).trackType, undefined);
  assert.equal(resolveGoals({ primary: ["university"], majorLean: "undecided" }).trackType, undefined);
});

test("أرامكو: CPC→aramco · ITC→itc · الاثنين→كلاهما", () => {
  assert.deepEqual(resolveGoals({ primary: ["aramco"], aramcoSub: "cpc" }).targets, ["aramco"]);
  assert.deepEqual(resolveGoals({ primary: ["aramco"], aramcoSub: "itc" }).targets, ["itc"]);
  assert.deepEqual(resolveGoals({ primary: ["aramco"], aramcoSub: "both" }).targets.sort(), ["aramco", "itc"]);
  /* أرامكو بلا فرعٍ محدّد = CPC افتراضاً */
  assert.deepEqual(resolveGoals({ primary: ["aramco"] }).targets, ["aramco"]);
});

test("عسكرية → military · ابتعاث → scholarship", () => {
  assert.deepEqual(resolveGoals({ primary: ["military"] }).targets, ["military"]);
  assert.deepEqual(resolveGoals({ primary: ["scholarship"] }).targets, ["scholarship"]);
});

test("أهدافٌ متعددة تُجمَع (جامعة + أرامكو الاثنين + عسكرية)", () => {
  const r = resolveGoals({ primary: ["university", "aramco", "military"], aramcoSub: "both", majorLean: "صحي" });
  assert.deepEqual(r.targets.sort(), ["aramco", "itc", "military", "university"]);
  assert.equal(r.trackType, "صحي");
});

test("«ما أدري» حصريّ: يلغي كل الوجهات ويرفع undecided", () => {
  const r = resolveGoals({ primary: ["undecided", "university"], majorLean: "حاسب" });
  assert.deepEqual(r.targets, []);
  assert.equal(r.undecided, true);
  assert.equal(r.trackType, undefined);
});

test("قائمة فارغة → بلا وجهات ولا undecided", () => {
  const r = resolveGoals({ primary: [] });
  assert.deepEqual(r.targets, []);
  assert.equal(r.undecided, false);
});
