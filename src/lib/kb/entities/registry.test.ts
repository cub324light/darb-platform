/* اختبارات بنية نموذج العالم — تشغيل: npx tsx --test src/lib/kb/entities/registry.test.ts
   نتحقق أن البنية سليمة قبل ضخّ المحتوى: معرّفات فريدة، لا حواف معلّقة، اجتياز
   ثنائي الاتجاه، تغطية الأنواع الـ١٨، نسخنة لكل عقدة، والأهداف تربط ما يقرؤه العقل. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { KB } from "./index";
import type { EntityKind } from "./schema";

/* ════════ السلامة ════════ */
test("لا أخطاء بنيوية (معرّفات فريدة/مطابقة للنوع، لا حواف معلّقة، لا حافّة لنفسه)", () => {
  assert.deepEqual(KB.validate(), []);
});

test("تغطية الأنواع الـ١٨ كلها ممثّلة في البذرة", () => {
  const kinds: EntityKind[] = [
    "university", "college", "major", "subject", "course", "lesson", "book", "resource",
    "job", "career_path", "company", "skill", "tool", "ai_tool", "project", "certification", "exam", "goal",
  ];
  for (const k of kinds) assert.ok(KB.all(k).length > 0, `النوع بلا عقدة: ${k}`);
});

test("كل معرّف بصيغة kind:slug ثابتة", () => {
  for (const e of KB.all()) assert.match(e.id, /^[a-z_]+:[a-z0-9-]+$/, `معرّف غير قياسي: ${e.id}`);
});

test("كل عقدة لها اسمٌ وملخّصٌ ونسخنة (meta مضمونة)", () => {
  for (const e of KB.all()) {
    assert.ok(e.name.trim() !== "" && e.summary.trim() !== "", `${e.id}: ناقص`);
    const m = KB.meta(e.id);
    assert.ok(m.version >= 1 && m.lastUpdated, `${e.id}: نسخنة ناقصة`);
  }
});

/* ════════ الأداة ≠ المهارة (تفريق المالك) ════════ */
test("ETAP أداة (tool) لا مهارة، وتحليل القوى مهارة (skill)", () => {
  assert.equal(KB.get("tool:etap")?.kind, "tool");
  assert.equal(KB.get("skill:power-systems-analysis")?.kind, "skill");
});

/* ════════ الاجتياز ثنائي الاتجاه ════════ */
test("الوظيفة تصل لأدواتها/شهاداتها (خارج) ولشركاتها/تخصّصها (داخل)", () => {
  const names = KB.edges("job:power-systems-engineer").map((e) => e.entity.name);
  assert.ok(names.includes("ETAP"), "لا أداة ETAP (uses)");
  assert.ok(names.includes("FE — أساسيات الهندسة"), "لا شهادة FE (requires)");
  assert.ok(names.includes("أرامكو السعودية"), "لا شركة (works_at)");
  assert.ok(names.includes("الهندسة الكهربائية"), "لا تخصّص يقود إليها (leads_to عكسي)");
  assert.ok(names.includes("مهندس تحكّم"), "لا خطوة تالية (next_step)");
});

test("المادة محورٌ: تربط التخصص والمهارة والأداة والمقرّر والمتطلّب السابق", () => {
  const names = KB.edges("subject:power-systems").map((e) => e.entity.name);
  assert.ok(names.includes("الهندسة الكهربائية"));        // belongs_to
  assert.ok(names.includes("تحليل أنظمة القوى"));          // teaches
  assert.ok(names.includes("ETAP"));                        // uses
  assert.ok(names.includes("الدوائر الكهربائية"));          // prerequisite
  assert.ok(names.includes("مقرّر أنظمة القوى (EE301)"));   // belongs_to عكسي (المقرّر)
});

test("سلسلة الجامعة → الكلية → التخصّص (part_of قابل للاجتياز عكسياً)", () => {
  const colleges = KB.neighbors("university:ksu", { type: "part_of", dir: "in", kind: "college" });
  assert.equal(colleges[0]?.id, "college:ksu-engineering");
  const majors = KB.neighbors("college:ksu-engineering", { type: "part_of", dir: "in", kind: "major" });
  assert.equal(majors[0]?.id, "major:electrical-engineering");
});

test("الشركة ترى وظائفها عبر works_at العكسي", () => {
  const jobs = KB.neighbors("company:aramco", { type: "works_at", dir: "in", kind: "job" });
  assert.ok(jobs.some((j) => j.id === "job:power-systems-engineer"));
});

/* ════════ الأهداف — ما يقرؤه Life Engine ════════ */
test("الهدف يربط عقدته الهدف ومتطلّباته (STEP 85 يتطلّب اختبار STEP)", () => {
  const goal = KB.get("goal:step-85");
  assert.equal(goal?.kind, "goal");
  const facts = KB.describe("goal:step-85");
  assert.match(facts, /STEP 85/);                         // المعيار
  assert.match(facts, /يتطلّب/);                           // العلاقة
  const enter = KB.neighbors("goal:enter-ee", { type: "leads_to", dir: "out", kind: "major" });
  assert.equal(enter[0]?.id, "major:electrical-engineering");
});

/* ════════ قراءة الرسم كنصّ (View) ════════ */
test("describe(الوظيفة) يُنتج حقائق: المهام/الراتب/الأداة/الشركة/الخطوة التالية", () => {
  const facts = KB.describe("job:power-systems-engineer");
  for (const re of [/المهام/, /الراتب/, /ETAP/, /أرامكو/, /مهندس تحكّم/]) assert.match(facts, re);
});

test("groundingFor يجد العقدة من اسم/بديل ويعيد حقائقها", () => {
  assert.match(KB.groundingFor("ارامكو"), /أرامكو السعودية/);
  assert.match(KB.groundingFor("CEFR"), /A1|C2/);
  assert.match(KB.groundingFor("ايلتس"), /IELTS/);
});
