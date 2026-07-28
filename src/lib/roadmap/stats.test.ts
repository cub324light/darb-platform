import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStats } from "./stats";
import type { StudySessionLog } from "./session";

const dayMins: Record<string, number> = {
  "2026-08-14": 45, "2026-08-13": 60, "2026-08-12": 30, "2026-08-11": 0,
  "2026-08-10": 90, "2026-08-09": 0, "2026-08-08": 50,
};
const sessions: StudySessionLog[] = [
  { id: "s1", examId: "qudurat", subject: "لفظي", taskKind: "review", startedAt: Date.UTC(2026, 7, 13, 20, 0), durationMins: 40 },
  { id: "s2", examId: "qudurat", subject: "كمي", taskKind: "drill", startedAt: Date.UTC(2026, 7, 10, 20, 30), durationMins: 30 },
];

test("computeStats: بطاقة هذا الأسبوع (ساعات · جلسات · سلسلة · التزام)", () => {
  const s = computeStats({ dayMins, sessions, today: "2026-08-14", plannedDailyMins: 60 });
  assert.equal(s.week.hours, 4.6);        // 275 دقيقة ÷ 60
  assert.equal(s.week.sessions, 2);
  assert.equal(s.week.streakDays, 3);     // 12·13·14
  assert.equal(s.week.commitmentPct, 65); // 275 ÷ (60×7)
});

test("computeStats: Heatmap + الشهر + مقارنةٌ صادقة", () => {
  const s = computeStats({ dayMins, sessions, today: "2026-08-14" });
  assert.equal(s.heatmap.length, 84);
  assert.equal(s.heatmap[s.heatmap.length - 1].day, "2026-08-14");
  assert.equal(s.heatmap[s.heatmap.length - 1].level, 2); // 45 دقيقة ⇒ مستوى 2 (≥30)
  assert.equal(s.monthHours, 4.6);
  assert.equal(s.vsLastMonthPct.available, false); // لا شهرٌ سابق ⇒ لا مقارنة (صدق)
});

test("computeStats: القمم + السلسلة + الانقطاع", () => {
  const s = computeStats({ dayMins, sessions, today: "2026-08-14" });
  assert.equal(s.longestStreak, 3);
  assert.equal(s.breakDays, 2);           // 09 و 11 بين أيامٍ نشطة
  assert.equal(s.bestWeek.available, true);
  assert.equal(s.bestWeek.value?.hours, 4.6);
  assert.equal(s.topSubject.value?.subject, "لفظي"); // 40 > 30
  assert.equal(s.topExam.value?.examId, "qudurat");
  assert.equal(s.topHour.value?.hour, 20);
});

test("computeStats: بلا جلساتٍ ⇒ القمم حالةٌ فارغةٌ صادقة (لا اختراع)", () => {
  const s = computeStats({ dayMins, sessions: [], today: "2026-08-14" });
  assert.equal(s.topSubject.available, false);
  assert.equal(s.topHour.available, false);
  assert.equal(s.topExam.available, false);
});
