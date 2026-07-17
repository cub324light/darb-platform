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

test("«ابدأ من هنا»: أدلّةٌ صالحة لوحدات القياس وأعضائها، ولا دليل لعوالم الروابط (hub)", () => {
  const g = moduleContent("qudurat").guide;
  assert.ok(g && g.length >= 10, "دليل القدرات ناقص");
  for (const s of g) {
    assert.ok(s.title.trim() !== "", "قسم دليل بلا عنوان");
    assert.ok(Array.isArray(s.blocks) && s.blocks.length > 0, `قسم «${s.title}» بلا محتوى`);
  }
  assert.ok(g.some((s) => s.title.includes("ما هو")), "قسم التعريف غائب");

  /* التحصيلي صار له دليلٌ يشمل قسم «التحصيلي المبكر» بالنصّ الرسمي المحدَّد. */
  const t = moduleContent("tahsili").guide;
  assert.ok(t && t.length > 0, "دليل التحصيلي غائب");
  const early = t.find((s) => s.title.includes("التحصيلي المبكر"));
  assert.ok(early, "قسم التحصيلي المبكر غائب");
  assert.ok(
    early!.blocks.some((b) => b.text?.includes("نفس اختبار التحصيلي العادي تماماً")),
    "نصّ التحصيلي المبكر الرسمي غير مطابق",
  );

  /* كل عضوٍ (لغة/برنامج) له دليلٌ ينتهي بقسم «كيف يساعدك درب؟» الثابت. */
  for (const m of MEMBER_DEFS) {
    const mg = memberContent(m.id).guide;
    assert.ok(mg && mg.length > 0, `دليل العضو غائب: ${m.id}`);
    assert.equal(mg[mg.length - 1].title, "كيف يساعدك درب؟", `ذيل «كيف يساعدك درب؟» غائب: ${m.id}`);
  }

  /* عوالم الروابط (المدرسة/الجامعة/مجموعات) بلا دليلٍ تعريفي. */
  assert.equal(moduleContent("school").guide, undefined, "hub لا يحمل دليلاً");
  assert.equal(moduleContent("university").guide, undefined, "hub لا يحمل دليلاً");
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
