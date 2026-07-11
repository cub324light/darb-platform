/* اختبار اصطلاح الأرقام — يقفل التناسق (عربية-هندية · ٪ · ﷼) فلا يعود يختلط.
   تشغيل: npx tsx --test src/lib/format.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { n, pct, frac, sar, days } from "./format";

const isArabicIndic = (s: string) => /[٠-٩]/.test(s) && !/[0-9]/.test(s);

test("n: أرقامٌ عربية-هندية لا لاتينية", () => {
  assert.ok(isArabicIndic(n(1234)), `توقّعنا عربية-هندية: ${n(1234)}`);
});

test("pct: بالرمز العربي ٪ لا %", () => {
  const s = pct(92);
  assert.ok(s.includes("٪") && !s.includes("%"), s);
  assert.ok(isArabicIndic(s.replace("٪", "")));
});

test("frac: صيغة أ/مجموع بأرقامٍ عربية", () => {
  assert.ok(frac(5, 7).includes("/"));
  assert.ok(isArabicIndic(frac(5, 7).replace("/", "")));
});

test("sar: بالرمز العربي للريال ﷼", () => {
  assert.ok(sar(1500).includes("﷼"));
});

test("days: صيغةٌ عربية سليمة للعدد", () => {
  assert.equal(days(1), "يوم واحد");
  assert.equal(days(2), "يومان");
  assert.match(days(5), /أيام/);
  assert.match(days(12), /يوماً/);
});
