/* اختبار نظام مذكرة الواجبات + قاعدة Life Engine للضغط.
   تشغيل: npx tsx --test src/lib/homework.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeHomework, addHomework, toggleDone, removeHomework, sortHomework,
  bucketOf, groupHomework, dueOn, homeworkPressure, addDaysKey, type Homework,
} from "./homework";
import { lifeEngine, type LifeContext } from "./lifeEngine";

const TODAY = "2026-07-11";
const mk = (over: Partial<Homework>): Homework => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  title: over.title ?? "واجب", subject: over.subject, due: over.due ?? TODAY,
  priority: over.priority ?? "normal", done: over.done ?? false,
  createdAt: "2026-07-01T00:00:00Z", repeat: over.repeat ?? "none",
  reminderLeadDays: over.reminderLeadDays,
});

test("makeHomework: تسليمٌ افتراضيّ اليوم، أولوية عادية، غير منجز", () => {
  const h = makeHomework({ title: "  رياضيات ص٣٠  " }, TODAY);
  assert.equal(h.title, "رياضيات ص٣٠");
  assert.equal(h.due, TODAY);
  assert.equal(h.priority, "normal");
  assert.equal(h.done, false);
  assert.equal(h.repeat, "none");
});

test("addHomework يتجاهل العنوان الفارغ", () => {
  assert.equal(addHomework([], { title: "   " }).length, 0);
  assert.equal(addHomework([], { title: "شيء" }).length, 1);
});

test("addDaysKey يحسب اليوم التالي بصحة", () => {
  assert.equal(addDaysKey("2026-07-11", 1), "2026-07-12");
  assert.equal(addDaysKey("2026-07-31", 1), "2026-08-01");
});

test("الترتيب التلقائي: غير المنجز أولاً، ثم الأقرب تسليماً، ثم الأولوية", () => {
  const list = [
    mk({ id: "a", due: "2026-07-15", priority: "low" }),
    mk({ id: "b", due: "2026-07-11", priority: "low" }),
    mk({ id: "c", due: "2026-07-11", priority: "high" }),
    mk({ id: "d", due: "2026-07-11", done: true }),
  ];
  const ids = sortHomework(list).map((h) => h.id);
  assert.deepEqual(ids, ["c", "b", "a", "d"]);
});

test("التجميع حسب التسليم: متأخّر/اليوم/غداً/قادم/منجز", () => {
  const list = [
    mk({ id: "over", due: "2026-07-09" }),
    mk({ id: "today", due: TODAY }),
    mk({ id: "tom", due: "2026-07-12" }),
    mk({ id: "up", due: "2026-07-20" }),
    mk({ id: "done", due: TODAY, done: true }),
  ];
  assert.equal(bucketOf(list[0], TODAY), "overdue");
  assert.equal(bucketOf(list[1], TODAY), "today");
  assert.equal(bucketOf(list[2], TODAY), "tomorrow");
  assert.equal(bucketOf(list[3], TODAY), "upcoming");
  assert.equal(bucketOf(list[4], TODAY), "done");
  const groups = groupHomework(list, TODAY).map((g) => g.bucket);
  assert.deepEqual(groups, ["overdue", "today", "tomorrow", "upcoming", "done"]);
});

test("«تم»: يعلّم الإنجاز، والواجب اليومي يتولّد له نسخةٌ للغد", () => {
  const daily = mk({ id: "x", title: "قراءة", due: TODAY, repeat: "daily" });
  const after = toggleDone([daily], "x", TODAY);
  const done = after.find((h) => h.id === "x")!;
  assert.equal(done.done, true);
  assert.ok(done.doneAt);
  const tomorrowCopy = after.find((h) => h.repeat === "daily" && !h.done && h.due === "2026-07-12");
  assert.ok(tomorrowCopy, "لم تتولّد نسخة الغد للواجب اليومي");
  /* إلغاء الإنجاز لا يولّد نسخة */
  const undo = toggleDone(after, "x", TODAY);
  assert.equal(undo.find((h) => h.id === "x")!.done, false);
});

test("removeHomework يحذف بالمعرّف", () => {
  const list = [mk({ id: "a" }), mk({ id: "b" })];
  assert.deepEqual(removeHomework(list, "a").map((h) => h.id), ["b"]);
});

test("dueOn: واجبات يومٍ محدّد غير المنجزة", () => {
  const list = [mk({ id: "a", due: TODAY }), mk({ id: "b", due: TODAY, done: true }), mk({ id: "c", due: "2026-07-12" })];
  assert.deepEqual(dueOn(list, TODAY).map((h) => h.id), ["a"]);
});

test("homeworkPressure: عدّاداتٌ صحيحة للضغط", () => {
  const list = [
    mk({ due: "2026-07-08" }),               // متأخّر
    mk({ due: TODAY, priority: "high" }),      // اليوم + مرتفع
    mk({ due: "2026-07-12" }),                // غداً
    mk({ due: "2026-07-13" }),                // خلال ٣ أيام
    mk({ due: "2026-07-25" }),                // بعيد
    mk({ due: TODAY, done: true }),            // منجز (لا يُحسب)
  ];
  const p = homeworkPressure(list, TODAY);
  assert.equal(p.pending, 5);
  assert.equal(p.overdue, 1);
  assert.equal(p.dueToday, 1);
  assert.equal(p.dueTomorrow, 1);
  assert.equal(p.highPriorityPending, 1);
  assert.equal(p.dueSoon, 3);            // اليوم + غداً + بعد يومين (٣ ضمن ٣ أيام)
  assert.equal(p.nextDue, "2026-07-08"); // الأقرب (المتأخّر أولاً في الترتيب)
});

/* ════════ Life Engine يقرأ ضغط الواجبات (لا الاختبارات وحدها) ════════ */
const baseCtx: LifeContext = {
  stage: "first", uniStage: null, gpa: null, hours: null, year: null,
  majorId: null, majorName: null, coopDone: false, gradInterest: false,
  highschoolPct: null, inSchoolFinals: false, daysToSchoolFinals: null,
  qiyas: null, uniFinalsInDays: null, termLabel: null, inStudyTerm: false,
  hwOverdue: 0, hwDueToday: 0, hwPending: 0, retakeExams: [], admissionOpen: true,
};

test("Life Engine: واجبٌ متأخّر يُظهر أولوية «الواجبات» بسببها الحقيقي", () => {
  const withHw = { ...baseCtx, hwOverdue: 2, hwPending: 3 };
  const hw = lifeEngine(withHw).find((p) => p.key === "homework");
  assert.ok(hw, "لم تظهر أولوية الواجبات رغم التأخّر");
  assert.match(hw!.why, /متأخّر/);
  assert.equal(hw!.href, "/school");
});

test("Life Engine: بلا واجبات لا تظهر أولوية «الواجبات»", () => {
  assert.equal(lifeEngine(baseCtx).find((p) => p.key === "homework"), undefined);
});

