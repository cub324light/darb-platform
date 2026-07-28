/* اختبار اصطلاح الأرقام — يقفل التناسق (0-9 الغُبارية · ٪ · ﷼) فلا يعود يختلط.
   تشغيل: npx tsx --test src/lib/format.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { n, pct, frac, sar, days, time, timeRange, dur } from "./format";

/* الاصطلاح: أرقام 0-9 وحدها — لا يجوز أن يتسرّب شكلٌ عربيٌّ-هنديّ إلى أي مخرَج. */
const isLatinDigits = (s: string) => /[0-9]/.test(s) && !/[٠-٩]/.test(s);

test("n: أرقام 0-9 لا عربية-هندية", () => {
  assert.ok(isLatinDigits(n(1234)), `توقّعنا 0-9: ${n(1234)}`);
});

test("pct: بالرمز العربي ٪ لا %", () => {
  const s = pct(92);
  assert.ok(s.includes("٪") && !s.includes("%"), s);
  assert.ok(isLatinDigits(s.replace("٪", "")));
});

test("frac: صيغة أ/مجموع بأرقامٍ عربية", () => {
  assert.ok(frac(5, 7).includes("/"));
  assert.ok(isLatinDigits(frac(5, 7).replace("/", "")));
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

/* ═══ الوقت — العطل الذي كان: الساعة العشرية تُطبع كما هي («5.5 م» بدل «5:30 م») ═══ */

test("time: الساعة العشرية تصير دقائق لا كسراً", () => {
  assert.equal(time(17.5), "5:30 م");
  assert.equal(time(20.5), "8:30 م");
  assert.equal(time(9.25), "9:15 ص");
});

test("time: الساعات الصحيحة بلا دقائق", () => {
  assert.equal(time(8), "8 ص");
  assert.equal(time(16), "4 م");
});

test("time: حدود اليوم (0 · 12 · 24)", () => {
  assert.equal(time(0), "12 ص");
  assert.equal(time(12), "12 م");
  assert.equal(time(24), "12 ص");
});

test("time: أرقام 0-9 في كل الساعات", () => {
  for (const h of [0, 7.5, 13, 17.25, 23.75]) {
    assert.ok(isLatinDigits(time(h).replace(/[صم\s:]/g, "")), `${h} ⇒ ${time(h)}`);
  }
});

test("timeRange: يُحذف المؤشّر المكرّر داخل الفترة الواحدة", () => {
  assert.equal(timeRange(16, 17.5), "4 – 5:30 م");
  assert.equal(timeRange(11, 13), "11 ص – 1 م", "فترةٌ تعبر الظهر تحتفظ بالمؤشّرين");
});

test("dur: مدّةٌ بجملةٍ عربية طبيعية", () => {
  assert.equal(dur(0), "0 دقيقة");
  assert.equal(dur(1), "دقيقة");
  assert.equal(dur(25), "25 دقيقة");
  assert.equal(dur(5), "5 دقائق");
  assert.equal(dur(60), "ساعة");
  assert.equal(dur(90), "ساعة و30 دقيقة");
  assert.equal(dur(120), "ساعتين");
  assert.equal(dur(195), "3 ساعات و15 دقيقة");
});
