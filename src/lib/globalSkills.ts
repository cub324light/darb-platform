/* ─── الموسوعة الموحدة للمهارات — Category → Domain → Skill ───
   نفس معرّف المهارة مشترك بين جميع الاختبارات التي تقيسها.
   مثال: en_read_infer «الاستنتاج» موجود في ايلتس وستيب وتوفل معاً. */

export interface GlobalSkill {
  id: string;
  name: string;       // الاسم بالعربية
  category: string;   // الفئة الكبرى
  domain: string;     // المجال الفرعي
  tracks: string[];   // المسارات التي تشمل هذه المهارة
}

export const GLOBAL_SKILLS: GlobalSkill[] = [
  // ── اللغة العربية: لفظي ──────────────────────────────────────
  { id: "ar_vocab",     name: "المفردات",            category: "اللغة العربية", domain: "لفظي",  tracks: ["قدرات"] },
  { id: "ar_analogy",   name: "التناظر اللفظي",      category: "اللغة العربية", domain: "لفظي",  tracks: ["قدرات"] },
  { id: "ar_complete",  name: "إكمال الجمل",         category: "اللغة العربية", domain: "لفظي",  tracks: ["قدرات"] },
  { id: "ar_odd",       name: "المفردة الشاذة",      category: "اللغة العربية", domain: "لفظي",  tracks: ["قدرات"] },
  { id: "ar_context",   name: "الخطأ السياقي",       category: "اللغة العربية", domain: "لفظي",  tracks: ["قدرات"] },
  { id: "ar_reading",   name: "استيعاب المقروء",     category: "اللغة العربية", domain: "لفظي",  tracks: ["قدرات"] },
  // ── اللغة العربية: كمي ───────────────────────────────────────
  { id: "math_arith",   name: "العمليات الحسابية",   category: "اللغة العربية", domain: "كمي",   tracks: ["قدرات", "CPC", "ITC"] },
  { id: "math_ratio",   name: "النسبة والتناسب",     category: "اللغة العربية", domain: "كمي",   tracks: ["قدرات", "CPC", "ITC"] },
  { id: "math_alg",     name: "الجبر والمعادلات",    category: "اللغة العربية", domain: "كمي",   tracks: ["قدرات", "CPC", "ITC"] },
  { id: "math_geo",     name: "الهندسة",             category: "اللغة العربية", domain: "كمي",   tracks: ["قدرات", "CPC", "ITC"] },
  { id: "math_stats",   name: "الإحصاء والاحتمالات", category: "اللغة العربية", domain: "كمي",   tracks: ["قدرات", "CPC", "ITC"] },
  { id: "math_word",    name: "المسائل اللفظية",     category: "اللغة العربية", domain: "كمي",   tracks: ["قدرات", "CPC", "ITC"] },
  // ── الرياضيات ────────────────────────────────────────────────
  { id: "t_math_basic",  name: "أساسيات الرياضيات",      category: "الرياضيات", domain: "رياضيات", tracks: ["تحصيلي", "تحصيلي مبكر"] },
  { id: "t_math_calc",   name: "التفاضل والتكامل",        category: "الرياضيات", domain: "رياضيات", tracks: ["تحصيلي"] },
  { id: "t_math_seq",    name: "المتتاليات والمتسلسلات",  category: "الرياضيات", domain: "رياضيات", tracks: ["تحصيلي"] },
  { id: "t_math_matrix", name: "المصفوفات",               category: "الرياضيات", domain: "رياضيات", tracks: ["تحصيلي"] },
  // ── الفيزياء ─────────────────────────────────────────────────
  { id: "t_phys_mech",   name: "الميكانيكا",            category: "الفيزياء", domain: "فيزياء", tracks: ["تحصيلي", "تحصيلي مبكر"] },
  { id: "t_phys_elec",   name: "الكهرباء والمغناطيسية", category: "الفيزياء", domain: "فيزياء", tracks: ["تحصيلي"] },
  { id: "t_phys_wave",   name: "الموجات والبصريات",      category: "الفيزياء", domain: "فيزياء", tracks: ["تحصيلي"] },
  { id: "t_phys_thermo", name: "الحرارة والديناميكا",    category: "الفيزياء", domain: "فيزياء", tracks: ["تحصيلي"] },
  // ── الكيمياء ─────────────────────────────────────────────────
  { id: "t_chem_gen",    name: "الكيمياء العامة",   category: "الكيمياء", domain: "كيمياء", tracks: ["تحصيلي", "تحصيلي مبكر"] },
  { id: "t_chem_org",    name: "الكيمياء العضوية",  category: "الكيمياء", domain: "كيمياء", tracks: ["تحصيلي"] },
  // ── الأحياء ──────────────────────────────────────────────────
  { id: "t_bio_cell",    name: "الخلية والوراثة", category: "الأحياء", domain: "أحياء", tracks: ["تحصيلي", "تحصيلي مبكر"] },
  { id: "t_bio_organ",   name: "وظائف الأعضاء",  category: "الأحياء", domain: "أحياء", tracks: ["تحصيلي"] },
  { id: "t_bio_eco",     name: "البيئة والنظم",   category: "الأحياء", domain: "أحياء", tracks: ["تحصيلي"] },
  // ── الإنجليزية: قراءة ────────────────────────────────────────
  { id: "en_read_main",   name: "الفكرة الرئيسية",  category: "الإنجليزية", domain: "قراءة",  tracks: ["ايلتس", "ستيب", "توفل", "دوليقو", "CPC", "ITC"] },
  { id: "en_read_infer",  name: "الاستنتاج",        category: "الإنجليزية", domain: "قراءة",  tracks: ["ايلتس", "ستيب", "توفل", "دوليقو", "CPC", "ITC"] },
  { id: "en_read_detail", name: "التفاصيل",         category: "الإنجليزية", domain: "قراءة",  tracks: ["ايلتس", "ستيب", "توفل", "CPC"] },
  { id: "en_read_vocab",  name: "مفردات في السياق", category: "الإنجليزية", domain: "قراءة",  tracks: ["ايلتس", "ستيب", "توفل", "دوليقو", "CPC", "ITC"] },
  // ── الإنجليزية: استماع ───────────────────────────────────────
  { id: "en_list_gen",    name: "الاستيعاب العام",  category: "الإنجليزية", domain: "استماع", tracks: ["ايلتس", "توفل", "دوليقو"] },
  { id: "en_list_spec",   name: "معلومات محددة",    category: "الإنجليزية", domain: "استماع", tracks: ["ايلتس", "توفل"] },
  { id: "en_list_tone",   name: "نبرة المتحدث",     category: "الإنجليزية", domain: "استماع", tracks: ["ايلتس", "توفل"] },
  // ── الإنجليزية: كتابة ────────────────────────────────────────
  { id: "en_write_org",   name: "تنظيم المقال",       category: "الإنجليزية", domain: "كتابة",  tracks: ["ايلتس", "توفل", "CPC"] },
  { id: "en_write_coh",   name: "الاتساق والترابط",   category: "الإنجليزية", domain: "كتابة",  tracks: ["ايلتس", "توفل"] },
  { id: "en_write_gram",  name: "القواعد في الكتابة", category: "الإنجليزية", domain: "كتابة",  tracks: ["ايلتس", "توفل", "ستيب", "دوليقو"] },
  // ── الإنجليزية: محادثة ───────────────────────────────────────
  { id: "en_speak_flu",   name: "الطلاقة",          category: "الإنجليزية", domain: "محادثة", tracks: ["ايلتس", "توفل", "دوليقو"] },
  { id: "en_speak_acc",   name: "الدقة اللغوية",    category: "الإنجليزية", domain: "محادثة", tracks: ["ايلتس", "توفل", "دوليقو"] },
  // ── الإنجليزية: قواعد ────────────────────────────────────────
  { id: "en_gram_tense",  name: "الأزمنة",            category: "الإنجليزية", domain: "قواعد",  tracks: ["ستيب", "CPC", "ITC", "دوليقو"] },
  { id: "en_gram_morph",  name: "الصرف",              category: "الإنجليزية", domain: "قواعد",  tracks: ["ستيب", "دوليقو"] },
  { id: "en_gram_agree",  name: "المطابقة النحوية",   category: "الإنجليزية", domain: "قواعد",  tracks: ["ستيب", "دوليقو"] },
  // ── المنطق ───────────────────────────────────────────────────
  { id: "itc_reason",     name: "الاستدلال الرياضي", category: "المنطق", domain: "منطق", tracks: ["ITC"] },
  { id: "itc_logic",      name: "التسلسل المنطقي",   category: "المنطق", domain: "منطق", tracks: ["ITC"] },
  { id: "itc_critical",   name: "التفكير النقدي",    category: "المنطق", domain: "منطق", tracks: ["ITC"] },
];

/* الحصول على مهارات مسارات محددة (بدون تكرار) */
export function skillsForTracks(trackIds: string[]): GlobalSkill[] {
  const ids = new Set(trackIds);
  return GLOBAL_SKILLS.filter((s) => s.tracks.some((t) => ids.has(t)));
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
