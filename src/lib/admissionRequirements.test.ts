/* اختبار شروط الفرص + الحكم — تشغيل: npx tsx --test src/lib/admissionRequirements.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ADMISSION_REQUIREMENTS, requirementById, evaluate, NEAR_MARGIN } from "./admissionRequirements";

test("مصدر واحد: كل فرصةٍ لها معرّف فريد وشرطٌ واحد على الأقل", () => {
  const ids = ADMISSION_REQUIREMENTS.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, "لا تكرار في المعرّفات");
  assert.ok(ADMISSION_REQUIREMENTS.every((r) => Object.keys(r.reqs).length > 0));
  assert.equal(requirementById("itc")!.reqs.qudurat, 72);
  assert.equal(requirementById("cpc")!.reqs.qudurat, 90);
});

test("بوابة hard: مستوفٍ 🟢 أو غير مستوفٍ 🔴 — لا أصفر مهما قرب", () => {
  const itc = requirementById("itc")!;
  assert.equal(evaluate(itc, { qudurat: 72 }).icon, "🟢");
  /* قدرات 71 لـ ITC(72) = أحمر (لا أصفر) رغم فارق درجة واحدة */
  assert.equal(evaluate(itc, { qudurat: 71 }).icon, "🔴");
  const cpc = requirementById("cpc")!;
  /* قدرات 89 لـ CPC(90) = أحمر (لا أصفر) */
  const r = evaluate(cpc, { qudurat: 89 });
  assert.equal(r.icon, "🔴");
  assert.ok(r.reason.includes("٩٠") && r.reason.includes("القدرات"));
});

test("بوابة soft: 🟢 مستوفٍ · 🟡 قريب (≤٣) · 🔴 بعيد", () => {
  const eng = requirementById("major-eng")!; // قدرات 85
  assert.equal(evaluate(eng, { qudurat: 86 }).icon, "🟢"); // متجاوز
  assert.equal(evaluate(eng, { qudurat: 85 }).icon, "🟢"); // مساوٍ
  assert.equal(evaluate(eng, { qudurat: 83 }).icon, "🟡"); // فارق ٢
  assert.equal(evaluate(eng, { qudurat: 85 - NEAR_MARGIN }).icon, "🟡"); // على حدّ القرب
  assert.equal(evaluate(eng, { qudurat: 80 }).icon, "🔴"); // فارق ٥ = بعيد
});

test("الحكم من شرط الفرصة لا من التقدير العام (S عالٍ لكن CPC أحمر)", () => {
  const cpc = requirementById("cpc")!; // 90
  /* درجةٌ ممتازة عموماً (٨٨) لكنها دون ٩٠ ⇒ CPC أحمر */
  assert.equal(evaluate(cpc, { qudurat: 88 }).icon, "🔴");
  const itc = requirementById("itc")!; // 72
  assert.equal(evaluate(itc, { qudurat: 88 }).icon, "🟢"); // نفس الدرجة تفتح ITC
});

test("الأسباب واضحة لكل حالة", () => {
  const itc = requirementById("itc")!;
  assert.ok(evaluate(itc, { qudurat: 80 }).reason.includes("استوفيت") && evaluate(itc, { qudurat: 80 }).reason.includes("٧٢+"));
  const eng = requirementById("major-eng")!;
  assert.ok(evaluate(eng, { qudurat: 83 }).reason.includes("ينقصك") && evaluate(eng, { qudurat: 83 }).reason.includes("درجتان"));
  assert.equal(evaluate(eng, { qudurat: 84 }).reason.includes("درجة واحدة"), true);
  const cpc = requirementById("cpc")!;
  assert.ok(evaluate(cpc, { qudurat: 70 }).reason.includes("تحتاج رفع") && evaluate(cpc, { qudurat: 70 }).reason.includes("٩٠+"));
});

test("متعدّد الشروط: الأسوأ يقود اللون؛ نقص درجةٍ = ⚪", () => {
  const kfupm = requirementById("kfupm")!; // qudurat 85, step 50
  assert.equal(evaluate(kfupm, { qudurat: 90, step: 60 }).icon, "🟢");
  assert.equal(evaluate(kfupm, { qudurat: 90, step: 40 }).icon, "🔴"); // hard: STEP دون ٥٠
  /* لا درجة لأي اختبارٍ محكوم → ⚪ */
  const u = evaluate(kfupm, {});
  assert.equal(u.icon, "⚪");
  assert.ok(u.needs?.includes("qudurat"));
});

test("scholarship: يعتمد على STEP (لغة)", () => {
  const sch = requirementById("scholarship")!; // step 80
  assert.equal(evaluate(sch, { step: 82 }).icon, "🟢");
  assert.equal(evaluate(sch, { step: 78 }).icon, "🟡"); // soft، فارق ٢
  assert.equal(evaluate(sch, { qudurat: 99 }).icon, "⚪"); // لا درجة STEP
});
