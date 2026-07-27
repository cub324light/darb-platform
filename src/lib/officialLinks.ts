/* ═══════════ المصادر الرسمية (Official Links) — بياناتٌ ثابتة ═══════════
   ▸ لماذا؟ قسمٌ داخل مساري بروابطَ رسميةٍ فقط، مصنّفة، لكلٍّ اسمٌ ووصفٌ وزرُّ فتح.
   ▸ صدق: نطاقاتٌ رسميةٌ موثّقةٌ فقط — لا نخترع رابطاً. تُوسَّع (سفير · الابتعاث · القبول
     الموحّد · ITC …) عند اعتماد ملف الجامعات/الجهات من المالك.
   ▸ بحثٌ نقيّ (searchLinks) لأنّ القائمة ستكبر. */

export type LinkCategory = "assessment" | "ministry" | "universities" | "programs";

export interface OfficialLink {
  id: string;
  name: string;      // اسم الجهة (كاملاً — لصفحة المصادر)
  short?: string;    // اسمٌ قصير للبطاقات الضيّقة (مساري)
  desc: string;      // وصفٌ بسيط
  url: string;       // النطاق الرسميّ
  category: LinkCategory;
}

export const LINK_CATEGORY_LABEL: Record<LinkCategory, string> = {
  assessment: "قياس وقبول",
  ministry: "الجهات الرسمية",
  universities: "الجامعات السعودية",
  programs: "برامج وجهات",
};

/* نطاقاتٌ رسميةٌ مستقرّة وموثّقة. (تُوسَّع لاحقاً بروابطَ يؤكّدها المالك.) */
export const OFFICIAL_LINKS: OfficialLink[] = [
  { id: "etec",  name: "قياس (هيئة تقويم التعليم والتدريب)", short: "قياس", desc: "التسجيل في القدرات والتحصيلي ونتائجها.", url: "https://etec.gov.sa", category: "assessment" },
  { id: "moe",   name: "وزارة التعليم", short: "وزارة التعليم", desc: "البوابة الرسمية لوزارة التعليم.", url: "https://moe.gov.sa", category: "ministry" },

  { id: "kfu",     name: "جامعة الملك فيصل", short: "الملك فيصل", desc: "الأحساء — القبول والبرامج الأكاديمية.", url: "https://kfu.edu.sa", category: "universities" },
  { id: "iau",     name: "جامعة الإمام عبدالرحمن بن فيصل", short: "الإمام عبدالرحمن", desc: "الدمام — القبول والبرامج.", url: "https://iau.edu.sa", category: "universities" },
  { id: "kfupm",   name: "جامعة الملك فهد للبترول والمعادن", short: "الملك فهد", desc: "الظهران — الهندسة والحاسب والعلوم.", url: "https://kfupm.edu.sa", category: "universities" },
  { id: "ksu",     name: "جامعة الملك سعود", short: "الملك سعود", desc: "الرياض — القبول والبرامج.", url: "https://ksu.edu.sa", category: "universities" },
  { id: "uqu",     name: "جامعة أم القرى", short: "أم القرى", desc: "مكة المكرمة — القبول والبرامج.", url: "https://uqu.edu.sa", category: "universities" },
  { id: "qu",      name: "جامعة القصيم", short: "القصيم", desc: "القصيم — القبول والبرامج.", url: "https://qu.edu.sa", category: "universities" },
  { id: "taibahu", name: "جامعة طيبة", short: "طيبة", desc: "المدينة المنورة — القبول والبرامج.", url: "https://taibahu.edu.sa", category: "universities" },
  { id: "jazanu",  name: "جامعة جازان", short: "جازان", desc: "جازان — القبول والبرامج.", url: "https://jazanu.edu.sa", category: "universities" },
  { id: "ut",      name: "جامعة تبوك", short: "تبوك", desc: "تبوك — القبول والبرامج.", url: "https://ut.edu.sa", category: "universities" },
  { id: "nu",      name: "جامعة نجران", short: "نجران", desc: "نجران — القبول والبرامج.", url: "https://nu.edu.sa", category: "universities" },

  { id: "aramco", name: "أرامكو السعودية", short: "أرامكو", desc: "برامج التوظيف والتحضير الجامعي (CPC).", url: "https://aramco.com", category: "programs" },
  { id: "sabic",  name: "سابك", short: "سابك", desc: "برامج التوظيف والتدريب.", url: "https://sabic.com", category: "programs" },
  { id: "neom",   name: "نيوم", short: "نيوم", desc: "الفرص والبرامج والوظائف.", url: "https://neom.com", category: "programs" },
];

/* ترتيب عرض التصنيفات */
export const LINK_CATEGORY_ORDER: LinkCategory[] = ["assessment", "universities", "programs", "ministry"];

/** بحثٌ نقيّ في الاسم/الوصف (تطبيعٌ بسيط) — للمربّع «ابحث عن جامعة أو برنامج». */
export function searchLinks(links: OfficialLink[], query: string): OfficialLink[] {
  const q = query.trim();
  if (!q) return links;
  const norm = (s: string) => s.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").toLowerCase();
  const nq = norm(q);
  return links.filter((l) => norm(l.name).includes(nq) || norm(l.desc).includes(nq));
}
