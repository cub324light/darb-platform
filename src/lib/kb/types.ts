/* ─── قاعدة المعرفة (Knowledge Base) — نماذج البيانات ───
   المصدر الأساسي لكل إجابات دويرب ومحتوى المنصة. مصمَّمة لتتوسّع سنوات:
   المصادر بيانات (لا كود)، قابلة للإضافة من لوحة الإدارة، مع نسخ (versioning)
   ودرجات ثقة وكشف تقادم. هذه الوحدة أنواع نقية فقط — لا اعتماد على المتصفح. */

/* الأقسام الأحد عشر — مصدر واحد لكل المستهلكين */
export type SourceCategory =
  | "secondary"        // الثانوية
  | "qudurat"          // القدرات
  | "tahsili"          // التحصيلي
  | "step"             // STEP
  | "universities"     // الجامعات السعودية
  | "university_plans" // الخطط الدراسية الجامعية
  | "admission"        // القبول
  | "scholarships"     // المنح
  | "jobs"             // الوظائف
  | "edu_news"         // الأخبار التعليمية
  | "regulations";     // الأنظمة واللوائح

export interface CategoryDef { id: SourceCategory; label: string; icon: string; }

export const SOURCE_CATEGORIES: readonly CategoryDef[] = [
  { id: "secondary",        label: "الثانوية",                 icon: "🏫" },
  { id: "qudurat",          label: "القدرات",                  icon: "🧠" },
  { id: "tahsili",          label: "التحصيلي",                 icon: "📚" },
  { id: "step",             label: "STEP",                     icon: "🔤" },
  { id: "universities",     label: "الجامعات السعودية",         icon: "🏛️" },
  { id: "university_plans", label: "الخطط الدراسية الجامعية",   icon: "🗂️" },
  { id: "admission",        label: "القبول",                   icon: "🎓" },
  { id: "scholarships",     label: "المنح",                    icon: "💰" },
  { id: "jobs",             label: "الوظائف",                  icon: "💼" },
  { id: "edu_news",         label: "الأخبار التعليمية",         icon: "📰" },
  { id: "regulations",      label: "الأنظمة واللوائح",          icon: "⚖️" },
] as const;

export function categoryLabel(id: SourceCategory): string {
  return SOURCE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/* أفضل طريقة لجلب البيانات من المصدر */
export type FetchMethod = "api" | "rss" | "scrape" | "pdf" | "manual";

export const FETCH_METHODS: Record<FetchMethod, string> = {
  api:    "API (الأفضل — منظَّم وفوري)",
  rss:    "RSS (تحديث تلقائي للأخبار)",
  scrape: "Web Scraping (للمواقع بلا API)",
  pdf:    "ملفات PDF (الأدلة والأنظمة)",
  manual: "إدخال يدوي (يحرّره المشرف)",
};

/* هل يُحدَّث المصدر تلقائياً أم يدوياً */
export type UpdateMode = "auto" | "manual";

/* حالة المصدر/المدخل */
export type ItemStatus = "active" | "disabled" | "expired";

/* ─── المصدر (Source) — بيانات تُضاف بلا تعديل كود ─── */
export interface Source {
  id: string;
  category: SourceCategory;
  name: string;               // اسم المصدر المعروض
  org: string;                // الجهة المالكة
  url: string;
  official: boolean;          // رسمي (true) أم موثوق غير رسمي (false)
  trust: number;              // درجة الثقة 0–100
  fetchMethod: FetchMethod;
  updateMode: UpdateMode;
  reviewCadenceDays: number;  // كل كم يوم يُعاد التحقق منه
  lastVerified: number;       // آخر تحقق (ms)
  expiresAt: number | null;   // تاريخ انتهاء معروف (ms) أو null
  status: ItemStatus;
  notes?: string;
  tags?: string[];
  version: number;
  updatedAt: number;
  origin: "seed" | "custom";  // من البذرة المضمّنة أم مُضاف من الإدارة
}

/* ─── مدخل معرفة (KB Entry) — الحقيقة التي يجيب منها دويرب ─── */
export interface KBEntry {
  id: string;
  category: SourceCategory;
  question: string;           // العنوان/السؤال
  answer: string;             // الإجابة الموثوقة (يستعملها دويرب نصّاً)
  keywords: string[];         // كلمات مفتاحية للمطابقة
  sourceIds: string[];        // المصادر الداعمة (للإسناد ودرجة الثقة)
  trust: number;              // درجة ثقة المدخل 0–100
  lastVerified: number;       // ms
  expiresAt: number | null;
  status: ItemStatus;
  version: number;
  updatedAt: number;
  origin: "seed" | "custom";
}

/* ─── سجل نسخة (Versioning) — لمعرفة متى تغيّرت المعلومة ─── */
export interface KBVersionRecord {
  id: string;
  targetType: "source" | "entry";
  targetId: string;
  version: number;
  field: string;              // الحقل الذي تغيّر
  before: string;
  after: string;
  changedBy: string;          // uid/إيميل المشرف
  changedAt: number;
}
