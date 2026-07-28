/* ═══════════ 📚 مصادر المذاكرة — محرّكٌ نقيّ ═══════════
   ▸ لماذا؟ الطالب لا يذاكر «مادةً» مجرّدة، بل يذاكر من مصدر: دورةُ معلّمٍ أو كتاب.
     المصدر يُقسَّم أقساماً، ولكل قسمٍ تقدّمه — فيرى الطالب أين هو بالضبط لا نسبةً غامضة.
   ▸ الوحدة: فيديوهات أو صفحات (`kind`). العدد الإجماليّ يوزَّع على الأقسام توزيعاً عادلاً.
   ▸ نقيٌّ ١٠٠٪: لا localStorage ولا window ولا Date. كل الإدخال عبر الوسائط.
     طبقة التخزين منفصلة في `sourceStore.ts`. (`format.ts` نقيٌّ بلا استيرادات فاستيراده آمن.) */
import { n as arNum } from "@/lib/format";

export type SourceKind = "video" | "pages";

export interface SourceSection {
  id: string;
  title: string;
  /** عدد الوحدات في هذا القسم (فيديوهات أو صفحات). */
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

/**
 * يوزّع `total` وحدةً على `count` قسماً توزيعاً عادلاً بلا كسور:
 * الأقسام الأولى تأخذ وحدةً زائدة حتى يفنى الباقي. المجموع = `total` دائماً.
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
    sections: src.sections.map((s) =>
      s.id === sectionId ? { ...s, done: Math.min(Math.max(0, Math.floor(done)), s.units) } : s),
  };
}

/** يبدّل حالة القسم: مكتملٌ ⇄ فارغ — نقرةٌ واحدة، وهي الفعل الأشيع. */
export function toggleSection(src: StudySource, sectionId: string): StudySource {
  const sec = src.sections.find((s) => s.id === sectionId);
  if (!sec) return src;
  return setSectionDone(src, sectionId, sec.done >= sec.units ? 0 : sec.units);
}

/** يبني مصدراً جاهزاً للتخزين. المعرّف يأتي من الخارج (المحرّك لا يعرف الوقت). */
export function buildSource(i: {
  id: string; examId: string; subject: string; name: string;
  kind: SourceKind; totalUnits: number; sectionCount: number; builtin?: boolean;
}): StudySource {
  return {
    id: i.id, examId: i.examId, subject: i.subject, name: i.name, kind: i.kind,
    totalUnits: Math.max(0, Math.floor(i.totalUnits)),
    sections: splitIntoSections(i.totalUnits, i.sectionCount),
    ...(i.builtin ? { builtin: true } : {}),
  };
}
