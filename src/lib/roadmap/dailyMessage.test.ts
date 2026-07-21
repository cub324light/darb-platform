import { test } from "node:test";
import assert from "node:assert/strict";
import { pickDailyMessage } from "./dailyMessage";

test("pickDailyMessage: ترحيبٌ بالاسم", () => {
  assert.equal(pickDailyMessage({ name: "محمد", everStarted: true }).greeting, "السلام عليكم يا محمد 👋");
  assert.equal(pickDailyMessage({ everStarted: true }).greeting, "السلام عليكم 👋");
});

test("pickDailyMessage: الرسالة تتبع حالة الطالب الحقيقية", () => {
  // لم يبدأ
  assert.ok(pickDailyMessage({ everStarted: false }).message.includes("أوّل خطوة"));
  // انقطع (سلسلة صفر)
  assert.ok(pickDailyMessage({ everStarted: true, streakDays: 0 }).message.includes("من زمان"));
  // اختبارٌ قريبٌ جداً
  assert.ok(pickDailyMessage({ everStarted: true, streakDays: 3, daysToExam: 10 }).message.includes("١٠"));
  // اجتهد أمس
  assert.ok(pickDailyMessage({ everStarted: true, streakDays: 3, daysToExam: 100, yesterdayMins: 90 }).message.includes("اجتهدت"));
  // افتراضي
  assert.ok(pickDailyMessage({ everStarted: true, streakDays: 3, daysToExam: 100, yesterdayMins: 20 }).message.includes("الطريق الصحيح"));
});
