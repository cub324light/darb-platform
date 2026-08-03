/* ═══════════ دفترُ اليوم الدراسي — المحرّك النقيّ ═══════════
   الطالبُ لا يكتب دائماً: منهم من يرسم مخطّطاً، ومنهم من يفضّل جدولاً. فالورقةُ
   ثلاثةُ أنواع — رسمٌ وجدولٌ وكتابة — والاختيارُ له.

   ▓ لماذا تُخزَّن الرسمةُ **خطوطاً** لا صورة؟ لأن حصّة التخزين المحلّيّ للنطاق
     كلِّه ~٥ ميغابايت، وصورةُ canvas بصيغة PNG مُرمَّزة تبلغ مئاتِ الكيلوبايتات
     للورقة الواحدة، فتمتلئ الحصّةُ في أسابيع فتفشل الكتابةُ بعدها **بصمت**: لا
     الخطةُ تُحفَظ ولا الأخطاء ولا الجدول. أمّا الخطوطُ فنقاطٌ صحيحةٌ في شبكةٍ
     ٠..١٠٠٠، ورسمةٌ وسطى منها بضعةُ كيلوبايتات — وتُعاد بأي مقاسٍ بلا تشويش.

   ▓ نقيّ: مُدخلاتٌ داخلة ونتيجةٌ خارجة. لا `localStorage` ولا `window` ولا
     `Date` — كلُّها في `store.ts`. */

export type NoteKind = "draw" | "table" | "text";

/** شكلُ الخطّ: حرٌّ بالإصبع، أو شكلٌ هندسيّ من نقطتين (بداية ونهاية). */
export type StrokeShape = "free" | "line" | "rect" | "ellipse" | "arrow";

/** خطُّ رسمٍ واحد: نقاطٌ متتابعة `[x0,y0,x1,y1,…]` في شبكةٍ ٠..١٠٠٠.
    الأشكالُ الهندسية تُخزَّن بنقطتين فقط وتُرسم عند العرض — أصغرُ وأدقّ. */
export interface Stroke { color: string; width: number; pts: number[]; shape?: StrokeShape }

export interface TableData { cols: string[]; rows: string[][] }

export interface JournalNote {
  id: string;
  date: string;            // YYYY-MM-DD
  kind: NoteKind;
  title?: string;
  text?: string;
  strokes?: Stroke[];
  table?: TableData;
  /** المادةُ التي تخصّها الورقة — تُربط بها فتظهر عند مراجعتها. */
  subject?: string;
  /** مثبَّتةٌ في أعلى الدفتر مهما تقادمت. */
  pinned?: boolean;
  updatedAt: number;
}

/** حدودٌ تحمي تخزينَ الطالب من الامتلاء الصامت. */
export const LIMITS = {
  maxStrokes: 400,          // خطوطُ الرسمة الواحدة
  maxPointsPerStroke: 800,  // نقطةً (٤٠٠ زوج)
  maxBytes: 400_000,        // الدفترُ كلُّه — أقلُّ من عُشر الحصّة
  maxCols: 8,
  maxRows: 40,
} as const;

export const GRID = 1000;

export const emptyTable = (): TableData => ({
  cols: ["المادة", "ماذا شرحوا", "الواجب"],
  rows: [["", "", ""], ["", "", ""], ["", "", ""]],
});

/* ── القراءة ── */

/** المثبَّتُ أوّلاً ثم الأحدث — الترتيبُ الذي يتوقّعه الطالب. */
const byPinThenNew = (a: JournalNote, b: JournalNote): number =>
  (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt;

export const notesOn = (notes: JournalNote[], date: string): JournalNote[] =>
  notes.filter((x) => x.date === date).sort(byPinThenNew);

/** أوراقٌ مثبَّتة — تُعرض فوق أوراق اليوم مهما تقادمت. */
export const pinnedNotes = (notes: JournalNote[]): JournalNote[] =>
  notes.filter((x) => x.pinned).sort((a, b) => b.updatedAt - a.updatedAt);

/** بحثٌ في العناوين والنصوص والمواد وخلايا الجداول. */
export function searchNotes(notes: JournalNote[], q: string): JournalNote[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hit = (x: JournalNote): boolean => {
    if ((x.title ?? "").toLowerCase().includes(needle)) return true;
    if ((x.text ?? "").toLowerCase().includes(needle)) return true;
    if ((x.subject ?? "").toLowerCase().includes(needle)) return true;
    return (x.table?.rows ?? []).some((r) => r.some((c) => c.toLowerCase().includes(needle)))
      || (x.table?.cols ?? []).some((c) => c.toLowerCase().includes(needle));
  };
  return notes.filter(hit).sort(byPinThenNew);
}

export const togglePin = (notes: JournalNote[], id: string): JournalNote[] =>
  notes.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x));

/** أيامٌ فيها ورقةٌ واحدة على الأقلّ — الأحدثُ أوّلاً. */
export const journalDays = (notes: JournalNote[]): string[] =>
  [...new Set(notes.map((n) => n.date))].sort((a, b) => b.localeCompare(a));

/** حجمٌ تقريبيّ لما سيُكتب — تقديرُ بايتات JSON. */
export const estimateBytes = (notes: JournalNote[]): number => {
  try { return JSON.stringify(notes).length; } catch { return 0; }
};

/* ── الكتابة ── */

export const upsertNote = (notes: JournalNote[], note: JournalNote): JournalNote[] => {
  const i = notes.findIndex((x) => x.id === note.id);
  if (i < 0) return [note, ...notes];
  const next = [...notes];
  next[i] = note;
  return next;
};

export const removeNote = (notes: JournalNote[], id: string): JournalNote[] =>
  notes.filter((x) => x.id !== id);

export type SaveCheck = { ok: true } | { ok: false; reason: "too-big" | "too-many-strokes" };

/** أيُقبل الحفظ؟ نفحص قبل الكتابة لا بعدها — الفشلُ بعدها صامت. */
export function canSave(notes: JournalNote[], note: JournalNote): SaveCheck {
  if ((note.strokes?.length ?? 0) > LIMITS.maxStrokes) return { ok: false, reason: "too-many-strokes" };
  if (estimateBytes(upsertNote(notes, note)) > LIMITS.maxBytes) return { ok: false, reason: "too-big" };
  return { ok: true };
}

/* ── الرسم ── */

/** يُسقط النقاطَ المتقاربة (مسافة مانهاتن < tol) فتصغر الرسمةُ ولا تتغيّر. */
export function simplify(pts: number[], tol = 6): number[] {
  if (pts.length <= 4) return [...pts];
  const out: number[] = [pts[0], pts[1]];
  for (let i = 2; i < pts.length - 2; i += 2) {
    const dx = Math.abs(pts[i] - out[out.length - 2]);
    const dy = Math.abs(pts[i + 1] - out[out.length - 1]);
    if (dx + dy >= tol) { out.push(pts[i], pts[i + 1]); }
  }
  out.push(pts[pts.length - 2], pts[pts.length - 1]);
  return out;
}

/** خطٌّ جاهزٌ للتخزين: مبسَّطٌ ومقصوصٌ عند الحدّ وبإحداثياتٍ صحيحة.
    الأشكالُ لا تُبسَّط — نقطتاها هما كلُّ ما فيها. */
export function finishStroke(s: Stroke): Stroke {
  if (s.shape && s.shape !== "free") {
    return { ...s, pts: s.pts.slice(0, 4).map((v) => Math.max(0, Math.min(GRID, Math.round(v)))) };
  }
  const pts = simplify(s.pts).map((v) => Math.max(0, Math.min(GRID, Math.round(v))));
  return { color: s.color, width: s.width, pts: pts.slice(0, LIMITS.maxPointsPerStroke) };
}

export const undoStroke = (strokes: Stroke[]): Stroke[] => strokes.slice(0, -1);

/** شكلٌ هندسيّ من نقطتين — يُحفظ بنقطتيه لا بمئات النقاط. */
export const makeShape = (shape: StrokeShape, color: string, width: number, x0: number, y0: number, x1: number, y1: number): Stroke =>
  ({ shape, color, width, pts: [x0, y0, x1, y1].map((v) => Math.max(0, Math.min(GRID, Math.round(v)))) });

/** الممحاة: تحذف كلَّ خطٍّ تمرّ عليه. المسافةُ إلى الخطّ الحرّ من نقاطه، وإلى
    الشكل من صندوقه — يكفي للمسحِ بالإصبع ولا يحتاج هندسةً دقيقة. */
export function eraseAt(strokes: Stroke[], x: number, y: number, radius: number): Stroke[] {
  const near = (s: Stroke): boolean => {
    if (s.shape && s.shape !== "free" && s.pts.length >= 4) {
      const [x0, y0, x1, y1] = s.pts;
      const lo = { x: Math.min(x0, x1) - radius, y: Math.min(y0, y1) - radius };
      const hi = { x: Math.max(x0, x1) + radius, y: Math.max(y0, y1) + radius };
      return x >= lo.x && x <= hi.x && y >= lo.y && y <= hi.y;
    }
    for (let i = 0; i < s.pts.length; i += 2) {
      if (Math.hypot(s.pts[i] - x, s.pts[i + 1] - y) <= radius) return true;
    }
    return false;
  };
  return strokes.filter((s) => !near(s));
}

export const isBlankDrawing = (strokes: Stroke[] | undefined): boolean =>
  !strokes || strokes.length === 0;

/* ── الجدول ── */

export function setCell(t: TableData, r: number, c: number, v: string): TableData {
  if (r < 0 || r >= t.rows.length || c < 0 || c >= t.cols.length) return t;
  const rows = t.rows.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? v : cell)) : row));
  return { cols: [...t.cols], rows };
}

export function setCol(t: TableData, c: number, v: string): TableData {
  if (c < 0 || c >= t.cols.length) return t;
  return { cols: t.cols.map((x, i) => (i === c ? v : x)), rows: t.rows.map((r) => [...r]) };
}

export function addRow(t: TableData): TableData {
  if (t.rows.length >= LIMITS.maxRows) return t;
  return { cols: [...t.cols], rows: [...t.rows.map((r) => [...r]), t.cols.map(() => "")] };
}

export function addCol(t: TableData, label = ""): TableData {
  if (t.cols.length >= LIMITS.maxCols) return t;
  return { cols: [...t.cols, label], rows: t.rows.map((r) => [...r, ""]) };
}

export function removeRow(t: TableData, r: number): TableData {
  if (t.rows.length <= 1 || r < 0 || r >= t.rows.length) return t;
  return { cols: [...t.cols], rows: t.rows.filter((_, i) => i !== r).map((x) => [...x]) };
}

export function removeCol(t: TableData, c: number): TableData {
  if (t.cols.length <= 1 || c < 0 || c >= t.cols.length) return t;
  return { cols: t.cols.filter((_, i) => i !== c), rows: t.rows.map((r) => r.filter((_, i) => i !== c)) };
}

/** جدولٌ فارغٌ تماماً — لا يُحفظ، فلا نملأ الدفترَ بورقٍ أبيض. */
export const isBlankTable = (t: TableData | undefined): boolean =>
  !t || t.rows.every((r) => r.every((c) => c.trim() === ""));

/** هل في الورقة شيءٌ يستحقّ الحفظ؟ */
export function isBlank(note: JournalNote): boolean {
  if (note.kind === "draw") return isBlankDrawing(note.strokes);
  if (note.kind === "table") return isBlankTable(note.table);
  return (note.text ?? "").trim() === "";
}

/* ═══ تذكيراتُ التصوير ═══
   بعد أن يصنع الطالبُ ألبومَه نُذكّره **بماذا يصوّر** — فالألبومُ الفارغ لا ينفع.
   الاختيارُ حتميّ من مفتاح اليوم: لا عشوائيةَ تتغيّر مع كل رسمةِ صفحة. */
export const PHOTO_PROMPTS: { icon: string; text: string }[] = [
  { icon: "📐", text: "صوّر السبورة بعد شرح الدرس — قبل ما تُمسح." },
  { icon: "📄", text: "صوّر صفحة الواجب اللي حلّيتها اليوم." },
  { icon: "❌", text: "صوّر سؤالاً غلطت فيه — ثم سجّله في «أخطائي»." },
  { icon: "📚", text: "صوّر صفحة الكتاب اللي بتذاكرها الليلة." },
  { icon: "🧪", text: "صوّر تجربة المختبر أو الرسم اللي على الورقة." },
  { icon: "🗓️", text: "صوّر جدول اختباراتك المعلَّق في المدرسة." },
  { icon: "✍️", text: "صوّر ملخّصك بخطّك — تراجعه قبل الاختبار." },
];

/** تذكيرُ اليوم — يُختار من مفتاح اليوم فيثبت طوال اليوم ويتغيّر غداً. */
export function photoPromptFor(dayKey: string): { icon: string; text: string } {
  let h = 0;
  for (let i = 0; i < dayKey.length; i++) h = (h * 31 + dayKey.charCodeAt(i)) >>> 0;
  return PHOTO_PROMPTS[h % PHOTO_PROMPTS.length];
}
