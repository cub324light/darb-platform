/* ─── إحصاءات وجودة المحتوى للأدمن (نقيّ، قابل للاختبار) ───
   يبني من سجلّات المستودع + الرسم (World Model): عدّادات الحالة والأنواع، آخر
   المنشور، أعلى المفاهيم — ومن أنظمةٍ جاهزة (knowledgeCoverage/KB.validate) قائمةَ
   مشاكل الجودة. أهمّ من إضافة محتوى جديد: نعرف أين الفجوات أولاً. */
import { KB } from "../entities";
import { knowledgeCoverage } from "../entities/content/coverage";
import { KIND_META, type EntityKind } from "../entities/schema";
import type { ContentRecord, ContentStatus } from "./repository";

export interface ContentStats {
  total: number;
  byStatus: Record<ContentStatus, number>;
  byKind: { kind: EntityKind; label: string; icon: string; count: number }[];
  recentPublished: { id: string; name: string; icon: string; at: string }[];
  topConcepts: { id: string; name: string; importance: number }[];
}

export function contentStats(records: ContentRecord[]): ContentStats {
  const byStatus: Record<ContentStatus, number> = { draft: 0, review: 0, published: 0, archived: 0 };
  const kindMap = new Map<EntityKind, number>();
  for (const r of records) {
    byStatus[r.status] += 1;
    kindMap.set(r.entity.kind, (kindMap.get(r.entity.kind) ?? 0) + 1);
  }
  const byKind = [...kindMap.entries()]
    .map(([kind, count]) => ({ kind, label: KIND_META[kind].label, icon: KIND_META[kind].icon, count }))
    .sort((a, b) => b.count - a.count);

  const recentPublished = records
    .filter((r) => r.status === "published")
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 8)
    .map((r) => ({ id: r.entity.id, name: r.entity.name, icon: KIND_META[r.entity.kind].icon, at: r.updatedAt.slice(0, 10) }));

  const topConcepts = records
    .filter((r) => r.entity.kind === "concept")
    .map((r) => ({ id: r.entity.id, name: r.entity.name, importance: r.entity.meta?.importance ?? 50 }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 8);

  return { total: records.length, byStatus, byKind, recentPublished, topConcepts };
}

export interface QualityIssue { key: string; label: string; icon: string; items: { id: string; name: string }[]; }

/* مشاكل الجودة — من الرسم مباشرة (المصدر: knowledgeCoverage + الأنواع + validate) */
export function contentQuality(): { issues: QualityIssue[]; brokenLinks: string[] } {
  const cov = knowledgeCoverage(KB);
  const missing = (pred: (c: (typeof cov.concepts)[number]) => boolean) =>
    cov.concepts.filter(pred).map((c) => ({ id: c.id, name: c.name }));

  const questionsNoAnswer = KB.all("question")
    .filter((q) => q.kind === "question" && !q.answer)
    .map((q) => ({ id: q.id, name: q.name }));
  const lessonsNoResource = KB.all("lesson")
    .filter((l) => KB.neighbors(l.id, { kind: "resource" }).length === 0)
    .map((l) => ({ id: l.id, name: l.name }));

  const issues: QualityIssue[] = [
    { key: "no-explanation", label: "مفاهيم بلا شرح", icon: "📖", items: missing((c) => !c.hasExplanation) },
    { key: "no-examples", label: "مفاهيم بلا أمثلة", icon: "🔢", items: missing((c) => !c.hasExamples) },
    { key: "no-questions", label: "مفاهيم بلا أسئلة", icon: "❓", items: missing((c) => !c.hasQuestions) },
    { key: "no-resources", label: "مفاهيم بلا مصادر", icon: "🎬", items: missing((c) => !c.hasResources) },
    { key: "lessons-no-resource", label: "دروس بلا مصادر", icon: "📝", items: lessonsNoResource },
    { key: "questions-no-answer", label: "أسئلة بلا إجابة/تفسير", icon: "🧩", items: questionsNoAnswer },
  ].filter((i) => i.items.length > 0);

  return { issues, brokenLinks: KB.validate() };
}
