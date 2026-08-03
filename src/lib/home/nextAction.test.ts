import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { nextAction, topTask, type NextActionInput } from "./nextAction";

const base = (o: Partial<NextActionInput> = {}): NextActionInput => ({
  tasks: [], subjects: [], weakestSubject: null, doneMins: 0, goalMins: 180, ...o,
});

describe("جوابُ «ماذا سأفعل اليوم؟»", () => {
  test("لا خطّةَ ولا مهامّ ⇒ لا نخترع مادّةً، نرسله ليبني خطّته", () => {
    const a = nextAction(base());
    assert.equal(a.kind, "setup");
    assert.equal(a.subject, null);
    assert.equal(a.href, "/roadmap");
  });

  test("مهمّةٌ اليوم ⇒ يبدأ بمادّتها، والعنوانُ يسمّيها", () => {
    const a = nextAction(base({
      tasks: [{ title: "حل تمارين التناسب", subject: "كمي", priority: "high" }],
      subjects: [{ name: "كمي" }, { name: "لفظي" }],
    }));
    assert.equal(a.kind, "task");
    assert.equal(a.subject, "كمي");
    assert.equal(a.title, "ابدأ بـكمي");
    assert.ok(a.why.includes("التناسب"));
    assert.equal(a.href, "/orbit?subject=%D9%83%D9%85%D9%8A");
  });

  test("الأولويةُ تسبق الترتيب: العاجلُ يتقدّم وإن جاء أخيراً", () => {
    const tasks = [
      { title: "مراجعة", subject: "لفظي", priority: "low" },
      { title: "واجب عاجل", subject: "فيزياء", priority: "high" },
    ];
    assert.equal(topTask(tasks)?.subject, "فيزياء");
    assert.equal(nextAction(base({ tasks, subjects: [{ name: "لفظي" }] })).subject, "فيزياء");
  });

  test("مهمّةٌ بلا مادّة ⇒ يسقط إلى الأضعف لا إلى الفراغ", () => {
    const a = nextAction(base({
      tasks: [{ title: "مذاكرة عامة", priority: "medium" }],
      subjects: [{ name: "كمي" }],
      weakestSubject: "لفظي",
    }));
    assert.equal(a.subject, "لفظي");
  });

  test("لا مهامّ وله خطّة ⇒ يبدأ بأضعف موادّه ويُقال له لماذا", () => {
    const a = nextAction(base({ subjects: [{ name: "كمي" }, { name: "لفظي" }], weakestSubject: "لفظي" }));
    assert.equal(a.kind, "weakest");
    assert.equal(a.subject, "لفظي");
    assert.ok(a.why.includes("أقلُّ موادّك"));
  });

  test("بلغ هدفَه ولا مهامّ ⇒ اعترافٌ لا دفعٌ جديد", () => {
    const a = nextAction(base({ subjects: [{ name: "كمي" }], doneMins: 200, goalMins: 180 }));
    assert.equal(a.kind, "done");
    assert.equal(a.href, "/vault");
  });

  test("بلغ هدفَه ولكن عليه مهمّة ⇒ المهمّةُ أولى — لا نُخفيها بالتهنئة", () => {
    const a = nextAction(base({
      tasks: [{ title: "واجب غداً", subject: "كيمياء", priority: "high" }],
      subjects: [{ name: "كيمياء" }], doneMins: 200, goalMins: 180,
    }));
    assert.equal(a.kind, "task");
    assert.equal(a.subject, "كيمياء");
  });

  test("بلا هدفٍ محدَّد لا يُعتبر بالغاً هدفَه", () => {
    assert.equal(nextAction(base({ subjects: [{ name: "كمي" }], doneMins: 0, goalMins: 0 })).kind, "weakest");
  });

  test("كلُّ جوابٍ له عنوانٌ وسببٌ ووجهة — لا حالةَ صامتة", () => {
    const cases: NextActionInput[] = [
      base(),
      base({ tasks: [{ title: "ت", subject: "كمي", priority: "high" }] }),
      base({ subjects: [{ name: "كمي" }] }),
      base({ subjects: [{ name: "كمي" }], doneMins: 999, goalMins: 60 }),
    ];
    for (const c of cases) {
      const a = nextAction(c);
      assert.ok(a.title.length > 0 && a.why.length > 0 && a.cta.length > 0 && a.href.startsWith("/"));
    }
  });
});
