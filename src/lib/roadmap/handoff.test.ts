import { test } from "node:test";
import assert from "node:assert/strict";
import { focusHandoffQuery, readFocusHandoff, remainingTaskMins, EMPTY_HANDOFF } from "./handoff";

test("focusHandoffQuery يبني الوسطاء الأساسية دائماً", () => {
  const q = new URLSearchParams(focusHandoffQuery({}));
  assert.equal(q.get("from"), "masari");
  assert.equal(q.get("auto"), "1");
  assert.equal(q.get("subject"), null);
  assert.equal(q.get("task"), null);
});

test("focusHandoffQuery يمرّر المادة والمهمّة ويرمّز العربية", () => {
  const s = focusHandoffQuery({ subject: "لفظي", taskMins: 15, taskLabel: "مراجعة لفظي" });
  const q = new URLSearchParams(s);
  assert.equal(q.get("subject"), "لفظي");
  assert.equal(q.get("task"), "15");
  assert.equal(q.get("tlabel"), "مراجعة لفظي");
  assert.ok(!s.includes(" "), "لا مسافاتٍ خامٍ في العنوان");
});

test("مهمّةٌ بلا وزنٍ زمنيّ (أسئلة) لا تُمرَّر كدقائق", () => {
  const q = new URLSearchParams(focusHandoffQuery({ taskMins: 0, taskLabel: "تدريب كمي" }));
  assert.equal(q.get("task"), null);
  assert.equal(q.get("tlabel"), "تدريب كمي");
});

test("readFocusHandoff يعيد الفارغ حين لا تسليم", () => {
  assert.deepEqual(readFocusHandoff(""), EMPTY_HANDOFF);
  assert.deepEqual(readFocusHandoff("?x=1"), EMPTY_HANDOFF);
});

test("readFocusHandoff يقرأ ما بناه focusHandoffQuery (ذهاباً وإياباً)", () => {
  const h = readFocusHandoff("?" + focusHandoffQuery({ subject: "كمي", taskMins: 30, taskLabel: "مراجعة كمي" }));
  assert.deepEqual(h, { from: "masari", subject: "كمي", auto: true, taskMins: 30, taskLabel: "مراجعة كمي" });
});

test("readFocusHandoff يتجاهل قيم task غير الصالحة", () => {
  assert.equal(readFocusHandoff("?from=masari&task=abc").taskMins, 0);
  assert.equal(readFocusHandoff("?from=masari&task=-5").taskMins, 0);
  assert.equal(readFocusHandoff("?from=masari&task=12.6").taskMins, 13);
});

test("remainingTaskMins: الباقي لا يصير سالباً", () => {
  assert.equal(remainingTaskMins(180, 25), 155);
  assert.equal(remainingTaskMins(25, 25), 0);
  assert.equal(remainingTaskMins(20, 50), 0);
  assert.equal(remainingTaskMins(0, 50), 0);
});
