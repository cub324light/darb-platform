/* اختبارات «ماذا أفعل الآن؟» — تشغيل: npx tsx --test src/lib/whatNow.test.ts
   حتمية بلا IO: نبني تجهيزات PhaseExperience/CalendarSnapshot يدوياً ونتحقق أن
   الإجابة تبدأ من المشكلة الأقرب، وتتغيّر بالمرحلة، وكل رابط حقيقي (يبدأ بـ/). */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { PhaseExperience, Stage } from "./experience";
import type { CalendarSnapshot, NextExamInfo, PeriodKind } from "./academicCalendar";
import { whatNow, type NowUni, type NowAnswer, type NowInput } from "./whatNow";

/* ── تجهيزات ── */
function exp(stage: Stage, over: Partial<PhaseExperience> = {}): PhaseExperience {
  return {
    stage,
    stageLabel: stage,
    phase: stage === "university" ? "university" : stage === "graduate" ? "graduate" : "secondary",
    showsQudurat: stage !== "university",
    showsTahsili: stage === "second" || stage === "third",
    showsEarlyTahsili: false,
    showsStep: false,
    admission: stage === "third" || stage === "graduate" ? "full" : stage === "university" ? "hidden" : "explore",
    showsUniLife: stage === "university",
    navMid: "roadmap",
    duwairbHint: "",
    ...over,
  };
}

function examInfo(kind: PeriodKind, days: number, label: string, over: Partial<NextExamInfo> = {}): NextExamInfo {
  return {
    kind, label, date: "2026-01-01",
    daysUntil: days, weeksUntil: Math.ceil(days / 7),
    approximate: false, registered: false, ...over,
  };
}

function cal(over: Partial<CalendarSnapshot> = {}): CalendarSnapshot {
  return {
    hasData: true, yearId: "1447", yearLabel: "2025–2026",
    phase: "study", phaseLabel: "دراسة",
    onVacation: false, inSchoolFinals: false, inStudyTerm: true,
    activePeriods: [], nextExam: null, nextSchoolFinals: null,
    weeksToNextExam: null, updatedFor: "1447",
    ...over,
  };
}

/* كل رابط في الإجابة حقيقي (يبدأ بـ«/») */
function assertRealLinks(a: NowAnswer) {
  assert.ok(a.primary.href.startsWith("/"), `رابط رئيس غير حقيقي: ${a.primary.href}`);
  for (const s of a.steps) assert.ok(s.href.startsWith("/"), `خطوة برابط غير حقيقي: ${s.href}`);
  assert.ok(a.headline.trim() !== "" && a.primary.label.trim() !== "");
  assert.ok(a.steps.length >= 2, "خطوات قليلة");
}

/* ════════ الجامعي ════════ */
test("جامعي قرب التخرّج → يبدأ بالسيرة (نجاح) لا بالقدرات", () => {
  const uni: NowUni = { stage: "senior", majorName: "هندسة كهربائية" };
  const a = whatNow({ exp: exp("university"), cal: cal(), uni });
  assert.equal(a.accent, "success");
  assert.match(a.headline, /سيرت/);
  assert.equal(a.primary.href, "/career");
  assertRealLinks(a);
});

test("جامعي منتصف — بلا تدريب: يقترح التدريب أولاً", () => {
  const a = whatNow({ exp: exp("university"), cal: cal(), uni: { stage: "mid", coopDone: false } });
  assert.match(a.headline, /التدريب/);
  assert.match(a.primary.label, /تدريب/);
  assertRealLinks(a);
});

test("جامعي منتصف — أنجز التدريب: ينتقل للشهادة (عالمان مختلفان لنفس التخصص)", () => {
  const a = whatNow({ exp: exp("university"), cal: cal(), uni: { stage: "mid", coopDone: true } });
  assert.match(a.headline, /شهادة/);
  assert.equal(a.primary.href, "/career#sec-certs");
  assertRealLinks(a);
});

test("جامعي متعثّر (معدّل منخفض) → الأولوية رفع المعدّل لا الشهادات — ولو senior", () => {
  const a = whatNow({ exp: exp("university"), cal: cal(), uni: { stage: "senior", gpa: 2.3 } });
  assert.match(a.headline, /معدّل/);
  assert.equal(a.primary.href, "/uni-tools");
  assert.doesNotMatch(a.headline, /سيرت/); // المعدّل يتقدّم على السوق
  assertRealLinks(a);
});

test("جامعي متميّز (معدّل عالٍ) → البحث والدراسات العليا لا رفع المعدّل", () => {
  const a = whatNow({ exp: exp("university"), cal: cal(), uni: { stage: "senior", gpa: 4.8 } });
  assert.match(a.headline, /البحث|الدراسات العليا/);
  assert.equal(a.accent, "success");
  assertRealLinks(a);
});

test("جامعي بداية → تنظيم الوقت والمعدّل (أدوات الجامعة)", () => {
  const a = whatNow({ exp: exp("university"), cal: cal(), uni: { stage: "start" } });
  assert.equal(a.primary.href, "/uni-tools");
  assert.match(a.headline, /معدّل|وقت/);
  assertRealLinks(a);
});

test("جامعي واختبارات الفصل بعد ٥ أيام → عدّاد عاجل يتقدّم على إجابة المرحلة", () => {
  const a = whatNow({ exp: exp("university"), cal: cal(), uni: { stage: "start", finalsInDays: 5, termLabel: "الفصل الثالث" } });
  assert.equal(a.urgency, "high");
  assert.match(a.headline, /باقي 5 يوم/);
  assert.equal(a.primary.href, "/plan");
  assertRealLinks(a);
});

/* ════════ الثانوي/الخريج — المشكلة أولاً ════════ */
test("اختبارات مدرسية جارية الآن → «بدأت» بلون عاجل", () => {
  const a = whatNow({ exp: exp("third"), cal: cal({ inSchoolFinals: true }) });
  assert.equal(a.accent, "danger");
  assert.match(a.headline, /بدأت/);
  assertRealLinks(a);
});

test("اختبار مدرسي بعد ١٠ أيام → عدّاد عاجل «باقي 10 يوم»", () => {
  const a = whatNow({ exp: exp("third"), cal: cal({ nextSchoolFinals: examInfo("school_finals", 10, "اختبارات الفصل") }) });
  assert.equal(a.urgency, "high");
  assert.match(a.headline, /باقي 10 يوم/);
  assert.equal(a.primary.href, "/plan");
  assertRealLinks(a);
});

test("قياس (تحصيلي) بعد ٣٠ يوماً لمن يراه → موعد قادم بالأسابيع", () => {
  const a = whatNow({ exp: exp("second"), cal: cal({ nextExam: examInfo("tahsili", 30, "التحصيلي") }) });
  assert.equal(a.urgency, "normal");
  assert.match(a.headline, /أسبوع/);
  assert.match(a.headline, /التحصيلي/);
  assertRealLinks(a);
});

test("لا يُبرِز اختباراً لا تراه المرحلة (أول ثانوي + تحصيلي مخفي → إجابة المرحلة)", () => {
  const a = whatNow({
    exp: exp("first", { showsTahsili: false }),
    cal: cal({ nextExam: examInfo("tahsili", 20, "التحصيلي") }),
  });
  assert.match(a.headline, /القدرات/);
  assert.equal(a.primary.href, "/roadmap");
});

test("أول ثانوي بلا ضغط → ابدأ بالقدرات وابنِ العادة", () => {
  const a = whatNow({ exp: exp("first"), cal: cal() });
  assert.match(a.headline, /القدرات|عادت/);
  assert.equal(a.primary.href, "/roadmap");
  assertRealLinks(a);
});

test("ثالث ثانوي بلا ضغط → رتّب رغباتك واحسب الموزونة", () => {
  const a = whatNow({ exp: exp("third"), cal: cal() });
  assert.match(a.headline, /موزون|رغبات/);
  assert.equal(a.primary.href, "/university");
  assertRealLinks(a);
});

test("خريج → الفرص والقبول", () => {
  const a = whatNow({ exp: exp("graduate"), cal: cal() });
  assert.equal(a.primary.href, "/opportunities");
  assertRealLinks(a);
});

/* ════════ ثبات: كل الإجابات روابطها حقيقية وعناوينها غير فارغة ════════ */
test("كل المسارات تُنتج إجابة صالحة الروابط", () => {
  const cases: NowInput[] = [
    { exp: exp("first"), cal: cal() },
    { exp: exp("second"), cal: cal() },
    { exp: exp("third"), cal: cal() },
    { exp: exp("graduate"), cal: cal() },
    { exp: exp("university"), cal: cal(), uni: { stage: "start" } },
    { exp: exp("university"), cal: cal(), uni: { stage: "mid" } },
    { exp: exp("university"), cal: cal(), uni: { stage: "senior" } },
  ];
  for (const c of cases) assertRealLinks(whatNow(c));
});
