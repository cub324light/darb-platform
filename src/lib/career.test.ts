/* اختبارات مركز المسيرة المهنية — تشغيل: npx tsx --test src/lib/career.test.ts
   نتحقق: فرادة المعرّفات، فئات الشهادات غير فارغة، صحة الفلترة، روابط https،
   واشتقاق الفئة من التخصص/المسار. كلها حتمية بلا أي IO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAREER_CERTS, CAREER_OPPORTUNITIES, CAREER_CATEGORIES,
  certsForMajor, opportunitiesAll, resolveCategory,
  resumeFocusForMajor, linkedinFocusForMajor,
} from "./career";
import type { MajorCategory } from "./university";

/* ════════ الشهادات ════════ */
test("معرّفات الشهادات فريدة", () => {
  const ids = CAREER_CERTS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("كل شهادة لها فئة واحدة على الأقل، وكل فئة صالحة", () => {
  for (const c of CAREER_CERTS) {
    assert.ok(c.category.length > 0, `الشهادة ${c.id} بلا فئة`);
    for (const cat of c.category) {
      assert.ok(CAREER_CATEGORIES.includes(cat), `فئة غير صالحة في ${c.id}: ${cat}`);
    }
    assert.ok(c.name.trim().length > 0);
    assert.ok(c.forWhat.trim().length > 0);
  }
});

test("certsForMajor يعيد فقط شهادات تلك الفئة، وغير فارغ لكل فئة", () => {
  for (const cat of CAREER_CATEGORIES) {
    const list = certsForMajor(cat);
    assert.ok(list.length > 0, `لا شهادات للفئة ${cat}`);
    for (const c of list) {
      assert.ok(c.category.includes(cat), `${c.id} لا يخص ${cat}`);
    }
  }
});

test("الشهادات الأساسية (لغة/مهارات رقمية) تظهر لكل فئة", () => {
  for (const cat of CAREER_CATEGORIES) {
    const ids = certsForMajor(cat).map((c) => c.id);
    assert.ok(ids.includes("ielts"), `IELTS يجب أن يظهر للفئة ${cat}`);
    assert.ok(ids.includes("icdl"), `ICDL يجب أن يظهر للفئة ${cat}`);
  }
});

/* ════════ الفرص ════════ */
test("معرّفات الفرص فريدة والقائمة غير فارغة", () => {
  const all = opportunitiesAll();
  assert.ok(all.length > 0);
  const ids = all.map((o) => o.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("كل رابط جهة يبدأ https:// ولها عنوان ووصف", () => {
  for (const o of CAREER_OPPORTUNITIES) {
    assert.ok(o.officialUrl.startsWith("https://"), `رابط غير آمن في ${o.id}: ${o.officialUrl}`);
    assert.ok(o.title.trim().length > 0);
    assert.ok(o.what.trim().length > 0);
    assert.ok(o.tags.length > 0);
  }
});

/* ════════ اشتقاق الفئة ════════ */
test("resolveCategory: التخصص المنظَّم له الأولوية", () => {
  // majorId «cs» فئته «حاسب» في university.ts
  assert.equal(resolveCategory("cs", "إداري"), "حاسب");
  // majorId «medicine» فئته «صحي»
  assert.equal(resolveCategory("medicine", undefined), "صحي");
});

test("resolveCategory: يسقط إلى trackType الصالح عند غياب التخصص", () => {
  assert.equal(resolveCategory(undefined, "هندسي"), "هندسي");
  assert.equal(resolveCategory(null, "قانوني"), "قانوني");
});

test("resolveCategory: عام عند غياب البيانات أو trackType غير صالح", () => {
  assert.equal(resolveCategory(undefined, undefined), "عام");
  assert.equal(resolveCategory(undefined, "مسار غير معروف"), "عام");
  assert.equal(resolveCategory("major-غير-موجود", undefined), "عام");
});

/* ════════ نقاط التخصيص ════════ */
test("resume/linkedin focus غير فارغة لكل فئة", () => {
  for (const cat of CAREER_CATEGORIES as MajorCategory[]) {
    assert.ok(resumeFocusForMajor(cat).length > 0, `سيرة فارغة للفئة ${cat}`);
    assert.ok(linkedinFocusForMajor(cat).length > 0, `لينكدإن فارغ للفئة ${cat}`);
  }
});
