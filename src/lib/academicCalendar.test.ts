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
  schoolTimeline, daysBetween, periodsOn, primaryPeriodOn,
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

/* ═══ خطُّ الزمن المدرسيّ — «كم باقي؟» و«وشو الجاي؟» ═══ */
test("schoolTimeline: يختار العام الذي نحن فيه", () => {
  const t = schoolTimeline("2026-09-01");
  assert.ok(t, "لا خطَّ زمنٍ ليومٍ داخل العام");
  assert.equal(t.yearId, "1448");
});

test("schoolTimeline: «اليوم» يعرف أننا في الفصل الأول", () => {
  const t = schoolTimeline("2026-09-01")!;
  assert.ok(t.today.some((p) => p.kind === "term"), `توقّعنا فصلاً: ${t.today.map((p) => p.label)}`);
});

test("schoolTimeline: يوم إجازةٍ يُعرف إجازةً", () => {
  const t = schoolTimeline("2026-09-24")!;   // ضمن إجازة اليوم الوطني
  assert.ok(t.today.some((p) => p.kind === "break"), `توقّعنا إجازة: ${t.today.map((p) => p.label)}`);
});

test("schoolTimeline: «القادم» أقربُ فترةٍ لم تبدأ، وعدُّ أيامها صحيح", () => {
  const t = schoolTimeline("2026-09-13")!;   // قبل اليوم الوطني بعشرة أيام
  assert.ok(t.next, "لا فترةَ قادمة");
  assert.equal(t.next.period.start, "2026-09-23");
  assert.equal(t.next.daysAway, 10, "متبقّي عشرة أيام");
});

test("schoolTimeline: القادم مرتَّبٌ تصاعدياً والسابق تنازلياً", () => {
  const t = schoolTimeline("2027-01-20")!;
  for (let i = 1; i < t.upcoming.length; i++) {
    assert.ok(t.upcoming[i].daysAway >= t.upcoming[i - 1].daysAway, "القادم غير مرتَّب");
  }
  assert.ok(t.past.length > 0, "لا فتراتٍ منقضية في منتصف العام؟");
  /* الأحدثُ انقضاءً أولاً — بتاريخ النهاية لا البداية: فصلٌ طويل قد يبدأ قبل
     إجازةٍ قصيرة وينتهي بعدها، فالترتيب بالبداية يقلبهما. */
  for (let i = 1; i < t.past.length; i++) {
    assert.ok(t.past[i].period.end <= t.past[i - 1].period.end, "السابق غير مرتَّب بالنهاية");
  }
});

test("schoolTimeline: طولُ الفترة شاملُ الطرفين", () => {
  const t = schoolTimeline("2026-09-13")!;
  /* إجازة اليوم الوطني 23→26 سبتمبر = أربعة أيام */
  assert.equal(t.next!.days, 4);
});

test("daysBetween: لا يفسده اختلافُ التوقيت", () => {
  assert.equal(daysBetween("2026-09-13", "2026-09-23"), 10);
  assert.equal(daysBetween("2026-09-23", "2026-09-13"), -10);
  assert.equal(daysBetween("2026-03-01", "2026-03-01"), 0);
});

/* العطل الذي كشفه العرض: في الإجازة الصيفية لا فترةَ قادمة داخل العام نفسه،
   فاختفى عدّاد «متبقّي … على الدراسة» في الشهرين اللذين يحتاجه الطالب فيهما
   أكثر من غيرهما. «القادم» يجب أن يعبر حدّ العام. */
test("schoolTimeline: في الصيف يَعُدّ إلى بداية العام التالي", () => {
  const t = schoolTimeline("2026-08-02")!;   // داخل صيف 1447
  assert.ok(t.today.some((p) => p.kind === "summer"), "توقّعنا إجازةً صيفية");
  assert.ok(t.next, "لا عدّادَ في الصيف — وهو أحوجُ وقتٍ إليه");
  assert.equal(t.next.period.start, "2026-08-23", "القادم بدايةُ العام التالي");
  assert.equal(t.next.daysAway, 21);
});

/* ═══ شريطُ التقويم على أيام الشهر ═══ */
test("periodsOn: اليوم الدراسيّ داخل فصلٍ", () => {
  const ps = periodsOn("2026-09-01");
  assert.ok(ps.some((p) => p.kind === "term"), "توقّعنا فصلاً");
});

test("periodsOn: يومٌ في فصلٍ واختباراتِه معاً يُعيدهما", () => {
  const ps = periodsOn("2026-06-10");   // اختبارات الفصل الثالث داخل الفصل
  assert.ok(ps.some((p) => p.kind === "term"));
  assert.ok(ps.some((p) => p.kind === "school_finals"));
});

test("primaryPeriodOn: الأخصُّ يفوز — الإجازةُ والاختبارُ قبل الفصل", () => {
  assert.equal(primaryPeriodOn("2026-06-10")!.kind, "school_finals");
  assert.equal(primaryPeriodOn("2026-09-24")!.kind, "break");
  assert.equal(primaryPeriodOn("2026-09-01")!.kind, "term");
});

test("primaryPeriodOn: إجازة اليوم الوطني بلبلها الخاصّ وحدودها الصحيحة", () => {
  assert.equal(primaryPeriodOn("2026-09-22")!.kind, "term", "قبلها دراسة");
  assert.equal(primaryPeriodOn("2026-09-23")!.label, "إجازة اليوم الوطني");
  assert.equal(primaryPeriodOn("2026-09-26")!.label, "إجازة اليوم الوطني", "شاملةُ الطرفين");
  assert.equal(primaryPeriodOn("2026-09-27")!.kind, "term", "بعدها دراسة");
});

test("primaryPeriodOn: يومٌ خارج أي عامٍ يُعيد null بلا اختراع", () => {
  assert.equal(primaryPeriodOn("2020-01-01"), null);
});
