/* اختبارُ ترحيب الرئيسية.
   تشغيل: npx tsx --test src/lib/greeting.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { helloFor, tipFor, TIPS, dayIndexOf } from "./greeting";

const say = (h: number, d: number) => `${helloFor(h, d).before}أحمد${helloFor(h, d).after}`;

test("الصباح يقول صباح الخير، والمساء مساء", () => {
  const morning = [0, 1, 2, 3].map((d) => say(7, d)).join(" | ");
  assert.ok(/صباح/.test(morning), "لا تحيّةَ صباحٍ في الصباح");
  const evening = [0, 1, 2, 3].map((d) => say(19, d)).join(" | ");
  assert.ok(/مساء/.test(evening), "لا تحيّةَ مساءٍ في المساء");
});

test("السلام عليكم موجودةٌ في كل وقت — تحيّةُ الطالب الأولى", () => {
  for (const h of [7, 14, 19, 23]) {
    const all = [0, 1, 2, 3, 4].map((d) => say(h, d)).join(" | ");
    assert.ok(all.includes("السلام عليكم"), `لا سلامَ في الساعة ${h}`);
  }
});

test("الاسم في وسط التحيّة دائماً — لا تحيّةَ بلا مُخاطَب", () => {
  for (let h = 0; h < 24; h++) {
    for (let d = 0; d < 6; d++) {
      const { before, after } = helloFor(h, d);
      assert.ok(before.length > 0, `تحيّةٌ فارغة عند ${h}:${d}`);
      assert.ok(!before.includes("أحمد") && !after.includes("أحمد"), "الاسمُ يُركَّب لا يُكتب");
      assert.ok(/[،\s]$/.test(before), "لا فاصلَ قبل الاسم فيلتصق به");
    }
  }
});

test("تحيّةُ اليوم ثابتة: النداءُ مرّتين في اليوم نفسِه يعطي النصّ نفسه", () => {
  assert.deepEqual(helloFor(9, 42), helloFor(9, 42));
  assert.equal(tipFor(42), tipFor(42));
});

test("التحيّة تتبدّل بين الأيام", () => {
  const seen = new Set([0, 1, 2, 3].map((d) => say(9, d)));
  assert.ok(seen.size > 1, "تحيّةٌ واحدةٌ لا تتبدّل — تصير أثاثاً لا يُقرأ");
});

test("الساعةُ الشاذّة لا تكسر شيئاً", () => {
  for (const h of [-1, 24, 25, 99, -13]) {
    assert.ok(helloFor(h, 3).before.length > 0, `انكسرت عند ${h}`);
  }
  assert.ok(tipFor(-5).length > 0, "رقمُ يومٍ سالب");
});

test("النصائح: لا تكرارَ ولا فراغ، وفيها العمليُّ والتحفيزيّ", () => {
  assert.equal(new Set(TIPS).size, TIPS.length, "نصيحةٌ مكرّرة");
  assert.ok(TIPS.every((t) => t.trim().length > 10), "نصيحةٌ أقصرُ من أن تفيد");
  assert.ok(TIPS.some((t) => t.startsWith("💡")), "لا نصيحةَ عملية");
  assert.ok(TIPS.some((t) => !t.startsWith("💡")), "لا كلمةَ تحفيز");
});

test("النصيحة تدور على كل القائمة ولا تعلق", () => {
  const seen = new Set(Array.from({ length: TIPS.length }, (_, d) => tipFor(d)));
  assert.equal(seen.size, TIPS.length, "بعضُ النصائح لا تظهر أبداً");
  assert.equal(tipFor(TIPS.length), tipFor(0), "الدورةُ تُغلق");
});

test("dayIndexOf يتقدّم يوماً بيوم", () => {
  assert.equal(dayIndexOf(2026, 7, 4) - dayIndexOf(2026, 7, 3), 1);
  assert.equal(dayIndexOf(2027, 0, 1) - dayIndexOf(2026, 11, 31), 1, "ورأسُ السنة يومٌ كغيره");
});

test("المحرّك نقيّ: لا تخزين ولا نافذة ولا وقتٍ حاضر", async () => {
  const { readFileSync } = await import("node:fs");
  const code = readFileSync("src/lib/greeting.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  for (const bad of ["localStorage", "window.", "new Date(", "Date.now("]) {
    assert.ok(!code.includes(bad), `المحرّك يلمس ${bad}`);
  }
});
