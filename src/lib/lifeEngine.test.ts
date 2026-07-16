/* اختبارات «العقل المركزي» — تشغيل: npx tsx --test src/lib/lifeEngine.test.ts
   حتمية بلا IO: نبني LifeContext يدوياً. نتحقق أن الأولويات تتغيّر بحال الطالب،
   ومرتّبة، وكل أولوية قرارٌ كامل (سبب/فائدة/وقت/بعدها) برابط حقيقي — وأن كل قرار
   قابل للتفسير: قواعد مُطلَقة بأوزان + ثقة + أسباب. لا قرار بلا تفسير. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { lifeEngine, lifeScore, projectTimeline, RULES, type LifeContext, type Priority } from "./lifeEngine";

function ctx(o: Partial<LifeContext> = {}): LifeContext {
  return {
    stage: "university", uniStage: "senior", gpa: null, hours: 115, year: "الرابعة",
    majorId: "ee", majorName: "هندسة كهربائية", coopDone: false, gradInterest: false,
    highschoolPct: null, inSchoolFinals: false, daysToSchoolFinals: null, qiyas: null,
    uniFinalsInDays: null, termLabel: null, inStudyTerm: false,
    hwOverdue: 0, hwDueToday: 0, hwPending: 0, retakeExams: [], admissionOpen: true, recommendedExams: [], focus: null, ...o,
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

/* ════════ خريج الجامعة خارج عالم القبول/القياس (#51) ════════ */
test("خريج الجامعة (admissionOpen=false) لا يرى «القبول» ولا «إعادة اختبار»", () => {
  const ps = lifeEngine(ctx({ stage: "graduate", admissionOpen: false, retakeExams: ["القدرات"] }));
  assert.ok(!ps.some((p) => p.key === "admission"), "خريج الجامعة يجب ألا يرى أولوية القبول");
  assert.ok(!ps.some((p) => p.key === "retake"), "خريج الجامعة يجب ألا يرى إعادة اختبار");
});
test("خريج الثانوية (admissionOpen=true) يرى «القبول»", () => {
  const ps = lifeEngine(ctx({ stage: "graduate", admissionOpen: true }));
  assert.ok(ps.some((p) => p.key === "admission"), "خريج الثانوية يجب أن يرى القبول");
});

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

/* ════════ التصنيف + التكلفة/العائد ════════ */
test("التصنيف لا يختلط: العاجل urgent، رفع المعدّل important، البحث strategic", () => {
  assert.equal(lifeEngine(ctx({ uniFinalsInDays: 5 }))[0].tier, "urgent");
  assert.equal(lifeEngine(ctx({ gpa: 2.3 }))[0].tier, "important");
  assert.equal(lifeEngine(ctx({ gpa: 4.8, uniStage: "mid" }))[0].tier, "strategic");
});

test("كل أولوية تكشف تكلفتها وعائدها", () => {
  for (const p of lifeEngine(ctx({ gpa: 2.3, uniStage: "senior", coopDone: false }))) {
    assert.ok(p.costHours >= 0, "تكلفة سالبة");
    assert.ok(p.payoff.trim() !== "", "بلا عائد");
  }
  const gpa = lifeEngine(ctx({ gpa: 2.3 })).find((p) => p.key === "gpa")!;
  assert.equal(gpa.costHours, 40);
  assert.match(gpa.payoff, /التدريب|القبول/);
});

/* ════════ Life Score ════════ */
test("lifeScore: الجامعي ثلاثة مؤشرات في [0,100]؛ الساعات ترفع جاهزية التخرّج", () => {
  const low = lifeScore(ctx({ hours: 30, gpa: 3, uniStage: "mid" }));
  const high = lifeScore(ctx({ hours: 120, gpa: 3, uniStage: "mid" }));
  assert.equal(low.length, 3);
  for (const s of low) assert.ok(s.pct >= 0 && s.pct <= 100);
  const g = (arr: typeof low) => arr.find((s) => s.key === "graduation")!.pct;
  assert.ok(g(high) > g(low), "الساعات لم ترفع جاهزية التخرّج");
});

test("lifeScore: إنجاز التدريب يرفع جاهزية سوق العمل", () => {
  const j = (coop: boolean) => lifeScore(ctx({ hours: 90, gpa: 3.5, uniStage: "senior", coopDone: coop })).find((s) => s.key === "job")!.pct;
  assert.ok(j(true) > j(false));
});

test("lifeScore: الثانوي محور القبول الجامعي، ويتقدّم بالمرحلة", () => {
  const first = lifeScore(ctx({ stage: "first", uniStage: null }))[0].pct;
  const third = lifeScore(ctx({ stage: "third", uniStage: null }))[0].pct;
  assert.ok(third > first);
});

/* ════════ Timeline ════════ */
test("projectTimeline: متعثّر يرى الطريق حتى الوظيفة (لا «افعل» فقط)", () => {
  const t = projectTimeline(ctx({ gpa: 2.3, uniStage: "senior" }));
  assert.ok(t.length >= 4);
  assert.match(t[0].title, /ارفع معدّلك/);
  assert.match(t.map((n) => n.title).join(" "), /التدريب/);
  assert.match(t[t.length - 1].title, /وظيفة/);
  for (const n of t) assert.ok(n.horizon.trim() !== "" && n.title.trim() !== "");
});

test("projectTimeline: أول ثانوي يرى الطريق للتحصيلي فالجامعة", () => {
  const t = projectTimeline(ctx({ stage: "first", uniStage: null }));
  const titles = t.map((n) => n.title).join(" ");
  assert.match(titles, /القدرات/);
  assert.match(titles, /التحصيلي/);
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
