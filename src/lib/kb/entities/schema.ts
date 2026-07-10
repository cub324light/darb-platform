/* ═══════════ قاعدة المعرفة الموحّدة — مخطّط الكيانات (Entity Schema) ═══════════
   مصدر الحقيقة الواحد لكل معرفة درب: الجامعات، الكليات، التخصصات، الوظائف،
   المسارات، الشركات، المهارات، الشهادات، الاختبارات. لا بيانات متفرقة — كل شيء
   كيانٌ واحد في رسمٍ (Graph) واحد، تربطه علاقات مُصنَّفة، ويقرؤه دويرب والوكلاء.

   ▓ مبادئ ثابتة (تغييرها لاحقاً مكلف — لذا نضبطها الآن):
   1) هوية ثابتة: كل كيان معرّفه «النوع:الاسم-اللطيف» (kind:slug) — لا يتغيّر.
   2) عُقَدٌ مُطبَّعة + حوافٌ مُصنَّفة: الحقول القياسية داخل الكيان، وكل رابط لكيان
      آخر يُعبَّر عنه بعلاقة مُصنَّفة (Relation) — فالرسم موحّد وقابل للاجتياز.
   3) قابل لقراءة دويرب: لكل كيان ما يكفي لتوليد «حقائق» نصّية (registry.describe).
   4) قابل للتوسّع: إضافة نوع/حقل/كيان لا تكسر ما قبله؛ إضافة الكيانات = بياناتٌ فقط.
   5) موصولٌ بطبقة المصادر: sourceIds تربط الكيان بمصادره الموثّقة (اقتباس دويرب).
   6) ثنائي اللغة عند الحاجة: name (عربي) + nameEn اختياري.

   هذا الملف أنواعٌ نقية فقط — لا اعتماد على المتصفح ولا IO. */

/* الأنواع التسعة — قائمة المالك حرفياً */
export type EntityKind =
  | "university"    // جامعة
  | "college"       // كلية
  | "major"         // تخصص
  | "job"           // وظيفة
  | "career_path"   // مسار مهني
  | "company"       // شركة/جهة توظيف
  | "skill"         // مهارة
  | "certification" // شهادة احترافية
  | "exam";         // اختبار (قدرات/تحصيلي/STEP/IELTS/CEFR...)

/* معرّف كيان: «kind:slug» — ثابت وفريد ومقروء */
export type EntityId = string;

/* أنواع العلاقات — حوافٌ مُصنَّفة موجّهة (المصدر → الهدف) */
export type RelationType =
  | "part_of"       // كلية ⊂ جامعة · تخصص ⊂ كلية
  | "offers"        // جامعة/كلية تطرح تخصصاً
  | "leads_to"      // تخصص → وظيفة · وظيفة → وظيفة (الخطوة التالية) · مسار → وظيفة
  | "requires"      // وظيفة تتطلّب مهارة/شهادة · تخصص يتطلّب اختباراً
  | "teaches"       // تخصص يُكسِب مهارة
  | "employs"       // شركة توظّف على وظيفة
  | "hires_from"    // شركة توظّف من تخصص
  | "prepares_for"  // اختبار يهيّئ لقبول/تخصص
  | "related_to";   // علاقة عامة

/* حافّة واحدة: نوعٌ + كيانٌ هدف + ملاحظة اختيارية */
export interface Relation {
  type: RelationType;
  to: EntityId;
  note?: string;
}

/* حقول مشتركة لكل كيان */
export interface EntityBase {
  kind: EntityKind;
  id: EntityId;
  name: string;            // الاسم العربي المعروض
  nameEn?: string;
  summary: string;         // سطرٌ واحد يُعرّف الكيان
  description?: string;    // وصفٌ أغنى (اختياري)
  aliases?: string[];      // أسماء بديلة للبحث/المطابقة (دويرب)
  tags?: string[];
  relations?: Relation[];  // الحواف إلى كيانات أخرى (الرسم)
  sourceIds?: string[];    // ربطٌ بطبقة المصادر الموثّقة (kb/types Source)
}

/* مدى راتب استرشادي موحّد */
export interface SalaryRange {
  entrySar: string;        // راتب مبتدئ (نص تقريبي)
  seniorSar?: string;      // بعد الخبرة
  note?: string;
}

export type Demand = "high" | "medium" | "low";

/* ─────────────── الكيانات المتخصّصة (Node types) ───────────────
   القاعدة: الحقول القياسية (قوائم/أرقام) داخل الكيان، والروابط لكيانات أخرى
   في relations[] (مهاراتٌ/شركاتٌ/شهاداتٌ/تخصصاتٌ = علاقات، لا نصوص مكرّرة). */

/* جامعة */
export interface UniversityEntity extends EntityBase {
  kind: "university";
  city?: string;
  type?: "government" | "private";
  founded?: number;
  ranking?: { scope: string; rank: string }[]; // تصنيفات (محلي/عالمي)
  stats?: { label: string; value: string }[];   // إحصاءات (طلاب/كليات...)
  website?: string;
}

/* كلية */
export interface CollegeEntity extends EntityBase {
  kind: "college";
}

/* تخصص */
export interface MajorEntity extends EntityBase {
  kind: "major";
  category?: string;         // الفئة العامة (صحي/هندسي/حاسب...)
  degreeYears?: number;      // سنوات الدرجة
  coreSubjects?: string[];   // المواد الأساسية
}

/* وظيفة — مثال المالك الكامل */
export interface JobEntity extends EntityBase {
  kind: "job";
  tasks: string[];              // المهام
  salary?: SalaryRange;         // الراتب
  demand?: Demand;              // الطلب في السوق
  learnPath?: string[];         // ماذا يتعلّم الطالب للوصول إليها
  // المهارات/الشركات/التخصصات/الشهادات/«ماذا بعدها» = علاقات في relations[]
}

/* مسار مهني */
export interface CareerPathEntity extends EntityBase {
  kind: "career_path";
  stages?: string[];            // مراحل المسار من مبتدئ إلى متقدّم
}

/* شركة/جهة توظيف */
export interface CompanyEntity extends EntityBase {
  kind: "company";
  sector?: string;              // القطاع
  locations?: string[];         // مدن/مواقع
  official?: boolean;           // جهة حكومية/رسمية
}

/* مهارة */
export interface SkillEntity extends EntityBase {
  kind: "skill";
  category?: string;            // تقنية/لغوية/تحليلية...
  toolFor?: string;             // إن كانت أداة/برنامجاً
}

/* شهادة احترافية */
export interface CertificationEntity extends EntityBase {
  kind: "certification";
  provider?: string;            // الجهة المانحة
  level?: string;               // مبتدئ/متقدّم
  costNote?: string;            // تكلفة تقريبية
  validityNote?: string;        // مدة الصلاحية
}

/* اختبار — قدرات/تحصيلي/STEP/IELTS/CEFR */
export interface ExamEntity extends EntityBase {
  kind: "exam";
  provider?: string;                          // قياس / بريطاني ...
  sections?: { name: string; note?: string }[]; // الأقسام
  levels?: string[];                          // مستويات (CEFR: A1..C2)
  scoreScale?: string;                        // سلّم الدرجات
  validityNote?: string;
  tips?: string[];
}

/* اتحاد كل الكيانات — مُميَّز بـ kind */
export type KBEntity =
  | UniversityEntity | CollegeEntity | MajorEntity | JobEntity | CareerPathEntity
  | CompanyEntity | SkillEntity | CertificationEntity | ExamEntity;

/* تسمية/أيقونة كل نوع (لعرضٍ موحّد وحقائق دويرب) */
export const KIND_META: Record<EntityKind, { label: string; icon: string }> = {
  university:    { label: "جامعة",     icon: "🏛️" },
  college:       { label: "كلية",      icon: "🏫" },
  major:         { label: "تخصص",      icon: "📚" },
  job:           { label: "وظيفة",     icon: "💼" },
  career_path:   { label: "مسار مهني", icon: "🧭" },
  company:       { label: "شركة",      icon: "🏢" },
  skill:         { label: "مهارة",     icon: "🛠️" },
  certification: { label: "شهادة",     icon: "🎓" },
  exam:          { label: "اختبار",    icon: "📝" },
};

/* تسمية العلاقة بالعربية — تُستعمل في توليد حقائق دويرب */
export const RELATION_LABEL: Record<RelationType, string> = {
  part_of: "جزء من",
  offers: "يطرح",
  leads_to: "يقود إلى",
  requires: "يتطلّب",
  teaches: "يُكسِب",
  employs: "يوظّف على",
  hires_from: "يوظّف من",
  prepares_for: "يهيّئ لـ",
  related_to: "مرتبط بـ",
};

/* بانٍ للمعرّف الثابت */
export const entityId = (kind: EntityKind, slug: string): EntityId => `${kind}:${slug}`;
