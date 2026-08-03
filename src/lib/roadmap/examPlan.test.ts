/* اختبارُ خطّة الاختبارات المتداخلة.
   تشغيل: npx tsx --test src/lib/roadmap/examPlan.test.ts

   أهمُّ ما يحرسه: **ألّا نقدّر بلا قياس**. جدولٌ لثلاثة أشهرٍ يُرسم في اليوم الأول
   كذبةٌ مهذّبة؛ ننتظر أسبوعاً نقيس فيه وتيرةَ الطالب ثم نتكلّم. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildStagedPlan, overlapShare, phaseOn, phaseLabel, daysUntilForecast,
  PLAN_MIN_DAYS, MINS_PER_ITEM, SOLO_FRACTION, OVERLAP_SPLIT_LABEL,
  type PlanExamInput, type OverlapSplit,
} from "./examPlan";
import { daysBetween } from "./metrics";

const TODAY = "2026-08-03";
const A: PlanExamInput = { id: "qudurat", label: "القدرات", remainingItems: 120 };
const B: PlanExamInput = { id: "step", label: "STEP", remainingItems: 90 };
const PACE = { minsPerDay: 60, daysMeasured: PLAN_MIN_DAYS };

const plan = (over: Partial<Parameters<typeof buildStagedPlan>[0]> = {}) =>
  buildStagedPlan({ exams: [A, B], pace: PACE, split: "priority", today: TODAY, ...over });

/* ── الصدق: لا تقدير بلا قياس ── */

test("بلا أسبوعٍ من القياس لا خطّة — ونقول كم بقي", () => {
  const p = plan({ pace: { minsPerDay: 60, daysMeasured: PLAN_MIN_DAYS - 1 } });
  assert.equal(p.ok, false);
  assert.equal(p.reason, "need-pace");
  assert.deepEqual(p.phases, []);
  assert.equal(daysUntilForecast({ minsPerDay: 60, daysMeasured: PLAN_MIN_DAYS - 2 }), 2);
  assert.equal(daysUntilForecast({ minsPerDay: 60, daysMeasured: PLAN_MIN_DAYS }), 0);
});

test("وتيرةٌ صفر لا تُنتج خطّة — القسمة على صفرٍ تُنتج لانهاية لا جدولاً", () => {
  const p = plan({ pace: { minsPerDay: 0, daysMeasured: 30 } });
  assert.equal(p.ok, false);
  assert.equal(p.reason, "need-pace");
});

test("اختبارٌ واحد ليس خطّةً متداخلة", () => {
  const p = plan({ exams: [A] });
  assert.equal(p.ok, false);
  assert.equal(p.reason, "need-two-exams");
});

test("بلا عملٍ متبقٍّ لا خطّة", () => {
  const p = plan({ exams: [{ ...A, remainingItems: 0 }, { ...B, remainingItems: 0 }] });
  assert.equal(p.ok, false);
  assert.equal(p.reason, "no-work");
});

/* ── الشكل: وحده ← مشتركة ← وحده ── */

test("ثلاثُ فتراتٍ متّصلة بلا فجوةٍ ولا تداخل", () => {
  const p = plan();
  assert.ok(p.ok);
  assert.equal(p.phases.length, 3);
  assert.deepEqual(p.phases.map((x) => x.kind), ["solo", "overlap", "solo"]);
  assert.deepEqual(p.phases[0].examIds, ["qudurat"]);
  assert.deepEqual(p.phases[1].examIds, ["qudurat", "step"]);
  assert.deepEqual(p.phases[2].examIds, ["step"]);

  /* كلُّ فترةٍ تبدأ في اليوم التالي لنهاية سابقتها */
  for (let k = 1; k < p.phases.length; k++) {
    const gap = daysBetween(p.phases[k - 1].end, p.phases[k].start);
    assert.equal(gap, 1, `فجوةٌ أو تداخلٌ بين الفترتين ${k - 1} و${k}: ${gap} يوماً`);
  }
  assert.equal(p.phases[0].start, TODAY, "الخطّة تبدأ اليوم");
});

test("الحصصُ في كل فترةٍ مجموعُها واحد", () => {
  for (const split of ["even", "priority", "nearest"] as OverlapSplit[]) {
    const p = plan({ split });
    for (const ph of p.phases) {
      const sum = Object.values(ph.share).reduce((x, y) => x + y, 0);
      assert.ok(Math.abs(sum - 1) < 1e-9, `مجموعُ الحصص ${sum} في ${split}`);
    }
  }
});

test("الفترةُ المشتركة تحمل الاثنين، والمنفردةُ واحداً", () => {
  const p = plan();
  assert.deepEqual(Object.keys(p.phases[0].share), ["qudurat"]);
  assert.equal(Object.keys(p.phases[1].share).length, 2);
});

/* ── الحساب ── */

test("طولُ الفترة الأولى = ثلثا عمل الأوّل مقسوماً على الوتيرة", () => {
  const p = plan();
  const expected = Math.ceil((A.remainingItems * MINS_PER_ITEM * SOLO_FRACTION) / PACE.minsPerDay);
  const actual = daysBetween(p.phases[0].start, p.phases[0].end) + 1;
  assert.equal(actual, expected);
});

test("وتيرةٌ أسرع ⇒ خطّةٌ أقصر", () => {
  const slow = plan({ pace: { minsPerDay: 30, daysMeasured: 10 } });
  const fast = plan({ pace: { minsPerDay: 120, daysMeasured: 10 } });
  assert.ok(fast.totalDays < slow.totalDays, `السريع ${fast.totalDays} ليس أقصر من البطيء ${slow.totalDays}`);
});

test("عملٌ أكثر ⇒ خطّةٌ أطول", () => {
  const light = plan({ exams: [{ ...A, remainingItems: 40 }, B] });
  const heavy = plan({ exams: [{ ...A, remainingItems: 400 }, B] });
  assert.ok(heavy.totalDays > light.totalDays);
});

test("جاهزيةُ الأوّل عند نهاية المشتركة، وجاهزيةُ الثاني في آخر الخطّة", () => {
  const p = plan();
  assert.equal(p.readyBy["qudurat"], p.phases[1].end);
  assert.equal(p.readyBy["step"], p.phases[p.phases.length - 1].end);
});

test("موعدُ اختبارٍ محدَّدٌ بعد المشتركة يؤخّر تفرّغَ الثاني إليه", () => {
  const withDate = plan({ exams: [{ ...A, examDate: "2027-01-01" }, B] });
  const without = plan();
  assert.ok(withDate.ok && without.ok);
  assert.ok(withDate.phases[2].start > without.phases[2].start,
    "لم ينتظر موعدَ الاختبار المحدَّد قبل التفرّغ للثاني");
});

/* ── التوزيع ── */

test("«نصفٌ ونصف» يعطيهما سواء", () => {
  const s = overlapShare("even", A, B, TODAY);
  assert.equal(s.a, 0.5); assert.equal(s.b, 0.5);
});

test("«الأهمّ أكثر» يرجّح الأوّل", () => {
  const s = overlapShare("priority", A, B, TODAY);
  assert.ok(s.a > s.b);
  assert.ok(Math.abs(s.a + s.b - 1) < 1e-9);
});

test("«الأقرب موعداً أكثر» يرجّح الأقربَ فعلاً", () => {
  const near: PlanExamInput = { ...A, examDate: "2026-09-01" };   // بعد ٢٩ يوماً
  const far: PlanExamInput = { ...B, examDate: "2026-12-01" };    // بعد ١٢٠ يوماً
  const s = overlapShare("nearest", near, far, TODAY);
  assert.ok(s.a > s.b, "الأبعدُ أخذ أكثر");

  /* والعكس: لو كان الثاني هو الأقرب */
  const flipped = overlapShare("nearest", { ...A, examDate: "2026-12-01" }, { ...B, examDate: "2026-09-01" }, TODAY);
  assert.ok(flipped.b > flipped.a);
});

test("«الأقرب» لا يُهمل اختباراً تماماً — حدٌّ أدنى لكلٍّ", () => {
  const s = overlapShare("nearest", { ...A, examDate: "2026-08-05" }, { ...B, examDate: "2030-01-01" }, TODAY);
  assert.ok(s.b >= 0.25, `الثاني أُهمل: ${s.b}`);
  assert.ok(s.a <= 0.75);
});

test("«الأقرب» بلا موعدين يرجع إلى «الأهمّ» لا إلى قسمةٍ مخترعة", () => {
  assert.deepEqual(overlapShare("nearest", A, B, TODAY), overlapShare("priority", A, B, TODAY));
});

/* ── القراءة ── */

test("phaseOn يجد فترةَ اليوم، ولا شيءَ خارج الخطّة", () => {
  const p = plan();
  assert.equal(phaseOn(p, TODAY)?.kind, "solo");
  assert.equal(phaseOn(p, p.phases[1].start)?.kind, "overlap");
  assert.equal(phaseOn(p, "2020-01-01"), null);
  assert.equal(phaseOn({ ok: false, phases: [], readyBy: {}, minsPerDay: 0, totalDays: 0 }, TODAY), null);
});

test("phaseLabel: المنفردةُ اسمٌ والمشتركةُ اسمان", () => {
  const p = plan();
  const nameOf = (id: string) => (id === "qudurat" ? "القدرات" : "STEP");
  assert.equal(phaseLabel(p.phases[0], nameOf), "القدرات");
  assert.equal(phaseLabel(p.phases[1], nameOf), "القدرات + STEP");
});

test("لكلّ توزيعٍ اسمٌ عربيّ يُعرض", () => {
  for (const k of ["even", "priority", "nearest"] as OverlapSplit[]) {
    assert.ok(OVERLAP_SPLIT_LABEL[k]?.length > 0);
  }
});

test("المحرّك نقيّ: لا تخزين ولا نافذة ولا وقت", async () => {
  const { readFileSync } = await import("node:fs");
  const code = readFileSync("src/lib/roadmap/examPlan.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  for (const bad of ["localStorage", "window.", "new Date(", "Date.now("]) {
    assert.ok(!code.includes(bad), `المحرّك يلمس ${bad}`);
  }
});
