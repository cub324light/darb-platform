import { test } from "node:test";
import assert from "node:assert/strict";
import {
  splitIntoSections, sectionProgress, sourceProgress, sourcesProgress,
  setSectionDone, toggleSection, buildSource, unitLabel, type StudySource,
} from "./sources";

const mk = (over: Partial<Parameters<typeof buildSource>[0]> = {}) =>
  buildSource({ id: "x", examId: "qudurat", subject: "لفظي", name: "مصدر", kind: "video", totalUnits: 10, sectionCount: 3, ...over });

test("splitIntoSections: المجموع يساوي الإجمالي دائماً", () => {
  for (const [total, count] of [[10, 3], [7, 4], [100, 7], [1, 1], [23, 5]] as const) {
    const secs = splitIntoSections(total, count);
    assert.equal(secs.reduce((a, s) => a + s.units, 0), total, `${total}/${count}`);
  }
});

test("splitIntoSections: الأقسام الأولى تأخذ الزائد", () => {
  assert.deepEqual(splitIntoSections(10, 3).map((s) => s.units), [4, 3, 3]);
  assert.deepEqual(splitIntoSections(9, 3).map((s) => s.units), [3, 3, 3]);
});

test("عناوين الأقسام بأرقامٍ عربية-هندية (قاعدة الخطوط)", () => {
  const titles = splitIntoSections(3, 3).map((s) => s.title);
  assert.deepEqual(titles, ["القسم ١", "القسم ٢", "القسم ٣"]);
  assert.ok(titles.every((t) => !/[0-9]/.test(t)), "لا أرقامَ غربية في العناوين");
  /* المعرّفات تبقى لاتينيةً للتخزين والمقارنة */
  assert.deepEqual(splitIntoSections(3, 3).map((s) => s.id), ["s1", "s2", "s3"]);
});

test("splitIntoSections: لا أقسامَ فارغة ولا قسمة على صفر", () => {
  assert.deepEqual(splitIntoSections(0, 5), []);
  assert.deepEqual(splitIntoSections(-3, 5), []);
  /* أقسامٌ أكثر من الوحدات ⇒ قسمٌ لكل وحدة، لا أقسامٌ بصفر */
  assert.equal(splitIntoSections(3, 10).length, 3);
  assert.ok(splitIntoSections(3, 10).every((s) => s.units === 1));
  assert.equal(splitIntoSections(5, 0).length, 1);
});

test("sectionProgress يقصّ المُنجَز داخل حدود القسم", () => {
  assert.deepEqual(sectionProgress({ id: "s1", title: "ق", units: 4, done: 2 }), { done: 2, total: 4, pct: 50 });
  assert.deepEqual(sectionProgress({ id: "s1", title: "ق", units: 4, done: 99 }), { done: 4, total: 4, pct: 100 });
  assert.deepEqual(sectionProgress({ id: "s1", title: "ق", units: 4, done: -5 }), { done: 0, total: 4, pct: 0 });
  assert.equal(sectionProgress({ id: "s1", title: "ق", units: 0, done: 0 }).pct, 0);
});

test("sourceProgress يجمع الأقسام", () => {
  let s = mk({ totalUnits: 10, sectionCount: 2 });     // [5,5]
  assert.deepEqual(sourceProgress(s), { done: 0, total: 10, pct: 0 });
  s = setSectionDone(s, "s1", 5);
  assert.deepEqual(sourceProgress(s), { done: 5, total: 10, pct: 50 });
});

test("مصدرٌ بلا أقسام لا يسقط من الحساب", () => {
  const s: StudySource = { id: "a", examId: "q", subject: "لفظي", name: "ن", kind: "pages", totalUnits: 40, sections: [] };
  assert.deepEqual(sourceProgress(s), { done: 0, total: 40, pct: 0 });
});

test("toggleSection يبدّل بين مكتملٍ وفارغ", () => {
  let s = mk({ totalUnits: 6, sectionCount: 2 });      // [3,3]
  s = toggleSection(s, "s1");
  assert.equal(sourceProgress(s).done, 3);
  s = toggleSection(s, "s1");
  assert.equal(sourceProgress(s).done, 0);
  /* قسمٌ غير موجود لا يغيّر شيئاً */
  assert.equal(sourceProgress(toggleSection(s, "لا-يوجد")).done, 0);
});

test("setSectionDone لا يغيّر المصدر في مكانه (لا طفرات)", () => {
  const s = mk({ totalUnits: 6, sectionCount: 2 });
  const next = setSectionDone(s, "s1", 3);
  assert.equal(s.sections[0].done, 0, "الأصل لم يتغيّر");
  assert.equal(next.sections[0].done, 3);
  assert.notEqual(s, next);
});

test("sourcesProgress يجمع عدّة مصادر", () => {
  const a = setSectionDone(mk({ id: "a", totalUnits: 10, sectionCount: 2 }), "s1", 5);
  const b = mk({ id: "b", totalUnits: 20, sectionCount: 2 });
  assert.deepEqual(sourcesProgress([a, b]), { done: 5, total: 30, pct: 17 });
  assert.deepEqual(sourcesProgress([]), { done: 0, total: 0, pct: 0 });
});

test("buildSource يحترم الحدود ويعلّم الجاهز", () => {
  const s = buildSource({ id: "i", examId: "q", subject: "لفظي", name: "إيهاب", kind: "video", totalUnits: 12, sectionCount: 4, builtin: true });
  assert.equal(s.builtin, true);
  assert.equal(s.sections.length, 4);
  assert.equal(s.sections.reduce((a, x) => a + x.units, 0), 12);
  assert.equal(buildSource({ id: "i", examId: "q", subject: "س", name: "ن", kind: "pages", totalUnits: -5, sectionCount: 3 }).totalUnits, 0);
  assert.equal(buildSource({ id: "i", examId: "q", subject: "س", name: "ن", kind: "pages", totalUnits: 5, sectionCount: 1 }).builtin, undefined);
});

test("unitLabel يصرّف الجمع العربيّ صحيحاً", () => {
  assert.equal(unitLabel("video", 1), "فيديو");
  assert.equal(unitLabel("video", 5), "فيديوهات");
  assert.equal(unitLabel("video", 40), "فيديو");
  assert.equal(unitLabel("pages", 3), "صفحات");
  assert.equal(unitLabel("pages", 120), "صفحة");
});
