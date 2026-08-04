import { test } from "node:test";
import assert from "node:assert/strict";
import { duwairbMoment, explainSessionPlan, MOMENT_TUNING } from "./moments";

/* ═══════════ لحظاتُ دويرب — العقدُ الأول: بلا إشارةٍ لا كلام ═══════════ */

test("بعد الجلسة: بلا دقائقَ فعليّة لا تدخّل", () => {
  assert.equal(duwairbMoment({ kind: "session-finished", minutes: 0 }), null);
});

test("بعد الجلسة: بلا اختبارٍ قريبٍ ولا سلسلةٍ ولا قائمةٍ فارغة يسكت", () => {
  assert.equal(duwairbMoment({ kind: "session-finished", minutes: 45, streakDays: 1, remainingCount: 4 }), null);
});

test("بعد الجلسة: قربُ الاختبار يسبق السلسلة، والسببُ مذكور", () => {
  const iv = duwairbMoment({ kind: "session-finished", minutes: 60, streakDays: 9, daysUntilExam: 5, remainingCount: 3 });
  assert.ok(iv);
  assert.equal(iv.text, "باقي 5 أيام على اختبارك.");
  assert.ok(!iv.text.includes("دقيقة"), "المدّةُ معروضةٌ في الشاشة — لا تُكرَّر في الرسالة");
});

test("بعد الجلسة: قائمةٌ فارغة تُذكر، ولا تُخترع سلسلةٌ غائبة", () => {
  const iv = duwairbMoment({ kind: "session-finished", minutes: 30, remainingCount: 0 });
  assert.ok(iv);
  assert.equal(iv.text, "لم يبقَ في قائمتك شيء.");
});

test("بعد الجلسة: السلسلةُ القوية تُذكر بصيغةٍ سليمة مع الأعداد الكبيرة", () => {
  const iv = duwairbMoment({ kind: "session-finished", minutes: 25, streakDays: 11, remainingCount: 2 });
  assert.ok(iv);
  assert.equal(iv.text, "سلسلتك 11 يوماً بلا انقطاع.");
});

/* ── التخطّي ── */

test("التخطّي: الاستبدالُ الفعليّ يذكر البديل، والأصلَ ما زال في المسار", () => {
  const iv = duwairbMoment({
    kind: "task-skipped", reason: "swap", reasonLabel: "أريد استبدالها",
    label: "مراجعة الرياضيات", swappedTo: "الكيمياء", remainingTasks: 2,
  });
  assert.ok(iv);
  assert.match(iv.text, /بدّلتها بـالكيمياء/);
  assert.match(iv.text, /«مراجعة الرياضيات» ما زالت في مسارك/);
});

test("التخطّي: طلبُ استبدالٍ بلا بديلٍ يصير حذفاً — ولا يُدّعى استبدال", () => {
  const iv = duwairbMoment({
    kind: "task-skipped", reason: "swap", reasonLabel: "أريد استبدالها",
    label: "تدريب الفيزياء", swappedTo: null, remainingTasks: 1,
  });
  assert.ok(iv);
  assert.ok(!iv.text.includes("بدّلتها"));
  assert.match(iv.text, /«تدريب الفيزياء» خرجت من خطة اليوم، وبقيت لك مهمة واحدة/);
});

test("التخطّي: السببُ نصُّ الخيار كما قرأه الطالب لا نصٌّ مخترَع", () => {
  const iv = duwairbMoment({
    kind: "task-skipped", reason: "later", reasonLabel: "سأفعلها لاحقاً",
    label: "مراجعة اللغة", remainingTasks: 0,
  });
  assert.ok(iv);
  assert.equal(iv.why, "لأنك اخترت «سأفعلها لاحقاً».");
  assert.ok(!iv.text.includes("وبقيت"));
});

/* ── الالتزام ── */

test("الالتزام: لا حكمَ على أسبوعٍ فارغ — وساعاتٌ بلا سجلِّ جلساتٍ محتوىً كافٍ", () => {
  assert.equal(duwairbMoment({ kind: "commitment-drop", commitmentPct: 0, weekHours: 0, weekSessions: 0 }), null);
  assert.ok(duwairbMoment({ kind: "commitment-drop", commitmentPct: 15, weekHours: 2.2, weekSessions: 0 }));
});

test("الالتزام: الغائبُ (null) لا يصير صفراً", () => {
  assert.equal(duwairbMoment({ kind: "commitment-drop", commitmentPct: null, weekHours: 3, weekSessions: 4 }), null);
});

test("الالتزام: فوق العتبة لا تدخّل، وتحتها تدخّلٌ بالنسبة الحقيقية", () => {
  assert.equal(duwairbMoment({ kind: "commitment-drop", commitmentPct: MOMENT_TUNING.lowCommitmentPct, weekHours: 2, weekSessions: 3 }), null);
  const iv = duwairbMoment({ kind: "commitment-drop", commitmentPct: 22, weekHours: 1, weekSessions: 2 });
  assert.ok(iv);
  assert.match(iv.text, /22٪/);
});

/* ── قربُ الاختبار ── */

test("قربُ الاختبار: بعيدٌ ⇒ صمت، وقريبٌ ⇒ الأيامُ مع ما بقي", () => {
  assert.equal(duwairbMoment({
    kind: "exam-near", daysUntilExam: MOMENT_TUNING.examNearDays + 1,
    remainingLessons: 5, remainingDrills: 5, activeErrors: 5,
  }), null);
  const iv = duwairbMoment({ kind: "exam-near", daysUntilExam: 3, remainingLessons: 2, remainingDrills: 0, activeErrors: 1 });
  assert.ok(iv);
  assert.match(iv.text, /باقي 3 أيام على اختبارك/);
  assert.match(iv.text, /إنهاء وحدتين/);
  assert.match(iv.text, /مراجعة خطأ واحد/);
  assert.ok(!iv.text.includes("حل "));
});

test("قربُ الاختبار: بلا موعدٍ مسجَّل لا تدخّل", () => {
  assert.equal(duwairbMoment({
    kind: "exam-near", daysUntilExam: null, remainingLessons: 9, remainingDrills: 9, activeErrors: 9,
  }), null);
});

/* ── الأخطاء ── */

test("الخطأ: نمطٌ في مادّةٍ واحدة يُذكر بصيغةٍ عربية سليمة", () => {
  const iv = duwairbMoment({ kind: "error-added", subject: "الرياضيات", inSubject: 2 });
  assert.ok(iv);
  assert.match(iv.text, /سجّلته في الرياضيات/);
  const many = duwairbMoment({ kind: "error-added", subject: "الرياضيات", inSubject: MOMENT_TUNING.subjectErrorPattern });
  assert.ok(many);
  assert.match(many.text, /صار عندك 3 أخطاء في الرياضيات/);
  const one = duwairbMoment({ kind: "error-added", subject: "الفيزياء", inSubject: 1 });
  assert.ok(one);
  assert.match(one.text, /المحفوظات/);
});

test("الخطأ: بلا مادّةٍ لا تدخّل", () => {
  assert.equal(duwairbMoment({ kind: "error-added", subject: "  ", inSubject: 7 }), null);
});

/* ── الهدف ── */

test("الهدف: القيمةُ الفارغة لا تُنتج رسالة، والمملوءةُ تُنتج سبباً", () => {
  assert.equal(duwairbMoment({ kind: "goal-changed", field: "major", value: "" }), null);
  const iv = duwairbMoment({ kind: "goal-changed", field: "university", value: "جامعة الملك فهد" });
  assert.ok(iv);
  assert.equal(iv.text, "سجّلت جامعتك المستهدفة: جامعة الملك فهد.");
  assert.ok(iv.why.length > 0);
});

/* ── Explainability ── */

test("شرحُ الخطة: بلا عاملٍ واحدٍ لا جملة", () => {
  assert.equal(explainSessionPlan([undefined, undefined]), null);
  assert.equal(explainSessionPlan([]), null);
});

test("شرحُ الخطة: أعلى عاملين بلا تكرار", () => {
  const iv = explainSessionPlan(["remaining-units", "remaining-units", "recent-mistakes", "commitment"]);
  assert.ok(iv);
  assert.equal(iv.text, "رتّبت خطّة اليوم على ما تبقّى من دروسك ثمّ أخطائك غير المراجَعة.");
  assert.ok(!iv.text.includes("التزامك"));
});

test("كلُّ تدخّلٍ يحمل معرّفاً ثابتاً وسبباً — لا رسالةَ بلا «لماذا»", () => {
  const all = [
    duwairbMoment({ kind: "session-finished", minutes: 40, daysUntilExam: 2 }),
    duwairbMoment({ kind: "task-skipped", reason: "cant-now", reasonLabel: "لا أستطيع الآن", label: "تدريب", remainingTasks: 1 }),
    duwairbMoment({ kind: "commitment-drop", commitmentPct: 10, weekHours: 0, weekSessions: 1 }),
    duwairbMoment({ kind: "exam-near", daysUntilExam: 1, remainingLessons: 1, remainingDrills: 0, activeErrors: 0 }),
    duwairbMoment({ kind: "error-added", subject: "الأحياء", inSubject: 4 }),
    duwairbMoment({ kind: "goal-changed", field: "major", value: "الطب" }),
    explainSessionPlan(["exam-urgency"]),
  ];
  for (const iv of all) {
    assert.ok(iv, "كل هذه اللحظات لها إشاراتٌ حقيقية فيجب أن تتكلّم");
    assert.ok(iv.id.startsWith("duwairb:"));
    assert.ok(iv.why.trim().length > 0);
    assert.ok(iv.text.trim().length > 0);
  }
  assert.equal(new Set(all.map((x) => x!.id)).size, all.length, "المعرّفاتُ متمايزة");
});
