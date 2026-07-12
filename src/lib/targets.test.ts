/* اختبار أهداف ما بعد الثانوية — دالة نقية.
   تشغيل: npx tsx --test src/lib/targets.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { targetsFor, ADMISSION_TARGETS } from "./targets";

test("targetsFor يرتّب بترتيب الكتالوج لا ترتيب الاختيار", () => {
  const r = targetsFor(["aramco", "university"]);
  assert.deepEqual(r.map((t) => t.id), ["university", "aramco"]);
});

test("targetsFor يتجاهل المعرّفات المجهولة والفراغ", () => {
  assert.deepEqual(targetsFor(["xyz", "sabic", ""]).map((t) => t.id), ["sabic"]);
  assert.deepEqual(targetsFor([]), []);
  assert.deepEqual(targetsFor(null), []);
  assert.deepEqual(targetsFor(undefined), []);
});

test("كل هدفٍ له وجهةٌ حقيقية (يبدأ بـ /)", () => {
  assert.ok(ADMISSION_TARGETS.every((t) => t.href.startsWith("/") && t.label && t.icon));
});

test("لا تكرار في معرّفات الأهداف", () => {
  const ids = ADMISSION_TARGETS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});
