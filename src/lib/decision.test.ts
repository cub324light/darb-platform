/* اختبارات «طبقة التاريخ» لشبكة التخصص — تشغيل: npx tsx --test src/lib/decision.test.ts
   حتمية بلا IO. قرار الأولويات انتقل للعقل المركزي (lifeEngine.test.ts)؛ هنا نتحقق
   أن سلوك الطالب يعيد ترتيب الشبكة: الأكثر مشاهدةً يهبط بثبات، والمألوف يُعرَف. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rankBySeen, isFamiliar } from "./decision";

test("rankBySeen: الأكثر مشاهدةً يهبط، والمتساوون يحفظون ترتيبهم", () => {
  const items = [{ label: "أ" }, { label: "ب" }, { label: "ج" }, { label: "د" }];
  const visits = { "أ": 5, "ج": 2 }; // ب،د = 0
  const ordered = rankBySeen(items, visits).map((x) => x.label);
  assert.deepEqual(ordered, ["ب", "د", "ج", "أ"]); // 0،0 (بترتيبهما) ثم 2 ثم 5
});

test("rankBySeen: بلا تاريخ يحفظ الترتيب الأصلي (مستقرّ)", () => {
  const items = [{ label: "x" }, { label: "y" }, { label: "z" }];
  assert.deepEqual(rankBySeen(items, {}).map((i) => i.label), ["x", "y", "z"]);
});

test("isFamiliar: عتبة المشاهدة المتكرّرة", () => {
  assert.equal(isFamiliar("ETAP", { ETAP: 3 }), true);
  assert.equal(isFamiliar("ETAP", { ETAP: 2 }), false);
  assert.equal(isFamiliar("ETAP", {}), false);
});
