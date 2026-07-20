import { test } from "node:test";
import assert from "node:assert/strict";
import {
  remainingSlots, atMax, MAX_EXAMS, PRIORITY_LOCK_DAYS,
  getExamMeta, setExamMeta, onExamAdded, onExamRemoved,
  setPriorityOrder, priorityLock, orderByPriority, setStudyMode,
  examStatus, type RoadmapConfig,
} from "./model";

const DAY = 86_400_000;
const empty: RoadmapConfig = {};

test("حدود الإضافة: max ٣", () => {
  assert.equal(MAX_EXAMS, 3);
  assert.equal(remainingSlots(0), 3);
  assert.equal(remainingSlots(3), 0);
  assert.equal(remainingSlots(5), 0);
  assert.equal(atMax(2), false);
  assert.equal(atMax(3), true);
});

test("get/setExamMeta: تعديلٌ غير مُدمِّر", () => {
  const c1 = setExamMeta(empty, "qudurat", { targetScore: 90 });
  assert.equal(getExamMeta(c1, "qudurat").targetScore, 90);
  const c2 = setExamMeta(c1, "qudurat", { registrationDate: "2026-05-01" });
  assert.equal(getExamMeta(c2, "qudurat").targetScore, 90); // مُبقى
  assert.equal(getExamMeta(c2, "qudurat").registrationDate, "2026-05-01");
  assert.deepEqual(getExamMeta(empty, "x"), {}); // افتراضي
});

test("قفل الأولوية: ٧ أيام + عدّاد", () => {
  const now = 1_000_000_000_000;
  const locked = setPriorityOrder(empty, ["qudurat", "step", "tahsili"], now);
  assert.equal(getExamMeta(locked, "qudurat").priority, 1);
  assert.equal(getExamMeta(locked, "step").priority, 2);
  assert.equal(getExamMeta(locked, "tahsili").priority, 3);

  const day1 = priorityLock(locked, now + 1 * DAY);
  assert.equal(day1.locked, true);
  assert.equal(day1.daysLeft, PRIORITY_LOCK_DAYS - 1); // ٦

  const after = priorityLock(locked, now + 8 * DAY);
  assert.equal(after.locked, false);
  assert.equal(after.daysLeft, 0);

  assert.equal(priorityLock(empty).locked, false); // بلا قفلٍ سابق
});

test("إضافة/حذف اختبار يُلغيان القفل (يسمحان بإعادة الترتيب)", () => {
  const now = 2_000_000_000_000;
  const locked = setPriorityOrder(empty, ["qudurat", "step"], now);
  assert.equal(priorityLock(locked, now).locked, true);

  const afterRemove = onExamRemoved(locked, "step");
  assert.equal(priorityLock(afterRemove, now).locked, false);
  assert.equal(afterRemove.examMeta?.step, undefined);

  const afterAdd = onExamAdded(locked, "tahsili");
  assert.equal(priorityLock(afterAdd, now).locked, false);
  assert.deepEqual(afterAdd.examMeta?.tahsili, {});
});

test("orderByPriority: المرتّب أولاً ثم غير المرتّب بثبات", () => {
  const c = setPriorityOrder(empty, ["step", "qudurat"], 1); // step=1, qudurat=2
  const out = orderByPriority(c, ["qudurat", "step", "ielts"]); // ielts بلا أولوية
  assert.deepEqual(out, ["step", "qudurat", "ielts"]);
});

test("setStudyMode", () => {
  assert.equal(setStudyMode(empty, "smart").studyMode, "smart");
});

test("examStatus: الاشتقاق من الحقائق (الأبعد وصولاً)", () => {
  assert.equal(examStatus({ progress: 0, registered: false, examPassed: false, hasResult: false, waitingResult: false }), "not-started");
  assert.equal(examStatus({ progress: 40, registered: false, examPassed: false, hasResult: false, waitingResult: false }), "studying");
  assert.equal(examStatus({ progress: 40, registered: true, examPassed: false, hasResult: false, waitingResult: false }), "registered");
  assert.equal(examStatus({ progress: 40, registered: true, examPassed: true, hasResult: false, waitingResult: false }), "taken");
  assert.equal(examStatus({ progress: 40, registered: true, examPassed: true, hasResult: false, waitingResult: true }), "waiting-result");
  assert.equal(examStatus({ progress: 100, registered: true, examPassed: true, hasResult: true, waitingResult: true }), "done");
});
