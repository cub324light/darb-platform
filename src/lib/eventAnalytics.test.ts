/* اختبار تجميع أحداث المنتج — دالة نقية.
   تشغيل: npx tsx --test src/lib/eventAnalytics.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { eventAggregates, type EventRow } from "./eventAnalytics";

const row = (name: string, props: Record<string, unknown> = {}, uid: string | null = null): EventRow => ({ name, props, uid });

test("eventAggregates: إكمال الدروس + أعلى الدروس بالاسم", () => {
  const a = eventAggregates([
    row("lesson_started", { lessonKey: "lesson:ohm" }, "u1"),
    row("lesson_completed", { lessonKey: "lesson:ohm", lessonName: "قانون أوم" }, "u1"),
    row("lesson_completed", { lessonKey: "lesson:ohm", lessonName: "قانون أوم" }, "u2"),
    row("lesson_completed", { lessonKey: "lesson:v", lessonName: "الجهد" }, "u3"),
  ]);
  assert.equal(a.lessonsCompleted, 3);
  assert.equal(a.topLessons[0].key, "lesson:ohm");
  assert.equal(a.topLessons[0].name, "قانون أوم");
  assert.equal(a.topLessons[0].count, 2);
});

test("eventAggregates: معدّل إكمال الدرس (Drop-off) = اكتمل ÷ بدأ", () => {
  const a = eventAggregates([
    row("lesson_started", {}, "u1"),
    row("lesson_started", {}, "u2"),
    row("lesson_started", {}, "u3"),
    row("lesson_started", {}, "u4"),
    row("lesson_completed", { lessonKey: "l" }, "u1"),
  ]);
  assert.equal(a.lessonsStarted, 4);
  assert.equal(a.lessonsCompleted, 1);
  assert.equal(a.lessonCompletionRate, 25);
});

test("eventAggregates: بلا بدايات → المعدّل null (لا رقم مخترع)", () => {
  const a = eventAggregates([row("page_view", { visitorId: "v1" })]);
  assert.equal(a.lessonCompletionRate, null);
  assert.equal(a.lessonsStarted, 0);
});

test("eventAggregates: أعلى الاختبارات حسب الاسم", () => {
  const a = eventAggregates([
    row("exam_completed", { exam: "القدرات" }, "u1"),
    row("exam_completed", { exam: "القدرات" }, "u2"),
    row("exam_completed", { exam: "التحصيلي" }, "u3"),
  ]);
  assert.equal(a.examsCompleted, 3);
  assert.equal(a.topExams[0].exam, "القدرات");
  assert.equal(a.topExams[0].count, 2);
});

test("eventAggregates: القمع بالمستخدم الفريد (زيارة بمعرّف الزائر، البقية بـ uid)", () => {
  const a = eventAggregates([
    row("page_view", { visitorId: "v1" }),
    row("page_view", { visitorId: "v1" }),   // نفس الزائر — لا يُضاعَف
    row("page_view", { visitorId: "v2" }),
    row("onboarding_completed", {}, "u1"),
    row("onboarding_completed", {}, "u1"),    // نفس المستخدم — لا يُضاعَف
    row("lesson_completed", { lessonKey: "l" }, "u1"),
  ]);
  const visit = a.funnel.find((s) => s.key === "visit");
  const signup = a.funnel.find((s) => s.key === "signup");
  const lesson = a.funnel.find((s) => s.key === "lesson");
  assert.equal(visit?.count, 2);   // زائران فريدان
  assert.equal(signup?.count, 1);  // مستخدم واحد
  assert.equal(lesson?.count, 1);
});

test("eventAggregates: القمع يتجاهل الأحداث بلا فاعل معروف", () => {
  const a = eventAggregates([
    row("onboarding_completed", {}, null),   // بلا uid → لا يُعدّ
    row("session_completed", {}, ""),        // فاعل فارغ → لا يُعدّ
  ]);
  assert.equal(a.funnel.find((s) => s.key === "signup")?.count, 0);
  assert.equal(a.funnel.find((s) => s.key === "session")?.count, 0);
});
