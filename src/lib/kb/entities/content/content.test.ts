/* اختبار دفعات المحتوى — تشغيل: npx tsx --test src/lib/kb/entities/content/content.test.ts
   نتحقق أن الدفعة الأولى (مفاهيم القدرات) سليمة ومربوطة، وأن الرسم يبقى صحيحاً
   بعد دمجها، وأن لوحة القيادة تعكس الأعداد. البناء بالدفعات: ٢٠–٣٠ عقدة. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { KB } from "../index";
import { QUDURAT_CONCEPTS } from "./qudurat";
import { domainProgress } from "./domains";

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
