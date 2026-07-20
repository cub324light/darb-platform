import { test } from "node:test";
import assert from "node:assert/strict";
import {
  commitmentFactor, progressFactor, errorsFactor, resultsFactor, proximityFactor,
  computeReadiness, computeDanger, computePrediction, bandOf,
} from "./readiness";

/* ── العوامل: متاح/غير متاح + الدرجة ── */
test("commitmentFactor: غير متاح بلا خطّة أو بلا بداية", () => {
  assert.equal(commitmentFactor({ plannedMins: 0, doneMins: 0, started: false }).available, false);
  assert.equal(commitmentFactor({ plannedMins: 180, doneMins: 90, started: false }).available, false);
});
test("commitmentFactor: المنجَز ÷ المخطّط، مقصوصٌ ٠..١", () => {
  const f = commitmentFactor({ plannedMins: 180, doneMins: 120, started: true });
  assert.equal(f.available, true);
  assert.ok(Math.abs(f.score - 120 / 180) < 1e-9);
  assert.equal(commitmentFactor({ plannedMins: 100, doneMins: 250, started: true }).score, 1); // مقصوص
});

test("progressFactor: غير متاح بلا عناصر", () => {
  assert.equal(progressFactor({ doneItems: 0, totalItems: 0 }).available, false);
  const f = progressFactor({ doneItems: 3, totalItems: 12 });
  assert.equal(f.available, true);
  assert.equal(f.score, 0.25);
});

test("errorsFactor: غير متاح إن لم يُسجّل أخطاءً؛ أخطاءٌ أكثر ⇐ درجةٌ أقل", () => {
  assert.equal(errorsFactor({ activeErrors: 0, everLogged: false }).available, false);
  assert.equal(errorsFactor({ activeErrors: 0, everLogged: true }).score, 1);
  assert.equal(errorsFactor({ activeErrors: 20, everLogged: true }, 40).score, 0.5);
  assert.equal(errorsFactor({ activeErrors: 100, everLogged: true }, 40).score, 0); // مقصوص
});

test("resultsFactor: غير متاح بلا درجة؛ يُطبَّع بالأعلى", () => {
  assert.equal(resultsFactor({ lastScore: null }).available, false);
  assert.equal(resultsFactor({ lastScore: undefined }).available, false);
  assert.equal(resultsFactor({ lastScore: 82, max: 100 }).score, 0.82);
  assert.equal(resultsFactor({ lastScore: 60, max: 120 }).score, 0.5);
});

test("proximityFactor: غير متاح بلا موعد؛ وقتٌ أكثر ⇐ درجةٌ أعلى؛ منتهٍ ⇐ ٠", () => {
  assert.equal(proximityFactor({ daysLeft: null }).available, false);
  assert.equal(proximityFactor({ daysLeft: 60 }, 60).score, 1);
  assert.equal(proximityFactor({ daysLeft: 30 }, 60).score, 0.5);
  assert.equal(proximityFactor({ daysLeft: -5 }, 60).score, 0);
});

/* ── المحرّك: كفاية العوامل + التركيب الموزون + النطاقات ── */
test("computeReadiness: عاملٌ واحدٌ فقط ⇐ لا توجد بيانات كافية", () => {
  const r = computeReadiness([
    progressFactor({ doneItems: 5, totalItems: 10 }),         // متاح
    errorsFactor({ activeErrors: 0, everLogged: false }),      // غير متاح
    resultsFactor({ lastScore: null }),                       // غير متاح
  ]);
  assert.equal(r.available, false);
  assert.equal(r.missing.length, 2);
  assert.equal(r.used.length, 1);
});

test("computeReadiness: يركّب المتاح فقط ويُنتج نطاقاً", () => {
  const r = computeReadiness([
    commitmentFactor({ plannedMins: 100, doneMins: 90, started: true }), // ٠.٩
    progressFactor({ doneItems: 8, totalItems: 10 }),                    // ٠.٨
    errorsFactor({ activeErrors: 4, everLogged: true }, 40),             // ٠.٩
    resultsFactor({ lastScore: 85, max: 100 }),                         // ٠.٨٥
    proximityFactor({ daysLeft: null }),                                // غير متاح
  ]);
  assert.equal(r.available, true);
  assert.equal(r.used.length, 4);
  assert.equal(r.band, "good");
  assert.ok(r.score >= 80 && r.score <= 90, `score=${r.score}`);
});

test("computeReadiness: عواملٌ ضعيفة ⇐ نطاق خطر", () => {
  const r = computeReadiness([
    commitmentFactor({ plannedMins: 100, doneMins: 20, started: true }), // ٠.٢
    progressFactor({ doneItems: 1, totalItems: 10 }),                    // ٠.١
  ]);
  assert.equal(r.available, true);
  assert.equal(r.band, "risk");
});

test("bandOf: حدود النطاقات", () => {
  assert.equal(bandOf(0.8), "good");
  assert.equal(bandOf(0.5), "watch");
  assert.equal(bandOf(0.2), "risk");
});

/* ── الخطر: أسباب + تأثير قرب الموعد ── */
test("computeDanger: غير متاحٍ بلا عوامل", () => {
  assert.equal(computeDanger([resultsFactor({ lastScore: 80 })]).available, false);
});
test("computeDanger: التزامٌ منخفض + أخطاءٌ كثيرة + موعدٌ قريب ⇐ خطر + أسباب", () => {
  const d = computeDanger([
    commitmentFactor({ plannedMins: 100, doneMins: 20, started: true }),
    errorsFactor({ activeErrors: 35, everLogged: true }, 40),
    proximityFactor({ daysLeft: 5 }, 60),
  ]);
  assert.equal(d.available, true);
  assert.equal(d.band, "risk");
  assert.ok(d.reasons.length >= 2);
});

/* ── التوقّع: فارغٌ بلا نتيجة، ومرتكزٌ عليها عند وجودها ── */
test("computePrediction: بلا نتيجةٍ حقيقية ⇐ غير متاح + رسالة", () => {
  const p = computePrediction({
    results: resultsFactor({ lastScore: null }),
    progress: progressFactor({ doneItems: 5, totalItems: 10 }),
    errors: errorsFactor({ activeErrors: 0, everLogged: false }),
  });
  assert.equal(p.available, false);
  assert.ok(p.hint.includes("لم نكوّن توقّعاً بعد"));
});
test("computePrediction: يرتكز على النتيجة ويُعدَّل بالتقدّم/الأخطاء", () => {
  const p = computePrediction({
    results: resultsFactor({ lastScore: 80, max: 100 }),
    progress: progressFactor({ doneItems: 10, totalItems: 10 }),   // ١.٠ يرفع قليلاً
    errors: errorsFactor({ activeErrors: 0, everLogged: true }),   // ١.٠ لا يخفض
  });
  assert.equal(p.available, true);
  assert.ok(p.score >= 80 && p.score <= 100, `score=${p.score}`);
});
