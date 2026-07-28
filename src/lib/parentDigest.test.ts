/* اختبار محرّك ملخّص الوالد (buildParentDigest) — دالّة نقيّة حتمية.
   تشغيل: npx tsx --test src/lib/parentDigest.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildParentDigest, type ParentDigestInput } from "./parentDigest";

const BASE: ParentDigestInput = {
  name: "عبدالله", stageLabel: "ثالث ثانوي · علمي", goalLabel: "الاستعداد للقدرات",
  hoursThisWeek: 9, hoursLastWeek: 7, sessionsThisWeek: 5, sessionsLastWeek: 4,
  commitmentPct: 78, daysSinceLastSession: 0, currentStreak: 5, longestStreakDays: 8,
  totalHours: 32, activeDaysLast14: 10, returnedAfterGap: false,
  weakestSubject: "الفيزياء", supportReason: "أضعف مادة هذا الأسبوع.",
  nextExam: { name: "القدرات", days: 40 }, doneLessons: 1, trackProgressPct: 40,
  bestScore: { exam: "التحصيلي", score: 82 }, lifeTopTitle: "أكمل مراجعة الجبر",
};

test("الحالة العامة: ملتزم ⟵ ممتاز 🟢", () => {
  const d = buildParentDigest(BASE);
  assert.equal(d.status.level, "great");
  assert.equal(d.status.emoji, "🟢");
  assert.match(d.status.line, /ملتزم/);
});

test("الحالة العامة: انقطاع > 4 أيام ⟵ يحتاج تدخلاً 🔴", () => {
  const d = buildParentDigest({ ...BASE, daysSinceLastSession: 6 });
  assert.equal(d.status.level, "act");
  assert.match(d.status.line, /انقطع/);
  /* والاقتراح والتنبيه يعكسان الانقطاع */
  assert.match(d.suggestion!, /العودة/);
  assert.equal(d.alert?.urgent, true);
  assert.match(d.alert!.title, /توقّف/);
});

test("الحالة العامة: لم يبدأ بعد ⟵ 🔴 بلا مقارنة", () => {
  const d = buildParentDigest({ ...BASE, daysSinceLastSession: null, totalHours: 0, commitmentPct: 0 });
  assert.equal(d.status.level, "act");
  assert.match(d.status.line, /لم يبدأ/);
});

test("الحالة العامة: انخفاض النشاط ⟵ يحتاج متابعة 🟡", () => {
  const d = buildParentDigest({ ...BASE, commitmentPct: 50, hoursThisWeek: 4, hoursLastWeek: 8 });
  assert.equal(d.status.level, "watch");
  assert.match(d.status.line, /انخفض/);
});

test("التقدّم: نسبة تغيّر الساعات وفرق الجلسات صحيحة", () => {
  const d = buildParentDigest(BASE);
  assert.equal(d.progress.hours.value, 9);
  assert.equal(d.progress.hours.deltaPct, Math.round(((9 - 7) / 7) * 100)); // ≈29
  assert.equal(d.progress.sessions.delta, 1);
  assert.equal(d.progress.commitmentPct, 78);
});

test("التقدّم: لا مقارنة إن كان الأسبوع الماضي بلا أساس (deltaPct=null)", () => {
  const d = buildParentDigest({ ...BASE, hoursLastWeek: 0 });
  assert.equal(d.progress.hours.deltaPct, null);
});

test("يحتاج دعم: مادة واحدة فقط + سبب", () => {
  const d = buildParentDigest(BASE);
  assert.deepEqual(d.support, { subject: "الفيزياء", reason: "أضعف مادة هذا الأسبوع." });
  const none = buildParentDigest({ ...BASE, weakestSubject: null });
  assert.equal(none.support, null);
});

test("الاختبار القادم يُمرَّر كما هو", () => {
  assert.deepEqual(buildParentDigest(BASE).nextExam, { name: "القدرات", days: 40 });
});

test("الإنجازات: تُختار الأعلى عتبةً في كل نوع", () => {
  const d = buildParentDigest({ ...BASE, totalHours: 55, longestStreakDays: 12, trackProgressPct: 100 });
  const texts = d.achievements.map((a) => a.text);
  assert.ok(texts.includes("أكمل 50 ساعة دراسة"));
  assert.ok(texts.includes("حافظ على الدراسة 10 أيام"));
  assert.ok(texts.includes("أنهى وحدة كاملة"));
  /* لا يجمع عتبتين للساعات معاً */
  assert.equal(texts.filter((t) => t.includes("ساعة") || t.includes("ساعات")).length, 1);
});

test("اقتراح واحد فقط للوالد، بصيغته لا صيغة الطالب", () => {
  const d = buildParentDigest(BASE);
  assert.ok(typeof d.suggestion === "string" && d.suggestion.includes("شجّعه"));
  /* اختبار قريب ⟵ الاقتراح عنه */
  const soon = buildParentDigest({ ...BASE, nextExam: { name: "القدرات", days: 10 } });
  assert.match(soon.suggestion!, /قريب/);
});

test("التنبيه: اختبار خلال 14 يوماً أعجل من الانقطاع (واحدٌ على الأكثر)", () => {
  const d = buildParentDigest({ ...BASE, daysSinceLastSession: 6, nextExam: { name: "القدرات", days: 9 } });
  assert.ok(d.alert);
  assert.match(d.alert!.title, /اختبار القدرات بعد 9|اختبار القدرات بعد 9/);
});

test("لا تنبيه حين لا اختبار قريب ولا انقطاع", () => {
  assert.equal(buildParentDigest(BASE).alert, null);
});

test("لحظات تستحق أن تعرفها: عودة بعد انقطاع + أعلى نتيجة + 30 ساعة", () => {
  const d = buildParentDigest({ ...BASE, returnedAfterGap: true });
  const texts = d.moments.map((m) => m.text);
  assert.ok(texts.some((t) => t.includes("انقطاع")));
  assert.ok(texts.some((t) => t.includes("أعلى نتيجة")));
  assert.ok(texts.some((t) => t.includes("30 ساعة")));
});

test("الاسم الافتراضي حين يغيب", () => {
  const d = buildParentDigest({ ...BASE, name: null });
  assert.equal(d.student.name, "الطالب");
});
