import { test } from "node:test";
import assert from "node:assert/strict";
import {
  daysBetween, addDays, finishForecast, suggestedExamDate, computeExamDashboard, type ExamInputs,
} from "./metrics";

test("مساعدات التاريخ", () => {
  assert.equal(daysBetween("2026-03-01", "2026-03-11"), 10);
  assert.equal(daysBetween("2026-03-11", "2026-03-01"), -10);
  assert.equal(addDays("2026-03-01", 10), "2026-03-11");
  assert.equal(addDays("2026-02-27", 2), "2026-03-01"); // 2026 ليست كبيسة
});

test("finishForecast: فارغٌ بلا تاريخٍ كافٍ", () => {
  assert.equal(finishForecast({ remaining: 20, done: 1, elapsedDays: 1, today: "2026-03-01" }).available, false);
  assert.equal(finishForecast({ remaining: 0, done: 10, elapsedDays: 10, today: "2026-03-01" }).available, false);
});
test("finishForecast: تاريخٌ بمعدّل الطالب", () => {
  // done=10 خلال 5 أيام ⇒ 2/يوم؛ المتبقّي 20 ⇒ 10 أيام ⇒ +10
  const f = finishForecast({ remaining: 20, done: 10, elapsedDays: 5, today: "2026-03-01" });
  assert.equal(f.available, true);
  assert.equal(f.days, 10);
  assert.equal(f.date, "2026-03-11");
});

test("suggestedExamDate: فارغٌ بلا نافذةٍ واثقة (لا نوافذ · ماضية · قريبةٌ جداً)", () => {
  assert.equal(suggestedExamDate({ windows: [], today: "2026-01-01" }, 30).available, false);
  // كل النوافذ ماضية
  assert.equal(suggestedExamDate({ windows: [{ start: "2025-01-01", end: "2025-02-01" }], today: "2026-01-01" }, 10).available, false);
  // نافذةٌ قريبةٌ جداً لا تعطي تحضيراً كافياً ⇒ لا اقتراح (لا نخمّن موعداً غير واقعيّ)
  const near = suggestedExamDate({ windows: [{ start: "2026-01-10", end: "2026-01-20" }], today: "2026-01-01" }, 45);
  assert.equal(near.available, false);
  assert.equal(near.hint, "حدد موعد اختبارك أولاً.");
});
test("suggestedExamDate: نافذةٌ تبدأ بعد اكتمال التحضير ⇒ اقتراحٌ واثق", () => {
  const s = suggestedExamDate({
    windows: [
      { start: "2026-01-10", end: "2026-01-20" }, // قريبةٌ جداً (تحضيرٌ غير كافٍ) — تُستبعد
      { start: "2026-03-01", end: "2026-03-20" }, // تبدأ بعد 60 يوماً — واثقة
    ],
    today: "2026-01-01",
  }, 45);
  assert.equal(s.available, true);
  assert.equal(s.date, "2026-03-01"); // بداية النافذة التي تعطي ≥45 يوم تحضير
});

/* ── الجسر الأساسي ── */
test("computeExamDashboard: طالبٌ جديد ⇒ حالاتٌ فارغة صادقة (لا أرقام)", () => {
  const inp: ExamInputs = {
    today: "2026-01-01", examDate: null, registrationDate: null, targetScore: null,
    doneItems: 0, totalItems: 0, plannedMins: 0, doneMins: 0, started: false,
    activeErrors: 0, everLoggedErrors: false, lastErrorDaysAgo: null, lastScore: null, scoreMax: 100, waitingResult: false,
    elapsedDays: 0, examWindows: [], prepDays: 30,
  };
  const d = computeExamDashboard(inp);
  assert.equal(d.status, "not-started");
  assert.equal(d.readiness.available, false);   // لا توجد بيانات كافية بعد
  assert.equal(d.prediction.available, false);
  assert.equal(d.commitment.available, false);
  assert.equal(d.planProgress.available, false);
  assert.equal(d.activeErrors.available, false);
  assert.equal(d.target.available, false);
  assert.equal(d.countdown.available, false);
  assert.equal(d.finish.available, false);
});

test("computeExamDashboard: طالبٌ نشطٌ مسجّل ⇒ مؤشّراتٌ متاحة + حالةٌ مشتقّة", () => {
  const inp: ExamInputs = {
    today: "2026-01-01", examDate: "2026-03-02", registrationDate: "2025-12-20", targetScore: 90,
    doneItems: 30, totalItems: 40, plannedMins: 180, doneMins: 150, started: true,
    activeErrors: 8, everLoggedErrors: true, lastErrorDaysAgo: 2, lastScore: null, scoreMax: 100, waitingResult: false,
    elapsedDays: 15, examWindows: [], prepDays: 30,
  };
  const d = computeExamDashboard(inp);
  assert.equal(d.readiness.available, true);     // 4 عوامل متاحة (النتائج غير متاحة)
  assert.ok(d.readiness.score > 0);
  assert.equal(d.commitment.available, true);
  assert.equal(d.commitment.pct, Math.round((150 / 180) * 100)); // 83
  assert.equal(d.planProgress.pct, 75);
  assert.equal(d.activeErrors.available, true);
  assert.equal(d.activeErrors.count, 8);
  assert.equal(d.activeErrors.lastErrorDaysAgo, 2); // «آخر خطأ قبل يومين»
  assert.equal(d.target.value, 90);
  assert.equal(d.countdown.available, true);
  assert.equal(d.countdown.daysLeft, daysBetween("2026-01-01", "2026-03-02"));
  assert.equal(d.prediction.available, false);   // لا درجةٌ بعد ⇒ لا توقّع (صدق)
  assert.equal(d.status, "registered");           // مسجّل، لم يمضِ الموعد

  // بمجرّد تسجيل درجةٍ حقيقية ومرور الموعد ⇒ توقّعٌ متاح + حالة «مكتمل»
  const done = computeExamDashboard({ ...inp, examDate: "2025-12-25", lastScore: 88 });
  assert.equal(done.prediction.available, true);
  assert.equal(done.status, "done");
});

test("computeExamDashboard: يقترح تاريخاً فقط إن لم يوجد موعد", () => {
  const base: ExamInputs = {
    today: "2026-01-01", examDate: null, registrationDate: null, targetScore: null,
    doneItems: 0, totalItems: 0, plannedMins: 0, doneMins: 0, started: false,
    activeErrors: 0, everLoggedErrors: false, lastErrorDaysAgo: null, lastScore: null, scoreMax: 100, waitingResult: false,
    elapsedDays: 0, examWindows: [{ start: "2026-03-01", end: "2026-03-20" }], prepDays: 30,
  };
  assert.equal(computeExamDashboard(base).suggestedDate.available, true);
  assert.equal(computeExamDashboard({ ...base, examDate: "2026-03-02" }).suggestedDate.available, false);
});
