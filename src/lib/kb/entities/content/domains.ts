/* ═══════════ لوحة قيادة المحتوى — تقدّم كل مجال وتفصيله ═══════════
   لكل مجال: هدفٌ تقديري + تفصيلٌ (مفاهيم/دروس/أسئلة/كتب/مصادر) لنعرف أين النقص،
   وترتيبٌ للمفاهيم حسب الأهمية (ماذا يشرح دويرب أولاً). الأهداف أرقام تخطيط تُراجَع.
   لا تعتمد على مثيلٍ — تأخذ الرسم. لا بنية جديدة. */
import type { KnowledgeBase } from "../registry";

export interface DomainCounts {
  concepts: number; lessons: number; questions: number; books: number; resources: number;
}
export interface DomainProgress {
  key: string; label: string; icon: string;
  actual: number; target: number; pct: number;
  layer: "concept" | "entity";
  counts?: DomainCounts;
}

/* عدد عقدٍ من نوعٍ مرتبطة باختبارٍ عبر علاقةٍ (belongs_to/used_in العكسية) */
const rel = (kb: KnowledgeBase, examId: string, type: "belongs_to" | "used_in", kind: "concept" | "book" | "question") =>
  kb.neighbors(examId, { type, dir: "in", kind }).length;

function examBreakdown(kb: KnowledgeBase, examId: string): DomainCounts {
  return {
    concepts: rel(kb, examId, "belongs_to", "concept"),
    books: rel(kb, examId, "belongs_to", "book"),
    questions: rel(kb, examId, "used_in", "question"),
    lessons: 0,   // الدروس تأتي في الطبقة الثانية
    resources: 0, // كذلك المصادر
  };
}

export function domainProgress(kb: KnowledgeBase): DomainProgress[] {
  const examDomain = (key: string, label: string, icon: string, examId: string, target: number): DomainProgress => {
    const counts = examBreakdown(kb, examId);
    return { key, label, icon, layer: "concept", counts, actual: counts.concepts, target,
      pct: target ? Math.min(100, Math.round((counts.concepts / target) * 100)) : 0 };
  };
  const entityDomain = (key: string, label: string, icon: string, actual: number, target: number): DomainProgress =>
    ({ key, label, icon, layer: "entity", actual, target, pct: target ? Math.min(100, Math.round((actual / target) * 100)) : 0 });

  /* الإنجليزية معرفةٌ واحدة: نجمع مفاهيم STEP وIELTS بلا تكرار (STEP مجرّد اختبار يقيسها) */
  const englishConcepts = new Set<string>([
    ...kb.neighbors("exam:step",  { type: "belongs_to", dir: "in", kind: "concept" }).map((c) => c.id),
    ...kb.neighbors("exam:ielts", { type: "belongs_to", dir: "in", kind: "concept" }).map((c) => c.id),
  ]);
  const englishTarget = 24;
  const englishDomain: DomainProgress = {
    key: "english", label: "STEP / الإنجليزية", icon: "🔤", layer: "concept",
    actual: englishConcepts.size, target: englishTarget,
    pct: Math.min(100, Math.round((englishConcepts.size / englishTarget) * 100)),
    counts: { concepts: englishConcepts.size, lessons: 0, questions: 0, books: 0, resources: 0 },
  };

  return [
    examDomain("qudurat", "القدرات",   "🧠", "exam:qudurat", 26),
    examDomain("tahsili", "التحصيلي",  "📚", "exam:tahsili", 33),
    englishDomain,
    entityDomain("universities", "الجامعات",  "🏛️", kb.all("university").length, 30),
    entityDomain("majors",       "التخصصات", "📚", kb.all("major").length,      30),
    entityDomain("jobs",         "الوظائف",  "💼", kb.all("job").length,        50),
  ];
}

/* أعلى المفاهيم أهميةً عبر المنصة كلها — أين نركّز المحتوى أولاً */
export interface TopConcept { id: string; name: string; category?: string; importance: number; examFrequency?: number; }
export function topConcepts(kb: KnowledgeBase, n = 20): TopConcept[] {
  return kb.all("concept")
    .map((c) => ({
      id: c.id, name: c.name, category: c.kind === "concept" ? c.category : undefined,
      importance: kb.meta(c.id).importance ?? 50,
      examFrequency: c.kind === "concept" ? c.examFrequency : undefined,
    }))
    .sort((a, b) => b.importance - a.importance || (b.examFrequency ?? 0) - (a.examFrequency ?? 0))
    .slice(0, n);
}

/* المفاهيم مرتّبة حسب الأهمية (ماذا يبدأ به دويرب) — مجمّعة في شرائح */
export interface ImportanceTier { min: number; label: string; items: { id: string; name: string; importance: number }[]; }
export function conceptsByImportance(kb: KnowledgeBase, examId: string): ImportanceTier[] {
  const tiers: ImportanceTier[] = [
    { min: 90, label: "الأعلى (٩٠+)", items: [] },
    { min: 75, label: "عالية (٧٥–٨٩)", items: [] },
    { min: 60, label: "متوسطة (٦٠–٧٤)", items: [] },
    { min: 0, label: "أساسية (<٦٠)", items: [] },
  ];
  const concepts = kb.neighbors(examId, { type: "belongs_to", dir: "in", kind: "concept" })
    .map((c) => ({ id: c.id, name: c.name, importance: kb.meta(c.id).importance ?? 50 }))
    .sort((a, b) => b.importance - a.importance);
  for (const c of concepts) (tiers.find((t) => c.importance >= t.min) ?? tiers[tiers.length - 1]).items.push(c);
  return tiers.filter((t) => t.items.length > 0);
}
