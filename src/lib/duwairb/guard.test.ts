/* اختبار حارس ردّ دويرب — يقفل عطلاً رآه الطالب مرّتين.
   تشغيل: npx tsx --test src/lib/duwairb/guard.test.ts

   القصّة: «عطني جدول دراسي جاهز لليوم» — زرٌّ جاهزٌ في درب نفسها — كان يُقابَل
   بجملة الرفض «أنا دويرب المختص بإعداد الجداول… فقط». عدّلنا التعليمات فخفّ
   ولم ينتهِ، لأن التعليمات رجاءٌ للنموذج لا ضمان. فصار الفحصُ على الردّ. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isRefusalText, isPlanningRequest, isWrongRefusal, fallbackAsk, RETRY_DIRECTIVE } from "./guard";

const REFUSAL =
  "أنا دويرب المختص بإعداد الجداول والخطط الدراسية فقط. أخبرني بالاختبار أو المادة والمدة المتاحة وسأبني لك خطة مناسبة.";

test("isRefusalText: يتعرّف على جملة الرفض", () => {
  assert.ok(isRefusalText(REFUSAL));
  assert.ok(isRefusalText("أنا دويرب مختصٌّ بإعداد الجداول والخطط الدراسية فقط."));
});

test("isRefusalText: لا يظنّ جدولاً طويلاً رفضاً", () => {
  /* لو ذكر دويرب العبارة عرَضاً داخل خطةٍ مطوّلة فليست رفضاً */
  const plan = "خطتك لليوم:\n" + "8-9 رياضيات\n".repeat(40) + " أنا دويرب المختص بإعداد الجداول";
  assert.ok(!isRefusalText(plan), "الردُّ الطويل ليس رفضاً");
});

test("isPlanningRequest: عبارات أزرار درب نفسها تُعدّ تخطيطاً", () => {
  for (const p of [
    "عطني جدول دراسي جاهز لليوم",
    "مشغول الصباح (6-12)",
    "جدول بدون مدرسة",
    "رتّب لي يومي",
    "أبي خطة للتحصيلي",
    "ما أعرف من وين أبدأ",
    "كم ساعة أذاكر قدرات؟",
  ]) {
    assert.ok(isPlanningRequest(p), `لم يُعدَّ تخطيطاً: «${p}»`);
  }
});

test("isPlanningRequest: ما هو خارج النطاق فعلاً لا يُعدّ تخطيطاً", () => {
  for (const p of ["كيف الطقس اليوم؟", "اكتب لي قصيدة", "من فاز بالمباراة؟"]) {
    assert.ok(!isPlanningRequest(p), `عُدَّ تخطيطاً وهو خارجه: «${p}»`);
  }
});

test("isWrongRefusal: الرفضُ في وجه طلب جدول خطأٌ يقيناً", () => {
  assert.ok(isWrongRefusal("عطني جدول دراسي جاهز لليوم", REFUSAL));
  assert.ok(isWrongRefusal("رتّب لي يومي", REFUSAL));
});

test("isWrongRefusal: الرفضُ في وجه سؤالٍ خارج النطاق صحيحٌ فيُمرَّر", () => {
  assert.ok(!isWrongRefusal("كيف الطقس اليوم؟", REFUSAL), "هذا رفضٌ في محلّه");
});

test("isWrongRefusal: الردُّ النافع يمرّ كما هو", () => {
  assert.ok(!isWrongRefusal("عطني جدول", "خطتك لليوم: 8-9 كمي، 9-10 لفظي…"));
});

test("fallbackAsk: يسأل عمّا ينقص فقط، ولا يعتذر ولا يرفض", () => {
  const bare = fallbackAsk("عطني جدول");
  assert.match(bare, /اختبار|مادة/, "لم يسأل عن الاختبار");
  assert.match(bare, /ساعة/, "لم يسأل عن الوقت");
  assert.ok(!isRefusalText(bare), "البديلُ نفسُه رفض!");

  const withExam = fallbackAsk("عطني جدول لقدرات");
  assert.doesNotMatch(withExam, /لأي اختبارٍ/, "سأل عن اختبارٍ ذكره الطالب");

  const full = fallbackAsk("عطني جدول لقدرات، عندي 3 ساعات باليوم");
  assert.match(full, /تاريخ اختبارك|المدّة المتبقّية/, "كل شيءٍ معلوم — يطلب الموعد");
});

test("RETRY_DIRECTIVE: ينهى صراحةً عن جملة الرفض", () => {
  assert.match(RETRY_DIRECTIVE, /يُمنع منعاً باتاً/);
  assert.match(RETRY_DIRECTIVE, /المختص بإعداد الجداول/, "لا يذكر الجملة الممنوعة نفسها");
  assert.match(RETRY_DIRECTIVE, /سؤالاً واحداً قصيراً/);
});

test("الحارس مُوصَّلٌ فعلاً في مسار المحادثة", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync("src/app/api/chat/route.ts", "utf8");
  assert.ok(src.includes("isWrongRefusal("), "الحارس معرَّفٌ ولا يُستدعى — لا قيمة له");
  assert.ok(src.includes("RETRY_DIRECTIVE"), "لا محاولةَ ثانية");
  assert.ok(src.includes("fallbackAsk("), "لا بديلَ حين يُصرّ النموذج");
});
