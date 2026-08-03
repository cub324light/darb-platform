/* اختبارُ ترحيب درب.
   تشغيل: npx tsx --test src/lib/greeting.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { helloFor, tipFor, TIPS, duwairbGreeting } from "./greeting";

const say = (h: number, r: number) => { const x = helloFor(h, r); return `${x.before}أحمد${x.after}`; };
/* كلُّ ما يمكن أن يقوله في ساعةٍ ما */
const allAt = (h: number) => Array.from({ length: 40 }, (_, i) => say(h, i / 40));

test("الصباح فيه تحيّةُ صباح، والمساء تحيّةُ مساء", () => {
  assert.ok(allAt(7).some((s) => s.includes("صباح")), "لا تحيّةَ صباحٍ في الصباح");
  assert.ok(allAt(19).some((s) => s.includes("مساء")), "لا تحيّةَ مساءٍ في المساء");
  assert.ok(!allAt(7).some((s) => s.includes("مساء")), "تحيّةُ مساءٍ في الصباح");
  assert.ok(!allAt(19).some((s) => s.includes("صباح")), "تحيّةُ صباحٍ في المساء");
});

test("«السلام عليكم» نفسُها تتبدّل — لا صيغةٌ واحدةٌ ثابتة", () => {
  const salams = new Set(allAt(14).filter((s) => s.includes("السلام عليكم")));
  assert.ok(salams.size >= 3, `صيغةٌ واحدةٌ للسلام لا تكفي (${salams.size})`);
  assert.ok([...salams].some((s) => s.includes("ورحمة الله")), "لا «ورحمة الله»");
});

test("وفيها ترحيبٌ غيرُ السلام: هلا والله · منوّر · حيّاك", () => {
  const all = allAt(14).join(" | ");
  for (const w of ["هلا والله", "منوّر", "حيّاك"]) {
    assert.ok(all.includes(w), `ناقصٌ: ${w}`);
  }
});

test("التنوّع حقيقيّ: عشرُ صيغٍ فأكثر في كل وقت", () => {
  for (const h of [7, 14, 19, 23]) {
    assert.ok(new Set(allAt(h)).size >= 10, `الساعة ${h}: التنوّعُ قليل`);
  }
});

test("الاسم في وسط التحيّة دائماً، ولا يلتصق بما قبله", () => {
  for (let h = 0; h < 24; h += 3) {
    for (let k = 0; k < 20; k++) {
      const { before, after } = helloFor(h, k / 20);
      assert.ok(before.length > 0, `تحيّةٌ فارغة عند ${h}`);
      assert.ok(!before.includes("أحمد") && !after.includes("أحمد"), "الاسمُ يُركَّب لا يُكتب");
      assert.ok(/[،\sـ]$/.test(before), `لا فاصلَ قبل الاسم: «${before}»`);
    }
  }
});

test("العشوائيُّ الشاذّ لا يكسر شيئاً", () => {
  for (const r of [0, 0.999999, 1, 1.5, -0.3, NaN, Infinity]) {
    assert.ok(helloFor(9, r).before.length > 0, `انكسر عند r=${r}`);
    assert.ok(tipFor(r).length > 0, `النصيحة انكسرت عند r=${r}`);
  }
  for (const h of [-1, 24, 99, -13]) assert.ok(helloFor(h, 0.5).before.length > 0, `انكسر عند h=${h}`);
});

test("النصائح: لا تكرارَ ولا فراغ، وفيها العمليُّ والتحفيزيّ", () => {
  assert.equal(new Set(TIPS).size, TIPS.length, "نصيحةٌ مكرّرة");
  assert.ok(TIPS.length >= 20, "القائمةُ قصيرةٌ فتتكرّر على الطالب");
  assert.ok(TIPS.every((t) => t.trim().length > 10), "نصيحةٌ أقصرُ من أن تفيد");
  assert.ok(TIPS.some((t) => t.startsWith("💡")), "لا نصيحةَ عملية");
  assert.ok(TIPS.some((t) => !t.startsWith("💡")), "لا كلمةَ تحفيز");
});

test("النصيحة تدور على كل القائمة ولا تعلق", () => {
  const seen = new Set(Array.from({ length: 400 }, (_, i) => tipFor(i / 400)));
  assert.equal(seen.size, TIPS.length, "بعضُ النصائح لا تظهر أبداً");
});

test("ترحيبُ دويرب: بالاسم وبلا اسمٍ سواء", () => {
  for (let k = 0; k < 30; k++) {
    const withName = duwairbGreeting("خالد", 14, k / 30);
    assert.ok(withName.includes("خالد"), "سقط الاسم");
    const bare = duwairbGreeting(undefined, 14, k / 30);
    assert.ok(bare.length > 0 && !/[،ـ]$/.test(bare), `تحيّةٌ معلّقة: «${bare}»`);
    assert.ok(!/\s(يا|بـ)$/.test(bare), `أداةُ نداءٍ بلا منادى: «${bare}»`);
  }
});

test("المحرّك نقيّ: لا تخزين ولا نافذة ولا وقتٍ ولا عشوائيّ داخليّ", async () => {
  const { readFileSync } = await import("node:fs");
  const code = readFileSync("src/lib/greeting.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  for (const bad of ["localStorage", "window.", "new Date(", "Date.now(", "Math.random("]) {
    assert.ok(!code.includes(bad), `المحرّك يلمس ${bad} — يأتيه من الخارج`);
  }
});
