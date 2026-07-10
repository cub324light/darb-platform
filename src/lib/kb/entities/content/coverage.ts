/* ═══════════ تغطية المعرفة — نضج طبقة المفاهيم قبل الطبقة الثانية ═══════════
   قبل أن نبدأ الدروس والأسئلة: كم مفهوماً مكتملٌ فعلاً (شرحٌ + أمثلة + أسئلة + مصادر)؟
   وكم ينقصه كلٌّ منها؟ بنينا أماكن المحتوى أولاً، فالأرقام هنا تكشف الفراغ الحقيقي
   وتُرتّب المفاهيم حسب الأهمية لنعرف من أين نبدأ الطبقة الثانية. نقرأ الرسم فقط. */
import type { KnowledgeBase } from "../registry";
import type { ConceptEntity } from "../schema";

/* شريحة تغطية: عددٌ ومعرّفاتٌ للمفاهيم التي تنطبق عليها الحالة */
export interface CoverageSlice { key: string; label: string; icon: string; count: number; ids: string[]; }

/* حالة مفهوم واحد عبر الأبعاد الأربعة (+ اكتمالٌ كلّي) */
export interface ConceptCoverage {
  id: string; name: string; category?: string; importance: number;
  hasExplanation: boolean; hasExamples: boolean; hasQuestions: boolean; hasResources: boolean;
  complete: boolean;
}

export interface CoverageReport {
  total: number;
  complete: number;
  pct: number;                  // نسبة المفاهيم المكتملة
  slices: CoverageSlice[];      // مكتملة / ينقصها شرح / بلا أمثلة / بلا أسئلة / بلا مصادر
  concepts: ConceptCoverage[];  // مرتّبة تنازلياً بالأهمية — من أين نبدأ الطبقة الثانية
}

export function knowledgeCoverage(kb: KnowledgeBase): CoverageReport {
  const rows: ConceptCoverage[] = (kb.all("concept") as ConceptEntity[]).map((e) => {
    const b = e.body;
    const hasExplanation = !!(b?.definition || b?.simpleExplanation || b?.advancedExplanation);
    const hasExamples = !!(b?.examples?.length);
    const linked = kb.edges(e.id);
    const hasQuestions = linked.some((x) => x.entity.kind === "question");
    const hasResources = linked.some((x) => x.entity.kind === "resource");
    return {
      id: e.id, name: e.name, category: e.category, importance: kb.meta(e.id).importance ?? 50,
      hasExplanation, hasExamples, hasQuestions, hasResources,
      complete: hasExplanation && hasExamples && hasQuestions && hasResources,
    };
  }).sort((a, b) => b.importance - a.importance);

  const slice = (key: string, label: string, icon: string, pred: (r: ConceptCoverage) => boolean): CoverageSlice => {
    const ids = rows.filter(pred).map((r) => r.id);
    return { key, label, icon, count: ids.length, ids };
  };

  const complete = rows.filter((r) => r.complete).length;
  return {
    total: rows.length,
    complete,
    pct: rows.length ? Math.round((complete / rows.length) * 100) : 0,
    slices: [
      slice("complete",       "مكتملة",        "✅", (r) => r.complete),
      slice("no-explanation", "ينقصها شرح",     "📖", (r) => !r.hasExplanation),
      slice("no-examples",    "بلا أمثلة",      "🔢", (r) => !r.hasExamples),
      slice("no-questions",   "بلا أسئلة",      "❓", (r) => !r.hasQuestions),
      slice("no-resources",   "بلا مصادر",      "🎬", (r) => !r.hasResources),
    ],
    concepts: rows,
  };
}
