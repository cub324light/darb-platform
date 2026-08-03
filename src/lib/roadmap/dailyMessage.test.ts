import { test } from "node:test";
import assert from "node:assert/strict";
import { pickDailyMessage } from "./dailyMessage";

test("pickDailyMessage: ترحيبٌ بالاسم — ويتبدّل، لا سطرٌ واحدٌ للأبد", () => {
  const say = (r: number) => pickDailyMessage({ name: "محمد", everStarted: true, hour: 14, rand: r }).greeting;
  for (let k = 0; k < 20; k++) assert.ok(say(k / 20).includes("محمد"), "سقط الاسم من التحيّة");
  assert.ok(new Set(Array.from({ length: 20 }, (_, k) => say(k / 20))).size >= 5, "تحيّةٌ واحدةٌ لا تتبدّل");

  const bare = pickDailyMessage({ everStarted: true, hour: 14, rand: 0.3 }).greeting;
  assert.ok(bare.length > 0 && !/\s(يا|بـ)$/.test(bare), `تحيّةٌ معلّقةٌ بلا اسم: «${bare}»`);
});

test("pickDailyMessage: الرسالة تتبع حالة الطالب الحقيقية", () => {
  // لم يبدأ
  assert.ok(pickDailyMessage({ everStarted: false }).message.includes("أوّل خطوة"));
  // انقطع (سلسلة صفر)
  assert.ok(pickDailyMessage({ everStarted: true, streakDays: 0 }).message.includes("من زمان"));
  // اختبارٌ قريبٌ جداً
  assert.ok(pickDailyMessage({ everStarted: true, streakDays: 3, daysToExam: 10 }).message.includes("10"));
  // اجتهد أمس
  assert.ok(pickDailyMessage({ everStarted: true, streakDays: 3, daysToExam: 100, yesterdayMins: 90 }).message.includes("اجتهدت"));
  // افتراضي
  assert.ok(pickDailyMessage({ everStarted: true, streakDays: 3, daysToExam: 100, yesterdayMins: 20 }).message.includes("الطريق الصحيح"));
});
