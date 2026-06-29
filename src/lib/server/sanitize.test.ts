/* اختبارات تنقية المدخلات (M-1/M-2/M-3) —
   تشغيل: npx tsx --test src/lib/server/sanitize.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanId, safeInternalPath, canViewPrivateProfile } from "./sanitize";

/* ── M-1: cleanId يمنع «/» وأي محرف مسار ── */
test("cleanId يزيل «/» ومحارف المسار (لا حقن مسار وثائق)", () => {
  assert.equal(cleanId("abc123"), "abc123");
  assert.equal(cleanId("a/b/c"), "abc", "أُزيلت /");
  assert.equal(cleanId("users/victim/friends/x"), "usersvictimfriendsx");
  assert.equal(cleanId("../../secret"), "secret");
  assert.equal(cleanId("id_with-dash"), "id_with-dash", "_ و - مسموحان");
  assert.equal(cleanId("درب 123!@#"), "123", "غير اللاتيني/الرموز يُزال");
  assert.equal(cleanId(123 as unknown), "");
  assert.equal(cleanId(null), "");
});

test("cleanId يحترم الحد الأقصى للطول", () => {
  assert.equal(cleanId("a".repeat(500), 80).length, 80);
});

/* ── M-2: safeInternalPath يقبل المسار الداخلي فقط ── */
test("safeInternalPath يقبل المسارات الداخلية", () => {
  assert.equal(safeInternalPath("/dashboard"), "/dashboard");
  assert.equal(safeInternalPath("/roadmap?tab=1"), "/roadmap?tab=1");
  assert.equal(safeInternalPath("  /profile  "), "/profile", "يُشذّب المسافات");
});

test("safeInternalPath يرفض الروابط الخارجية والـ schemes", () => {
  assert.equal(safeInternalPath("https://evil.com"), null);
  assert.equal(safeInternalPath("http://evil.com"), null);
  assert.equal(safeInternalPath("//evil.com"), null, "protocol-relative");
  assert.equal(safeInternalPath("javascript:alert(1)"), null);
  assert.equal(safeInternalPath("data:text/html,abc"), null);
  assert.equal(safeInternalPath("/\\evil.com"), null, "backslash");
  assert.equal(safeInternalPath("dashboard"), null, "لا يبدأ بـ/");
  assert.equal(safeInternalPath(""), null);
  assert.equal(safeInternalPath("/a\nb"), null, "محرف تحكّم");
  assert.equal(safeInternalPath(123 as unknown), null);
});

/* ── M-3: حماية الملف الخاص (صداقة متبادلة فقط) ── */
test("canViewPrivateProfile: العام يُرى للجميع", () => {
  assert.equal(canViewPrivateProfile({ isPrivate: false, isOwner: false, iAddedThem: false, theyAddedMe: false }), true);
});

test("canViewPrivateProfile: الخاص لصاحبه فقط أو بصداقة متبادلة", () => {
  // صاحبه
  assert.equal(canViewPrivateProfile({ isPrivate: true, isOwner: true, iAddedThem: false, theyAddedMe: false }), true);
  // إضافة ذاتية أحادية (جذر الثغرة) → ممنوع
  assert.equal(canViewPrivateProfile({ isPrivate: true, isOwner: false, iAddedThem: true, theyAddedMe: false }), false,
    "الإضافة الذاتية وحدها لا تكشف الخاص");
  // الطرف الآخر أضافني فقط → ممنوع
  assert.equal(canViewPrivateProfile({ isPrivate: true, isOwner: false, iAddedThem: false, theyAddedMe: true }), false);
  // صداقة متبادلة → مسموح
  assert.equal(canViewPrivateProfile({ isPrivate: true, isOwner: false, iAddedThem: true, theyAddedMe: true }), true);
});
