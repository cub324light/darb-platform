/* ═══════════ 📚 مصادر المذاكرة — محرّكٌ نقيّ ═══════════
   ▸ لماذا؟ الطالب لا يذاكر «مادةً» مجرّدة، بل يذاكر من مصدر: دورةُ معلّمٍ أو كتاب.
     المصدر يُقسَّم أقساماً، ولكل قسمٍ تقدّمه — فيرى الطالب أين هو بالضبط لا نسبةً غامضة.
   ▸ الأقسام غير متساوية بطبعها: قسمُ «القواعد» ٢٥ صفحة وقسمٌ آخر ١٠. فلكل قسمٍ حجمه
     واسمه، والتقسيمُ المتساوي مجرّد بدايةٍ يعدّلها الطالب.
   ▸ لا يُنجَز القسم دفعةً واحدة: التقدّم جزئيّ (صفحاتٌ/فيديوهاتٌ منجَزة)، ويمكن تسجيله
     بالوحدات مباشرةً أو بجلسةٍ زمنية عبر معدّل الإنجاز (`ratePerHour`).
   ▸ نقيٌّ ١٠٠٪: لا localStorage ولا window ولا Date. كل الإدخال عبر الوسائط.
     طبقة التخزين منفصلة في `sourceStore.ts`. (`format.ts` نقيٌّ بلا استيرادات فاستيراده آمن.) */
import { n as arNum } from "@/lib/format";

export type SourceKind = "video" | "pages";

export interface SourceSection {
  id: string;
  title: string;
  /** عدد الوحدات في هذا القسم (فيديوهات أو صفحات) — يحرّره الطالب. */
  units: number;
  /** المُنجَز منها — يبقى دائماً بين ٠ و`units`. */
  done: number;
}

export interface StudySource {
  id: string;
  examId: string;
  subject: string;
  name: string;
  kind: SourceKind;
  totalUnits: number;
  sections: SourceSection[];
  /** من كتالوج المنصّة لا من إضافة الطالب. */
  builtin?: boolean;
  /** معدّل الإنجاز: كم وحدةً في الساعة؟ (صفحات/ساعة أو فيديوهات/ساعة). */
  ratePerHour?: number;
  /** متوسّط طول الفيديو بالدقائق — يُدخله الطالب أو يُشتقّ من المعدّل. */
  minsPerUnit?: number;
}

export interface Progress {
  done: number;
  total: number;
  /** نسبةٌ صحيحة ٠-١٠٠. صفرٌ حين لا وحدات — لا قسمةَ على صفر. */
  pct: number;
}

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  video: "فيديو",
  pages: "صفحة",
};

/** وحدةُ العدّ بصيغة الجمع العربيّة المناسبة للعدد. */
export function unitLabel(kind: SourceKind, count: number): string {
  if (kind === "video") return count >= 3 && count <= 10 ? "فيديوهات" : "فيديو";
  return count >= 3 && count <= 10 ? "صفحات" : "صفحة";
}

const pct = (done: number, total: number): number => (total <= 0 ? 0 : Math.round((done / total) * 100));
const clampInt = (x: number, lo: number, hi: number): number => Math.min(Math.max(lo, Math.floor(x)), hi);

/**
 * يوزّع `total` وحدةً على `count` قسماً توزيعاً عادلاً بلا كسور:
 * الأقسام الأولى تأخذ وحدةً زائدة حتى يفنى الباقي. المجموع = `total` دائماً.
 * هذه بدايةٌ فقط — الطالب يعدّل حجم كل قسمٍ واسمه بعدها.
 */
export function splitIntoSections(total: number, count: number, titlePrefix = "القسم"): SourceSection[] {
  const t = Math.max(0, Math.floor(total));
  const c = Math.max(1, Math.floor(count));
  if (t === 0) return [];
  /* أقسامٌ أكثر من الوحدات لا معنى لها: قسمٌ فارغ ليس قسماً. */
  const n = Math.min(c, t);
  const base = Math.floor(t / n);
  const extra = t % n;
  /* العنوان بأرقامٍ عربية-هندية (قاعدة الخطوط المقفلة) — والمعرّف لاتينيٌّ للتخزين. */
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`,
    title: `${titlePrefix} ${arNum(i + 1)}`,
    units: base + (i < extra ? 1 : 0),
    done: 0,
  }));
}

export function sectionProgress(sec: SourceSection): Progress {
  const done = Math.min(Math.max(0, sec.done), sec.units);
  return { done, total: sec.units, pct: pct(done, sec.units) };
}

export function sourceProgress(src: StudySource): Progress {
  /* المصدر بلا أقسام يُحسب على إجماليّه — لا يسقط من الحساب. */
  if (src.sections.length === 0) return { done: 0, total: Math.max(0, src.totalUnits), pct: 0 };
  let done = 0, total = 0;
  for (const s of src.sections) { const p = sectionProgress(s); done += p.done; total += p.total; }
  return { done, total, pct: pct(done, total) };
}

/** تقدّمُ كل مصادر مادةٍ مجتمعةً — لسطرٍ واحدٍ فوق قائمة المصادر. */
export function sourcesProgress(list: StudySource[]): Progress {
  let done = 0, total = 0;
  for (const s of list) { const p = sourceProgress(s); done += p.done; total += p.total; }
  return { done, total, pct: pct(done, total) };
}

/** يضبط المُنجَز في قسمٍ ويعيد مصدراً جديداً (بلا تغييرٍ في مكانه). */
export function setSectionDone(src: StudySource, sectionId: string, done: number): StudySource {
  return {
    ...src,
    sections: src.sections.map((s) => (s.id === sectionId ? { ...s, done: clampInt(done, 0, s.units) } : s)),
  };
}

/** يزيد المُنجَز بمقدارٍ (موجبٍ أو سالب) — لتسجيل «ذاكرتُ ٥ صفحات الآن». */
export function addSectionDone(src: StudySource, sectionId: string, delta: number): StudySource {
  const sec = src.sections.find((s) => s.id === sectionId);
  if (!sec) return src;
  return setSectionDone(src, sectionId, sec.done + Math.round(delta));
}

/** يعيد تسمية قسم — «القسم ١» ← «القواعد». */
export function renameSection(src: StudySource, sectionId: string, title: string): StudySource {
  const t = title.trim();
  if (!t) return src;
  return { ...src, sections: src.sections.map((s) => (s.id === sectionId ? { ...s, title: t } : s)) };
}

/** يغيّر حجم قسم (أقسامٌ غير متساوية)، ويُحدّث إجماليّ المصدر تبعاً للأقسام. */
export function resizeSection(src: StudySource, sectionId: string, units: number): StudySource {
  const u = Math.max(1, Math.floor(units));
  const sections = src.sections.map((s) => (s.id === sectionId ? { ...s, units: u, done: Math.min(s.done, u) } : s));
  return { ...src, sections, totalUnits: sections.reduce((a, s) => a + s.units, 0) };
}

/** يشطر قسماً إلى جزأين — «القسم الواحد يتقسّم بعد». الجزء الأول يأخذ `firstUnits`. */
export function splitSection(src: StudySource, sectionId: string, firstUnits: number): StudySource {
  const i = src.sections.findIndex((s) => s.id === sectionId);
  if (i < 0) return src;
  const sec = src.sections[i];
  const first = clampInt(firstUnits, 1, sec.units - 1);
  /* قسمٌ بوحدةٍ واحدة لا يُشطر */
  if (sec.units < 2) return src;
  const rest = sec.units - first;
  const a: SourceSection = { ...sec, units: first, done: Math.min(sec.done, first) };
  /* معرّفٌ مشتقٌّ من الموجود لا من الوقت — المحرّك نقيٌّ وحتميّ. */
  const used = new Set(src.sections.map((s) => s.id));
  let k = 2;
  while (used.has(`${sec.id}b${k}`)) k++;
  const b: SourceSection = {
    id: `${sec.id}b${k}`,
    title: `${sec.title} — تتمّة`,
    units: rest,
    done: Math.max(0, sec.done - first),
  };
  return { ...src, sections: [...src.sections.slice(0, i), a, b, ...src.sections.slice(i + 1)] };
}

/** يبدّل حالة القسم: مكتملٌ ⇄ فارغ — للأقسام الصغيرة التي تُنجَز دفعةً واحدة. */
export function toggleSection(src: StudySource, sectionId: string): StudySource {
  const sec = src.sections.find((s) => s.id === sectionId);
  if (!sec) return src;
  return setSectionDone(src, sectionId, sec.done >= sec.units ? 0 : sec.units);
}

/* ══════ تقديرُ الوقت ══════ */

/** كم وحدةً تُنجَز في `mins` دقيقة بمعدّل `ratePerHour` وحدة/ساعة؟ صفرٌ بلا معدّل. */
export function unitsInMinutes(ratePerHour: number | undefined, mins: number): number {
  if (!ratePerHour || ratePerHour <= 0 || mins <= 0) return 0;
  return Math.round((ratePerHour * mins) / 60);
}

/** كم دقيقةً يحتاج `units` وحدة؟ يعتمد المعدّل، وإلا متوسّط طول الوحدة. صفرٌ بلا كليهما. */
export function minutesForUnits(src: Pick<StudySource, "ratePerHour" | "minsPerUnit">, units: number): number {
  if (units <= 0) return 0;
  if (src.minsPerUnit && src.minsPerUnit > 0) return Math.round(units * src.minsPerUnit);
  if (src.ratePerHour && src.ratePerHour > 0) return Math.round((units / src.ratePerHour) * 60);
  return 0;
}

/** متوسّط طول الوحدة بالدقائق مشتقّاً من المعدّل (٦٠ ÷ وحدة/ساعة). صفرٌ بلا معدّل. */
export function minsPerUnitFromRate(ratePerHour: number | undefined): number {
  if (!ratePerHour || ratePerHour <= 0) return 0;
  return Math.round(60 / ratePerHour);
}

/** نصُّ مدّةٍ تقريبيّ بهامشٍ ±١٠٪ — «بين ٥٥ و٦٥ دقيقة». فارغٌ بلا تقدير. */
export function durationRangeText(mins: number, fmt: (x: number) => string): string {
  if (mins <= 0) return "";
  const lo = Math.max(1, Math.round(mins * 0.9));
  const hi = Math.round(mins * 1.1);
  return lo === hi ? `${fmt(lo)} دقيقة` : `بين ${fmt(lo)} و${fmt(hi)} دقيقة`;
}

/** الوقت المتبقّي لإنهاء المصدر بالدقائق. صفرٌ بلا تقديرٍ موثوق. */
export function remainingMinutes(src: StudySource): number {
  const p = sourceProgress(src);
  return minutesForUnits(src, p.total - p.done);
}

/** يبني مصدراً جاهزاً للتخزين. المعرّف يأتي من الخارج (المحرّك لا يعرف الوقت). */
export function buildSource(i: {
  id: string; examId: string; subject: string; name: string;
  kind: SourceKind; totalUnits: number; sectionCount: number; builtin?: boolean;
  ratePerHour?: number; minsPerUnit?: number;
}): StudySource {
  return {
    id: i.id, examId: i.examId, subject: i.subject, name: i.name, kind: i.kind,
    totalUnits: Math.max(0, Math.floor(i.totalUnits)),
    sections: splitIntoSections(i.totalUnits, i.sectionCount),
    ...(i.builtin ? { builtin: true } : {}),
    ...(i.ratePerHour && i.ratePerHour > 0 ? { ratePerHour: i.ratePerHour } : {}),
    ...(i.minsPerUnit && i.minsPerUnit > 0 ? { minsPerUnit: i.minsPerUnit } : {}),
  };
}
