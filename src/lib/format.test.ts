/* اختبار اصطلاح الأرقام — يقفل التناسق (عربية-هندية · ٪ · ﷼) فلا يعود يختلط.
   تشغيل: npx tsx --test src/lib/format.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { n, pct, frac, sar, days, time, timeRange, dur } from "./format";

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

/* ═══ الوقت — العطل الذي كان: الساعة العشرية تُطبع كما هي («5.5 م» بدل «٥:٣٠ م») ═══ */

test("time: الساعة العشرية تصير دقائق لا كسراً", () => {
  assert.equal(time(17.5), "٥:٣٠ م");
  assert.equal(time(20.5), "٨:٣٠ م");
  assert.equal(time(9.25), "٩:١٥ ص");
});

test("time: الساعات الصحيحة بلا دقائق", () => {
  assert.equal(time(8), "٨ ص");
  assert.equal(time(16), "٤ م");
});

test("time: حدود اليوم (٠ · ١٢ · ٢٤)", () => {
  assert.equal(time(0), "١٢ ص");
  assert.equal(time(12), "١٢ م");
  assert.equal(time(24), "١٢ ص");
});

test("time: أرقامٌ عربية-هندية لا لاتينية", () => {
  for (const h of [0, 7.5, 13, 17.25, 23.75]) {
    assert.ok(isArabicIndic(time(h).replace(/[صم\s:]/g, "")), `${h} ⇒ ${time(h)}`);
  }
});

test("timeRange: يُحذف المؤشّر المكرّر داخل الفترة الواحدة", () => {
  assert.equal(timeRange(16, 17.5), "٤ – ٥:٣٠ م");
  assert.equal(timeRange(11, 13), "١١ ص – ١ م", "فترةٌ تعبر الظهر تحتفظ بالمؤشّرين");
});

test("dur: مدّةٌ بجملةٍ عربية طبيعية", () => {
  assert.equal(dur(0), "٠ دقيقة");
  assert.equal(dur(1), "دقيقة");
  assert.equal(dur(25), "٢٥ دقيقة");
  assert.equal(dur(5), "٥ دقائق");
  assert.equal(dur(60), "ساعة");
  assert.equal(dur(90), "ساعة و٣٠ دقيقة");
  assert.equal(dur(120), "ساعتين");
  assert.equal(dur(195), "٣ ساعات و١٥ دقيقة");
});
