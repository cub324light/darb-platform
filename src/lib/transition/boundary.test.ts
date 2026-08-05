/* ═══ حارسُ الحدّ: الصفحةُ تسأل ولا تقرّر ═══
   قاعدةٌ معماريةٌ مثبَّتة: لا صفحةَ ولا مكوّنَ يشتقّ المرحلةَ بنفسه. كلُّ إظهارٍ
   أو إخفاءٍ أو ترتيبٍ يأتي من محرّك الانتقال (`currentPhase()` / `phaseView`).
   تشغيل: npx tsx --test src/lib/transition/boundary.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/* الفحصُ على **الكود** لا على التعليقات: شرحُ القاعدة يذكر أسماءَ ما مُنع،
   فلو فحصنا النصَّ خاماً لصار التعليقُ نفسُه مخالفة. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if ((p.endsWith(".tsx") || p.endsWith(".ts")) && !p.includes(".test.")) out.push(p);
  }
  return out;
}

/* الواجهاتُ وحدَها محكومةٌ بالقاعدة. و«الاستثناءات» ليست ثغرات:
   ▸ `/admin` و`/dev` أدواتُ تشغيلٍ داخلية تعرض حالةَ المحرّكات نفسِها.
   ▸ `/onboarding` **ينشئ** الملفَّ ولا ينتقل بمرحلة — فهو مصدرُ الحقيقة الأول. */
const EXEMPT = ["/admin/", "/dev/", "src/app/onboarding/"];
const UI = [...walk("src/app"), ...walk("src/components")]
  .filter((p) => !EXEMPT.some((e) => p.includes(e)));

/* الاشتقاقاتُ الممنوعة داخل الواجهات — كلٌّ منها يعرّف المرحلةَ من جديد. */
const FORBIDDEN: [RegExp, string][] = [
  [/\bstudyLevel\s*[=!]==/, "studyLevel === …"],
  [/\bgradStage\s*[=!]==/, "gradStage === …"],
  [/\bcomputeStudentPhase\b/, "computeStudentPhase"],
  [/\bphaseExperience\b/, "phaseExperience"],
  [/\bisUniversityPhase\b/, "isUniversityPhase"],
  [/\bisUniversityGraduate\b/, "isUniversityGraduate"],
  [/\bisGraduatePhase\b/, "isGraduatePhase"],
  [/\bisSecondaryPhase\b/, "isSecondaryPhase"],
  [/\bshowsUniversityUI\b/, "showsUniversityUI"],
  [/\bcanApplyUniversity\b/, "canApplyUniversity"],
  [/\bstudentPersona\b/, "studentPersona"],
];

test("لا صفحةَ ولا مكوّنَ يشتقّ المرحلةَ بنفسه — المحرّكُ وحدَه يقرّر", () => {
  const breaches: string[] = [];
  for (const p of UI) {
    const src = stripComments(readFileSync(p, "utf8"));
    for (const [re, name] of FORBIDDEN) {
      if (re.test(src)) breaches.push(`${p.replace("src/", "")} → ${name}`);
    }
  }
  assert.deepEqual(breaches, [],
    "الواجهةُ تقرّر بدل أن تسأل — استعمل `currentPhase().allows(...)` من `@/lib/transition`");
});

test("كلُّ من يحجب أو يُظهر بالمرحلة يسأل المحرّك", () => {
  /* عيّنةٌ من المواضع التي أُغلقت أعطالُها — تبقى مربوطةً بالمحرّك لا بالحقول. */
  const MUST_ASK = [
    "src/app/school/page.tsx",
    "src/app/skills/page.tsx",
    "src/app/plan/page.tsx",
    "src/app/dashboard/page.tsx",
    "src/app/opportunities/page.tsx",
    "src/app/university/page.tsx",
    "src/app/profile/page.tsx",
    "src/components/BottomNav.tsx",
    "src/components/DesktopSidebar.tsx",
    "src/components/dash/PhaseHome.tsx",
    "src/components/NextThread.tsx",
    "src/components/profile/ProfileEditor.tsx",
    "src/components/profile/ProfileGoals.tsx",
  ];
  for (const p of MUST_ASK) {
    const src = readFileSync(p, "utf8");
    assert.match(src, /from "@\/lib\/transition"/, `${p}: لا يسأل محرّك الانتقال`);
  }
});

test("الشريطان لا يعرفان اسم المرحلة — يقرآن `navMid` وحده", () => {
  for (const p of ["src/components/BottomNav.tsx", "src/components/DesktopSidebar.tsx"]) {
    const src = stripComments(readFileSync(p, "utf8"));
    assert.match(src, /navMid/, `${p}: لا يستعمل navMid`);
    for (const name of ["hs-1", "hs-2", "hs-3", "grad-hs", "grad-uni"]) {
      assert.ok(!src.includes(`"${name}"`), `${p}: يذكر اسم مرحلةٍ صراحةً (${name})`);
    }
  }
});
