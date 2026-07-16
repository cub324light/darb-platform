/* اختبارات واصف المحتوى — تشغيل: npx tsx --test src/lib/modules/descriptor.test.ts
   القالب الواحد يقرأ الواصف؛ فأي وحدة/عضو بلا واصفٍ متّسق = عطلٌ في مساري.
   نحرس أيضاً استمرارية البيانات: أسماء مواد القياس يجب أن تطابق التخزين القائم. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MODULE_DEFS, MEMBER_DEFS } from "./registry";
import { moduleContent, memberContent, moduleView, memberView, opensDirectSpace } from "./descriptor";
import { isGroup } from "./registry";

test("كل وحدة عليا لها محتوًى متّسق مع شكلها", () => {
  for (const d of MODULE_DEFS) {
    const c = moduleContent(d.id);
    assert.ok(c.intro.trim() !== "", `وحدة بلا تعريف: ${d.id}`);
    if (c.kind === "study") {
      assert.ok(c.subjects && c.subjects.length > 0, `وحدة study بلا مواد: ${d.id}`);
      for (const s of c.subjects) assert.ok(s.name.trim() && /^#/.test(s.color), `مادة ناقصة في ${d.id}`);
    }
    if (c.kind === "hub" && !isGroup(d.id)) {
      assert.ok(c.hub && c.hub.length > 0, `hub مفرد بلا روابط: ${d.id}`);
      for (const l of c.hub) assert.ok(l.href.startsWith("/"), `رابط غير حقيقي في ${d.id}`);
    }
  }
});

test("كل عضوٍ له محتوًى study بمواد", () => {
  for (const m of MEMBER_DEFS) {
    const c = memberContent(m.id);
    assert.equal(c.kind, "study", `عضو غير study: ${m.id}`);
    assert.ok(c.subjects && c.subjects.length > 0, `عضو بلا مواد: ${m.id}`);
  }
});

test("استمرارية البيانات: مواد القياس تطابق التخزين القائم بالاسم", () => {
  assert.deepEqual(moduleContent("qudurat").subjects?.map((s) => s.name), ["لفظي", "كمي"]);
  assert.deepEqual(moduleContent("tahsili").subjects?.map((s) => s.name), ["أحياء", "فيزياء", "رياضيات", "كيمياء"]);
});

test("المجموعات تُعرض بأعضائها لا بفضاءٍ مباشر", () => {
  assert.equal(opensDirectSpace("english"), false);
  assert.equal(opensDirectSpace("programs"), false);
  assert.equal(opensDirectSpace("qudurat"), true);
  assert.equal(opensDirectSpace("school"), true);
});

test("moduleView/memberView يجمعان العرض (من registry) مع المحتوى", () => {
  const v = moduleView("tahsili");
  assert.equal(v.label, "التحصيلي");
  assert.ok(v.icon && /^#/.test(v.color));
  assert.equal(v.content.kind, "study");
  const mv = memberView("step");
  assert.equal(mv.label, "STEP");
  assert.equal(mv.content.examKey, "ستيب");
});
