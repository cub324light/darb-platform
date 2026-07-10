/* اختبارات بنية قاعدة المعرفة — تشغيل: npx tsx --test src/lib/kb/entities/registry.test.ts
   نتحقق أن البنية سليمة قبل ضخّ المحتوى: معرّفات فريدة، لا حواف معلّقة، اجتياز
   ثنائي الاتجاه، تغطية الأنواع التسعة، ومثال الوظيفة الكامل يُقرأ حقائقَ لدويرب. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { KB } from "./index";
import type { EntityKind } from "./schema";

/* ════════ السلامة ════════ */
test("لا أخطاء بنيوية (معرّفات فريدة/مطابقة للنوع، لا حواف معلّقة، لا حافّة لنفسه)", () => {
  assert.deepEqual(KB.validate(), []);
});

test("تغطية الأنواع التسعة كلها ممثّلة في البذرة", () => {
  const kinds: EntityKind[] = ["university", "college", "major", "job", "career_path", "company", "skill", "certification", "exam"];
  for (const k of kinds) assert.ok(KB.all(k).length > 0, `النوع بلا كيان: ${k}`);
});

test("كل كيان له اسمٌ وملخّصٌ غير فارغين", () => {
  for (const e of KB.all()) {
    assert.ok(e.name.trim() !== "", `${e.id}: بلا اسم`);
    assert.ok(e.summary.trim() !== "", `${e.id}: بلا ملخّص`);
  }
});

/* ════════ الاجتياز ثنائي الاتجاه ════════ */
test("الوظيفة تصل لمهاراتها وشهاداتها (خارج) ولشركاتها وتخصّصها (داخل)", () => {
  const id = "job:power-systems-engineer";
  const names = KB.edges(id).map((e) => e.entity.name);
  assert.ok(names.includes("ETAP"), "لا مهارة ETAP");
  assert.ok(names.includes("FE — أساسيات الهندسة"), "لا شهادة FE");
  assert.ok(names.includes("أرامكو السعودية"), "لا شركة توظّفه (اجتياز عكسي)");
  assert.ok(names.includes("الهندسة الكهربائية"), "لا تخصّص يقود إليه (اجتياز عكسي)");
});

test("neighbors مُصفّى: شركات توظّف التخصّص عبر الحافّة العكسية", () => {
  const companies = KB.neighbors("major:electrical-engineering", { type: "hires_from", dir: "in", kind: "company" });
  const names = companies.map((c) => c.name);
  assert.ok(names.includes("أرامكو السعودية") && names.includes("الشركة السعودية للكهرباء"));
});

test("الجامعة → الكلية → التخصّص (سلسلة part_of/offers قابلة للاجتياز)", () => {
  const colleges = KB.neighbors("university:ksu", { type: "offers", dir: "out", kind: "college" });
  assert.equal(colleges[0]?.id, "college:ksu-engineering");
  const majors = KB.neighbors("college:ksu-engineering", { type: "offers", dir: "out", kind: "major" });
  assert.equal(majors[0]?.id, "major:electrical-engineering");
});

/* ════════ قراءة دويرب ════════ */
test("describe(الوظيفة) يُنتج حقائق تشمل المهام والراتب والمهارات والشركات و«بعدها»", () => {
  const facts = KB.describe("job:power-systems-engineer");
  assert.match(facts, /المهام/);
  assert.match(facts, /الراتب/);
  assert.match(facts, /ETAP/);          // مهارة مطلوبة
  assert.match(facts, /أرامكو/);        // شركة توظّفه (عكسي)
  assert.match(facts, /مهندس تحكّم/);   // ماذا بعدها (leads_to)
});

test("groundingFor يجد الكيان من اسم/بديل ويعيد حقائقه", () => {
  assert.match(KB.groundingFor("ارامكو"), /أرامكو السعودية/);       // بديل بلا همزة
  assert.match(KB.groundingFor("كهرباء"), /الهندسة الكهربائية/);
  assert.match(KB.groundingFor("CEFR"), /A1|C2/);                    // مستويات الإطار
});

test("البحث يطابق البدائل والوسوم (لا الاسم فقط)", () => {
  assert.ok(KB.search("EE").some((e) => e.id === "major:electrical-engineering"));
  assert.ok(KB.search("ايلتس").some((e) => e.id === "exam:ielts"));
});

/* ════════ ثبات الهوية ════════ */
test("كل معرّف بصيغة kind:slug ثابتة", () => {
  for (const e of KB.all()) assert.match(e.id, /^[a-z_]+:[a-z0-9-]+$/, `معرّف غير قياسي: ${e.id}`);
});
