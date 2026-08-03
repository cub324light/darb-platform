/* اختبار اكتمال الملف + مكافآته التدريجية — تشغيل: npx tsx --test src/lib/profileCompletion.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { profileCompletion, pendingProfileRewards, type FullProfile } from "./profileCompletion";

const registered: FullProfile = { name: "محمد", grade: "ثالث ثانوي", region: "الرياض", targets: ["university"], studyStyle: "both" };
const full: FullProfile = { ...registered, academicTrack: "general", hobbies: ["كرة"], interests: ["برمجة"], favSubjects: ["رياضيات"] };

test("الاكتمال: ٩ للثانويّ (٥ أساسية + ٤ شخصية)، و٨ لغيره", () => {
  /* ملفٌّ فارغٌ لا نعرف صاحبَه — فلا نطالبه بمسارٍ دراسيّ */
  assert.equal(profileCompletion({}).total, 8);
  assert.equal(profileCompletion({}).done, 0);
  /* ثانويٌّ ⇒ المسارُ الدراسي يُحصى: يقود موادَّ «المدرسة» فليس ترفاً */
  assert.equal(profileCompletion(registered).total, 9);
  assert.equal(profileCompletion(registered).done, 5);
  assert.equal(profileCompletion(full).done, 9);
  assert.equal(profileCompletion(full).pct, 100);
});

test("الجامعيُّ لا يُسأل عن مسارٍ ثانويّ — ويبلغ المئة بدونه", () => {
  const uni: FullProfile = { name: "سارة", studyLevel: "جامعي", region: "جدة", targets: ["university"],
    studyStyle: "both", hobbies: ["قراءة"], interests: ["طب"], favSubjects: ["أحياء"] };
  assert.equal(profileCompletion(uni).total, 8);
  assert.equal(profileCompletion(uni).pct, 100);
});

test("ما يُطلب هو ما يُحصى — كلُّ حقلٍ في القائمة له معرّفٌ ثابت", () => {
  const ids = profileCompletion(registered).fields.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, "معرّفٌ مكرّر يخلط العرضَ بالحساب");
  assert.ok(ids.includes("academicTrack"), "المسارُ الدراسي غائبٌ عن ملفّ ثانويّ");
});

test("مكافأة تدريجية: +5 لكل معلومةٍ شخصية جديدة (مرّة لكلٍّ)", () => {
  /* أضاف الهوايات فقط → +5 */
  const one = pendingProfileRewards({ ...registered, hobbies: ["كرة"] })!;
  assert.equal(one.silver, 5);
  assert.deepEqual(one.newRewardedFields, ["hobbies"]);
  assert.equal(one.badge, false);
  /* لا تتكرّر بعد صرفها */
  assert.equal(pendingProfileRewards({ ...registered, hobbies: ["كرة"], rewardedFields: ["hobbies"] }), null);
});

test("عند 100٪: وسام + 30 فضة (مع الفضة التدريجية المتبقّية)", () => {
  /* هوايات+اهتمامات مكافأة سابقاً، تبقى المواد (+5) ثم 100٪ (+30 ووسام) */
  const r = pendingProfileRewards({ ...full, rewardedFields: ["hobbies", "interests"] })!;
  assert.equal(r.badge, true);
  assert.equal(r.setCompleteFlag, true);
  assert.equal(r.silver, 35); // 5 (المواد) + 30 (اكتمال)
  assert.ok(r.message.includes("وسام"));
});

test("لا وسام إن صُرف سابقاً، ولا مكافأة قبل أي إضافة", () => {
  assert.equal(pendingProfileRewards({ ...full, rewardedFields: ["hobbies", "interests", "favSubjects"], awardedProfileComplete: true }), null);
  assert.equal(pendingProfileRewards(registered), null); // لا معلومات شخصية جديدة و<100٪
});

test("طريقة المذاكرة تُحتسب في الاكتمال لكن لا تُكافأ تدريجياً (مملوءة من التسجيل)", () => {
  const noStyle = profileCompletion({ ...registered, studyStyle: undefined });
  assert.equal(noStyle.done, 4); // بلا طريقة مذاكرة
  const r = pendingProfileRewards({ name: "x", grade: "g", region: "r", targets: ["university"], studyStyle: "both" });
  assert.equal(r, null); // طريقة المذاكرة ليست ضمن الحقول المكافَأة
});
