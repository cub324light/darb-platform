/* ═══ محرّكُ السلسلة — مصدرٌ واحدٌ لا خمسة ═══
   تشغيل: TZ=UTC npx tsx --test src/lib/streak.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { streakOn, studyDays, longestStreakOf, prevDay } from "./streak";
import { computeStats } from "./roadmap/stats";

/* ─────────── القاعدة ─────────── */

test("prevDay: يعبر حدَّ الشهر والسنة بلا منطقةٍ زمنية", () => {
  assert.equal(prevDay("2026-08-14"), "2026-08-13");
  assert.equal(prevDay("2026-08-01"), "2026-07-31");
  assert.equal(prevDay("2026-01-01"), "2025-12-31");
  assert.equal(prevDay("2028-03-01"), "2028-02-29", "سنةٌ كبيسة");
});

test("السلسلةُ متسامحة: يومُ اليوم لم ينتهِ فلا يكسرها", () => {
  const src = { sessionDays: ["2026-08-11", "2026-08-12", "2026-08-13"] };
  assert.equal(streakOn(src, "2026-08-13"), 3, "ذاكر اليوم ⇒ يُعدّ اليوم");
  assert.equal(streakOn(src, "2026-08-14"), 3, "لم يذاكر بعدُ ⇒ العدُّ من أمس، لا صفر");
  assert.equal(streakOn(src, "2026-08-15"), 0, "فات يومٌ كامل ⇒ انكسرت");
});

test("الفجوةُ تكسر السلسلة عند أوّل يومٍ غائب", () => {
  const src = { sessionDays: ["2026-08-09", "2026-08-11", "2026-08-12"] };
  assert.equal(streakOn(src, "2026-08-12"), 2, "١١ و١٢ فقط — العاشرُ غائب");
});

test("لا أيامَ ⇒ صفر (لا تخمين)", () => {
  assert.equal(streakOn({}, "2026-08-14"), 0);
  assert.equal(streakOn({ sessionDays: [], dayMins: {} }, "2026-08-14"), 0);
});

/* ─────────── المُدخَل الواحد ─────────── */

test("المُدخَلُ اتّحادُ المصدرين — واستعادةُ السلسلة تُحتسب في كلّ الشاشات", () => {
  /* `recordSession` تكتب الاثنين معاً؛ و`addSessionDay` (استعادةُ سلسلةٍ مكسورة)
     تكتب `sessionDays` وحدَها — فبالاتّحادِ لا تسقط الاستعادةُ من نصف الشاشات. */
  const restored = { dayMins: { "2026-08-12": 40, "2026-08-14": 30 }, sessionDays: ["2026-08-13"] };
  assert.deepEqual([...studyDays(restored)].sort(), ["2026-08-12", "2026-08-13", "2026-08-14"]);
  assert.equal(streakOn(restored, "2026-08-14"), 3, "اليومُ المُستعاد يصل السلسلة");
});

test("يومٌ بصفر دقائق ليس يومَ مذاكرة", () => {
  assert.equal(streakOn({ dayMins: { "2026-08-14": 0, "2026-08-13": 20 } }, "2026-08-14"), 1);
});

/* ─────────── أطولُ سلسلة ─────────── */

test("longestStreakOf: أطولُ تتابعٍ في التاريخ كلِّه", () => {
  const src = { dayMins: { "2026-01-01": 10, "2026-01-02": 10, "2026-01-03": 10, "2026-02-01": 10, "2026-02-02": 10 } };
  assert.equal(longestStreakOf(src), 3);
  assert.equal(longestStreakOf({}), 0);
  assert.equal(longestStreakOf({ sessionDays: ["2026-05-05"] }), 1);
});

/* ─────────── الاتّفاق: الرئيسيةُ ومساري رقمٌ واحد ─────────── */

test("«الرئيسية» و«مساري» لا يفترقان في السلسلة", () => {
  /* كان `computeStats` يبدأ العدَّ من اليوم صرامةً بينما تبدأ الرئيسيةُ من أمس
     تسامحاً — فيرى الطالبُ رقمين للسلسلة نفسِها في اللحظة نفسِها. */
  const stats = { dayMins: { "2026-08-12": 45, "2026-08-13": 60 }, sessionDays: ["2026-08-12", "2026-08-13"] };
  const home = streakOn(stats, "2026-08-14");          // ما تعرضه الرئيسية
  const masari = computeStats({
    dayMins: stats.dayMins, sessionDays: stats.sessionDays, sessions: [], today: "2026-08-14",
  }).week.streakDays;                                   // ما تعرضه «مساري»
  assert.equal(home, 2);
  assert.equal(masari, home, "رقمٌ واحدٌ في الشاشتين");
});

/* ─────────── حارسُ المصدر: لا اشتقاقَ سادس ─────────── */

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if ((p.endsWith(".ts") || p.endsWith(".tsx")) && !p.includes(".test.")) out.push(p);
  }
  return out;
}
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

test("لا يمشي أحدٌ على الأيام إلا محرّكُ السلسلة", () => {
  /* مشيُ الأيام إلى الوراء (`while (…has(` أو `setDate(d.getDate() - 1)` داخل حلقة)
     هو **تعريفُ** السلسلة. مَن كتبه بنفسه أنشأ اشتقاقاً سادساً. */
  const offenders: string[] = [];
  for (const f of walk("src")) {
    if (f.endsWith("src/lib/streak.ts")) continue;
    const code = stripComments(readFileSync(f, "utf8"));
    /* المشيُ يكون على **أيام**: الملفُّ يذكر مصدرَ الأيام، وفيه حلقةٌ تتقدّم يوماً يوماً. */
    const touchesDays = /\b(sessionDays|dayMins|localDayKey|addDays)\b/.test(code);
    if (!touchesDays) continue;
    if (/while\s*\([^)]*\.has\(/.test(code)) offenders.push(`${f}: while (…has(…)) — مشيٌ على الأيام`);
    if (/for\s*\(\s*let\s+\w+\s*=\s*0\s*;\s*;\s*\w+\+\+\s*\)/.test(code)) offenders.push(`${f}: حلقةٌ مفتوحةٌ على الأيام`);
    if (/while[\s\S]{0,120}?setDate\(\s*\w+\.getDate\(\)\s*-\s*1\s*\)/.test(code)) offenders.push(`${f}: تراجعٌ يوماً بيوم`);
  }
  assert.deepEqual(offenders, [], `اشتقاقٌ جديدٌ للسلسلة خارج المحرّك:\n${offenders.join("\n")}`);
});

test("كلُّ من يعرض سلسلةً يمرّ بالمحرّك", () => {
  const readers = [
    "src/lib/storage.ts",        // computeStreak — الرئيسيةُ ودويربُ وسندُ والاقتصاد
    "src/lib/roadmap/stats.ts",  // «مساري» وإحصاءاته
    "src/lib/roadmap/nowRead.ts",// رسالةُ دويرب اليومية
    "src/lib/insights.ts",       // أطولُ سلسلةٍ تاريخية
    "src/lib/retention.ts",      // كسرُ السلسلة واستعادتُها
  ];
  for (const f of readers) {
    const code = readFileSync(f, "utf8");
    assert.ok(/from "\.\/streak"|from "\.\.\/streak"/.test(code), `${f} لا يستورد محرّكَ السلسلة`);
  }
  /* والشاراتُ تمرّ به عبر `computeStreak` لا بنسخةٍ بمفتاحِ UTC. */
  const xp = stripComments(readFileSync("src/lib/xp.ts", "utf8"));
  assert.ok(/computeStreak\(/.test(xp), "xp لا يستعمل المصدرَ الواحد");
  assert.ok(!/toISOString\(\)\.slice\(0,\s*10\)/.test(xp), "xp عاد إلى مفتاح UTC");
});
