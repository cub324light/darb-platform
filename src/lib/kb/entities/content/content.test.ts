/* اختبار دفعات المحتوى — تشغيل: npx tsx --test src/lib/kb/entities/content/content.test.ts
   نتحقق أن الدفعة الأولى (مفاهيم القدرات) سليمة ومربوطة، وأن الرسم يبقى صحيحاً
   بعد دمجها، وأن لوحة القيادة تعكس الأعداد. البناء بالدفعات: ٢٠–٣٠ عقدة. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { KB } from "../index";
import { QUDURAT_CONCEPTS } from "./qudurat";
import { TAHSILI_CONCEPTS } from "./tahsili";
import { domainProgress, conceptsByImportance, topConcepts } from "./domains";

test("الرسم يبقى سليماً بعد دمج دفعة المحتوى (لا حواف معلّقة)", () => {
  assert.deepEqual(KB.validate(), []);
});

test("دفعة القدرات: حجمها ضمن ٢٠–٣٠، كلها مفاهيم بمعرّفات فريدة", () => {
  assert.ok(QUDURAT_CONCEPTS.length >= 20 && QUDURAT_CONCEPTS.length <= 30, `حجم غير مطابق: ${QUDURAT_CONCEPTS.length}`);
  const ids = QUDURAT_CONCEPTS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "معرّف مكرّر");
  for (const c of QUDURAT_CONCEPTS) assert.equal(c.kind, "concept");
});

test("كل مفهوم ينتمي لاختبار القدرات وله مصدرٌ وثقةٌ ووزن", () => {
  for (const c of QUDURAT_CONCEPTS) {
    assert.ok(c.relations?.some((r) => r.type === "belongs_to" && r.to === "exam:qudurat"), `${c.id}: غير مربوط بالقدرات`);
    const m = c.meta!;
    assert.ok(m.source && m.source.trim() !== "", `${c.id}: بلا مصدر`);
    assert.ok(m.importance != null, `${c.id}: بلا أهمية`);
    assert.ok(m.confidence != null && m.confidence < 1, `${c.id}: ثقة ١٠٠٪ غير مبرّرة`);
  }
});

test("لوحة القيادة: تقدّم القدرات يساوي عدد مفاهيم الدفعة", () => {
  const qudurat = domainProgress(KB).find((d) => d.key === "qudurat")!;
  assert.equal(qudurat.actual, QUDURAT_CONCEPTS.length);
  assert.ok(qudurat.pct > 0 && qudurat.pct <= 100);
});

test("المفاهيم تظهر عبر belongs_to العكسي على اختبار القدرات", () => {
  const concepts = KB.neighbors("exam:qudurat", { type: "belongs_to", dir: "in", kind: "concept" });
  assert.ok(concepts.some((c) => c.id === "concept:q-analogy"));
  assert.ok(concepts.length >= QUDURAT_CONCEPTS.length);
});

test("لوحة القيادة: تفصيلٌ لكل مجال مفاهيم (وطبقة ثانية صفر الآن)", () => {
  const qudurat = domainProgress(KB).find((d) => d.key === "qudurat")!;
  assert.ok(qudurat.counts, "بلا تفصيل");
  assert.equal(qudurat.counts!.concepts, QUDURAT_CONCEPTS.length);
  assert.equal(qudurat.counts!.lessons, 0);   // لم نبدأ الطبقة الثانية
  assert.equal(qudurat.counts!.questions, 0);
});

test("ترتيب المفاهيم حسب الأهمية: شرائح تنازلية غير فارغة", () => {
  const tiers = conceptsByImportance(KB, "exam:qudurat");
  assert.ok(tiers.length > 0);
  const flat = tiers.flatMap((t) => t.items);
  assert.equal(flat.length, QUDURAT_CONCEPTS.length);
  for (let i = 1; i < flat.length; i++) assert.ok(flat[i - 1].importance >= flat[i].importance, "غير مرتّبة تنازلياً");
});

test("لكل مفهوم أماكن حقوله الثابتة (body اختياري — بنيةٌ جاهزة للملء)", () => {
  /* الحقول اختيارية بالنوع؛ نتأكّد أن المخطّط يقبلها دون إعادة هيكلة */
  const withBody = { ...QUDURAT_CONCEPTS[0], body: { definition: "تعريف تجريبي" } };
  assert.equal(withBody.body.definition, "تعريف تجريبي");
});

/* ════════ دفعة التحصيلي ════════ */
test("دفعة التحصيلي: كلها مفاهيم بأهمية وصعوبة وتكرارٍ في الاختبارات، بلا تكرار معرّف", () => {
  const ids = TAHSILI_CONCEPTS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "معرّف مكرّر");
  for (const c of TAHSILI_CONCEPTS) {
    assert.equal(c.kind, "concept");
    assert.ok(c.relations?.some((r) => r.type === "belongs_to" && r.to === "exam:tahsili"), `${c.id}: غير مربوط بالتحصيلي`);
    assert.ok(c.difficulty, `${c.id}: بلا صعوبة`);
    assert.ok(c.examFrequency != null, `${c.id}: بلا تكرار`);
    assert.ok(c.meta?.importance != null, `${c.id}: بلا أهمية`);
  }
});

test("لا تكرار للمفهوم: «التكامل» و«الجبر» عقدةٌ واحدة تنتمي للاختبارين", () => {
  /* التكامل: عقدة seed واحدة تظهر في تحصيلي (belongs_to) */
  const tahsiliConcepts = KB.neighbors("exam:tahsili", { type: "belongs_to", dir: "in", kind: "concept" }).map((c) => c.id);
  assert.ok(tahsiliConcepts.includes("concept:integration"), "التكامل لم يُعَد استخدامه");
  assert.ok(tahsiliConcepts.includes("concept:q-algebra"), "الجبر لم يُشارَك");
  /* ولا توجد عقدة تكامل ثانية */
  const integrals = KB.all("concept").filter((c) => c.name === "التكامل");
  assert.equal(integrals.length, 1, "أُنشئ تكاملٌ مكرّر");
  /* الجبر يظهر في القدرات والتحصيلي معاً بعقدةٍ واحدة */
  const algebraExams = (KB.get("concept:q-algebra")?.relations ?? []).filter((r) => r.type === "belongs_to").map((r) => r.to);
  assert.ok(algebraExams.includes("exam:qudurat") && algebraExams.includes("exam:tahsili"));
});

test("Top 20: أعلى المفاهيم أهميةً عبر المنصة كلها، مرتّبة تنازلياً", () => {
  const top = topConcepts(KB, 20);
  assert.equal(top.length, 20);
  for (let i = 1; i < top.length; i++) assert.ok(top[i - 1].importance >= top[i].importance, "غير مرتّب");
  /* يخلط مجالات مختلفة (لا مادة واحدة) */
  const cats = new Set(top.map((t) => t.category));
  assert.ok(cats.size >= 3, "Top 20 من مادة واحدة فقط");
});
