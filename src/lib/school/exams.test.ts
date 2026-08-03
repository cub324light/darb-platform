/* اختبارُ اختبارات المدرسة.
   تشغيل: npx tsx --test src/lib/school/exams.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addExam, updateExam, removeExam, upcomingExams, pastExams, examsOn,
  daysTo, whenLabel, isSoon, LIMITS, type SchoolExam,
} from "./exams";

const AT = 1_700_000_000_000;
const TODAY = "2026-08-03";

const add = (all: SchoolExam[], over: Partial<SchoolExam> & { id: string; subject: string; date: string }): SchoolExam[] => {
  const r = addExam(all, { at: AT, ...over });
  assert.ok(r.ok, `فشلت إضافة ${over.subject}`);
  return r.exams;
};

test("الإضافة تُنظّف الحقول وتحفظ التحديد وكلام المدرّس", () => {
  const r = addExam([], {
    id: "a", subject: "  رياضيات ", date: "2026-08-09",
    scope: "  من الفصل الثالث إلى الخامس ", teacherName: " أ. محمد ",
    teacherSaid: " قال: من الكتاب لا من الملزمة ", at: AT,
  });
  assert.ok(r.ok);
  const e = r.exams[0];
  assert.equal(e.subject, "رياضيات");
  assert.equal(e.scope, "من الفصل الثالث إلى الخامس");
  assert.equal(e.teacherName, "أ. محمد");
  assert.equal(e.teacherSaid, "قال: من الكتاب لا من الملزمة");
});

test("الحقولُ الفارغة تصير غيرَ معرَّفة لا سلاسلَ فارغة", () => {
  const r = addExam([], { id: "a", subject: "فيزياء", date: "2026-08-09", scope: "   ", teacherSaid: "", at: AT });
  assert.ok(r.ok);
  assert.equal(r.exams[0].scope, undefined);
  assert.equal(r.exams[0].teacherSaid, undefined);
});

test("بلا مادّةٍ لا اختبار، وبتاريخٍ غيرِ صحيحٍ لا اختبار", () => {
  const noSubj = addExam([], { id: "a", subject: "  ", date: "2026-08-09", at: AT });
  assert.ok(!noSubj.ok); assert.equal(noSubj.reason, "empty");

  const badDate = addExam([], { id: "a", subject: "كيمياء", date: "الأحد", at: AT });
  assert.ok(!badDate.ok); assert.equal(badDate.reason, "bad-date");
});

test("الحدُّ الأعلى يوقف", () => {
  let all: SchoolExam[] = [];
  for (let i = 0; i < LIMITS.maxExams; i++) all = add(all, { id: `e${i}`, subject: "مادة", date: "2026-08-09" });
  const over = addExam(all, { id: "x", subject: "زائد", date: "2026-08-09", at: AT });
  assert.ok(!over.ok); assert.equal(over.reason, "full");
});

test("القادمُ يشمل اليوم، والأقربُ أوّلاً", () => {
  let all = add([], { id: "c", subject: "أحياء", date: "2026-08-20" });
  all = add(all, { id: "a", subject: "رياضيات", date: TODAY });
  all = add(all, { id: "b", subject: "فيزياء", date: "2026-08-10" });
  all = add(all, { id: "old", subject: "قديم", date: "2026-07-01" });

  assert.deepEqual(upcomingExams(all, TODAY).map((e) => e.id), ["a", "b", "c"]);
  assert.deepEqual(pastExams(all, TODAY).map((e) => e.id), ["old"]);
  assert.deepEqual(examsOn(all, TODAY).map((e) => e.id), ["a"]);
});

test("التعديل يغيّر ما طُلب وحده، ويرفض تاريخاً غيرَ صحيح", () => {
  const all = add([], { id: "a", subject: "رياضيات", date: "2026-08-09", scope: "الفصل الثالث" });
  const up = updateExam(all, "a", { scope: "الفصل الرابع" });
  assert.equal(up[0].scope, "الفصل الرابع");
  assert.equal(up[0].subject, "رياضيات", "غيّر المادة بلا طلب");
  assert.equal(all[0].scope, "الفصل الثالث", "غيّر الأصل — ليس نقيّاً");

  assert.equal(updateExam(all, "a", { date: "غداً" })[0].date, "2026-08-09", "قَبِل تاريخاً غيرَ صحيح");
  assert.equal(updateExam(all, "a", { subject: "   " })[0].subject, "رياضيات", "فرّغ المادة");
  assert.equal(removeExam(all, "a").length, 0);
});

test("daysTo يحسب الفرق بالإشارة", () => {
  assert.equal(daysTo(TODAY, TODAY), 0);
  assert.equal(daysTo(TODAY, "2026-08-06"), 3);
  assert.equal(daysTo(TODAY, "2026-08-01"), -2);
});

test("whenLabel: «اليوم» و«غداً» أوضحُ من رقم", () => {
  assert.equal(whenLabel(TODAY, TODAY), "اليوم");
  assert.equal(whenLabel(TODAY, "2026-08-04"), "غداً");
  assert.equal(whenLabel(TODAY, "2026-08-05"), "بعد غد");
  assert.equal(whenLabel(TODAY, "2026-08-06"), "بعد 3 أيام");
  assert.equal(whenLabel(TODAY, "2026-08-20"), "بعد 17 يوماً");
  assert.equal(whenLabel(TODAY, "2026-08-01"), "مضى");
});

test("isSoon: ثلاثةُ أيامٍ فأقلّ، ولا شيءَ لما مضى", () => {
  assert.ok(isSoon(TODAY, TODAY));
  assert.ok(isSoon(TODAY, "2026-08-06"));
  assert.ok(!isSoon(TODAY, "2026-08-07"));
  assert.ok(!isSoon(TODAY, "2026-08-01"));
});

test("المحرّك نقيّ: لا تخزين ولا نافذة ولا وقت", async () => {
  const { readFileSync } = await import("node:fs");
  const code = readFileSync("src/lib/school/exams.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  for (const bad of ["localStorage", "window.", "new Date(", "Date.now("]) {
    assert.ok(!code.includes(bad), `المحرّك يلمس ${bad}`);
  }
});
