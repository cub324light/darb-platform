/* اختبار «يفتح لك» — الحكم من شروط الفرص. تشغيل: npx tsx --test src/lib/onboarding/outlook.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { admissionOutlook, orderOutlook, whatIfRaise, readiness } from "./outlook";

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

test("الترتيب بالأهمية: اللون أولاً (🟢→🟡→🔴) ثم الوزن (لا أبجدياً)", () => {
  /* قدرات ٨٦: الجامعة🟢 ITC🟢 الهندسة🟢 · CPC🔴 (٩٠). الترتيب: جامعة قبل ITC قبل هندسة، وCPC أخيراً */
  const items = admissionOutlook({ targets: ["university", "itc", "aramco"], trackType: "هندسي", qudurat: 86 });
  const ids = items.map((i) => i.id);
  assert.deepEqual(ids, ["university", "itc", "major-eng", "cpc"]);
  assert.equal(items[items.length - 1].id, "cpc"); // الأحمر أخيراً
});

test("orderOutlook: 🟢 قبل 🟡 قبل 🔴 مهما كان ترتيب الإدخال", () => {
  const raw = [
    { id: "cpc", label: "CPC", icon: "🔴" as const, note: "" },
    { id: "university", label: "الجامعات", icon: "🟢" as const, note: "" },
    { id: "major-cs", label: "الحاسب", icon: "🟡" as const, note: "" },
  ];
  assert.deepEqual(orderOutlook(raw).map((i) => i.icon), ["🟢", "🟡", "🔴"]);
});

test("ماذا لو رفعت درجتك؟ — قدرات ٨٨ → ٩٠ يفتح CPC (من الشروط لا أرقامٍ مخترعة)", () => {
  const w = whatIfRaise({ targets: ["university", "aramco"], qudurat: 88 }, "qudurat");
  assert.ok(w, "يوجد ما يُفتح");
  assert.equal(w!.target, 90);                       // أقرب عتبةٍ نافعة = CPC
  assert.ok(w!.unlocks.some((u) => u.id === "cpc"));
});

test("ماذا لو: بلا عتبةٍ أعلى → null · بلا درجة → null", () => {
  /* قدرات ٩٥ يتجاوز كل العتبات → لا شيء يُرفع إليه */
  assert.equal(whatIfRaise({ targets: ["university", "aramco", "itc"], qudurat: 95 }, "qudurat"), null);
  /* لا درجة قدرات مُدخلة */
  assert.equal(whatIfRaise({ targets: ["aramco"] }, "qudurat"), null);
});

test("الجاهزية: جاهز/تحسين بسيط/تركيز حسب فرص الطالب", () => {
  /* مستوفٍ فرصةً واحدة على الأقل → جاهز */
  assert.equal(readiness(admissionOutlook({ targets: ["university"], qudurat: 80 }))!.level, "ready");
  /* لا مستوفى لكن قريب (جامعة ٦٨ = فارق ٢) → تحسين بسيط */
  assert.equal(readiness(admissionOutlook({ targets: ["university"], qudurat: 68 }))!.level, "improve");
  /* بعيدٌ عن الكل (جامعة ٥٥) → تركيز */
  assert.equal(readiness(admissionOutlook({ targets: ["university"], qudurat: 55 }))!.level, "focus");
  /* بلا درجات → لا بطاقة جاهزية */
  assert.equal(readiness(admissionOutlook({ targets: ["university"] })), null);
});
