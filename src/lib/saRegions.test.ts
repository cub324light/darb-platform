/* اختبار مناطق السعودية — تشغيل: npx tsx --test src/lib/saRegions.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SA_REGIONS, toOfficialRegion, isSaRegion, universitiesInRegion, nearestUniversity,
} from "./saRegions";

test("المناطق الرسمية ثلاث عشرة، بلا تكرار", () => {
  assert.equal(SA_REGIONS.length, 13);
  assert.equal(new Set(SA_REGIONS).size, 13);
  assert.ok(SA_REGIONS.includes("الرياض"));
  assert.ok(SA_REGIONS.includes("الحدود الشمالية"));
});

test("التطبيع: المحافظات تُردّ إلى منطقتها الرسمية", () => {
  assert.equal(toOfficialRegion("الخرج"), "الرياض");
  assert.equal(toOfficialRegion("الطائف"), "مكة المكرمة");
  assert.equal(toOfficialRegion("الأحساء"), "المنطقة الشرقية");
  assert.equal(toOfficialRegion("عرعر"), "الحدود الشمالية");
  assert.equal(toOfficialRegion("الرياض"), "الرياض");
  assert.equal(toOfficialRegion("  المنطقة الشرقية  "), "المنطقة الشرقية");
  assert.equal(toOfficialRegion("بلدٌ مجهول"), undefined);
  assert.equal(toOfficialRegion(""), undefined);
  assert.equal(toOfficialRegion(null), undefined);
});

test("isSaRegion يميّز المنطقة الرسمية", () => {
  assert.equal(isSaRegion("القصيم"), true);
  assert.equal(isSaRegion("الخرج"), false); // محافظة لا منطقة رسمية
  assert.equal(isSaRegion(undefined), false);
});

test("أقرب جامعة: منطقةٌ بها جامعات تُعيد أولاها، والمحافظة تُطبَّع", () => {
  const riyadh = universitiesInRegion("الرياض");
  assert.ok(riyadh.length > 0, "الرياض بها جامعات");
  assert.ok(riyadh.every((u) => toOfficialRegion(u.region) === "الرياض"));
  /* جامعات الخرج/المجمعة تُحسب ضمن الرياض */
  assert.ok(riyadh.some((u) => u.region === "الخرج" || u.region === "الرياض"));

  const east = nearestUniversity("المنطقة الشرقية");
  assert.ok(east, "المنطقة الشرقية بها جامعة");
  assert.equal(toOfficialRegion(east!.region), "المنطقة الشرقية");

  /* الإدخال بمحافظةٍ يُطبَّع أيضاً */
  assert.ok(nearestUniversity("الأحساء"), "الأحساء تُطبَّع إلى الشرقية فتجد جامعة");
  assert.equal(nearestUniversity("بلدٌ مجهول"), undefined);
});
