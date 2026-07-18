/* اختبار «يفتح لك» — الحكم من شروط الفرص. تشغيل: npx tsx --test src/lib/onboarding/outlook.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { admissionOutlook } from "./outlook";

const find = (items: ReturnType<typeof admissionOutlook>, id: string) => items.find((i) => i.id === id)!;

test("البرامج بوابات صارمة: ITC(٧٢) وCPC(٩٠) — دون الشرط = أحمر لا أصفر", () => {
  /* قدرات ٧١ لـ ITC = أحمر */
  assert.equal(find(admissionOutlook({ targets: ["itc"], qudurat: 71 }), "itc").icon, "🔴");
  assert.equal(find(admissionOutlook({ targets: ["itc"], qudurat: 72 }), "itc").icon, "🟢");
  /* قدرات ٨٩ لـ CPC = أحمر */
  assert.equal(find(admissionOutlook({ targets: ["aramco"], qudurat: 89 }), "cpc").icon, "🔴");
  assert.equal(find(admissionOutlook({ targets: ["aramco"], qudurat: 93 }), "cpc").icon, "🟢");
});

test("نفس الدرجة تفتح ITC وتغلق CPC (الحكم من شرط كلٍّ لا من التقدير)", () => {
  const items = admissionOutlook({ targets: ["itc", "aramco"], qudurat: 88 });
  assert.equal(find(items, "itc").icon, "🟢"); // ٨٨ ≥ ٧٢
  assert.equal(find(items, "cpc").icon, "🔴"); // ٨٨ < ٩٠
});

test("الجامعة (soft): مستوفٍ/قريب/بعيد", () => {
  assert.equal(find(admissionOutlook({ targets: ["university"], qudurat: 75 }), "university").icon, "🟢");
  assert.equal(find(admissionOutlook({ targets: ["university"], qudurat: 68 }), "university").icon, "🟡"); // فارق ٢
  assert.equal(find(admissionOutlook({ targets: ["university"], qudurat: 60 }), "university").icon, "🔴"); // فارق ١٠
});

test("ميل التخصص يضيف فرصة التخصص (هندسة قدرات ٨٥)", () => {
  const items = admissionOutlook({ targets: ["university"], trackType: "هندسي", qudurat: 86 });
  assert.ok(find(items, "university"));
  assert.equal(find(items, "major-eng").icon, "🟢"); // ٨٦ ≥ ٨٥
  const near = admissionOutlook({ targets: ["university"], trackType: "هندسي", qudurat: 83 });
  assert.equal(find(near, "major-eng").icon, "🟡"); // فارق ٢
});

test("الصحة تعتمد التحصيلي؛ الابتعاث يعتمد STEP", () => {
  assert.equal(find(admissionOutlook({ targets: ["university"], trackType: "صحي", tahsili: 92 }), "major-health").icon, "🟢");
  /* لا تحصيلي → التخصص الصحي ⚪ */
  assert.equal(find(admissionOutlook({ targets: ["university"], trackType: "صحي", qudurat: 95 }), "major-health").icon, "⚪");
  assert.equal(find(admissionOutlook({ targets: ["scholarship"], step: 82 }), "scholarship").icon, "🟢");
});

test("السبب واضح على كل بطاقة", () => {
  assert.ok(find(admissionOutlook({ targets: ["itc"], qudurat: 80 }), "itc").note.includes("استوفيت"));
  assert.ok(find(admissionOutlook({ targets: ["aramco"], qudurat: 70 }), "cpc").note.includes("تحتاج رفع"));
});

test("بلا درجات → كل الفرص ⚪ · بلا وجهات → لا فرص", () => {
  const items = admissionOutlook({ targets: ["university", "itc"] });
  assert.ok(items.every((i) => i.icon === "⚪"));
  assert.deepEqual(admissionOutlook({ targets: [] }), []);
});
