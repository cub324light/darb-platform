/* ─── خريطة المهارات (Skill Graph) ───
   شجرة مهارات لكل مسار: كل مهارة لها متطلبات سابقة (prereqs) يجب إتقانها أولاً.
   الطالب يتقدّم بإتقان المهارات بالترتيب، فتنفتح المهارات الأعلى تلقائياً.
   حالة الإتقان تُحفظ محلياً (darb_skills) وتتزامن سحابياً. */

export interface Skill {
  id: string;
  name: string;
  section: string;     // مجموعة العرض (لفظي/كمي/رياضيات...)
  prereqs: string[];   // معرّفات مهارات سابقة
}

export type NodeStatus = "locked" | "available" | "mastered";

/* الرسوم البيانية لكل مسار (المفتاح = اسم المسار) */
export const SKILL_GRAPHS: Record<string, Skill[]> = {
  "قدرات": [
    // ── كمي ──
    { id: "q_calc",    name: "العمليات الحسابية",     section: "كمي", prereqs: [] },
    { id: "q_ratio",   name: "النسبة والتناسب",       section: "كمي", prereqs: ["q_calc"] },
    { id: "q_algebra", name: "الجبر والمعادلات",      section: "كمي", prereqs: ["q_calc"] },
    { id: "q_geo",     name: "الهندسة",               section: "كمي", prereqs: ["q_calc"] },
    { id: "q_stats",   name: "الإحصاء والاحتمالات",   section: "كمي", prereqs: ["q_ratio"] },
    { id: "q_word",    name: "المسائل اللفظية",       section: "كمي", prereqs: ["q_algebra", "q_ratio"] },
    // ── لفظي ──
    { id: "v_vocab",   name: "المفردات",              section: "لفظي", prereqs: [] },
    { id: "v_analogy", name: "التناظر اللفظي",        section: "لفظي", prereqs: ["v_vocab"] },
    { id: "v_complete",name: "إكمال الجمل",           section: "لفظي", prereqs: ["v_vocab"] },
    { id: "v_odd",     name: "المفردة الشاذة",        section: "لفظي", prereqs: ["v_vocab"] },
    { id: "v_context", name: "الخطأ السياقي",         section: "لفظي", prereqs: ["v_complete"] },
    { id: "v_reading", name: "استيعاب المقروء",       section: "لفظي", prereqs: ["v_complete", "v_analogy"] },
  ],
  "تحصيلي": [
    { id: "t_math1", name: "أساسيات الرياضيات",      section: "رياضيات", prereqs: [] },
    { id: "t_math2", name: "التفاضل والتكامل",       section: "رياضيات", prereqs: ["t_math1"] },
    { id: "t_phys1", name: "الميكانيكا",             section: "فيزياء",  prereqs: ["t_math1"] },
    { id: "t_phys2", name: "الكهرباء والمغناطيسية",  section: "فيزياء",  prereqs: ["t_phys1"] },
    { id: "t_chem1", name: "الكيمياء العامة",        section: "كيمياء",  prereqs: [] },
    { id: "t_chem2", name: "الكيمياء العضوية",       section: "كيمياء",  prereqs: ["t_chem1"] },
    { id: "t_bio1",  name: "الخلية والوراثة",        section: "أحياء",   prereqs: [] },
    { id: "t_bio2",  name: "وظائف الأعضاء",          section: "أحياء",   prereqs: ["t_bio1"] },
  ],
};

export function graphForTrack(track: string | undefined | null): Skill[] {
  return (track && SKILL_GRAPHS[track]) || [];
}

/* حالة مهارة بناءً على المتقَنة: مُتقنة / متاحة / مقفلة */
export function skillStatus(skill: Skill, mastered: Set<string>): NodeStatus {
  if (mastered.has(skill.id)) return "mastered";
  return skill.prereqs.every((p) => mastered.has(p)) ? "available" : "locked";
}

/* عمق المهارة = أطول سلسلة متطلبات (لترتيب المستويات في العرض) */
export function skillDepth(skill: Skill, byId: Map<string, Skill>): number {
  if (skill.prereqs.length === 0) return 0;
  return 1 + Math.max(...skill.prereqs.map((p) => {
    const parent = byId.get(p);
    return parent ? skillDepth(parent, byId) : 0;
  }));
}
