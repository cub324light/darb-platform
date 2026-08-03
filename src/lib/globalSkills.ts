/* ─── الموسوعة الموحّدة للمهارات — Category → Domain → Skill ───
   مصدر الحقيقة الوحيد للمهارات في كل المنصة (وحّدنا عليه نظام الشجرة القديم).
   نفس معرّف المهارة مشترك بين جميع الاختبارات التي تقيسها.
   مثال: en_read_infer «الاستنتاج» موجود في ايلتس وستيب وتوفل معاً.

   prereqs: متطلبات سابقة (لعرض الشجرة في الخريطة). الإتقان يُقاس من
   darb_skill_progress (masteryScore ≥ MASTERY_THRESHOLD = مُتقنة). */

export interface GlobalSkill {
  id: string;
  name: string;       // الاسم بالعربية
  category: string;   // الفئة الكبرى
  domain: string;     // المجال الفرعي (يُستخدم أيضاً كقسم في عرض الشجرة)
  tracks: string[];   // المسارات التي تشمل هذه المهارة
  prereqs?: string[]; // معرّفات مهارات سابقة (اختياري)
}

export const MASTERY_THRESHOLD = 70;
export type NodeStatus = "locked" | "available" | "mastered";

export const GLOBAL_SKILLS: GlobalSkill[] = [
  // ── اللغة العربية: لفظي ──────────────────────────────────────
  { id: "ar_vocab",     name: "المفردات",            category: "اللغة العربية", domain: "لفظي",  tracks: ["قدرات"], prereqs: [] },
  { id: "ar_analogy",   name: "التناظر اللفظي",      category: "اللغة العربية", domain: "لفظي",  tracks: ["قدرات"], prereqs: ["ar_vocab"] },
  { id: "ar_complete",  name: "إكمال الجمل",         category: "اللغة العربية", domain: "لفظي",  tracks: ["قدرات"], prereqs: ["ar_vocab"] },
  { id: "ar_odd",       name: "المفردة الشاذة",      category: "اللغة العربية", domain: "لفظي",  tracks: ["قدرات"], prereqs: ["ar_vocab"] },
  { id: "ar_context",   name: "الخطأ السياقي",       category: "اللغة العربية", domain: "لفظي",  tracks: ["قدرات"], prereqs: ["ar_complete"] },
  { id: "ar_reading",   name: "استيعاب المقروء",     category: "اللغة العربية", domain: "لفظي",  tracks: ["قدرات"], prereqs: ["ar_complete", "ar_analogy"] },
  // ── اللغة العربية: كمي ───────────────────────────────────────
  { id: "math_arith",   name: "العمليات الحسابية",   category: "اللغة العربية", domain: "كمي",   tracks: ["قدرات", "CPC", "ITC"], prereqs: [] },
  { id: "math_ratio",   name: "النسبة والتناسب",     category: "اللغة العربية", domain: "كمي",   tracks: ["قدرات", "CPC", "ITC"], prereqs: ["math_arith"] },
  { id: "math_alg",     name: "الجبر والمعادلات",    category: "اللغة العربية", domain: "كمي",   tracks: ["قدرات", "CPC", "ITC"], prereqs: ["math_arith"] },
  { id: "math_geo",     name: "الهندسة",             category: "اللغة العربية", domain: "كمي",   tracks: ["قدرات", "CPC", "ITC"], prereqs: ["math_arith"] },
  { id: "math_stats",   name: "الإحصاء والاحتمالات", category: "اللغة العربية", domain: "كمي",   tracks: ["قدرات", "CPC", "ITC"], prereqs: ["math_ratio"] },
  { id: "math_word",    name: "المسائل اللفظية",     category: "اللغة العربية", domain: "كمي",   tracks: ["قدرات", "CPC", "ITC"], prereqs: ["math_alg", "math_ratio"] },
  // ── الرياضيات ────────────────────────────────────────────────
  { id: "t_math_basic",  name: "أساسيات الرياضيات",      category: "الرياضيات", domain: "رياضيات", tracks: ["تحصيلي", "تحصيلي مبكر"], prereqs: [] },
  { id: "t_math_calc",   name: "التفاضل والتكامل",        category: "الرياضيات", domain: "رياضيات", tracks: ["تحصيلي"], prereqs: ["t_math_basic"] },
  { id: "t_math_seq",    name: "المتتاليات والمتسلسلات",  category: "الرياضيات", domain: "رياضيات", tracks: ["تحصيلي"], prereqs: ["t_math_basic"] },
  { id: "t_math_matrix", name: "المصفوفات",               category: "الرياضيات", domain: "رياضيات", tracks: ["تحصيلي"], prereqs: ["t_math_basic"] },
  // ── الفيزياء ─────────────────────────────────────────────────
  { id: "t_phys_mech",   name: "الميكانيكا",            category: "الفيزياء", domain: "فيزياء", tracks: ["تحصيلي", "تحصيلي مبكر"], prereqs: [] },
  { id: "t_phys_elec",   name: "الكهرباء والمغناطيسية", category: "الفيزياء", domain: "فيزياء", tracks: ["تحصيلي"], prereqs: ["t_phys_mech"] },
  { id: "t_phys_wave",   name: "الموجات والبصريات",      category: "الفيزياء", domain: "فيزياء", tracks: ["تحصيلي"], prereqs: ["t_phys_mech"] },
  { id: "t_phys_thermo", name: "الحرارة والديناميكا",    category: "الفيزياء", domain: "فيزياء", tracks: ["تحصيلي"], prereqs: ["t_phys_mech"] },
  // ── الكيمياء ─────────────────────────────────────────────────
  { id: "t_chem_gen",    name: "الكيمياء العامة",   category: "الكيمياء", domain: "كيمياء", tracks: ["تحصيلي", "تحصيلي مبكر"], prereqs: [] },
  { id: "t_chem_org",    name: "الكيمياء العضوية",  category: "الكيمياء", domain: "كيمياء", tracks: ["تحصيلي"], prereqs: ["t_chem_gen"] },
  // ── الأحياء ──────────────────────────────────────────────────
  { id: "t_bio_cell",    name: "الخلية والوراثة", category: "الأحياء", domain: "أحياء", tracks: ["تحصيلي", "تحصيلي مبكر"], prereqs: [] },
  { id: "t_bio_organ",   name: "وظائف الأعضاء",  category: "الأحياء", domain: "أحياء", tracks: ["تحصيلي"], prereqs: ["t_bio_cell"] },
  { id: "t_bio_eco",     name: "البيئة والنظم",   category: "الأحياء", domain: "أحياء", tracks: ["تحصيلي"], prereqs: ["t_bio_cell"] },
  // ── الإنجليزية: قراءة ────────────────────────────────────────
  { id: "en_read_main",   name: "الفكرة الرئيسية",  category: "الإنجليزية", domain: "قراءة",  tracks: ["ايلتس", "ستيب", "توفل", "دوليقو", "CPC", "ITC"], prereqs: [] },
  { id: "en_read_infer",  name: "الاستنتاج",        category: "الإنجليزية", domain: "قراءة",  tracks: ["ايلتس", "ستيب", "توفل", "دوليقو", "CPC", "ITC"], prereqs: ["en_read_main"] },
  { id: "en_read_detail", name: "التفاصيل",         category: "الإنجليزية", domain: "قراءة",  tracks: ["ايلتس", "ستيب", "توفل", "CPC"], prereqs: ["en_read_main"] },
  { id: "en_read_vocab",  name: "مفردات في السياق", category: "الإنجليزية", domain: "قراءة",  tracks: ["ايلتس", "ستيب", "توفل", "دوليقو", "CPC", "ITC"], prereqs: [] },
  // ── الإنجليزية: استماع ───────────────────────────────────────
  { id: "en_list_gen",    name: "الاستيعاب العام",  category: "الإنجليزية", domain: "استماع", tracks: ["ايلتس", "توفل", "دوليقو"], prereqs: [] },
  { id: "en_list_spec",   name: "معلومات محددة",    category: "الإنجليزية", domain: "استماع", tracks: ["ايلتس", "توفل"], prereqs: ["en_list_gen"] },
  { id: "en_list_tone",   name: "نبرة المتحدث",     category: "الإنجليزية", domain: "استماع", tracks: ["ايلتس", "توفل"], prereqs: ["en_list_gen"] },
  // ── الإنجليزية: كتابة ────────────────────────────────────────
  { id: "en_write_org",   name: "تنظيم المقال",       category: "الإنجليزية", domain: "كتابة",  tracks: ["ايلتس", "توفل", "CPC"], prereqs: [] },
  { id: "en_write_coh",   name: "الاتساق والترابط",   category: "الإنجليزية", domain: "كتابة",  tracks: ["ايلتس", "توفل"], prereqs: ["en_write_org"] },
  { id: "en_write_gram",  name: "القواعد في الكتابة", category: "الإنجليزية", domain: "كتابة",  tracks: ["ايلتس", "توفل", "ستيب", "دوليقو"], prereqs: [] },
  // ── الإنجليزية: محادثة ───────────────────────────────────────
  { id: "en_speak_flu",   name: "الطلاقة",          category: "الإنجليزية", domain: "محادثة", tracks: ["ايلتس", "توفل", "دوليقو"], prereqs: [] },
  { id: "en_speak_acc",   name: "الدقة اللغوية",    category: "الإنجليزية", domain: "محادثة", tracks: ["ايلتس", "توفل", "دوليقو"], prereqs: [] },
  // ── الإنجليزية: قواعد ────────────────────────────────────────
  { id: "en_gram_tense",  name: "الأزمنة",            category: "الإنجليزية", domain: "قواعد",  tracks: ["ستيب", "CPC", "ITC", "دوليقو"], prereqs: [] },
  { id: "en_gram_morph",  name: "الصرف",              category: "الإنجليزية", domain: "قواعد",  tracks: ["ستيب", "دوليقو"], prereqs: ["en_gram_tense"] },
  { id: "en_gram_agree",  name: "المطابقة النحوية",   category: "الإنجليزية", domain: "قواعد",  tracks: ["ستيب", "دوليقو"], prereqs: ["en_gram_tense"] },
  // ── المنطق ───────────────────────────────────────────────────
  { id: "itc_reason",     name: "الاستدلال الرياضي", category: "المنطق", domain: "منطق", tracks: ["ITC"], prereqs: [] },
  { id: "itc_logic",      name: "التسلسل المنطقي",   category: "المنطق", domain: "منطق", tracks: ["ITC"], prereqs: [] },
  { id: "itc_critical",   name: "التفكير النقدي",    category: "المنطق", domain: "منطق", tracks: ["ITC"], prereqs: ["itc_logic"] },
];

/* فهرس سريع بالمعرّف */
export const SKILL_BY_ID: Map<string, GlobalSkill> = new Map(GLOBAL_SKILLS.map((s) => [s.id, s]));

/* الحصول على مهارات مسارات محددة (بدون تكرار) */
export function skillsForTracks(trackIds: string[]): GlobalSkill[] {
  const ids = new Set(trackIds);
  return GLOBAL_SKILLS.filter((s) => s.tracks.some((t) => ids.has(t)));
}

/* مهارات مسار واحد (لعرض الشجرة في الخريطة) */
export function skillsForTrack(trackId: string): GlobalSkill[] {
  return GLOBAL_SKILLS.filter((s) => s.tracks.includes(trackId));
}

/* حالة مهارة من مجموعة المُتقنة: مُتقنة / متاحة / مقفلة */
export function skillNodeStatus(skill: GlobalSkill, masteredIds: Set<string>): NodeStatus {
  if (masteredIds.has(skill.id)) return "mastered";
  return (skill.prereqs ?? []).every((p) => masteredIds.has(p)) ? "available" : "locked";
}

/* عمق المهارة = أطول سلسلة متطلبات (لترتيب المستويات في العرض) */
export function skillDepth(skill: GlobalSkill, byId: Map<string, GlobalSkill> = SKILL_BY_ID): number {
  const pr = skill.prereqs ?? [];
  if (pr.length === 0) return 0;
  return 1 + Math.max(...pr.map((p) => {
    const parent = byId.get(p);
    return parent ? skillDepth(parent, byId) : 0;
  }));
}

/* تجميع حسب الفئة ثم المجال (للعرض) */
export interface DomainGroup { domain: string; skills: GlobalSkill[] }
export interface CategoryGroup { category: string; domains: DomainGroup[] }

export function groupedSkills(skills: GlobalSkill[]): CategoryGroup[] {
  const catMap = new Map<string, Map<string, GlobalSkill[]>>();
  for (const s of skills) {
    if (!catMap.has(s.category)) catMap.set(s.category, new Map());
    const domMap = catMap.get(s.category)!;
    const arr = domMap.get(s.domain) ?? [];
    arr.push(s);
    domMap.set(s.domain, arr);
  }
  return [...catMap.entries()].map(([category, domMap]) => ({
    category,
    domains: [...domMap.entries()].map(([domain, skills]) => ({ domain, skills })),
  }));
}
