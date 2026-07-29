/* اختبار سجلّ التحديثات — أهمّه أنه لا يتأخّر عن الواقع بصمت.
   تشغيل: npx tsx --test src/lib/changelog.test.ts

   الخلفية: بقي السجلّ خمسة أسابيع عند 21 يونيو وقد شُحن بعده 231 تغييراً — والصفحة
   عنوانُها «آخر التحديثات». طالبٌ يفتحها فيظنّ المنصّة متوقّفة. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHANGELOG, CHANGE_META, type ChangeType } from "./changelog";

const ts = (d: string) => new Date(d + "T12:00:00").getTime();
const DAY = 86_400_000;

/* ═══ حارسُ التأخّر ═══
   خمسةٌ وأربعون يوماً سقفٌ سخيّ (درب يشحن أسبوعياً)، فلا يزعج في هدأةٍ قصيرة
   ويصرخ في غفلةٍ طويلة. إن سقط فالمطلوب مُدخلٌ يصف ما شُحن، لا رفعُ السقف. */
test("السجلّ ليس متأخّراً عن الواقع", () => {
  const newest = Math.max(...CHANGELOG.map((e) => ts(e.date)));
  const age = Math.round((Date.now() - newest) / DAY);
  assert.ok(
    age <= 45,
    `آخر مُدخلٍ عمرُه ${age} يوماً. أضِف مُدخلاً يصف ما شُحن منذُه بلغة الطالب ` +
    `(ماذا صار بمقدوره؟) — الصفحة اسمها «آخر التحديثات».`,
  );
});

test("مرتّبٌ من الأحدث إلى الأقدم (هكذا يُعرض)", () => {
  for (let i = 1; i < CHANGELOG.length; i++) {
    assert.ok(
      ts(CHANGELOG[i - 1].date) >= ts(CHANGELOG[i].date),
      `«${CHANGELOG[i].date}» يسبق «${CHANGELOG[i - 1].date}» — الترتيب معكوس`,
    );
  }
});

test("لا تاريخ في المستقبل", () => {
  const tomorrow = Date.now() + DAY;
  for (const e of CHANGELOG) {
    assert.ok(ts(e.date) < tomorrow, `${e.date}: تاريخٌ في المستقبل`);
  }
});

test("كل مُدخلٍ صالحٌ للعرض", () => {
  const types: ChangeType[] = ["new", "improve", "fix"];
  for (const e of CHANGELOG) {
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/, `${e.date}: صيغة تاريخٍ غير صالحة`);
    assert.ok(!Number.isNaN(ts(e.date)), `${e.date}: تاريخٌ غير موجود`);
    assert.ok(e.changes.length > 0, `${e.date}: مُدخلٌ بلا تغييرات`);
    for (const c of e.changes) {
      assert.ok(types.includes(c.type), `${e.date}: نوعٌ مجهول «${c.type}»`);
      assert.ok(c.text.trim().length > 10, `${e.date}: نصٌّ أقصر من أن يفيد`);
      /* لغة الطالب لا لغة الـcommit: لا مسارات ملفّات ولا مصطلحاتٍ داخلية */
      assert.doesNotMatch(c.text, /\.tsx?\b|src\/|localStorage|refactor|commit/i,
        `${e.date}: «${c.text.slice(0, 40)}…» بلغة المطوّر لا الطالب`);
    }
  }
});

test("لكل نوعٍ عرضٌ معرَّف (لا بطاقةٌ بلا لون)", () => {
  for (const e of CHANGELOG) {
    for (const c of e.changes) assert.ok(CHANGE_META[c.type], `نوعٌ بلا CHANGE_META: ${c.type}`);
  }
});
