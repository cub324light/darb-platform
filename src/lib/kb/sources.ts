/* ─── سجل المصادر المبدئي (Seed Source Registry) ───
   تجسيد «تصنيف المصادر» كبيانات — يُدمج فوقه ما يضيفه المشرف من Firestore
   (لا تعديل كود لإضافة مصدر). كل مصدر: رسمي/موثوق، درجة ثقة، طريقة جلب،
   وضع تحديث، ودورية مراجعة. التواريخ ثابتة (بذرة) ليبقى السلوك حتمياً. */
import type { Source, SourceCategory, FetchMethod, UpdateMode } from "./types";

/* وقت تحقّق البذرة (ثابت = 2026-06-01 UTC) — حتمي وقابل للاختبار */
export const SEED_VERIFIED_AT = Date.UTC(2026, 5, 1);
const DAY = 86_400_000;

type Seed = {
  id: string; category: SourceCategory; name: string; org: string; url: string;
  official: boolean; trust: number; fetchMethod: FetchMethod; updateMode: UpdateMode;
  cadence: number; tags?: string[]; notes?: string;
};

const SEEDS: Seed[] = [
  /* ── الثانوية ── */
  { id: "moe-main", category: "secondary", name: "وزارة التعليم", org: "وزارة التعليم", url: "https://moe.gov.sa", official: true, trust: 99, fetchMethod: "scrape", updateMode: "manual", cadence: 30, tags: ["مناهج", "تقويم دراسي"] },
  { id: "noor", category: "secondary", name: "نظام نور", org: "وزارة التعليم", url: "https://noor.moe.gov.sa", official: true, trust: 97, fetchMethod: "manual", updateMode: "manual", cadence: 60, notes: "بوابة الدرجات والنتائج" },
  { id: "madrasati", category: "secondary", name: "منصة مدرستي", org: "وزارة التعليم", url: "https://schools.madrasati.sa", official: true, trust: 95, fetchMethod: "manual", updateMode: "manual", cadence: 60 },

  /* ── القدرات ── */
  { id: "etec-qudurat", category: "qudurat", name: "هيئة تقويم التعليم (القدرات العامة)", org: "ETEC", url: "https://etec.gov.sa", official: true, trust: 99, fetchMethod: "scrape", updateMode: "manual", cadence: 21, tags: ["قياس", "مواعيد"] },
  { id: "qiyas-qudurat", category: "qudurat", name: "قياس — التسجيل والمواعيد", org: "ETEC / قياس", url: "https://qiyas.sa", official: true, trust: 97, fetchMethod: "scrape", updateMode: "manual", cadence: 14, notes: "فترات التسجيل والنتائج" },

  /* ── التحصيلي ── */
  { id: "etec-tahsili", category: "tahsili", name: "هيئة تقويم التعليم (التحصيلي)", org: "ETEC", url: "https://etec.gov.sa", official: true, trust: 99, fetchMethod: "scrape", updateMode: "manual", cadence: 21 },
  { id: "qiyas-tahsili", category: "tahsili", name: "قياس — التحصيلي", org: "ETEC / قياس", url: "https://qiyas.sa", official: true, trust: 96, fetchMethod: "scrape", updateMode: "manual", cadence: 21 },

  /* ── STEP ── */
  { id: "etec-step", category: "step", name: "اختبار STEP", org: "ETEC", url: "https://etec.gov.sa", official: true, trust: 98, fetchMethod: "scrape", updateMode: "manual", cadence: 30, tags: ["إنجليزي"] },

  /* ── الجامعات السعودية ── */
  { id: "moe-universities", category: "universities", name: "دليل الجامعات الحكومية", org: "وزارة التعليم", url: "https://moe.gov.sa/ar/education/highereducation", official: true, trust: 97, fetchMethod: "scrape", updateMode: "manual", cadence: 90 },
  { id: "ksu", category: "universities", name: "جامعة الملك سعود", org: "KSU", url: "https://ksu.edu.sa", official: true, trust: 96, fetchMethod: "scrape", updateMode: "manual", cadence: 90 },
  { id: "kfupm", category: "universities", name: "جامعة الملك فهد للبترول والمعادن", org: "KFUPM", url: "https://kfupm.edu.sa", official: true, trust: 96, fetchMethod: "scrape", updateMode: "manual", cadence: 90 },

  /* ── الخطط الدراسية الجامعية ── */
  { id: "ksu-plans", category: "university_plans", name: "الخطط الدراسية — جامعة الملك سعود", org: "KSU", url: "https://dadmissions.ksu.edu.sa", official: true, trust: 92, fetchMethod: "pdf", updateMode: "manual", cadence: 180, notes: "خطط الأقسام (PDF)" },
  { id: "kfupm-plans", category: "university_plans", name: "الخطط الدراسية — جامعة البترول", org: "KFUPM", url: "https://kfupm.edu.sa", official: true, trust: 92, fetchMethod: "pdf", updateMode: "manual", cadence: 180 },

  /* ── القبول ── */
  { id: "admission-riyadh", category: "admission", name: "بوابة القبول الموحّد (الرياض)", org: "وزارة التعليم", url: "https://riyadhadm.moe.gov.sa", official: true, trust: 96, fetchMethod: "scrape", updateMode: "manual", cadence: 14, tags: ["مواعيد القبول"] },
  { id: "admission-deanships", category: "admission", name: "عمادات القبول والتسجيل", org: "الجامعات", url: "https://moe.gov.sa", official: true, trust: 90, fetchMethod: "manual", updateMode: "manual", cadence: 30 },

  /* ── المنح ── */
  { id: "study-abroad", category: "scholarships", name: "بوابة الدراسة في الخارج", org: "وزارة التعليم", url: "https://moe.gov.sa/ar/knowledgecenter/studyabroad", official: true, trust: 94, fetchMethod: "scrape", updateMode: "manual", cadence: 45 },
  { id: "internal-scholarships", category: "scholarships", name: "المنح الداخلية للجامعات", org: "الجامعات", url: "https://moe.gov.sa", official: true, trust: 88, fetchMethod: "manual", updateMode: "manual", cadence: 60 },

  /* ── الوظائف ── */
  { id: "jadarat", category: "jobs", name: "جدارات (التوظيف الحكومي)", org: "وزارة الموارد البشرية", url: "https://jadarat.sa", official: true, trust: 95, fetchMethod: "scrape", updateMode: "manual", cadence: 14 },
  { id: "taqat-hadaf", category: "jobs", name: "طاقات (هدف)", org: "صندوق تنمية الموارد البشرية", url: "https://taqat.sa", official: true, trust: 92, fetchMethod: "scrape", updateMode: "manual", cadence: 14 },
  { id: "qiwa", category: "jobs", name: "منصة قوى", org: "وزارة الموارد البشرية", url: "https://qiwa.sa", official: true, trust: 90, fetchMethod: "manual", updateMode: "manual", cadence: 30 },

  /* ── الأخبار التعليمية ── */
  { id: "spa-edu", category: "edu_news", name: "واس — التعليم", org: "وكالة الأنباء السعودية", url: "https://spa.gov.sa", official: true, trust: 93, fetchMethod: "rss", updateMode: "auto", cadence: 2, tags: ["أخبار"] },
  { id: "moe-news", category: "edu_news", name: "أخبار وزارة التعليم", org: "وزارة التعليم", url: "https://moe.gov.sa/ar/mediacenter/MOEnews", official: true, trust: 95, fetchMethod: "rss", updateMode: "auto", cadence: 3 },

  /* ── الأنظمة واللوائح ── */
  { id: "boe-laws", category: "regulations", name: "هيئة الخبراء — الأنظمة", org: "مجلس الوزراء", url: "https://laws.boe.gov.sa", official: true, trust: 98, fetchMethod: "scrape", updateMode: "manual", cadence: 90, tags: ["نظام التعليم"] },
  { id: "etec-regulations", category: "regulations", name: "لوائح الاختبارات", org: "ETEC", url: "https://etec.gov.sa", official: true, trust: 95, fetchMethod: "pdf", updateMode: "manual", cadence: 120 },
];

/* بناء سجل البذرة كمصادر كاملة */
export const SEED_SOURCES: Source[] = SEEDS.map((s) => ({
  id: s.id,
  category: s.category,
  name: s.name,
  org: s.org,
  url: s.url,
  official: s.official,
  trust: s.trust,
  fetchMethod: s.fetchMethod,
  updateMode: s.updateMode,
  reviewCadenceDays: s.cadence,
  lastVerified: SEED_VERIFIED_AT,
  expiresAt: null,
  status: "active",
  notes: s.notes,
  tags: s.tags ?? [],
  version: 1,
  updatedAt: SEED_VERIFIED_AT,
  origin: "seed",
}));

export const SEED_SOURCE_BY_ID: Map<string, Source> = new Map(SEED_SOURCES.map((s) => [s.id, s]));
export { DAY as MS_PER_DAY };
