/* اختبار عزل البيانات بين الحسابات (C2) —
   تشغيل: npx tsx --test src/lib/accountScope.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureLocalOwnership, hasAnyLocalUserData, localDataOwner, clearLocalUserData } from "./accountScope";

function installMockStorage() {
  const map: Record<string, string> = {};
  const g = globalThis as { window?: unknown; localStorage?: Storage };
  g.window = {};
  g.localStorage = {
    getItem: (k: string) => map[k] ?? null,
    setItem: (k: string, v: string) => { map[k] = v; },
    removeItem: (k: string) => { delete map[k]; },
    clear: () => { for (const k of Object.keys(map)) delete map[k]; },
    key: () => null, length: 0,
  } as Storage;
  return { map, uninstall: () => { delete g.window; delete g.localStorage; } };
}

test("تبديل الحساب على نفس الجهاز يمسح بيانات الحساب الأول (جذر C2)", () => {
  const { map, uninstall } = installMockStorage();
  try {
    // الحساب A: عنده بيانات + مالك مسجّل
    map["darb_user"] = JSON.stringify({ name: "طالب A" });
    map["darb_vault"] = JSON.stringify([{ q: "خطأ A" }]);
    ensureLocalOwnership("uidA");
    assert.equal(localDataOwner(), "uidA");

    // يدخل الحساب B على نفس الجهاز → تُمسح بيانات A قبل تحميل بيانات B
    const cleared = ensureLocalOwnership("uidB");
    assert.equal(cleared, true, "مسح بيانات الحساب الآخر");
    assert.equal(map["darb_user"], undefined, "لم تعد بيانات A موجودة");
    assert.equal(map["darb_vault"], undefined);
    assert.equal(localDataOwner(), "uidB", "الملكية انتقلت لـ B");
    assert.equal(hasAnyLocalUserData(), false, "B يبدأ نظيفاً (تُسحب بياناته من السحابة)");
  } finally { uninstall(); }
});

test("نفس المستخدم العائد (ملكيته مثبّتة): لا مسح لبياناته", () => {
  const { map, uninstall } = installMockStorage();
  try {
    ensureLocalOwnership("uidA");                 // جلسة سابقة ربطت الملكية (جهاز نظيف)
    map["darb_user"] = JSON.stringify({ name: "أنا" }); // ثم تراكمت بياناته
    const cleared = ensureLocalOwnership("uidA"); // يعود/يتحدّث التوكن
    assert.equal(cleared, false);
    assert.ok(map["darb_user"], "بياناتي باقية");
  } finally { uninstall(); }
});

test("تسجيل الخروج يمسح البيانات المحلية ويزيل المالك", () => {
  const { map, uninstall } = installMockStorage();
  try {
    map["darb_user"] = JSON.stringify({ name: "طالب" });
    ensureLocalOwnership("uidA");
    const cleared = ensureLocalOwnership(null); // خروج
    assert.equal(cleared, true);
    assert.equal(map["darb_user"], undefined, "لا بيانات بعد الخروج");
    assert.equal(localDataOwner(), null, "لا مالك");
  } finally { uninstall(); }
});

test("بيانات الزائر تُرحَّل لحسابه (سلوك قائم) — بلا مسح", () => {
  const { map, uninstall } = installMockStorage();
  try {
    map["darb_guest_mode"] = "1";
    map["darb_user"] = JSON.stringify({ name: "زائر" });
    const cleared = ensureLocalOwnership("uidA");
    assert.equal(cleared, false, "لا مسح — ترحيل بيانات الزائر");
    assert.ok(map["darb_user"], "بيانات الزائر باقية لترحيلها");
    assert.equal(localDataOwner(), "uidA");
  } finally { uninstall(); }
});

test("بيانات مجهولة المالك (قبل الإصلاح) وليست زائراً → تُمسح احتياطاً", () => {
  const { map, uninstall } = installMockStorage();
  try {
    map["darb_user"] = JSON.stringify({ name: "قديم" }); // لا مالك، لا وضع زائر
    const cleared = ensureLocalOwnership("uidA");
    assert.equal(cleared, true, "تُمسح لتُعاد من السحابة (منعاً للتسرّب)");
    assert.equal(localDataOwner(), "uidA");
  } finally { uninstall(); }
});

test("جهاز نظيف: ربط الملكية فقط بلا مسح", () => {
  const { uninstall } = installMockStorage();
  try {
    const cleared = ensureLocalOwnership("uidA");
    assert.equal(cleared, false);
    assert.equal(localDataOwner(), "uidA");
  } finally { uninstall(); }
});

test("clearLocalUserData يمسح كل مفاتيح BACKUP", () => {
  const { map, uninstall } = installMockStorage();
  try {
    map["darb_user"] = "x"; map["darb_results"] = "y"; map["darb_seen_broadcasts"] = "z";
    map["darb_theme"] = "dark"; // ليست بيانات مستخدم — تبقى
    clearLocalUserData();
    assert.equal(map["darb_user"], undefined);
    assert.equal(map["darb_results"], undefined);
    assert.equal(map["darb_seen_broadcasts"], undefined);
    assert.equal(map["darb_theme"], "dark", "الثيم لا يُمسح (خاص بالجهاز)");
  } finally { uninstall(); }
});
