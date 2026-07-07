/* اختبارات «العقل المركزي» — تشغيل: npx tsx --test src/lib/lifeEngine.test.ts
   حتمية بلا IO: نبني LifeContext يدوياً. نتحقق أن الأولويات تتغيّر بحال الطالب،
   ومرتّبة، ومحدودة، وكل أولوية قرارٌ كامل (سبب/فائدة/وقت/بعدها) برابط حقيقي. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { lifeEngine, type LifeContext, type Priority } from "./lifeEngine";

function ctx(o: Partial<LifeContext> = {}): LifeContext {
  return {
    stage: "university", uniStage: "senior", gpa: null, hours: 115, year: "الرابعة",
    majorId: "ee", majorName: "هندسة كهربائية", coopDone: false, gradInterest: false,
    inSchoolFinals: false, daysToSchoolFinals: null, qiyas: null,
    uniFinalsInDays: null, termLabel: null, inStudyTerm: false, ...o,
  };
}

/* كل أولوية قرارٌ كامل — لا نص فقط */
function assertComplete(p: Priority) {
  for (const f of [p.title, p.why, p.benefit, p.time, p.next, p.cta] as string[]) {
    assert.ok(f.trim() !== "", "حقل قرار فارغ");
  }
  assert.ok(p.href.startsWith("/"), `رابط غير حقيقي: ${p.href}`);
}
function assertRanked(ps: Priority[]) {
  assert.ok(ps.length > 0, "بلا أولويات");
  assert.ok(ps.length <= 4, "تجاوز الحدّ");
  ps.forEach((p, i) => assert.equal(p.rank, i + 1, "ترقيم غير متسلسل"));
  ps.forEach(assertComplete);
}

/* ════════ الجامعي — الأولوية تتحوّل بالحال ════════ */
test("متعثّر (معدّل ٢٫٣) → الأولوية الأولى رفع المعدّل، وسببها المعدّل نفسه", () => {
  const ps = lifeEngine(ctx({ gpa: 2.3 }));
  assertRanked(ps);
  assert.equal(ps[0].key, "gpa");
  assert.match(ps[0].why, /٢٫٧٥|2\.3|2٫3/);
  assert.match(ps[0].next, /التدريب/); // ماذا بعدها
});

test("متميّز (معدّل ٤٫٨) → البحث والدراسات العليا لا رفع المعدّل", () => {
  const ps = lifeEngine(ctx({ gpa: 4.8 }));
  assert.equal(ps[0].key, "research");
  assert.ok(!ps.some((p) => p.key === "gpa"));
});

test("قرب التخرّج بمعدّل متوسط → السيرة أولاً ثم التدريب", () => {
  const ps = lifeEngine(ctx({ gpa: 3.5, uniStage: "senior", coopDone: false }));
  assert.equal(ps[0].key, "cv");
  assert.ok(ps.some((p) => p.key === "coop"), "التدريب من الأولويات");
});

test("اختبارات الفصل بعد ٥ أيام → عاجل يتصدّر كل شيء", () => {
  const ps = lifeEngine(ctx({ gpa: 2.3, uniFinalsInDays: 5, termLabel: "الفصل الثالث" }));
  assert.equal(ps[0].key, "uni-finals");
  assert.equal(ps[0].urgent, true);
  assert.match(ps[0].why, /باقي 5 يوم/);
});

test("منتصف مع تدريب مُنجَز → أول شهادة ضمن الأولويات", () => {
  const ps = lifeEngine(ctx({ uniStage: "mid", gpa: 3.4, coopDone: true }));
  assert.ok(ps.some((p) => p.key === "cert"));
  assert.ok(!ps.some((p) => p.key === "coop"), "لا تدريب بعد إنجازه");
});

test("بداية → الأساس (معدّل وتنظيم)", () => {
  const ps = lifeEngine(ctx({ uniStage: "start", gpa: 3.2, hours: 15, year: "الأولى" }));
  assert.ok(ps.some((p) => p.key === "foundation"));
});

/* ════════ الثانوي/الخريج ════════ */
test("اختبارات مدرسية الآن → عاجل يتصدّر", () => {
  const ps = lifeEngine(ctx({ stage: "third", uniStage: null, inSchoolFinals: true }));
  assertRanked(ps);
  assert.equal(ps[0].key, "school-finals-now");
  assert.equal(ps[0].urgent, true);
});

test("ثالث ثانوي بلا ضغط → القبول (حساب موزونة)", () => {
  const ps = lifeEngine(ctx({ stage: "third", uniStage: null }));
  assert.ok(ps.some((p) => p.key === "admission" && p.href === "/university"));
});

test("أول ثانوي + قياس بعد ٣٠ يوماً يراه → الاستعداد للقياس", () => {
  const ps = lifeEngine(ctx({
    stage: "first", uniStage: null,
    qiyas: { kind: "qudurat", label: "القدرات العامة", days: 30, weeks: 5, approximate: true },
  }));
  assert.ok(ps.some((p) => p.key === "qiyas"));
});

test("خريج → القبول", () => {
  const ps = lifeEngine(ctx({ stage: "graduate", uniStage: null }));
  assert.ok(ps.some((p) => p.key === "admission"));
});

/* ════════ سلامة عامة ════════ */
test("كل الحالات تُنتج أولويات مرتّبة كاملة القرار", () => {
  for (const c of [
    ctx({ gpa: 2.0 }), ctx({ gpa: 4.9, uniStage: "mid" }), ctx({ uniStage: "start", gpa: 3.0, inStudyTerm: true }),
    ctx({ stage: "second", uniStage: null }), ctx({ stage: "graduate", uniStage: null }),
    ctx({ stage: "third", uniStage: null, daysToSchoolFinals: 10 }),
  ]) {
    assertRanked(lifeEngine(c));
  }
});
