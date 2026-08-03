/* اختبارُ دفتر اليوم الدراسي.
   تشغيل: npx tsx --test src/lib/journal/journal.test.ts

   أهمُّ ما يحرسه: **ألّا يمتلئ تخزينُ الطالب بصمت**. الحصّة ~٥ ميغا للنطاق
   كلِّه، ولو ابتلعها الدفترُ لفشل حفظُ الخطة والأخطاء والجدول بلا رسالةِ خطأ.
   فالفحصُ قبل الكتابة، والرسمةُ خطوطٌ لا صورة. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  notesOn, journalDays, upsertNote, removeNote, canSave, estimateBytes, LIMITS, GRID,
  simplify, finishStroke, undoStroke, emptyTable, setCell, setCol, addRow, addCol,
  removeRow, removeCol, isBlank, isBlankTable, photoPromptFor, PHOTO_PROMPTS,
  type JournalNote, type Stroke,
} from "./journal";

const note = (over: Partial<JournalNote> = {}): JournalNote => ({
  id: "n1", date: "2026-08-02", kind: "text", text: "شرحوا المتجهات", updatedAt: 1000, ...over,
});

test("notesOn: أوراقُ اليوم وحدها، والأحدثُ أوّلاً", () => {
  const all = [
    note({ id: "a", date: "2026-08-02", updatedAt: 10 }),
    note({ id: "b", date: "2026-08-01", updatedAt: 99 }),
    note({ id: "c", date: "2026-08-02", updatedAt: 50 }),
  ];
  assert.deepEqual(notesOn(all, "2026-08-02").map((x) => x.id), ["c", "a"]);
  assert.deepEqual(notesOn(all, "2026-07-30"), []);
});

test("journalDays: أيامٌ بلا تكرار، الأحدثُ أوّلاً", () => {
  const all = [note({ id: "a", date: "2026-08-01" }), note({ id: "b", date: "2026-08-03" }), note({ id: "c", date: "2026-08-01" })];
  assert.deepEqual(journalDays(all), ["2026-08-03", "2026-08-01"]);
});

test("upsert يضيف الجديد ويستبدل القديم بمكانه", () => {
  const one = upsertNote([], note());
  assert.equal(one.length, 1);
  const edited = upsertNote(one, note({ text: "غيّرتُه" }));
  assert.equal(edited.length, 1, "لم يُضِف نسخةً ثانية");
  assert.equal(edited[0].text, "غيّرتُه");
  assert.equal(removeNote(edited, "n1").length, 0);
});

/* ── الحارسُ الأهمّ: السعة ── */

test("canSave يرفض ما يتجاوز حصّة الدفتر قبل أن يُكتب", () => {
  const huge = note({ id: "big", kind: "text", text: "ء".repeat(LIMITS.maxBytes + 10) });
  const r = canSave([], huge);
  assert.ok(!r.ok);
  assert.equal(r.reason, "too-big");
});

test("canSave يرفض رسمةً بخطوطٍ فوق الحدّ", () => {
  const strokes: Stroke[] = Array.from({ length: LIMITS.maxStrokes + 1 }, () => ({ color: "#fff", width: 3, pts: [0, 0, 1, 1] }));
  const r = canSave([], note({ kind: "draw", strokes }));
  assert.ok(!r.ok);
  assert.equal(r.reason, "too-many-strokes");
});

test("رسمةٌ واقعية تبقى صغيرة — هذا سببُ تخزين الخطوط لا الصور", () => {
  /* ٤٠ خطّاً، كلٌّ ٣٠ نقطة: أكثرُ من رسمةِ مخطّطٍ عادية */
  const strokes: Stroke[] = Array.from({ length: 40 }, (_, s) =>
    finishStroke({ color: "#60A5FA", width: 4, pts: Array.from({ length: 60 }, (_, i) => (i * 13 + s * 7) % GRID) }));
  const n = note({ kind: "draw", strokes, text: undefined });
  const bytes = estimateBytes([n]);
  assert.ok(bytes < 40_000, `رسمةٌ عادية بلغت ${bytes} بايت — الحجم انفلت`);
  assert.ok(canSave([], n).ok);
});

test("canSave يقبل الحجمَ الطبيعيّ", () => {
  assert.ok(canSave([], note()).ok);
});

/* ── الرسم ── */

test("simplify يُسقط المتقارب ويُبقي الطرفين", () => {
  const pts = [0, 0, 1, 1, 2, 2, 300, 300, 301, 301, 600, 600];
  const s = simplify(pts, 6);
  assert.equal(s[0], 0); assert.equal(s[1], 0);
  assert.equal(s[s.length - 2], 600); assert.equal(s[s.length - 1], 600);
  assert.ok(s.length < pts.length, "لم يُسقط شيئاً");
  assert.ok(s.includes(300), "أسقط نقطةً بعيدة");
});

test("simplify لا يمسّ الخطَّ القصير جداً", () => {
  assert.deepEqual(simplify([1, 2, 3, 4]), [1, 2, 3, 4]);
});

test("finishStroke يقصّ خارج الشبكة ويُدوّر ويحدّ الطول", () => {
  const s = finishStroke({ color: "#f00", width: 3, pts: [-50, 12.4, 5000, 800.6, 400, 400] });
  assert.equal(s.pts[0], 0, "ما دون الصفر يُقصّ");
  assert.equal(s.pts[1], 12, "يُدوَّر");
  assert.ok(s.pts.every((v) => Number.isInteger(v) && v >= 0 && v <= GRID));

  const long = finishStroke({ color: "#f00", width: 3, pts: Array.from({ length: 5000 }, (_, i) => (i * 37) % GRID) });
  assert.ok(long.pts.length <= LIMITS.maxPointsPerStroke);
});

test("undoStroke يحذف الأخير فقط، والفراغُ لا ينكسر", () => {
  const a: Stroke = { color: "#fff", width: 3, pts: [0, 0] };
  const b: Stroke = { color: "#000", width: 3, pts: [1, 1] };
  assert.deepEqual(undoStroke([a, b]), [a]);
  assert.deepEqual(undoStroke([]), []);
});

/* ── الجدول ── */

test("setCell/setCol يغيّران خليةً واحدة بلا مساسٍ بغيرها", () => {
  const t0 = emptyTable();
  const t1 = setCell(t0, 1, 2, "حل تمارين ص ٤٠");
  assert.equal(t1.rows[1][2], "حل تمارين ص ٤٠");
  assert.equal(t1.rows[0][2], "", "لمس صفّاً آخر");
  assert.equal(t0.rows[1][2], "", "غيّر الأصل — ليس نقيّاً");
  assert.equal(setCol(t1, 0, "الحصّة").cols[0], "الحصّة");
});

test("خارجُ الحدود لا يفعل شيئاً", () => {
  const t = emptyTable();
  assert.equal(setCell(t, 99, 0, "س"), t);
  assert.equal(setCol(t, -1, "س"), t);
});

test("addRow/addCol يزيدان، والحدُّ يوقف", () => {
  let t = emptyTable();
  const cols0 = t.cols.length;
  t = addRow(t);
  assert.equal(t.rows.length, 4);
  t = addCol(t, "ملاحظة");
  assert.equal(t.cols.length, cols0 + 1);
  assert.ok(t.rows.every((r) => r.length === t.cols.length), "الصفوفُ لم تتبع الأعمدة");

  let big = emptyTable();
  for (let i = 0; i < LIMITS.maxRows + 5; i++) big = addRow(big);
  assert.equal(big.rows.length, LIMITS.maxRows);
});

test("removeRow/removeCol لا يُفرغان الجدول تماماً", () => {
  let t = emptyTable();
  t = removeRow(t, 0);
  assert.equal(t.rows.length, 2);
  t = removeRow(t, 0); t = removeRow(t, 0);
  assert.equal(t.rows.length, 1, "أبقى صفّاً واحداً على الأقلّ");

  let c = emptyTable();
  c = removeCol(c, 1);
  assert.equal(c.cols.length, 2);
  assert.ok(c.rows.every((r) => r.length === 2), "الصفوفُ لم تتبع حذفَ العمود");
});

/* ── الفراغ ── */

test("الورقةُ الفارغة تُعرف فلا نحفظ ورقاً أبيض", () => {
  assert.ok(isBlank(note({ kind: "text", text: "   " })));
  assert.ok(!isBlank(note({ kind: "text", text: "شيء" })));
  assert.ok(isBlank(note({ kind: "draw", strokes: [] })));
  assert.ok(!isBlank(note({ kind: "draw", strokes: [{ color: "#fff", width: 3, pts: [0, 0, 5, 5] }] })));
  assert.ok(isBlankTable(emptyTable()), "جدولٌ بعناوينَ فقط فارغ");
  assert.ok(!isBlank(note({ kind: "table", table: setCell(emptyTable(), 0, 0, "رياضيات") })));
});

test("المحرّك نقيّ: لا تخزين ولا نافذة ولا وقت", async () => {
  const { readFileSync } = await import("node:fs");
  const code = readFileSync("src/lib/journal/journal.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  for (const bad of ["localStorage", "window.", "new Date(", "Date.now("]) {
    assert.ok(!code.includes(bad), `المحرّك يلمس ${bad} — نقلْه إلى store.ts`);
  }
});

test("photoPromptFor: يثبت في اليوم ويتغيّر بين الأيام", () => {
  assert.deepEqual(photoPromptFor("2026-08-02"), photoPromptFor("2026-08-02"), "تغيّر داخل اليوم نفسه");
  const week = ["2026-08-02","2026-08-03","2026-08-04","2026-08-05","2026-08-06","2026-08-07","2026-08-08"]
    .map((d) => photoPromptFor(d).text);
  assert.ok(new Set(week).size >= 4, `أسبوعٌ فيه ${new Set(week).size} تذكيراً فقط — يتكرّر كثيراً`);
  for (const d of week) assert.ok(PHOTO_PROMPTS.some((p) => p.text === d), "تذكيرٌ من خارج القائمة");
});
