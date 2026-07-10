/* ═══════════ لوحة قيادة المحتوى — تقدّم كل مجال ═══════════
   لكل مجال هدفٌ تقديري (عدد العقد لاكتماله) نقيس تقدّمه إليه. الأهداف أرقام تخطيط
   تُراجَع، لا وعود. تُستهلك في /dev/content. لا تعتمد على مثيلٍ — تأخذ الرسم. */
import type { KnowledgeBase } from "../registry";

export interface DomainProgress {
  key: string; label: string; icon: string;
  actual: number; target: number; pct: number;
}

/* عدد المفاهيم المنتمية لاختبارٍ عبر belongs_to العكسي */
function conceptsOfExam(kb: KnowledgeBase, examId: string): number {
  return kb.neighbors(examId, { type: "belongs_to", dir: "in", kind: "concept" }).length;
}

export function domainProgress(kb: KnowledgeBase): DomainProgress[] {
  const rows: Omit<DomainProgress, "pct">[] = [
    { key: "qudurat", label: "القدرات",       icon: "🧠", actual: conceptsOfExam(kb, "exam:qudurat"), target: 40 },
    { key: "tahsili", label: "التحصيلي",      icon: "📚", actual: conceptsOfExam(kb, "exam:tahsili"), target: 60 },
    { key: "step",    label: "STEP",          icon: "🔤", actual: conceptsOfExam(kb, "exam:step"),    target: 25 },
    { key: "universities", label: "الجامعات", icon: "🏛️", actual: kb.all("university").length,         target: 30 },
    { key: "majors",  label: "التخصصات",      icon: "📚", actual: kb.all("major").length,             target: 30 },
    { key: "jobs",    label: "الوظائف",       icon: "💼", actual: kb.all("job").length,               target: 50 },
  ];
  return rows.map((r) => ({ ...r, pct: r.target ? Math.min(100, Math.round((r.actual / r.target) * 100)) : 0 }));
}
