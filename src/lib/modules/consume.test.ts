/* اختبارات محوّل الاستهلاك — تشغيل: npx tsx --test src/lib/modules/consume.test.ts
   المستهلكون يقرؤون الـWorkspace وحده؛ نتحقّق أن المحوّل يشتقّ المواد/المفاتيح صحيحاً. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInitialWorkspace, addModule, addMember } from "./workspace";
import { workspaceStudy, workspaceSubjects, workspaceTrackIds, defaultStudySubjects } from "./consume";

test("Core فقط (مدرسة) → لا مواد دراسية ولا مفاتيح", () => {
  const ws = buildInitialWorkspace("third");
  assert.deepEqual(workspaceSubjects(ws), []);
  assert.deepEqual(workspaceTrackIds(ws), []);
});

test("قدرات + تحصيلي → مواد الاثنين ومفاتيح الكتالوج القديمة", () => {
  let ws = buildInitialWorkspace("third");
  ws = addModule(ws, "qudurat");
  ws = addModule(ws, "tahsili");
  const { subjects, trackIds } = workspaceStudy(ws);
  const names = subjects.map((s) => s.name);
  assert.ok(names.includes("لفظي") && names.includes("كمي"), "مواد القدرات");
  assert.ok(names.includes("فيزياء") && names.includes("أحياء"), "مواد التحصيلي");
  assert.deepEqual(trackIds.sort(), ["تحصيلي", "قدرات"].sort());
});

test("عضو لغة (STEP) → مواد اللغة ومفتاح ستيب", () => {
  let ws = buildInitialWorkspace("third");
  ws = addMember(ws, "step");
  const { subjects, trackIds } = workspaceStudy(ws);
  assert.ok(subjects.some((s) => s.name === "قواعد"), "مواد STEP");
  assert.deepEqual(trackIds, ["ستيب"]);
});

test("لا تكرار مواد عند تقاطعها (رياضيات في التحصيلي والبرامج)", () => {
  let ws = buildInitialWorkspace("third");
  ws = addModule(ws, "tahsili");
  ws = addMember(ws, "itc");
  const names = workspaceSubjects(ws).map((s) => s.name);
  assert.equal(names.filter((n) => n === "رياضيات").length, 1, "رياضيات مكرّرة");
});

test("الفولباك الافتراضي = مواد التحصيلي", () => {
  assert.deepEqual(defaultStudySubjects().map((s) => s.name), ["أحياء", "فيزياء", "رياضيات", "كيمياء"]);
});
