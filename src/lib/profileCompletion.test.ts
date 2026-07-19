/* اختبار اكتمال الملف + مكافآته التدريجية — تشغيل: npx tsx --test src/lib/profileCompletion.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { profileCompletion, pendingProfileRewards, type FullProfile } from "./profileCompletion";

const registered: FullProfile = { name: "محمد", grade: "ثالث ثانوي", region: "الرياض", targets: ["university"], studyStyle: "both" };
const full: FullProfile = { ...registered, hobbies: ["كرة"], interests: ["برمجة"], favSubjects: ["رياضيات"] };

test("الاكتمال: ٨ معلومات (٤ أساسية + ٤ شخصية)", () => {
  assert.equal(profileCompletion({}).total, 8);
  assert.equal(profileCompletion({}).done, 0);
  /* مسجَّل مع طريقة مذاكرة → ٥/٨ */
  assert.equal(profileCompletion(registered).done, 5);
  assert.equal(profileCompletion(full).done, 8);
  assert.equal(profileCompletion(full).pct, 100);
});

test("مكافأة تدريجية: +٥ لكل معلومةٍ شخصية جديدة (مرّة لكلٍّ)", () => {
  /* أضاف الهوايات فقط → +٥ */
  const one = pendingProfileRewards({ ...registered, hobbies: ["كرة"] })!;
  assert.equal(one.silver, 5);
  assert.deepEqual(one.newRewardedFields, ["hobbies"]);
  assert.equal(one.badge, false);
  /* لا تتكرّر بعد صرفها */
  assert.equal(pendingProfileRewards({ ...registered, hobbies: ["كرة"], rewardedFields: ["hobbies"] }), null);
});

test("عند ١٠٠٪: وسام + ٣٠ فضة (مع الفضة التدريجية المتبقّية)", () => {
  /* هوايات+اهتمامات مكافأة سابقاً، تبقى المواد (+٥) ثم ١٠٠٪ (+٣٠ ووسام) */
  const r = pendingProfileRewards({ ...full, rewardedFields: ["hobbies", "interests"] })!;
  assert.equal(r.badge, true);
  assert.equal(r.setCompleteFlag, true);
  assert.equal(r.silver, 35); // ٥ (المواد) + ٣٠ (اكتمال)
  assert.ok(r.message.includes("وسام"));
});

test("لا وسام إن صُرف سابقاً، ولا مكافأة قبل أي إضافة", () => {
  assert.equal(pendingProfileRewards({ ...full, rewardedFields: ["hobbies", "interests", "favSubjects"], awardedProfileComplete: true }), null);
  assert.equal(pendingProfileRewards(registered), null); // لا معلومات شخصية جديدة و<١٠٠٪
});

test("طريقة المذاكرة تُحتسب في الاكتمال لكن لا تُكافأ تدريجياً (مملوءة من التسجيل)", () => {
  const noStyle = profileCompletion({ ...registered, studyStyle: undefined });
  assert.equal(noStyle.done, 4); // بلا طريقة مذاكرة
  const r = pendingProfileRewards({ name: "x", grade: "g", region: "r", targets: ["university"], studyStyle: "both" });
  assert.equal(r, null); // طريقة المذاكرة ليست ضمن الحقول المكافَأة
});
