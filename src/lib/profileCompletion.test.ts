/* اختبار اكتمال الملف + مكافآته — تشغيل: npx tsx --test src/lib/profileCompletion.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { profileCompletion, pendingProfileRewards, type FullProfile } from "./profileCompletion";

const registered: FullProfile = { name: "محمد", grade: "ثالث ثانوي", region: "الرياض", targets: ["university"] };
const full: FullProfile = { ...registered, hobbies: ["كرة"], interests: ["برمجة"], favSubjects: ["رياضيات"], learnPref: "بالفيديو" };

test("الاكتمال: ٨ معلومات، ٤ أساسية + ٤ إضافية", () => {
  const empty = profileCompletion({});
  assert.equal(empty.total, 8);
  assert.equal(empty.done, 0);
  assert.equal(empty.pct, 0);
  assert.equal(empty.extraDone, false);

  const reg = profileCompletion(registered); // الأساسية الأربع فقط
  assert.equal(reg.done, 4);
  assert.equal(reg.pct, 50);
  assert.equal(reg.extraDone, false);

  const done = profileCompletion(full);
  assert.equal(done.done, 8);
  assert.equal(done.pct, 100);
  assert.equal(done.extraDone, true);
});

test("extraDone يتطلّب المعلومات الإضافية الأربع كلها", () => {
  const three = profileCompletion({ ...registered, hobbies: ["x"], interests: ["y"], favSubjects: ["z"] });
  assert.equal(three.extraDone, false); // ينقص learnPref
  assert.equal(three.done, 7);
});

test("مكافأة +٥٠ فضة عند إكمال المعلومات الإضافية (مرّة واحدة)", () => {
  const r = pendingProfileRewards(full)!;
  assert.ok(r.silver >= 50);
  assert.equal(r.setInfoFlag, true);
  assert.ok(r.message.includes("أحسنت"));
  /* بعد صرفها: لا تتكرّر */
  assert.equal(pendingProfileRewards({ ...full, awardedProfileInfo: true, awardedProfileComplete: true }), null);
});

test("وسام + فضة عند ١٠٠٪ (والمكافأتان تجتمعان لملفٍ مسجَّل مكتمل)", () => {
  const r = pendingProfileRewards(full)!;
  assert.equal(r.badge, true);
  assert.equal(r.setCompleteFlag, true);
  assert.equal(r.silver, 80); // ٥٠ (إضافية) + ٣٠ (اكتمال)
});

test("لا مكافأة قبل الإكمال", () => {
  assert.equal(pendingProfileRewards(registered), null); // الإضافية غير مكتملة و<١٠٠٪
});
