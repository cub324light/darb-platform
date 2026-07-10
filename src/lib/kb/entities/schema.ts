/* ═══════════ نموذج عالم درب (World Model) — مخطّط العقد ═══════════
   ليست مجرد قاعدة معرفة: كل شيء في حياة الطالب عقدةٌ (Node) في رسمٍ واحد. الرسم
   هو الحقيقة الوحيدة؛ والنصّ الذي يقرؤه دويرب مجرّد View مُشتقّ منه (registry.describe).

   ▓ مبادئ ثابتة (تغييرها لاحقاً مكلف):
   1) هوية ثابتة: كل عقدة «kind:slug».
   2) عُقَدٌ مُطبَّعة + حوافٌ مُصنَّفة: لا علاقة عامة — لكل رابط نوعٌ واضح.
   3) قابل لقراءة الرسم: الحقيقة في العقد والحواف؛ النص يُولَّد عند الطلب.
   4) نسخنة لكل عقدة: meta (version/lastUpdated/source/confidence) لمعرفة متى تُحدَّث.
   5) قابل للتوسّع: إضافة نوع/حقل/عقدة لا تكسر ما قبله.

   أنواعٌ نقية فقط — لا IO. */

/* ─── الأنواع (Node kinds) — ٩ أساسية + ١٠ جديدة ─── */
export type EntityKind =
  /* البنية الأكاديمية */
  | "university" | "college" | "major"
  | "subject"       // مادة (كيان مستقل: تربط التخصص بالمهارات/الأدوات/المشاريع/الوظائف)
  | "course"        // مقرّر (EE301)
  | "lesson"        // درس
  | "book"          // كتاب
  | "resource"      // مصدر (فيديو/مقال/بودكاست/PDF)
  /* المهني */
  | "job" | "career_path" | "company"
  | "skill"         // مهارة (قدرة مجرّدة)
  | "tool"          // أداة/برنامج (ETAP/AutoCAD) — غير المهارة
  | "ai_tool"       // أداة ذكاء اصطناعي (تتغيّر باستمرار — نوعٌ خاص)
  | "project"       // مشروع
  | "certification" // شهادة
  | "exam"          // اختبار (قدرات/تحصيلي/STEP/IELTS/CEFR)
  | "goal";         // هدف الطالب — أهمّ عقدة يقرؤها Life Engine

export type EntityId = string; // «kind:slug»

/* ─── العلاقات (Edges) — مفردات صريحة مغلقة، لا علاقة عامة ─── */
export type RelationType =
  | "requires"      // يتطلّب
  | "leads_to"      // يقود إلى
  | "uses"          // يستخدم (وظيفة/مشروع → أداة)
  | "belongs_to"    // ينتمي إلى (مادة → تخصص · مقرّر → مادة)
  | "recommends"    // يُنصَح بـ (مادة → أداة ذكاء · مصدر)
  | "similar_to"    // مشابه لـ
  | "part_of"       // جزء من (كلية → جامعة · درس → مقرّر)
  | "next_step"     // الخطوة التالية (وظيفة → وظيفة · مادة → مادة)
  | "prerequisite"  // متطلّب سابق (مادة تحتاج مادة قبلها)
  | "used_in"       // يُستخدَم في (مشروع → شركة · أداة ذكاء → مادة)
  | "works_at"      // يُمارَس في (وظيفة → شركة)
  | "certified_by"  // مُعتمَد من (اختبار/شهادة → جهة)
  | "teaches"       // يُكسِب (مادة/مصدر → مهارة)
  | "depends_on"    // يعتمد على
  | "supported_by"; // مدعوم بـ (درس → مصدر)

export interface Relation { type: RelationType; to: EntityId; note?: string; }

/* نسخنة العقدة — لمعرفة متى تحتاج تحديثاً */
export interface NodeMeta {
  version: number;
  lastUpdated: string;   // ISO (YYYY-MM-DD)
  source?: string;       // من أين جاءت المعلومة
  confidence?: number;   // 0..1 ثقة المحتوى
}

/* حقول مشتركة لكل عقدة */
export interface EntityBase {
  kind: EntityKind;
  id: EntityId;
  name: string;
  nameEn?: string;
  summary: string;
  description?: string;
  aliases?: string[];
  tags?: string[];
  relations?: Relation[];
  sourceIds?: string[];  // ربطٌ بطبقة المصادر الموثّقة
  meta?: NodeMeta;
}

export interface SalaryRange { entrySar: string; seniorSar?: string; note?: string; }
export type Demand = "high" | "medium" | "low";

/* ─── العقد المتخصّصة ─── */
export interface UniversityEntity extends EntityBase {
  kind: "university";
  city?: string; type?: "government" | "private"; founded?: number;
  ranking?: { scope: string; rank: string }[];
  stats?: { label: string; value: string }[];
  website?: string;
}
export type CollegeEntity = EntityBase & { kind: "college" };

export interface MajorEntity extends EntityBase {
  kind: "major";
  category?: string; degreeYears?: number; coreSubjects?: string[];
}
export interface SubjectEntity extends EntityBase {
  kind: "subject";
  code?: string; category?: string; level?: "secondary" | "university";
}
export interface CourseEntity extends EntityBase {
  kind: "course";
  code?: string; credits?: number;
}
export type LessonEntity = EntityBase & { kind: "lesson"; durationMin?: number };

export interface BookEntity extends EntityBase {
  kind: "book";
  author?: string; publisher?: string; forExam?: boolean;
}
export interface ResourceEntity extends EntityBase {
  kind: "resource";
  format?: "video" | "article" | "podcast" | "pdf" | "course";
  url?: string; lang?: "ar" | "en";
}
export interface JobEntity extends EntityBase {
  kind: "job";
  tasks: string[]; salary?: SalaryRange; demand?: Demand; learnPath?: string[];
}
export interface CareerPathEntity extends EntityBase { kind: "career_path"; stages?: string[]; }
export interface CompanyEntity extends EntityBase {
  kind: "company";
  sector?: string; locations?: string[]; official?: boolean;
}
export interface SkillEntity extends EntityBase { kind: "skill"; category?: string; }
export interface ToolEntity extends EntityBase {
  kind: "tool";
  category?: string; platform?: string;
}
export interface AiToolEntity extends EntityBase {
  kind: "ai_tool";
  vendor?: string; bestFor?: string[];
}
export interface ProjectEntity extends EntityBase {
  kind: "project";
  difficulty?: "beginner" | "intermediate" | "advanced"; deliverables?: string[];
}
export interface CertificationEntity extends EntityBase {
  kind: "certification";
  provider?: string; level?: string; costNote?: string; validityNote?: string;
}
export interface ExamEntity extends EntityBase {
  kind: "exam";
  provider?: string; sections?: { name: string; note?: string }[];
  levels?: string[]; scoreScale?: string; validityNote?: string; tips?: string[];
}
export interface GoalEntity extends EntityBase {
  kind: "goal";
  target?: EntityId;   // العقدة الهدف (تخصص/شركة/اختبار...)
  metric?: string;     // معيار النجاح (مثل «STEP 85»)
}

/* اتحاد كل العقد — مُميَّز بـ kind */
export type KBEntity =
  | UniversityEntity | CollegeEntity | MajorEntity | SubjectEntity | CourseEntity
  | LessonEntity | BookEntity | ResourceEntity | JobEntity | CareerPathEntity
  | CompanyEntity | SkillEntity | ToolEntity | AiToolEntity | ProjectEntity
  | CertificationEntity | ExamEntity | GoalEntity;

/* تسمية/أيقونة كل نوع */
export const KIND_META: Record<EntityKind, { label: string; icon: string }> = {
  university:    { label: "جامعة",           icon: "🏛️" },
  college:       { label: "كلية",            icon: "🏫" },
  major:         { label: "تخصص",            icon: "📚" },
  subject:       { label: "مادة",            icon: "📖" },
  course:        { label: "مقرّر",           icon: "🗂️" },
  lesson:        { label: "درس",             icon: "📝" },
  book:          { label: "كتاب",            icon: "📕" },
  resource:      { label: "مصدر",            icon: "🎬" },
  job:           { label: "وظيفة",           icon: "💼" },
  career_path:   { label: "مسار مهني",       icon: "🧭" },
  company:       { label: "شركة",            icon: "🏢" },
  skill:         { label: "مهارة",           icon: "🛠️" },
  tool:          { label: "أداة",            icon: "🧰" },
  ai_tool:       { label: "أداة ذكاء",       icon: "🤖" },
  project:       { label: "مشروع",           icon: "🚀" },
  certification: { label: "شهادة",           icon: "🎓" },
  exam:          { label: "اختبار",          icon: "🧪" },
  goal:          { label: "هدف",             icon: "🎯" },
};

/* تسمية العلاقة (اتجاه الخروج) — لعرضٍ موحّد */
export const RELATION_LABEL: Record<RelationType, string> = {
  requires: "يتطلّب", leads_to: "يقود إلى", uses: "يستخدم", belongs_to: "ينتمي إلى",
  recommends: "يُنصَح بـ", similar_to: "مشابه لـ", part_of: "جزء من", next_step: "الخطوة التالية",
  prerequisite: "متطلّب سابق", used_in: "يُستخدَم في", works_at: "يُمارَس في",
  certified_by: "مُعتمَد من", teaches: "يُكسِب", depends_on: "يعتمد على", supported_by: "مدعوم بـ",
};

export const entityId = (kind: EntityKind, slug: string): EntityId => `${kind}:${slug}`;

/* نسخنة افتراضية حين تغيب — فتبقى لكل عقدة meta عند القراءة */
export const DEFAULT_META: NodeMeta = { version: 1, lastUpdated: "2026-07-01", confidence: 0.9 };
