/* اختبارات الإشراف الخادمي (C1/H1/H3) —
   تشغيل: npx tsx --test src/lib/server/moderation.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isBlocked, buildReportFields, cooldownOk } from "./moderation";

/* ── H1: الحظر ── */
test("isBlocked: blocked=true يحظر، والغياب لا يحظر", () => {
  assert.equal(isBlocked({ blocked: true }, 1000), true);
  assert.equal(isBlocked({ blocked: false }, 1000), false);
  assert.equal(isBlocked({}, 1000), false);
  assert.equal(isBlocked(undefined, 1000), false);
  assert.equal(isBlocked(null, 1000), false);
});

test("isBlocked: الإيقاف المؤقت ينتهي بعد blockUntil", () => {
  // موقوف حتى 2000
  assert.equal(isBlocked({ blocked: true, blockUntil: 2000 }, 1500), true, "قبل الانتهاء → محظور");
  assert.equal(isBlocked({ blocked: true, blockUntil: 2000 }, 2500), false, "بعد الانتهاء → غير محظور");
  // إيقاف دائم (blockUntil=null) يبقى
  assert.equal(isBlocked({ blocked: true, blockUntil: null }, 9_999_999), true);
});

/* ── C1: بناء البلاغ من الرسالة الحقيقية ── */
test("buildReportFields يشتق المُبلَّغ عنه/الاسم/المحتوى من الرسالة لا من العميل", () => {
  const r = buildReportFields({
    groupId: "g1", messageId: "m1",
    msg: { uid: "victim_real", name: "اسم الكاتب الحقيقي", content: "النص الحقيقي" },
    reporterUid: "attacker", reason: "harassment", note: "ملاحظة",
  });
  assert.equal(r.reportedUid, "victim_real", "يأتي من الرسالة لا من المهاجم");
  assert.equal(r.reportedName, "اسم الكاتب الحقيقي");
  assert.equal(r.content, "النص الحقيقي");
  assert.equal(r.reporterUid, "attacker");
  assert.equal(r.status, "pending");
});

test("buildReportFields لا يتأثر بحقول مزوّرة (المهاجم لا يتحكم إلا بالسبب/الملاحظة)", () => {
  // حتى لو حاول المهاجم تمرير reportedUid، الدالة لا تقرؤه — تأخذ من msg فقط
  const r = buildReportFields({
    groupId: "g", messageId: "m",
    msg: { uid: "real_author", name: "كاتب", content: "محتوى أصلي" },
    reporterUid: "me", reason: "spam",
  });
  assert.equal(r.reportedUid, "real_author");
  assert.equal(r.content, "محتوى أصلي");
  assert.equal(r.note, "");
});

test("buildReportFields يقصّ المحتوى ويضبط سبباً افتراضياً للسبب المجهول", () => {
  const long = "ا".repeat(5000);
  const r = buildReportFields({ groupId: "g", messageId: "m", msg: { uid: "u", name: "n", content: long }, reporterUid: "r", reason: "غريب" });
  assert.equal(r.content.length, 1000, "المحتوى مقصوص لـ1000");
  assert.equal(r.reason, "other", "سبب غير معروف ← other");
});

test("buildReportFields يتحمّل رسالة بحقول ناقصة", () => {
  const r = buildReportFields({ groupId: "g", messageId: "m", msg: {}, reporterUid: "r", reason: "spam" });
  assert.equal(r.reportedUid, "");
  assert.equal(r.content, "");
});

/* ── H3: نموذج مهلة النشر (يطابق قاعدة Firestore) ── */
test("cooldownOk: يمنع النشر قبل انقضاء النافذة", () => {
  const W = 4000;
  assert.equal(cooldownOk(null, 10_000, W), true, "أول رسالة مسموحة");
  assert.equal(cooldownOk(10_000, 12_000, W), false, "بعد ثانيتين فقط → ممنوع");
  assert.equal(cooldownOk(10_000, 14_000, W), true, "بعد 4 ثوانٍ → مسموح");
  // محاولة التحايل: عميل يضع lastPostAt قديماً — لكن القاعدة تُلزم lastPostAt==request.time
  // فلا يمكنه «تقديم» القيمة؛ هذا النموذج يثبت أن النافذة تُحسب من آخر نشر حقيقي.
  assert.equal(cooldownOk(13_900, 14_000, W), false, "آخر نشر حقيقي قبل 0.1ث → ممنوع");
});
