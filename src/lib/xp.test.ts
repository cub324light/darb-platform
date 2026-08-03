/* اختبارُ الشارات — يقفل ما طلبه المالك: أربعٌ وعشرون على ثلاث درجات، ولكلٍّ فضّة.
   تشغيل: npx tsx --test src/lib/xp.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BADGE_DEFS, TIER_META, badgesInTier, getBadgeCurrent, getUnlockedBadgeIds,
  pendingBadgeSilver, computeXP, getLevel, type BadgeTier,
} from "./xp";
import type { DarbStats } from "./storage";

const TIERS: BadgeTier[] = ["easy", "mid", "hard"];

const stats = (p: Partial<DarbStats> = {}): DarbStats => ({
  silver: 0, totalFocusMins: 0, sessionDays: [], sessionsCount: 0,
  todayFocusMins: 0, todayKey: "2026-08-03", dayMins: {}, ...p,
});

test("أربعٌ وعشرون شارة، ثمانٍ لكلّ درجة", () => {
  assert.equal(BADGE_DEFS.length, 24);
  for (const t of TIERS) assert.equal(badgesInTier(t).length, 8, `الدرجة ${t}`);
});

test("لا معرّفَ مكرّر ولا اسمٌ مكرّر", () => {
  assert.equal(new Set(BADGE_DEFS.map((b) => b.id)).size, 24, "معرّفٌ مكرّر يخلط الفتحَ والصرف");
  assert.equal(new Set(BADGE_DEFS.map((b) => b.label)).size, 24);
});

test("كلُّ شارةٍ تعطي فضّة، وكلُّها موصوفةٌ بهدفٍ ووحدة", () => {
  for (const b of BADGE_DEFS) {
    assert.ok(b.silver > 0, `${b.id} بلا فضة — شارةٌ لا تُصرف وعدٌ ناقص`);
    assert.ok(b.goal > 0, `${b.id} بلا هدف`);
    assert.ok(b.unit.trim().length > 0 && b.desc.trim().length > 0, `${b.id} بلا وصف`);
    assert.ok(TIER_META[b.tier], `${b.id} بدرجةٍ مجهولة`);
  }
});

test("الأصعبُ أغلى: أدنى فضّةِ درجةٍ فوق أعلى ما قبلها", () => {
  const lo = (t: BadgeTier) => Math.min(...badgesInTier(t).map((b) => b.silver));
  const hi = (t: BadgeTier) => Math.max(...badgesInTier(t).map((b) => b.silver));
  assert.ok(lo("mid") > hi("easy"), "المتوسّطةُ لا تُميَّز عن السهلة");
  assert.ok(lo("hard") > hi("mid"), "الصعبةُ لا تُميَّز عن المتوسّطة");
});

test("كلُّ شارةٍ لها مقياسٌ حقيقيّ — لا شارةَ عالقةٌ على الصفر أبداً", () => {
  /* طالبٌ بلغ كلَّ شيء: لو بقيت شارةٌ صفراً فمقياسُها غير موصول */
  /* الستريك يُقاس من اليوم للخلف، فلا بدّ من أيامٍ حقيقيةٍ متّصلةٍ بالحاضر */
  const back = (k: number) => { const d = new Date(); d.setDate(d.getDate() - k); return d.toISOString().slice(0, 10); };
  const maxed = stats({
    silver: 99999, totalFocusMins: 99999, sessionsCount: 9999,
    sessionDays: Array.from({ length: 200 }, (_, i) => back(i)),
    plansCount: 999, aiChats: 999, quizCount: 999, analyzedCount: 999, trackProgress: 100,
  });
  for (const b of BADGE_DEFS) {
    assert.ok(getBadgeCurrent(b.id, maxed, 9999) > 0, `${b.id} لا مقياسَ له — تبقى مقفلةً للأبد`);
  }
});

test("الفتحُ مصدرُه واحد: بلوغُ الهدف هو الفتح", () => {
  const s = stats({ sessionsCount: 5, totalFocusMins: 60, silver: 100 });
  const ids = new Set(getUnlockedBadgeIds(s, 0));
  assert.ok(ids.has("first_session") && ids.has("sessions_5"), "خمسُ جلساتٍ تفتح الأولى والخامسة");
  assert.ok(ids.has("hours_1"), "ستّون دقيقةً = ساعة");
  assert.ok(ids.has("silver_100"));
  assert.ok(!ids.has("sessions_20"), "لم يبلغ العشرين");
  assert.ok(!ids.has("vault_1"), "لا خطأ في خزنته");
});

test("الطالبُ الجديد لا يفتح شيئاً", () => {
  assert.deepEqual(getUnlockedBadgeIds(stats(), 0), []);
});

test("الستريك يُقاس متتالياً لا مجموعاً", () => {
  const scattered = stats({ sessionDays: ["2020-01-01", "2020-03-01", "2020-06-01"] });
  assert.equal(getBadgeCurrent("streak_3", scattered, 0), 0, "أيامٌ متفرّقةٌ ليست ستريكاً");
  assert.equal(getBadgeCurrent("days_30", scattered, 0), 3, "لكنها تُحصى في «شهرٌ في درب»");
});

test("الفضةُ تُصرف مرّةً واحدة", () => {
  const first = pendingBadgeSilver(["first_session", "sessions_5"], []);
  assert.deepEqual(first.ids, ["first_session", "sessions_5"]);
  assert.equal(first.silver, 20 + 25);

  const again = pendingBadgeSilver(["first_session", "sessions_5"], first.ids);
  assert.deepEqual(again.ids, []);
  assert.equal(again.silver, 0, "الصرفُ مرّتين يطبع فضةً من هواء");

  const partial = pendingBadgeSilver(["first_session", "streak_3"], ["first_session"]);
  assert.deepEqual(partial.ids, ["streak_3"]);
});

test("شارةٌ مسحوبةٌ من القائمة لا تُصرف ولا تكسر الحساب", () => {
  const r = pendingBadgeSilver(["مسحوبة", "first_session"], []);
  assert.deepEqual(r.ids, ["first_session"]);
  assert.equal(r.silver, 20);
});

test("المستوى يتدرّج، والخبرة تُحسب من الثلاثة", () => {
  assert.equal(getLevel(0).name, "مبتدئ");
  assert.equal(getLevel(200).name, "طالب");
  assert.equal(getLevel(999999).progress, 100, "الأعلى مكتملٌ لا كسر");
  assert.ok(computeXP(stats({ totalFocusMins: 10, sessionsCount: 1, silver: 1 })) > 0);
});

test("مخزنُ الصرف لا يفتح رصيداً ثانياً", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync("src/lib/badgeRewards.ts", "utf8");
  assert.ok(src.includes("addSilver("), "لا يصرف الفضةَ من مصدرها");
  assert.ok(!/localStorage\.setItem\(\s*["'`]darb_stats/.test(src), "يكتب الإحصاءات مباشرةً — مرّ عبر storage");
});
