import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildInitialWorkspace, syncCoreModules, addModule, removeModule, hideModule,
  reorderModules, setPriority, setProgress, setState, recordScore,
  getInstance, hasModule, visibleModules, orderedModules, optionalInstances,
} from "./workspace";

const NOW = 1_700_000_000_000;

test("مساري الابتدائي: Core المرحلة فقط، لا شيء اختياري", () => {
  const first = buildInitialWorkspace("first", NOW);
  assert.deepEqual(first.modules.map((m) => m.id), ["school"]);
  assert.equal(first.modules[0].state, "added");
  assert.equal(first.modules[0].progress, 0);

  assert.deepEqual(buildInitialWorkspace("university", NOW).modules.map((m) => m.id), ["university"]);
  assert.deepEqual(buildInitialWorkspace("graduate", NOW).modules, []); // الخريج بلا Core
});

test("addModule: الطريق الوحيد لإضافة اختيارية — يرفض Core والتكرار", () => {
  let ws = buildInitialWorkspace("third", NOW);
  ws = addModule(ws, "school", NOW);          // Core → مرفوض
  assert.equal(optionalInstances(ws).length, 0);
  ws = addModule(ws, "qudurat", NOW);
  assert.ok(hasModule(ws, "qudurat"));
  const before = ws.modules.length;
  ws = addModule(ws, "qudurat", NOW);         // تكرار → لا تغيير
  assert.equal(ws.modules.length, before);
});

test("removeModule/hideModule: Core محميّة — لا تُحذف ولا تُخفى", () => {
  let ws = buildInitialWorkspace("first", NOW);
  ws = removeModule(ws, "school", NOW);
  assert.ok(hasModule(ws, "school"), "المدرسة لا تُحذف");
  ws = hideModule(ws, "school", true, NOW);
  assert.equal(getInstance(ws, "school")!.hidden, false, "المدرسة لا تُخفى");

  ws = addModule(ws, "step", NOW);
  ws = hideModule(ws, "step", true, NOW);
  assert.equal(getInstance(ws, "step")!.hidden, true);
  assert.ok(!visibleModules(ws).some((m) => m.id === "step"));
  ws = removeModule(ws, "step", NOW);
  assert.ok(!hasModule(ws, "step"));
});

test("setProgress يقود الحالة، والحالة اليدوية (متوقف) تبقى", () => {
  let ws = addModule(buildInitialWorkspace("third", NOW), "qudurat", NOW);
  ws = setProgress(ws, "qudurat", 50, NOW);
  assert.equal(getInstance(ws, "qudurat")!.state, "active");
  ws = setProgress(ws, "qudurat", 100, NOW);
  assert.equal(getInstance(ws, "qudurat")!.state, "completed");

  ws = setState(ws, "qudurat", "paused", NOW);
  ws = setProgress(ws, "qudurat", 20, NOW);
  assert.equal(getInstance(ws, "qudurat")!.state, "paused", "الحالة اليدوية لا يدهسها التقدّم");
  assert.equal(getInstance(ws, "qudurat")!.progress, 20);
});

test("الأولوية والترتيب: setPriority يعلو، reorderModules يعيد الترقيم", () => {
  let ws = buildInitialWorkspace("third", NOW);
  ws = addModule(ws, "qudurat", NOW);
  ws = addModule(ws, "tahsili", NOW);
  assert.deepEqual(orderedModules(ws).map((m) => m.id), ["school", "qudurat", "tahsili"]);

  ws = setPriority(ws, "tahsili", true, NOW);
  assert.equal(orderedModules(ws)[0].id, "tahsili", "المثبّت كأولوية يعلو");

  ws = setPriority(ws, "tahsili", false, NOW);
  ws = reorderModules(ws, ["tahsili", "qudurat", "school"], NOW);
  assert.deepEqual(orderedModules(ws).map((m) => m.id), ["tahsili", "qudurat", "school"]);
});

test("recordScore يحفظ الدرجة ويحدّث آخر نشاط", () => {
  let ws = addModule(buildInitialWorkspace("third", NOW), "qudurat", NOW);
  ws = recordScore(ws, "qudurat", "85", NOW + 5);
  assert.equal(getInstance(ws, "qudurat")!.score, "85");
  assert.equal(getInstance(ws, "qudurat")!.lastActivityAt, NOW + 5);
});

test("syncCoreModules: الترقية ثانوي→جامعي تحذف المدرسة وتضيف الجامعة وتُبقي الاختيارية", () => {
  let ws = buildInitialWorkspace("third", NOW);
  ws = addModule(ws, "qudurat", NOW);           // اختيارية يجب أن تبقى
  ws = syncCoreModules(ws, "university", NOW);
  assert.ok(!hasModule(ws, "school"), "المدرسة تُزال عند مغادرة الثانوي");
  assert.ok(hasModule(ws, "university"), "الجامعة Core الجامعي تُضاف");
  assert.ok(hasModule(ws, "qudurat"), "الوحدات الاختيارية تبقى عبر الترقية");

  // ثانوي→خريج: تُزال المدرسة ولا Core جديد
  let g = buildInitialWorkspace("third", NOW);
  g = syncCoreModules(g, "graduate", NOW);
  assert.ok(!hasModule(g, "school"));
  assert.equal(g.modules.filter((m) => m.kind === "core").length, 0);
});
