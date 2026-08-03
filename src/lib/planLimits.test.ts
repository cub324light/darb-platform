import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PLAN_LIMITS, limitsFor, limitLabel } from "./planLimits";
import { VAULT_FREE_LIMIT } from "./plan";

describe("حدودُ الباقات", () => {
  test("المجّانيُّ أضيقُ من المدفوع في الذكاء — وإلا فالمدفوعُ لا يشتري شيئاً", () => {
    assert.ok(PLAN_LIMITS.free.chatPerDay < PLAN_LIMITS.shaheen.chatPerDay);
    assert.ok(PLAN_LIMITS.free.analyzePerDay < PLAN_LIMITS.shaheen.analyzePerDay);
  });

  test("لا باقةَ تنقص عن التي تحتها", () => {
    const order = [PLAN_LIMITS.free, PLAN_LIMITS.shaheen, PLAN_LIMITS.anqa];
    for (let i = 1; i < order.length; i++) {
      assert.ok(order[i].chatPerDay >= order[i - 1].chatPerDay, `الدردشة تنقص عند ${i}`);
      assert.ok(order[i].analyzePerDay >= order[i - 1].analyzePerDay, `التحليل ينقص عند ${i}`);
      assert.ok(order[i].vaultPerSubject >= order[i - 1].vaultPerSubject, `الخزنة تنقص عند ${i}`);
    }
  });

  test("حدُّ الخزنة المجّانيّ هو نفسُه المفروضُ في «أخطائي» — مصدرٌ واحد", () => {
    assert.equal(PLAN_LIMITS.free.vaultPerSubject, VAULT_FREE_LIMIT);
  });

  test("المدفوعُ بلا سقفِ خزنة", () => {
    assert.equal(PLAN_LIMITS.shaheen.vaultPerSubject, Infinity);
    assert.equal(PLAN_LIMITS.anqa.vaultPerSubject, Infinity);
  });

  test("باقةٌ مجهولةٌ تسقط إلى المجّانيّ — لا تُفتح السعةُ بخطأ إملائيّ", () => {
    assert.deepEqual(limitsFor("mystery" as never), PLAN_LIMITS.free);
  });

  test("كلُّ حدٍّ موجبٌ ومحدود إلا الخزنةَ المدفوعة", () => {
    for (const [id, l] of Object.entries(PLAN_LIMITS)) {
      assert.ok(Number.isFinite(l.chatPerDay) && l.chatPerDay > 0, `${id}: الدردشة`);
      assert.ok(Number.isFinite(l.analyzePerDay) && l.analyzePerDay > 0, `${id}: التحليل`);
    }
  });

  test("نصُّ الحدّ: رقمٌ صريح، و«غير محدودة» للسقف الغائب", () => {
    assert.equal(limitLabel(25, "لكل مادة"), "25 لكل مادة");
    assert.equal(limitLabel(Infinity, "لكل مادة"), "غير محدودة");
  });
});
