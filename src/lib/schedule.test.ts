/* اختبار توسيع تكرار جدول اليوم — المنطق الذي كان مكرّراً في DayScheduler و calendar/plan.
   تشغيل: TZ=UTC npx tsx --test src/lib/schedule.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { dayOfWeek, occursOn, getEventsForDate, studyMinutesOn, currentEvent, nextEvent } from "./schedule";
import type { ScheduleEvent } from "./storage";

/* 2026-07-29 أربعاء (3) · 2026-07-30 خميس (4) */
const WED = "2026-07-29";
const THU = "2026-07-30";

const ev = (p: Partial<ScheduleEvent> & Pick<ScheduleEvent, "id" | "recurrence">): ScheduleEvent => ({
  type: "study", fromHour: 16, toHour: 17.5, ...p,
});

test("dayOfWeek يقرأ اليوم ظهراً فلا تزيحه المنطقة الزمنية", () => {
  assert.equal(dayOfWeek(WED), 3);
  assert.equal(dayOfWeek(THU), 4);
});

test("occursOn: once ينطبق على تاريخه وحده", () => {
  const e = ev({ id: "a", recurrence: { kind: "once", date: WED } });
  assert.equal(occursOn(e, WED), true);
  assert.equal(occursOn(e, THU), false);
});

test("occursOn: weekly ينطبق على يوم الأسبوع نفسه", () => {
  const e = ev({ id: "a", recurrence: { kind: "weekly", dayOfWeek: 3 } });
  assert.equal(occursOn(e, WED), true);
  assert.equal(occursOn(e, THU), false);
});

test("occursOn: daily يبدأ من تاريخه ولا يسبقه", () => {
  const e = ev({ id: "a", recurrence: { kind: "daily", fromDate: WED } });
  assert.equal(occursOn(e, "2026-07-28"), false);
  assert.equal(occursOn(e, WED), true);
  assert.equal(occursOn(e, "2026-12-31"), true);
});

test("occursOn: multiweekly ينطبق على الأيام المختارة فقط", () => {
  const e = ev({ id: "a", recurrence: { kind: "multiweekly", days: [3, 6] } });
  assert.equal(occursOn(e, WED), true);
  assert.equal(occursOn(e, THU), false);
});

test("getEventsForDate يرتّب بالوقت", () => {
  const list = [
    ev({ id: "late", fromHour: 19, toHour: 20, recurrence: { kind: "daily", fromDate: WED } }),
    ev({ id: "early", fromHour: 8, toHour: 9, recurrence: { kind: "daily", fromDate: WED } }),
    ev({ id: "other-day", recurrence: { kind: "once", date: THU } }),
  ];
  assert.deepEqual(getEventsForDate(WED, list).map((e) => e.id), ["early", "late"]);
});

test("studyMinutesOn يجمع المذاكرة وحدها لا المشغول", () => {
  const list = [
    ev({ id: "s1", fromHour: 16, toHour: 17.5, recurrence: { kind: "daily", fromDate: WED } }), // 90
    ev({ id: "s2", fromHour: 19, toHour: 20, recurrence: { kind: "daily", fromDate: WED } }),   // 60
    ev({ id: "b1", type: "busy", label: "نادٍ", fromHour: 21, toHour: 22, recurrence: { kind: "daily", fromDate: WED } }),
  ];
  assert.equal(studyMinutesOn(WED, list), 150);
  assert.equal(studyMinutesOn("2026-07-28", list), 0, "قبل بداية التكرار ⇒ صفر");
});

test("currentEvent/nextEvent يقرآن الساعة العشرية", () => {
  const list = getEventsForDate(WED, [
    ev({ id: "a", fromHour: 16, toHour: 17.5, recurrence: { kind: "daily", fromDate: WED } }),
    ev({ id: "b", fromHour: 19, toHour: 20, recurrence: { kind: "daily", fromDate: WED } }),
  ]);
  assert.equal(currentEvent(list, 16.75)?.id, "a");
  assert.equal(currentEvent(list, 17.5), null, "نهايةُ الجلسة ليست داخلها");
  assert.equal(nextEvent(list, 16.75)?.id, "b");
  assert.equal(nextEvent(list, 21), null, "لا جلسة بعد اليوم");
});
