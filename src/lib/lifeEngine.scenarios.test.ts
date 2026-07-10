/* اختبار انحدار المصفوفة — تشغيل: npx tsx --test src/lib/lifeEngine.scenarios.test.ts
   يشغّل العقل على كل الحالات: كلٌّ يعطي أولوية أولى كاملة ومُفسَّرة، والحالات
   القاطعة تطابق expectTop. أي انحراف = قرار غير منطقي نراجعه في العقل لا الصفحة. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { lifeEngine } from "./lifeEngine";
import { SCENARIOS } from "./lifeEngine.scenarios";

test("كل حالة تُنتج أولوية أولى كاملة ومُفسَّرة", () => {
  for (const s of SCENARIOS) {
    const ps = lifeEngine(s.ctx);
    assert.ok(ps.length > 0, `${s.id} (${s.name}): بلا أولويات`);
    const top = ps[0];
    assert.ok(top.firedRules.length > 0, `${s.id}: قرار بلا تفسير`);
    for (const f of [top.title, top.why, top.benefit, top.payoff] as string[]) {
      assert.ok(f.trim() !== "", `${s.id}: حقل قرار فارغ`);
    }
    assert.ok(top.href.startsWith("/"), `${s.id}: رابط غير حقيقي`);
  }
});

test("الحالات القاطعة تطابق الأولوية المتوقّعة (expectTop)", () => {
  const misses: string[] = [];
  for (const s of SCENARIOS) {
    if (!s.expectTop) continue;
    const top = lifeEngine(s.ctx)[0];
    if (top.key !== s.expectTop) misses.push(`${s.id} «${s.name}»: توقّع ${s.expectTop} فحصل ${top.key}`);
  }
  assert.deepEqual(misses, [], `انحرافات:\n${misses.join("\n")}`);
});

test("لا تختلط الأنواع: العاجل دائماً يتصدّر متى وُجد", () => {
  for (const s of SCENARIOS) {
    const ps = lifeEngine(s.ctx);
    const hasUrgent = ps.some((p) => p.tier === "urgent");
    if (hasUrgent) assert.equal(ps[0].tier, "urgent", `${s.id}: عاجلٌ لم يتصدّر`);
  }
});

test("تغطية: على الأقل ٣٠ حالة", () => {
  assert.ok(SCENARIOS.length >= 30, `الحالات قليلة: ${SCENARIOS.length}`);
});
