import { test } from "node:test";
import assert from "node:assert/strict";
import { canAddModule, canAddMember, buildAddMenu } from "./eligibility";
import { buildInitialWorkspace, addMember } from "./workspace";

/* اليوم المرجعي يطابق examProvider: 1447هـ انتهت، 1448هـ بانتظار، القدرات محوسبة مفتوحة. */
const today = "2026-07-13";

test("Core والمجموعات لا تُضاف مباشرةً؛ القياس المفرد محكومٌ بالجدول", () => {
  assert.equal(canAddModule("university", { stage: "university", today }).allowed, false); // Core لا يُضاف يدوياً
  assert.equal(canAddModule("english", { stage: "third", today }).allowed, false); // عبر عضو

  assert.equal(canAddModule("qudurat", { stage: "first", today }).allowed, false);
  const third = canAddModule("qudurat", { stage: "third", today });
  assert.equal(third.allowed, true);
  assert.equal(third.label, "القدرات");
  assert.equal(canAddModule("tahsili", { stage: "graduate", today }).allowed, true);
  assert.equal(canAddModule("tahsili", { stage: "university", today }).allowed, false);
});

test("أعضاء اللغة بلا قيد؛ أعضاء البرامج لمرحلة القبول", () => {
  for (const stage of ["first", "second", "third", "graduate", "university"] as const) {
    assert.equal(canAddMember("ielts", { stage, today }).allowed, true, `اللغة تُتاح لـ ${stage}`);
  }
  assert.equal(canAddMember("aramco", { stage: "second", today }).allowed, false);
  assert.equal(canAddMember("aramco", { stage: "third", today }).allowed, true);
  assert.equal(canAddMember("itc", { stage: "graduate", today }).allowed, true);
  assert.equal(canAddMember("itc", { stage: "graduate", isUniGrad: true, today }).allowed, false);
});

test("buildAddMenu لطالب ثالث ثانوي: فئات + إتاحة + alreadyAdded", () => {
  let ws = buildInitialWorkspace("third");
  ws = addMember(ws, "step"); // STEP مضاف مسبقاً
  const menu = buildAddMenu(ws, { stage: "third", today });

  assert.deepEqual(menu.map((c) => c.id), ["qiyas", "language", "program"]);

  const qiyas = menu.find((c) => c.id === "qiyas")!;
  assert.deepEqual(qiyas.items.map((i) => i.target.kind === "module" ? i.target.id : ""), ["qudurat", "tahsili"]);
  assert.ok(qiyas.items.find((i) => i.target.kind === "module" && i.target.id === "qudurat")!.allowed);

  const lang = menu.find((c) => c.id === "language")!;
  assert.equal(lang.items.length, 4);
  const stepItem = lang.items.find((i) => i.target.kind === "member" && i.target.id === "step")!;
  assert.equal(stepItem.alreadyAdded, true, "STEP مضاف فيُعلَّم");
  assert.equal(lang.items.find((i) => i.target.kind === "member" && i.target.id === "ielts")!.allowed, true);

  const prog = menu.find((c) => c.id === "program")!;
  assert.ok(prog.items.every((i) => i.allowed), "البرامج متاحة لثالث ثانوي");
});

test("buildAddMenu لأول ثانوي: القياس ممنوع، اللغة متاحة، البرامج ممنوعة", () => {
  const menu = buildAddMenu(buildInitialWorkspace("first"), { stage: "first", today });
  const qiyas = menu.find((c) => c.id === "qiyas")!;
  assert.ok(qiyas.items.every((i) => !i.allowed), "لا قياس لأول ثانوي");
  assert.ok(qiyas.items.find((i) => i.target.kind === "module" && i.target.id === "qudurat")!.reason);
  assert.ok(menu.find((c) => c.id === "language")!.items.every((i) => i.allowed));
  assert.ok(menu.find((c) => c.id === "program")!.items.every((i) => !i.allowed));
});
