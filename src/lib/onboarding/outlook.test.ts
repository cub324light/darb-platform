/* اختبار فرص القبول الاسترشادية — تشغيل: npx tsx --test src/lib/onboarding/outlook.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { admissionOutlook } from "./outlook";

const find = (items: ReturnType<typeof admissionOutlook>, id: string) =>
  items.find((i) => i.id === id)!;

test("الجامعة (normal): مرتفع→🟢 · جيد→🟡 · مقبول→🔴", () => {
  assert.equal(find(admissionOutlook({ targets: ["university"], qudurat: 87 }), "university").icon, "🟢");
  assert.equal(find(admissionOutlook({ targets: ["university"], qudurat: 78 }), "university").icon, "🟡");
  assert.equal(find(admissionOutlook({ targets: ["university"], qudurat: 66 }), "university").icon, "🔴");
});

test("CPC (strict) أصعب من ITC (lenient) لنفس الدرجة", () => {
  const cpc = find(admissionOutlook({ targets: ["aramco"], qudurat: 87 }), "aramco-cpc");
  const itc = find(admissionOutlook({ targets: ["itc"], qudurat: 87 }), "aramco-itc");
  assert.equal(cpc.icon, "🟡"); // مرتفع لا يكفي لـ🟢 في CPC
  assert.equal(itc.icon, "🟢"); // مرتفع أكثر من كافٍ لـ ITC
  /* CPC يحتاج ممتاز لـ🟢 */
  assert.equal(find(admissionOutlook({ targets: ["aramco"], qudurat: 93 }), "aramco-cpc").icon, "🟢");
});

test("الهدف يأخذ أدنى طبقةٍ بين اختباراته (هندسة = قدرات+تحصيلي)", () => {
  const items = admissionOutlook({ targets: ["university"], trackType: "هندسي", qudurat: 92, tahsili: 70 });
  /* الجامعة (قدرات ممتاز) 🟢، لكن الهندسة تُقيَّد بالتحصيلي المنخفض */
  assert.equal(find(items, "university").icon, "🟢");
  assert.equal(find(items, "major-eng").icon, "🔴"); // تحصيلي 70 = مقبول(fair) → 🔴 في normal
});

test("التخصص الصحي (strict) يحتاج تحصيلي ممتاز لـ🟢", () => {
  const hi = find(admissionOutlook({ targets: ["university"], trackType: "صحي", qudurat: 90, tahsili: 92 }), "major-health");
  assert.equal(hi.icon, "🟢");
  const mid = find(admissionOutlook({ targets: ["university"], trackType: "صحي", qudurat: 90, tahsili: 86 }), "major-health");
  assert.equal(mid.icon, "🟡"); // تحصيلي مرتفع(high) → strict yellow
});

test("الابتعاث يحتاج التحصيلي واللغة معاً؛ نقص أحدهما = ⚪", () => {
  const noLang = find(admissionOutlook({ targets: ["scholarship"], tahsili: 90 }), "scholarship");
  assert.equal(noLang.icon, "⚪");
  assert.ok(noLang.needs?.some((n) => n.includes("اللغة")));
  const full = find(admissionOutlook({ targets: ["scholarship"], tahsili: 92, step: 90 }), "scholarship");
  assert.equal(full.icon, "🟢");
});

test("بلا درجات إطلاقاً: كل الأهداف ⚪ مع أسماء الاختبارات الناقصة", () => {
  const items = admissionOutlook({ targets: ["university", "itc"] });
  assert.ok(items.every((i) => i.icon === "⚪"));
  assert.ok(find(items, "university").needs?.includes("القدرات"));
});

test("«ما أدري» (بلا وجهات) → لا أهداف", () => {
  assert.deepEqual(admissionOutlook({ targets: [] }), []);
});
