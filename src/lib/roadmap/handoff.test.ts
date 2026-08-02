import { test } from "node:test";
import assert from "node:assert/strict";
import { focusHandoffQuery, readFocusHandoff, remainingTaskMins, isTaskHandoff,
  handoffSourceLabel, EMPTY_HANDOFF } from "./handoff";

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

/* ═══ تسليمُ «خطتي» — العطل الذي كان ═══
   كان زرّا «ادخل التركيز» و«ابدأ الآن» في خطتي يفتحان `/orbit` عارياً بلا
   وسطاء: الطالب يجدول «رياضيات ٥–٦:٣٠»، فيضغط ابدأ، فيفتح المؤقّت على مادةٍ
   افتراضية ومدّةٍ افتراضية — ويعيد اختيار ما جدوله بنفسه. فبدت الصفحة غيرَ
   موصولةٍ بشيء. والعقدُ كان موجوداً أصلاً ومكتوبٌ في رأسه أنه لـ«ابدأ الآن»
   في جلسة اليوم، لكنّ خطتي لم تكن موصولةً به. */
test("focusHandoffQuery: المصدر «خطتي» يُمرَّر ولا يُنسب لمساري", () => {
  const q = new URLSearchParams(focusHandoffQuery({ from: "plan", subject: "كمي", taskMins: 90 }));
  assert.equal(q.get("from"), "plan", "لا تُنسب جلسةُ الخطة إلى مساري");
  assert.equal(q.get("auto"), "1");
  assert.equal(q.get("task"), "90");
});

test("readFocusHandoff يقرأ تسليمَ الخطة كاملاً", () => {
  const h = readFocusHandoff(focusHandoffQuery({
    from: "plan", subject: "رياضيات", taskMins: 90, taskLabel: "رياضيات",
  }));
  assert.equal(h.from, "plan");
  assert.equal(h.subject, "رياضيات");
  assert.equal(h.taskMins, 90);
  assert.ok(h.auto, "جلسةُ الخطة تبدأ تلقائياً");
});

test("isTaskHandoff: يشمل مساري وخطتي، ويستبعد ما لا وزنَ زمنيَّ له", () => {
  const plan = readFocusHandoff(focusHandoffQuery({ from: "plan", taskMins: 45 }));
  const masari = readFocusHandoff(focusHandoffQuery({ taskMins: 25 }));
  const noWeight = readFocusHandoff(focusHandoffQuery({ from: "plan", subject: "لفظي" }));
  assert.ok(isTaskHandoff(plan), "خيطُ المهمّة يظهر لجلسة الخطة");
  assert.ok(isTaskHandoff(masari), "ولا ينكسر لمساري");
  assert.ok(!isTaskHandoff(noWeight), "مهمّةٌ بلا دقائق لا تخترع رقماً");
  assert.ok(!isTaskHandoff(EMPTY_HANDOFF));
});

test("handoffSourceLabel: لكل مصدرٍ اسمُه أمام الطالب", () => {
  const plan = readFocusHandoff(focusHandoffQuery({ from: "plan", taskMins: 30 }));
  const masari = readFocusHandoff(focusHandoffQuery({ taskMins: 30 }));
  assert.equal(handoffSourceLabel(plan), "من جدولك");
  assert.equal(handoffSourceLabel(masari), "من مهمّتك");
});

test("المستدعون القدامى لم يتغيّروا: الافتراضُ يبقى مساري", () => {
  assert.equal(new URLSearchParams(focusHandoffQuery({ subject: "لفظي" })).get("from"), "masari");
});
