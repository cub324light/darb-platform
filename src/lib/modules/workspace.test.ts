import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildInitialWorkspace, syncCoreModules, addModule, addMember, removeModule, removeMember,
  hideModule, reorderModules, setPriority, setProgress, setState, setMemberProgress,
  getInstance, getMember, hasModule, hasMember, groupMembers,
  visibleModules, orderedModules, optionalInstances,
} from "./workspace";

const NOW = 1_700_000_000_000;

test("مساري الابتدائي: Core المرحلة فقط، لا شيء اختياري", () => {
  assert.deepEqual(buildInitialWorkspace("first", NOW).modules.map((m) => m.id), ["school"]);
  assert.deepEqual(buildInitialWorkspace("university", NOW).modules.map((m) => m.id), ["university"]);
  assert.deepEqual(buildInitialWorkspace("graduate", NOW).modules, []);
});

test("addModule: للمفردة فقط — يرفض Core والمجموعة والتكرار", () => {
  let ws = buildInitialWorkspace("third", NOW);
  ws = addModule(ws, "school", NOW);   // Core → مرفوض
  ws = addModule(ws, "english", NOW);  // مجموعة → مرفوضة (تُضاف بعضو)
  assert.equal(optionalInstances(ws).length, 0);
  ws = addModule(ws, "qudurat", NOW);
  assert.ok(hasModule(ws, "qudurat"));
  ws = addModule(ws, "qudurat", NOW);  // تكرار
  assert.equal(ws.modules.filter((m) => m.id === "qudurat").length, 1);
});

test("addMember: يُنشئ الوحدة المجموعة الأمّ ويضيف العضو (بطاقة واحدة لا أربع)", () => {
  let ws = buildInitialWorkspace("third", NOW);
  ws = addMember(ws, "step", NOW);
  ws = addMember(ws, "ielts", NOW);
  assert.ok(hasModule(ws, "english"), "تُنشأ بطاقة اللغة الواحدة");
  assert.equal(ws.modules.filter((m) => m.id === "english").length, 1, "بطاقة واحدة لا تتكرر");
  assert.deepEqual(groupMembers(ws, "english").map((x) => x.id), ["step", "ielts"]);
  assert.ok(hasMember(ws, "step") && hasMember(ws, "ielts"));

  // برامج القبول بطاقة مجموعة أخرى
  ws = addMember(ws, "aramco", NOW);
  assert.ok(hasModule(ws, "programs"));
  assert.deepEqual(groupMembers(ws, "programs").map((x) => x.id), ["aramco"]);
});

test("removeMember: يفرّغ المجموعة فتُحذف؛ removeModule يحذف المجموعة كاملة", () => {
  let ws = addMember(addMember(buildInitialWorkspace("third", NOW), "step", NOW), "ielts", NOW);
  ws = removeMember(ws, "step", NOW);
  assert.ok(hasModule(ws, "english"), "تبقى ما دام فيها عضو");
  assert.deepEqual(groupMembers(ws, "english").map((x) => x.id), ["ielts"]);
  ws = removeMember(ws, "ielts", NOW);
  assert.ok(!hasModule(ws, "english"), "تُحذف عند تفريغها");

  let g = addMember(addMember(buildInitialWorkspace("third", NOW), "step", NOW), "toefl", NOW);
  g = removeModule(g, "english", NOW);
  assert.ok(!hasModule(g, "english") && !hasMember(g, "step"));
});

test("Core محميّة — لا تُحذف ولا تُخفى", () => {
  let ws = buildInitialWorkspace("first", NOW);
  ws = removeModule(ws, "school", NOW);
  assert.ok(hasModule(ws, "school"));
  ws = hideModule(ws, "school", true, NOW);
  assert.equal(getInstance(ws, "school")!.hidden, false);
});

test("تقدّم المجموعة مشتقٌّ من أعضائها", () => {
  let ws = addMember(addMember(buildInitialWorkspace("third", NOW), "step", NOW), "ielts", NOW);
  ws = setMemberProgress(ws, "step", 100, NOW);
  ws = setMemberProgress(ws, "ielts", 50, NOW);
  assert.equal(getMember(ws, "step")!.state, "completed");
  assert.equal(getInstance(ws, "english")!.progress, 75, "متوسط 100 و50");
  assert.equal(getInstance(ws, "english")!.state, "active");
  ws = setMemberProgress(ws, "ielts", 100, NOW);
  assert.equal(getInstance(ws, "english")!.state, "completed");
  assert.equal(getInstance(ws, "english")!.progress, 100);
});

test("تقدّم المفردة يقود حالتها، والحالة اليدوية تبقى", () => {
  let ws = addModule(buildInitialWorkspace("third", NOW), "qudurat", NOW);
  ws = setProgress(ws, "qudurat", 40, NOW);
  assert.equal(getInstance(ws, "qudurat")!.state, "active");
  ws = setState(ws, "qudurat", "paused", NOW);
  ws = setProgress(ws, "qudurat", 90, NOW);
  assert.equal(getInstance(ws, "qudurat")!.state, "paused");
  ws = setProgress(ws, "english", 50, NOW); // المجموعة لا يقودها setProgress
  assert.equal(getInstance(ws, "english"), undefined);
});

test("الأولوية والترتيب والإخفاء", () => {
  let ws = addModule(buildInitialWorkspace("third", NOW), "qudurat", NOW);
  ws = addModule(ws, "tahsili", NOW);
  assert.deepEqual(orderedModules(ws).map((m) => m.id), ["school", "qudurat", "tahsili"]);
  ws = setPriority(ws, "tahsili", true, NOW);
  assert.equal(orderedModules(ws)[0].id, "tahsili");
  ws = setPriority(ws, "tahsili", false, NOW);
  ws = reorderModules(ws, ["tahsili", "qudurat", "school"], NOW);
  assert.deepEqual(orderedModules(ws).map((m) => m.id), ["tahsili", "qudurat", "school"]);
  ws = hideModule(ws, "qudurat", true, NOW);
  assert.ok(!visibleModules(ws).some((m) => m.id === "qudurat"));
});

test("syncCoreModules: ثانوي→جامعي يحذف المدرسة ويضيف الجامعة ويُبقي الاختيارية", () => {
  let ws = addMember(addModule(buildInitialWorkspace("third", NOW), "qudurat", NOW), "step", NOW);
  ws = syncCoreModules(ws, "university", NOW);
  assert.ok(!hasModule(ws, "school"));
  assert.ok(hasModule(ws, "university"));
  assert.ok(hasModule(ws, "qudurat") && hasModule(ws, "english"));
});
