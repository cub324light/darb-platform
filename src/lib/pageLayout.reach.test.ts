/* حرّاسُ الوصول والتسريب — اختباراتُ مصدرٍ ثابتةٌ لا تحتاج متصفّحاً.
   تشغيل: npx tsx --test src/lib/pageLayout.reach.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { GLOBAL_SKILLS } from "./globalSkills";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if ((p.endsWith(".tsx") || p.endsWith(".ts")) && !p.includes(".test.")) out.push(p);
  }
  return out;
}
const SRC = walk("src");
const text = (p: string) => readFileSync(p, "utf8");

/* ═══ العطل: أربعُ ميزاتٍ لا يصلها إلا الشريطُ الجانبيّ للحاسب ═══ */

test("كلُّ ميزةٍ من ميزات المجتمع يصلها مصدرٌ واحدٌ على الأقل خارج الشريط الجانبيّ", () => {
  const FEATURES = ["/council", "/arena", "/leaderboard", "/challenges"];
  for (const href of FEATURES) {
    const sources = SRC.filter((p) =>
      !p.includes("DesktopSidebar") &&
      !p.includes(`src/app${href}/`) &&
      new RegExp(`"${href}"`).test(text(p)));
    assert.ok(sources.length > 0, `${href}: لا يصلها إلا الشريط الجانبيّ — مستخدمُ الجوال لا يراها`);
  }
});

/* ═══ العطل: مهاراتُ القياس تُعرض لمن تجاوز مرحلته ═══ */

test("مهاراتُ درب كلُّها مهاراتُ اختباراتِ قياس — فلا مهارةَ لمرحلةٍ بعد الثانوية", () => {
  const EXAM_TRACKS = new Set(["قدرات", "تحصيلي", "تحصيلي مبكر", "ستيب", "CPC", "ITC", "ايلتس", "توفل", "دوليقو"]);
  for (const s of GLOBAL_SKILLS) {
    assert.ok(s.tracks.length > 0, `${s.id}: مهارةٌ بلا مسار`);
    for (const t of s.tracks) {
      assert.ok(EXAM_TRACKS.has(t), `${s.id}: مسارٌ غيرُ اختباريّ (${t}) — راجع بوابة /skills`);
    }
  }
});

test("صفحةُ المهارات محروسةٌ بالبوابة لا بالبيانات", () => {
  const page = text("src/app/skills/page.tsx");
  assert.match(page, /phaseAllows\(\s*phase\s*,\s*"secondary-study"\s*\)/,
    "بوابةُ المرحلة غائبة عن /skills");
});

/* ═══ العطل: شريطان بمنطقين ═══ */

test("الشريطان يقرآن `navMid` من محرّك الانتقال ولا يكتب أحدُهما منطقَه بيده", () => {
  for (const f of ["src/components/BottomNav.tsx", "src/components/DesktopSidebar.tsx"]) {
    const t = text(f);
    assert.match(t, /currentPhase\(\)/, `${f}: لا يسأل محرّك الانتقال`);
    assert.match(t, /navMid/, `${f}: لا يستعمل navMid`);
    assert.ok(!/isUniversityGraduate\(|isUniversityPhase\(|phaseExperience\(/.test(t),
      `${f}: ما زال يشتقّ المرحلة بنفسه`);
  }
});

/* ═══ العطل: لوحةٌ تقود إلى بابٍ مغلق ═══ */

test("لوحةُ خريج الجامعة لا تقود إلى صفحةٍ ترفض مرحلتَه", () => {
  const t = text("src/components/dash/PhaseHome.tsx");
  const gradBoard = t.slice(t.indexOf('view.allows("career")'), t.indexOf('const showAdmission'));
  assert.ok(!gradBoard.includes('"/opportunities"'),
    "«الوظائف والفرص» تقود إلى صفحةٍ تستقبله بـ«هذا القسم لمن هم على أعتاب القبول»");
  /* و`/opportunities` نفسُها ما زالت ترفض مَن ملك قدرةَ ما بعد التخرّج —
     فالحارسُ يبقى ذا معنى، والرفضُ صار بالقدرة لا بالحقل. */
  assert.match(text("src/app/opportunities/page.tsx"), /allows\("career"\)/);
});
