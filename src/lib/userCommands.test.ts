/* ═══ حدُّ الكتابة: واجهة ← أمر ← محرّك ← تخزين ═══
   قاعدةٌ معماريةٌ مثبَّتة: لا تكتب شاشةٌ في ملفّ الطالب بيدها.
   تشغيل: npx tsx --test src/lib/userCommands.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if ((p.endsWith(".ts") || p.endsWith(".tsx")) && !p.includes(".test.")) out.push(p);
  }
  return out;
}
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/* `/onboarding` **ينشئ** الملفَّ ولا يعدّله — هو مصدرُ الحقيقة الأوّل،
   كما استُثني في حدّ المرحلة (`transition/boundary.test.ts`). */
const EXEMPT = ["src/app/onboarding/"];
const UI = [...walk("src/app"), ...walk("src/components")]
  .filter((p) => !EXEMPT.some((e) => p.includes(e)));

test("لا `saveUser` في صفحةٍ ولا مكوّن", () => {
  const offenders = UI.filter((f) => /\bsaveUser\s*\(/.test(stripComments(readFileSync(f, "utf8"))));
  assert.deepEqual(offenders, [],
    `كتابةٌ مباشرةٌ في ملفّ الطالب — مرِّرها بأمرٍ من lib/userCommands:\n${offenders.join("\n")}`);
});

test("لا تستورد واجهةٌ `saveUser` أصلاً", () => {
  const offenders = UI.filter((f) => {
    const code = stripComments(readFileSync(f, "utf8"));
    return /import\s*\{[^}]*\bsaveUser\b[^}]*\}\s*from\s*"@\/lib\/storage"/.test(code);
  });
  assert.deepEqual(offenders, [], `استيرادٌ لا يجوز:\n${offenders.join("\n")}`);
});

test("كلُّ من كان يكتب صار يمرّ بالأوامر", () => {
  const writers = [
    "src/app/profile/page.tsx",
    "src/app/roadmap/page.tsx",
    "src/components/SettingsPanel.tsx",
    "src/components/profile/ProfileEditor.tsx",
    "src/components/profile/ProfileGoals.tsx",
  ];
  for (const f of writers) {
    assert.ok(/from "@\/lib\/userCommands"/.test(readFileSync(f, "utf8")), `${f} لا يمرّ بالأوامر`);
  }
});

test("حقولُ المرحلة محجوبةٌ عن أمر تعديل الملفّ", () => {
  /* `ProfilePatch` يحذفها بالنوع، فمحاولةُ كتابتها من شاشةٍ لا تُترجَم أصلاً —
     ويبقى الانتقالُ نفسُه ملكَ محرّك الانتقال. */
  const src = readFileSync("src/lib/userCommands.ts", "utf8");
  assert.ok(/Omit<Partial<DarbUser>,\s*PhaseField>/.test(src), "الرقعةُ لا تحجب حقولَ المرحلة");
  for (const f of ["studyLevel", "grade", "gradStage", "gradeYearId"]) {
    assert.ok(new RegExp(`"${f}"`).test(src), `${f} ليس في حقول المرحلة المحجوبة`);
  }
});

test("محرّكُ الانتقال يبقى صاحبَ حدث المرحلة وحدَه", () => {
  /* توحيدُ الكتابة لا يعني مُطلِقاً ثانياً لـ`StudentPhaseChanged`. */
  const emitters = walk("src").filter((f) =>
    /eventType:\s*"StudentPhaseChanged"/.test(stripComments(readFileSync(f, "utf8"))));
  assert.deepEqual(emitters, ["src/lib/transition/index.ts"]);
});

test("`saveUser` تبثّ حدثاً واحداً موحّداً", () => {
  const storage = readFileSync("src/lib/storage.ts", "utf8");
  assert.ok(/export const USER_CHANGED = "darb:userChanged"/.test(storage), "لا حدثَ موحّداً للملفّ");
  const body = storage.match(/export function saveUser[\s\S]*?\n}/)![0];
  assert.ok(/dispatchEvent\(new Event\(USER_CHANGED\)\)/.test(body), "`saveUser` ما زالت صامتة");
  /* ومستهلكٌ واحدٌ على الأقلّ، وإلا صار حدثاً لا يسمعه أحد. */
  const consumers = walk("src").filter((f) =>
    /addEventListener\(USER_CHANGED/.test(readFileSync(f, "utf8")));
  assert.ok(consumers.length >= 1, "حدثٌ بلا مستهلك");
});
