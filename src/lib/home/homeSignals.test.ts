/* اختبار إشارات الرئيسية — تشغيل: TZ=UTC npx tsx --test src/lib/home/homeSignals.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { upcomingMilestones, officialUpdates, OFFICIAL_UPDATES } from "./homeSignals";

test("قريباً: مواعيد مستقبلية فقط، مرتّبةٌ بالأقرب، ضمن الأفق", () => {
  /* اليوم قبل موسم قياس 1447 (٢٠٢٥-٠٨-٢٥): يظهر «فتح التسجيل» ٢٠٢٥-٠٩-٠١ أولاً */
  const ms = upcomingMilestones({ today: "2025-08-25", horizonDays: 120 });
  assert.ok(ms.length > 0, "توجد مواعيد قادمة");
  assert.ok(ms.every((m) => m.date > "2025-08-25"), "كلها مستقبلية");
  for (let i = 1; i < ms.length; i++) assert.ok(ms[i - 1].date <= ms[i].date, "مرتّبة تصاعدياً");
  assert.equal(ms[0].kind, "reg-open");
  assert.ok(ms[0].daysUntil >= 0);
});

test("قريباً: الأفق يقصي البعيد؛ والحدّ يقيّد العدد", () => {
  const near = upcomingMilestones({ today: "2025-08-25", horizonDays: 5 });
  assert.ok(near.every((m) => m.daysUntil <= 5));
  const capped = upcomingMilestones({ today: "2025-08-01", horizonDays: 400, limit: 3 });
  assert.ok(capped.length <= 3);
});

test("قريباً: يُضيف «إعلان النتيجة المتوقّع» من نتائج الطالب المنتظَرة", () => {
  /* اختبار محوسب ٢٠٢٦-٠٧-١٥ → النتيجة المتوقّعة ٢٠٢٦-٠٧-١٨ (٣ أيام) */
  const ms = upcomingMilestones({
    today: "2026-07-16", horizonDays: 30,
    pending: [{ exam: "qudurat", mode: "computer", testDate: "2026-07-15" }],
  });
  const res = ms.find((m) => m.kind === "result");
  assert.ok(res, "توجد بطاقة إعلان نتيجة");
  assert.equal(res!.date, "2026-07-18");
  assert.ok(res!.title.includes("القدرات"));
  /* STEP لا يُنتج تقدير موعد */
  const noStep = upcomingMilestones({ today: "2026-07-16", pending: [{ exam: "step", mode: "paper", testDate: "2026-07-15" }] });
  assert.equal(noStep.find((m) => m.kind === "result"), undefined);
});

test("آخر التحديثات: مرتّبةٌ بالأحدث، وكلها جهاتٌ رسمية بروابط", () => {
  const list = officialUpdates();
  assert.equal(list.length, OFFICIAL_UPDATES.length);
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].updatedAt >= list[i].updatedAt, "الأحدث أولاً");
  assert.ok(list.every((u) => u.url.startsWith("https://") && u.entity && u.title));
});
