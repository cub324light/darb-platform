import { test } from "node:test";
import assert from "node:assert/strict";
import {
  occursOnDay, eventsOnDay, groupUpcoming, availableStudyMinutes, warnsPlanChange,
  minutesBetween, kindMeta, type CalendarEvent,
} from "./calendar";

const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({
  id: "x", title: "حدث", kind: "other", start: "2026-08-14T12:00", end: "2026-08-14T13:00",
  recurrence: "none", impact: "busy", source: "local", ...p,
});

test("occursOnDay: none (نطاقٌ متّصل) / daily / weekly / monthly", () => {
  const trip = ev({ start: "2026-08-14T00:00", end: "2026-08-16T23:59", allDay: true, recurrence: "none" });
  assert.equal(occursOnDay(trip, "2026-08-13"), false);
  assert.equal(occursOnDay(trip, "2026-08-14"), true);
  assert.equal(occursOnDay(trip, "2026-08-16"), true);
  assert.equal(occursOnDay(trip, "2026-08-17"), false);

  const daily = ev({ start: "2026-08-01T05:00", recurrence: "daily" });
  assert.equal(occursOnDay(daily, "2026-07-31"), false);
  assert.equal(occursOnDay(daily, "2026-08-20"), true);

  const weekly = ev({ start: "2026-08-01T10:00", recurrence: "weekly" });
  assert.equal(occursOnDay(weekly, "2026-08-08"), true);   // +٧ نفس اليوم
  assert.equal(occursOnDay(weekly, "2026-08-02"), false);  // يومٌ مختلف

  const monthly = ev({ start: "2026-08-14T10:00", recurrence: "monthly" });
  assert.equal(occursOnDay(monthly, "2026-09-14"), true);
  assert.equal(occursOnDay(monthly, "2026-09-15"), false);
});

test("eventsOnDay + groupUpcoming: القريب أولاً", () => {
  const today = "2026-08-14";
  const events = [
    ev({ id: "a", start: "2026-08-14T12:00", end: "2026-08-14T13:30" }),           // اليوم
    ev({ id: "b", start: "2026-08-15T18:00", end: "2026-08-15T21:00" }),           // غداً
    ev({ id: "c", start: "2026-08-19T00:00", end: "2026-08-19T23:59", kind: "exam" }), // خلال الأسبوع
    ev({ id: "d", start: "2026-09-10T00:00", end: "2026-09-10T23:59" }),           // لاحقاً
  ];
  assert.deepEqual(eventsOnDay(events, today).map((e) => e.id), ["a"]);
  const g = groupUpcoming(events, today);
  assert.deepEqual(g.today.map((e) => e.id), ["a"]);
  assert.deepEqual(g.tomorrow.map((e) => e.id), ["b"]);
  assert.deepEqual(g.week.map((e) => e.id), ["c"]);
  assert.deepEqual(g.later.map((e) => e.id), ["d"]);
});

test("availableStudyMinutes: block/busy/reduce", () => {
  const base = 120;
  assert.equal(availableStudyMinutes({ baseMinutes: base, dayEvents: [] }).availableMinutes, 120);

  const allDayBlock = availableStudyMinutes({ baseMinutes: base, dayEvents: [{ impact: "block", start: "", end: "", allDay: true }] });
  assert.equal(allDayBlock.availableMinutes, 0);
  assert.equal(allDayBlock.blocked, true);

  // busy ساعة ⇒ ينقص ٦٠
  assert.equal(availableStudyMinutes({ baseMinutes: base, dayEvents: [{ impact: "busy", start: "2026-08-14T10:00", end: "2026-08-14T11:00" }] }).availableMinutes, 60);
  // reduce ⇒ النصف (config.reduceFactor=0.5)
  const red = availableStudyMinutes({ baseMinutes: base, dayEvents: [{ impact: "reduce", start: "2026-08-14T18:00", end: "2026-08-14T20:00" }] });
  assert.equal(red.availableMinutes, 60);
  assert.equal(red.adjusted, true);
});

test("minutesBetween + warnsPlanChange + kindMeta", () => {
  assert.equal(minutesBetween("2026-08-14T10:00", "2026-08-14T11:30"), 90);
  assert.equal(minutesBetween("2026-08-14T11:00", "2026-08-14T10:00"), 0); // سالب ⇒ ٠
  assert.equal(warnsPlanChange({ kind: "travel", impact: "block" }), true);
  assert.equal(warnsPlanChange({ kind: "occasion", impact: "reduce" }), true);
  assert.equal(warnsPlanChange({ kind: "prayer", impact: "busy" }), false);
  assert.equal(kindMeta("travel").icon, "✈️");
});
