/* اختبارات «العقل المركزي» — تشغيل: npx tsx --test src/lib/lifeEngine.test.ts
   حتمية بلا IO: نبني LifeContext يدوياً. نتحقق أن الأولويات تتغيّر بحال الطالب،
   ومرتّبة، وكل أولوية قرارٌ كامل (سبب/فائدة/وقت/بعدها) برابط حقيقي — وأن كل قرار
   قابل للتفسير: قواعد مُطلَقة بأوزان + ثقة + أسباب. لا قرار بلا تفسير. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { lifeEngine, RULES, type LifeContext, type Priority } from "./lifeEngine";

function ctx(o: Partial<LifeContext> = {}): LifeContext {
  return {
    stage: "university", uniStage: "senior", gpa: null, hours: 115, year: "الرابعة",
    majorId: "ee", majorName: "هندسة كهربائية", coopDone: false, gradInterest: false,
    inSchoolFinals: false, daysToSchoolFinals: null, qiyas: null,
    uniFinalsInDays: null, termLabel: null, inStudyTerm: false, ...o,
  };
}

/* كل أولوية قرارٌ كامل + مُفسَّر */
function assertComplete(p: Priority) {
  for (const f of [p.title, p.why, p.benefit, p.time, p.next, p.cta] as string[]) {
    assert.ok(f.trim() !== "", "حقل قرار فارغ");
  }
  assert.ok(p.href.startsWith("/"), `رابط غير حقيقي: ${p.href}`);
  assert.ok(p.firedRules.length > 0, "قرار بلا قواعد (غير مُفسَّر)");
  assert.equal(p.score, p.firedRules.reduce((s, r) => s + r.weight, 0), "score لا يساوي مجموع الأوزان");
  assert.deepEqual(p.reasons, p.firedRules.map((r) => r.label), "الأسباب لا تطابق القواعد");
  assert.ok(p.confidence >= 5 && p.confidence <= 99, "ثقة خارج المدى");
}
function assertRanked(ps: Priority[]) {
  assert.ok(ps.length > 0, "بلا أولويات");
  ps.forEach((p, i) => assert.equal(p.rank, i + 1, "ترقيم غير متسلسل"));
  for (let i = 1; i < ps.length; i++) assert.ok(ps[i - 1].score >= ps[i].score, "غير مرتّبة بالوزن");
  ps.forEach(assertComplete);
}

/* ════════ الأولوية تتحوّل بالحال ════════ */
test("متعثّر (٢٫٣) → الأولوية الأولى رفع المعدّل، وقواعدها تشمل «المعدّل أقل من ٢٫٧٥»", () => {
  const ps = lifeEngine(ctx({ gpa: 2.3 }));
  assertRanked(ps);
  assert.equal(ps[0].key, "gpa");
  assert.ok(ps[0].firedRules.some((r) => r.id === 11), "قاعدة المعدّل لم تُطلَق");
  assert.ok(ps[0].firedRules.some((r) => r.id === 13), "قاعدة قرب التخرّج بمعدّل منخفض");
  assert.equal(ps[0].score, 70); // 50 + 20 (senior)
});

test("متميّز (٤٫٨) → البحث لا رفع المعدّل", () => {
  const ps = lifeEngine(ctx({ gpa: 4.8 }));
  assert.equal(ps[0].key, "research");
  assert.ok(!ps.some((p) => p.key === "gpa"));
});

test("قرب التخرّج بمعدّل متوسط → السيرة أولاً ثم التدريب", () => {
  const ps = lifeEngine(ctx({ gpa: 3.5, uniStage: "senior", coopDone: false }));
  assert.equal(ps[0].key, "cv");
  assert.ok(ps.some((p) => p.key === "coop"));
});

test("اختبارات الفصل بعد ٥ أيام → عاجل يتصدّر (أعلى وزن)", () => {
  const ps = lifeEngine(ctx({ gpa: 2.3, uniFinalsInDays: 5, termLabel: "الفصل الثالث" }));
  assert.equal(ps[0].key, "uni-finals");
  assert.equal(ps[0].urgent, true);
  assert.match(ps[0].why, /باقي 5 يوم/);
});

test("منتصف مع تدريب مُنجَز → الشهادة لا التدريب", () => {
  const ps = lifeEngine(ctx({ uniStage: "mid", gpa: 3.4, coopDone: true }));
  assert.ok(ps.some((p) => p.key === "cert"));
  assert.ok(!ps.some((p) => p.key === "coop"));
});

test("بداية → الأساس", () => {
  const ps = lifeEngine(ctx({ uniStage: "start", gpa: 3.2, hours: 15, year: "الأولى" }));
  assert.ok(ps.some((p) => p.key === "foundation"));
});

/* ════════ الثانوي/الخريج ════════ */
test("اختبارات مدرسية الآن → عاجل يتصدّر", () => {
  const ps = lifeEngine(ctx({ stage: "third", uniStage: null, inSchoolFinals: true }));
  assertRanked(ps);
  assert.equal(ps[0].key, "school-finals-now");
});

test("ثالث ثانوي بلا ضغط → القبول", () => {
  const ps = lifeEngine(ctx({ stage: "third", uniStage: null }));
  assert.ok(ps.some((p) => p.key === "admission" && p.href === "/university"));
});

test("أول ثانوي + قياس خلال ٤٥ يوماً → القياس والتبكير معاً", () => {
  const ps = lifeEngine(ctx({
    stage: "first", uniStage: null,
    qiyas: { kind: "qudurat", label: "القدرات العامة", days: 30, weeks: 5, approximate: true },
  }));
  assert.ok(ps.some((p) => p.key === "qiyas"));
  assert.ok(ps.some((p) => p.key === "early"));
});

test("خريج → القبول", () => {
  assert.ok(lifeEngine(ctx({ stage: "graduate", uniStage: null })).some((p) => p.key === "admission"));
});

/* ════════ قابلية التفسير ════════ */
test("الثقة رتيبة في الوزن: أعلى score ⇐ ثقة ≥", () => {
  const ps = lifeEngine(ctx({ gpa: 2.3, uniStage: "senior", coopDone: false }));
  for (let i = 1; i < ps.length; i++) assert.ok(ps[i - 1].confidence >= ps[i].confidence);
});

test("معرّفات القواعد فريدة (لا تعارض في التفسير)", () => {
  const ids = RULES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, "معرّف قاعدة مكرّر");
  for (const r of RULES) assert.ok(r.label.trim() !== "" && r.weight > 0, "قاعدة بلا سبب/وزن");
});

test("كل الحالات تُنتج أولويات مرتّبة كاملة القرار ومُفسَّرة", () => {
  for (const c of [
    ctx({ gpa: 2.0 }), ctx({ gpa: 4.9, uniStage: "mid" }), ctx({ uniStage: "start", gpa: 3.0, inStudyTerm: true }),
    ctx({ stage: "second", uniStage: null }), ctx({ stage: "graduate", uniStage: null }),
    ctx({ stage: "third", uniStage: null, daysToSchoolFinals: 10 }),
  ]) {
    assertRanked(lifeEngine(c));
  }
});
