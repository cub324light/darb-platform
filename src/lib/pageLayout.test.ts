/* اختبارُ ترتيب أقسام الصفحة.
   تشغيل: npx tsx --test src/lib/pageLayout.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultLayout, mergeLayout, moveSection, toggleSection, visibleIds, hiddenCount, isCustomized,
  type SectionDef, type SectionState,
} from "./pageLayout";

const DEFS: SectionDef[] = [
  { id: "a", label: "الأول" },
  { id: "b", label: "الثاني" },
  { id: "c", label: "الثالث" },
];

const L = (...pairs: [string, boolean][]): SectionState[] => pairs.map(([id, visible]) => ({ id, visible }));

test("الافتراضيّ: ترتيبُ الكود والكلُّ ظاهر", () => {
  assert.deepEqual(defaultLayout(DEFS), L(["a", true], ["b", true], ["c", true]));
});

test("بلا تخزينٍ نرجع إلى الافتراضيّ", () => {
  assert.deepEqual(mergeLayout(DEFS, null), defaultLayout(DEFS));
  assert.deepEqual(mergeLayout(DEFS, []), defaultLayout(DEFS));
});

test("رأيُ الطالب يُحترم: ترتيبُه وإخفاؤه يبقيان", () => {
  const stored = L(["c", true], ["a", false], ["b", true]);
  assert.deepEqual(mergeLayout(DEFS, stored), stored);
});

test("قسمٌ جديد يدخل في موضعه الافتراضيّ لا في الذيل", () => {
  const defs: SectionDef[] = [...DEFS.slice(0, 2), { id: "new", label: "جديد" }, DEFS[2]];
  /* الطالبُ يعرف a,b,c ورتّبها c,b,a — والجديدُ بعد b في الكود */
  const out = mergeLayout(defs, L(["c", true], ["b", true], ["a", true]));
  assert.deepEqual(out.map((s) => s.id), ["c", "b", "new", "a"], "دخل بعد جاره b");
  assert.equal(out.find((s) => s.id === "new")!.visible, true, "الجديدُ يُرى");
});

test("الجديدُ الأوّلُ في الكود يدخل في الرأس", () => {
  const defs: SectionDef[] = [{ id: "zero", label: "صفر" }, ...DEFS];
  const out = mergeLayout(defs, L(["a", true], ["b", true], ["c", true]));
  assert.deepEqual(out.map((s) => s.id), ["zero", "a", "b", "c"]);
});

test("قسمٌ حُذف من الكود يسقط من التخزين، والمكرَّرُ لا يتضاعف", () => {
  const out = mergeLayout(DEFS, L(["a", true], ["مسحوب", true], ["a", false], ["b", true], ["c", true]));
  assert.deepEqual(out.map((s) => s.id), ["a", "b", "c"]);
  assert.equal(out[0].visible, true, "أول ذكرٍ هو المعتبَر");
});

test("الثابتُ لا يُخفى ولو قال التخزين ذلك", () => {
  const defs: SectionDef[] = [{ id: "a", label: "الأول", fixed: true }, ...DEFS.slice(1)];
  const out = mergeLayout(defs, L(["a", false], ["b", true], ["c", true]));
  assert.equal(out[0].visible, true);
  assert.deepEqual(toggleSection(out, defs, "a"), out, "ولا يُطفأ بزرّ");
});

test("التحريك خطوةٌ واحدة، ويقف عند الطرفين", () => {
  const base = defaultLayout(DEFS);
  assert.deepEqual(moveSection(base, DEFS, "b", -1).map((s) => s.id), ["b", "a", "c"]);
  assert.deepEqual(moveSection(base, DEFS, "b", 1).map((s) => s.id), ["a", "c", "b"]);
  assert.deepEqual(moveSection(base, DEFS, "a", -1), base, "الأولُ لا يصعد");
  assert.deepEqual(moveSection(base, DEFS, "c", 1), base, "الأخيرُ لا ينزل");
  assert.deepEqual(moveSection(base, DEFS, "لا-وجود-له", 1), base);
});

test("الثابتُ لا يتحرّك ولا يُزاح عنه", () => {
  const defs: SectionDef[] = [{ id: "a", label: "الأول", fixed: true }, ...DEFS.slice(1)];
  const base = defaultLayout(defs);
  assert.deepEqual(moveSection(base, defs, "a", 1), base, "الثابتُ نفسُه لا ينزل");
  assert.deepEqual(moveSection(base, defs, "b", -1), base, "ولا يُزاح ليصعد غيرُه فوقه");
});

test("الإخفاء يقلب الرؤية ويُحصى", () => {
  const out = toggleSection(defaultLayout(DEFS), DEFS, "b");
  assert.deepEqual(visibleIds(out), ["a", "c"]);
  assert.equal(hiddenCount(out), 1);
  assert.deepEqual(visibleIds(toggleSection(out, DEFS, "b")), ["a", "b", "c"], "والضغطةُ الثانية تُرجعه");
});

test("isCustomized: يميّز الافتراضيّ من المعدَّل", () => {
  assert.equal(isCustomized(DEFS, defaultLayout(DEFS)), false);
  assert.equal(isCustomized(DEFS, toggleSection(defaultLayout(DEFS), DEFS, "a")), true);
  assert.equal(isCustomized(DEFS, moveSection(defaultLayout(DEFS), DEFS, "a", 1)), true);
});

test("المحرّك نقيّ: لا تخزين ولا نافذة ولا وقت", async () => {
  const { readFileSync } = await import("node:fs");
  const code = readFileSync("src/lib/pageLayout.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  for (const bad of ["localStorage", "window.", "new Date(", "Date.now("]) {
    assert.ok(!code.includes(bad), `المحرّك يلمس ${bad} — نقلْه إلى المخزن`);
  }
});
