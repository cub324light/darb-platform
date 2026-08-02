/* اختبار اصطلاح الأرقام — يقفل التناسق (0-9 الغُبارية · ٪ · ﷼) فلا يعود يختلط.
   تشغيل: npx tsx --test src/lib/format.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { n, pct, frac, sar, days, time, timeRange, dur,
  dateShort, dateLong, dateTiny, dateFull, dateHijri, dateHijriShort, weeks } from "./format";

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

test("weeks: صيغةٌ عربية سليمة — «7 أسابيع» لا «7 أسبوع»", () => {
  assert.equal(weeks(1), "أسبوع واحد");
  assert.equal(weeks(2), "أسبوعان");
  assert.equal(weeks(7), "7 أسابيع");
  assert.match(weeks(12), /أسبوعاً/);
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

/* ═══ التواريخ — العطل الذي كان: «ar-SA» في المتصفّح = أُمّ القرى بأرقامٍ هندية ═══
   الطالب كان يرى موعد اختباره «٢٦ محرم» في التقويم و«11 يوليو» في خطته — تاريخٌ
   واحد بتقويمين وشكلَي أرقام. */

test("dateShort/dateLong/dateTiny: ميلاديّ بأرقام 0-9", () => {
  assert.equal(dateShort("2026-07-11"), "11 يوليو");
  assert.equal(dateLong("2026-07-11"), "11 يوليو 2026");
  assert.ok(isLatinDigits(dateTiny("2026-07-11")), dateTiny("2026-07-11"));
});

test("dateFull: اليوم واسمه، والسنة اختيارية", () => {
  assert.match(dateFull("2026-07-11"), /السبت/);
  assert.match(dateFull("2026-07-11"), /2026/);
  assert.doesNotMatch(dateFull("2026-07-11", false), /2026/);
});

test("dateHijri: هجريٌّ صريح لكن بأرقام 0-9 لا هندية", () => {
  const s = dateHijri("2026-07-11");
  assert.ok(!/[٠-٩]/.test(s), `تسرّبت أرقامٌ هندية: ${s}`);
});

/* ═══ حارسُ المصدر — يمنع عودة العطل نفسه ═══
   `"ar-SA"` (ومعها `"ar-SA-u-nu-latn"`) تعني في المتصفّح تقويم أُمّ القرى، فتُظهر
   «26 محرم» حيث يقصد المنتج «11 يوليو». الاصطلاح: `ar-u-nu-latn` وحدها، ومَن أراد
   الهجريّ فليطلبه صراحةً بـ`dateHijri`. */
test("المصدر: لا «ar-SA» في أي صفحةٍ أو مكوّن", async () => {
  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir)) {
      const f = join(dir, e);
      if (statSync(f).isDirectory()) { walk(f); continue; }
      if (!/\.tsx?$/.test(f) || /\.test\.tsx?$/.test(f) || f.endsWith("lib/format.ts")) continue;
      /* المقصود: «ar-SA» بوصفها لغةَ **تنسيق** (تجرّ معها تقويم أُمّ القرى).
         أمّا كونها وسمَ لغةٍ في hreflang أو وصفاً في بياناتٍ مهيكلة فلا ضرر فيه
         ولا علاقة له بالتواريخ — فلا نوقع الحارس على بريء. */
      const src = readFileSync(f, "utf8");
      if (/(?:toLocale(?:Date|Time)?String|Intl\.[A-Za-z]+)\(\s*"ar-SA/.test(src)) offenders.push(f);
    }
  };
  walk("src");
  assert.deepEqual(offenders, [], `استعمِل ar-u-nu-latn أو dateHijri بدل ar-SA في:\n${offenders.join("\n")}`);
});

test("dateHijriShort: هجريٌّ مختصر بأرقام 0-9 وبلا اسم اليوم", () => {
  const s = dateHijriShort("2026-08-23");   // أول يوم دراسي 1448
  assert.ok(!/[٠-٩]/.test(s), `تسرّبت أرقامٌ هندية: ${s}`);
  assert.doesNotMatch(s, /الأحد|الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت/, `اسمُ اليوم زائد: ${s}`);
  assert.match(s, /\d/, `بلا رقم: ${s}`);
  assert.ok(dateHijriShort("2026-08-23", true).length > s.length, "الصيغةُ بالسنة أطول");
});
