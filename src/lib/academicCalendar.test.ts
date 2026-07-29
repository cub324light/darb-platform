/* اختبار التقويم الدراسي — وأهمّه حارسُ الصلاحية.
   تشغيل: npx tsx --test src/lib/academicCalendar.test.ts

   الخلفية: بقي التطبيق شهوراً يعرض «مُحدَّث لـ 1447هـ» وبياناتُه تنتهي في أغسطس
   2026 — لا اختبارٌ يسقط ولا بناءٌ يشتكي، فما اكتُشف إلا بفحصٍ يدويّ. البياناتُ
   الموقوتة تحتاج حارساً موقوتاً: هذا الملفّ يُسقط البناء **قبل** أن تنفد التغطية،
   لا بعدها. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SAUDI_ACADEMIC_YEARS, CALENDAR_UPDATED_FOR, resolveCalendar,
} from "./academicCalendar";

const ts = (d: string) => new Date(d + "T12:00:00").getTime();
const DAY = 86_400_000;

/* آخر يومٍ يغطّيه التقويم فعلاً (أبعدُ نهايةِ فترة في أحدث عام) */
const coverageEnd = (): number => {
  const last = SAUDI_ACADEMIC_YEARS[SAUDI_ACADEMIC_YEARS.length - 1];
  return last.periods.reduce((mx, p) => Math.max(mx, ts(p.end)), ts(last.schoolEnd));
};

/* ═══ حارسُ الصلاحية ═══
   ستّون يوماً مهلةٌ كافية لإضافة العام التالي بعد إعلان الوزارة، وغيرُ كافيةٍ
   لنسيانه. إن سقط هذا الاختبار فالمطلوب بيانات، لا تعديلُ الاختبار. */
test("التقويم لم يوشك على النفاد (حارسُ التحديث السنوي)", () => {
  const daysLeft = Math.round((coverageEnd() - Date.now()) / DAY);
  assert.ok(
    daysLeft > 60,
    `تغطيةُ التقويم تنتهي بعد ${daysLeft} يوماً. أضِف العام الدراسي التالي إلى ` +
    `SAUDI_ACADEMIC_YEARS من مصدرٍ رسميّ (moe.gov.sa) وحدّث CALENDAR_UPDATED_FOR. ` +
    `لا تُمدّد التواريخ تخميناً.`,
  );
});

test("العنوان المعروض يطابق أحدث عامٍ في البيانات", () => {
  const newest = SAUDI_ACADEMIC_YEARS[SAUDI_ACADEMIC_YEARS.length - 1];
  assert.ok(
    CALENDAR_UPDATED_FOR.includes(newest.id),
    `«${CALENDAR_UPDATED_FOR}» لا يذكر ${newest.id} — العنوان يكذب على الطالب`,
  );
});

/* ═══ سلامة البيانات ═══ */

test("كل عام: الفترات مرتّبةٌ منطقياً وداخل حدوده", () => {
  for (const y of SAUDI_ACADEMIC_YEARS) {
    assert.ok(ts(y.schoolStart) < ts(y.schoolEnd), `${y.id}: البداية بعد النهاية`);
    assert.ok(y.source.trim().length > 0, `${y.id}: بلا مصدر`);
    for (const p of y.periods) {
      assert.ok(ts(p.start) <= ts(p.end), `${y.id}/${p.label}: تبدأ بعد أن تنتهي`);
    }
  }
});

test("الأعوام متتابعة بلا فجوة بين نهاية عامٍ وبداية تاليه", () => {
  for (let i = 1; i < SAUDI_ACADEMIC_YEARS.length; i++) {
    const prev = SAUDI_ACADEMIC_YEARS[i - 1], cur = SAUDI_ACADEMIC_YEARS[i];
    assert.ok(ts(prev.id) < ts(cur.id) || prev.id < cur.id, "الأعوام غير مرتّبة تصاعدياً");
    const prevLast = prev.periods.reduce((mx, p) => Math.max(mx, ts(p.end)), ts(prev.schoolEnd));
    const gap = Math.round((ts(cur.schoolStart) - prevLast) / DAY);
    assert.ok(gap >= 0 && gap <= 1, `فجوةٌ ${gap} يوماً بين ${prev.id} و${cur.id}`);
  }
});

test("لا تتداخل فترتان من النوع نفسه داخل العام", () => {
  for (const y of SAUDI_ACADEMIC_YEARS) {
    const terms = y.periods.filter((p) => p.kind === "term")
      .sort((a, b) => ts(a.start) - ts(b.start));
    for (let i = 1; i < terms.length; i++) {
      assert.ok(ts(terms[i].start) > ts(terms[i - 1].end),
        `${y.id}: «${terms[i].label}» تبدأ قبل انتهاء «${terms[i - 1].label}»`);
    }
  }
});

/* ═══ 1448: العودة إلى فصلين ═══ */

test("1448 عامٌ بفصلين (لا ثلاثة) وبياناته حاضرة", () => {
  const y = SAUDI_ACADEMIC_YEARS.find((x) => x.id === "1448");
  assert.ok(y, "1448 غير موجود");
  assert.equal(y!.periods.filter((p) => p.kind === "term").length, 2);
  assert.equal(y!.schoolStart, "2026-08-23");   // 10 ربيع الأول 1448
  assert.equal(y!.schoolEnd, "2027-06-24");     // 19 محرم 1449
});

test("لا نخترع اختبارات مدرسية لـ1448 قبل إعلانها", () => {
  const y = SAUDI_ACADEMIC_YEARS.find((x) => x.id === "1448")!;
  assert.equal(y.periods.filter((p) => p.kind === "school_finals").length, 0,
    "أُضيفت نوافذ اختبارات — إن كانت رسميةً فاحذف هذا الاختبار، وإلا فهي تخمين");
});

/* ═══ القراءة عبر السنة ═══ */

test("أول يومٍ دراسي في 1448 يُقرأ «دراسة» لا «إجازة»", () => {
  const s = resolveCalendar(new Date("2026-08-23T12:00:00"));
  assert.equal(s.hasData, true);
  assert.equal(s.yearId, "1448");
  assert.equal(s.onVacation, false);
  assert.equal(s.phase, "study");
});

test("إجازة منتصف عام 1448 تُقرأ إجازة", () => {
  const s = resolveCalendar(new Date("2027-01-12T12:00:00"));
  assert.equal(s.yearId, "1448");
  assert.equal(s.onVacation, true);
});

test("صيف 1447 (قبل بداية 1448) يبقى صيفاً لا يُنسب إلى العام الجديد", () => {
  const s = resolveCalendar(new Date("2026-07-28T12:00:00"));
  assert.equal(s.yearId, "1447");
  assert.equal(s.phase, "summer");
});
