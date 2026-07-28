import { test } from "node:test";
import assert from "node:assert/strict";
import { ladderRange, type Slot } from "./dayLadder";

const s = (id: string, fromHour: number, toHour: number): Slot => ({ id, title: id, fromHour, toHour, color: "#000" });

test("يومٌ فارغ ⇒ نطاقٌ افتراضي معقول لا سلّمٌ بلا ساعات", () => {
  const r = ladderRange([]);
  assert.deepEqual([r.from, r.to], [7, 22]);
  assert.equal(r.hours.length, 16);
});

test("يتمدّد للفترات الخارجة عن الافتراضي من الطرفين", () => {
  const r = ladderRange([s("fajr", 5.5, 6), s("late", 22.5, 23.5)]);
  assert.deepEqual([r.from, r.to], [5, 24]);
});

test("يشمل الساعة الحالية حتى لو خارج الفترات", () => {
  assert.equal(ladderRange([s("a", 16, 17)], 2.25).from, 2);
  assert.equal(ladderRange([s("a", 16, 17)], -1).from, 7, "ساعةٌ سالبة ⇒ لم تُقرأ بعد فتُهمَل");
});

test("النطاق لا يخرج عن اليوم", () => {
  const r = ladderRange([s("a", -3, 30)]);
  assert.deepEqual([r.from, r.to], [0, 24]);
});

test("الساعات متّصلةٌ بلا فجوات", () => {
  const { from, hours } = ladderRange([s("a", 9, 11)]);
  hours.forEach((h, i) => assert.equal(h, from + i));
});
