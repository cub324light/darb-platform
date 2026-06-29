/* اختبارات منطق المحدّد الدائم (H-1/M-5/M-6) —
   تشغيل: npx tsx --test src/lib/server/rateLimit.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rateStep, dailyStep, dayKeyUTC, type RateState, type DailyState } from "./rateLimit";

/* ── نافذة منزلقة (M-6) ── */
test("rateStep: أول طلب يُسمح ويبدأ النافذة", () => {
  const r = rateStep(null, 1000, 5, 60_000);
  assert.equal(r.allow, true);
  assert.deepEqual(r.next, { count: 1, reset: 1000 + 60_000 });
});

test("rateStep: يعدّ حتى الحدّ ثم يمنع", () => {
  let state: RateState | null = null;
  const now = 1000;
  for (let i = 1; i <= 5; i++) {
    const r = rateStep(state, now, 5, 60_000);
    assert.equal(r.allow, true, `الطلب ${i} مسموح`);
    state = r.next;
  }
  // السادس ضمن النافذة → ممنوع
  const blocked = rateStep(state, now + 1000, 5, 60_000);
  assert.equal(blocked.allow, false);
  assert.equal(blocked.next, null, "لا كتابة عند المنع");
});

test("rateStep: تنتهي النافذة فتُصفَّر (لا يُصفَّر مع instance — الحالة في Firestore)", () => {
  const state: RateState = { count: 5, reset: 2000 };
  const after = rateStep(state, 2001, 5, 60_000); // بعد انتهاء reset
  assert.equal(after.allow, true);
  assert.deepEqual(after.next, { count: 1, reset: 2001 + 60_000 });
});

test("rateStep: المنطق مستقل عن الـ instance (يعتمد فقط على الحالة المخزّنة)", () => {
  // نفس الحالة المخزّنة تعطي نفس القرار أياً كان الـ instance ⇒ لا تجاوز بإعادة التشغيل
  const state: RateState = { count: 5, reset: 9_999_999 };
  assert.equal(rateStep(state, 1000, 5, 60_000).allow, false);
  assert.equal(rateStep(state, 1000, 5, 60_000).allow, false);
});

/* ── الحدّ اليومي (M-5) ── */
test("dailyStep: يعدّ خلال اليوم ثم يمنع", () => {
  let s: DailyState | null = null;
  for (let i = 1; i <= 3; i++) { const r = dailyStep(s, "2026-06-29", 3); assert.equal(r.allow, true); s = r.next; }
  const blocked = dailyStep(s, "2026-06-29", 3);
  assert.equal(blocked.allow, false, "تجاوز الحدّ اليومي → منع");
});

test("dailyStep: يُصفَّر مع تغيّر اليوم", () => {
  const s: DailyState = { day: "2026-06-29", count: 3 };
  const nextDay = dailyStep(s, "2026-06-30", 3);
  assert.equal(nextDay.allow, true, "يوم جديد → سماح");
  assert.deepEqual(nextDay.next, { day: "2026-06-30", count: 1 });
});

test("dayKeyUTC ثابت لليوم نفسه عبر الساعات", () => {
  const a = dayKeyUTC(Date.UTC(2026, 5, 29, 1, 0, 0));
  const b = dayKeyUTC(Date.UTC(2026, 5, 29, 23, 0, 0));
  assert.equal(a, b);
  assert.equal(a, "2026-06-29");
  assert.notEqual(dayKeyUTC(Date.UTC(2026, 5, 30, 0, 0, 0)), a);
});
