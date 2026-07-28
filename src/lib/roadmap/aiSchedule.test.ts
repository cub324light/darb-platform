import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeDigits, hhmm, parseSlots, slotsToEvents } from "./aiSchedule";

const SUBJ = ["لفظي", "كمي"];
const ids = (i: number) => `e${i}`;

test("normalizeDigits يحوّل العربية-الهندية", () => {
  assert.equal(normalizeDigits("من 8 إلى 10"), "من 8 إلى 10");
  assert.equal(normalizeDigits("abc"), "abc");
});

test("hhmm يبني وقتاً بخانتين", () => {
  assert.equal(hhmm(8), "08:00");
  assert.equal(hhmm(8.5), "08:30");
  assert.equal(hhmm(20.25), "20:15");
  assert.equal(hhmm(13.999), "14:00", "التقريب لا ينتج 60 دقيقة");
});

test("parseSlots يقرأ الصيغة المفروضة على النموذج", () => {
  const t = ["من 8 ص إلى 9 ص — لفظي", "من 9 ص إلى 9:15 ص — راحة", "من 5 م إلى 7 م — كمي"].join("\n");
  const slots = parseSlots(t, SUBJ);
  assert.equal(slots.length, 3);
  assert.deepEqual(slots.map((s) => [s.fromHour, s.toHour]), [[8, 9], [9, 9.25], [17, 19]]);
  assert.equal(slots[0].subject, "لفظي");
  assert.equal(slots[1].isBreak, true);
  assert.equal(slots[2].subject, "كمي");
});

test("ص/م تُحوَّل إلى 24 ساعة صحيحاً", () => {
  assert.deepEqual(parseSlots("من 12 ص إلى 1 ص — لفظي", SUBJ).map((s) => [s.fromHour, s.toHour]), [[0, 1]]);
  assert.deepEqual(parseSlots("من 12 م إلى 1 م — لفظي", SUBJ).map((s) => [s.fromHour, s.toHour]), [[12, 13]]);
});

test("تُتجاهَل الأسطر المستحيلة والمتداخلة", () => {
  /* نهايةٌ قبل البداية · تجاوز اليوم · تداخل */
  const t = ["من 10 ص إلى 8 ص — لفظي", "من 8 ص إلى 25 — كمي", "من 8 ص إلى 10 ص — لفظي", "من 9 ص إلى 11 ص — كمي"].join("\n");
  const slots = parseSlots(t, SUBJ);
  assert.equal(slots.length, 1);
  assert.deepEqual([slots[0].fromHour, slots[0].toHour], [8, 10]);
});

test("سطرٌ لا يطابق الصيغة يُتجاهَل بلا انهيار", () => {
  assert.deepEqual(parseSlots("كلامٌ عامّ بلا جدول\n\n", SUBJ), []);
  assert.deepEqual(parseSlots("", SUBJ), []);
});

test("slotsToEvents يبني CalendarEvent صالحاً ويستبعد الراحات", () => {
  const t = ["من 8 ص إلى 9 ص — لفظي", "من 9 ص إلى 9:30 ص — راحة"].join("\n");
  const evs = slotsToEvents(t, { date: "2026-07-29", subjects: SUBJ, idOf: ids });
  assert.equal(evs.length, 1, "الراحة لا تُحفَظ في التقويم");
  const e = evs[0];
  assert.equal(e.id, "e0");
  assert.equal(e.title, "مذاكرة لفظي");
  assert.equal(e.start, "2026-07-29T08:00");
  assert.equal(e.end, "2026-07-29T09:00");
  assert.equal(e.recurrence, "none");
  assert.equal(e.impact, "busy");
  assert.equal(e.source, "local");
});

test("فترةٌ بلا مادةٍ معروفة تحفظ عنوانها كما هو", () => {
  const evs = slotsToEvents("من 4 م إلى 6 م — نادي كرة القدم", { date: "2026-07-29", subjects: SUBJ, idOf: ids });
  assert.equal(evs[0].title, "نادي كرة القدم");
});

test("نصٌّ بلا جدولٍ ⇒ لا أحداث (لا اختراع)", () => {
  assert.deepEqual(slotsToEvents("ما فهمت طلبك", { date: "2026-07-29", subjects: SUBJ, idOf: ids }), []);
});
