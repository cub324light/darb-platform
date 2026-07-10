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
  | "concept"       // مفهوم (قانون أوم/التكامل) — يظهر في عدّة مواد/كتب/اختبارات
  | "course"        // مقرّر (EE301)
  | "lesson"        // درس
  | "book"          // كتاب
  | "resource"      // مصدر (فيديو/مقال/بودكاست/PDF)
  | "question"      // سؤال (كيان مستقل يُعاد استخدامه)
  /* المهني */
  | "job" | "career_path" | "company"
  | "skill"         // مهارة (قدرة مجرّدة)
  | "tool"          // أداة/برنامج (ETAP/AutoCAD) — غير المهارة
  | "ai_tool"       // أداة ذكاء اصطناعي (تتغيّر باستمرار — نوعٌ خاص)
  | "project"       // مشروع
  | "certification" // شهادة
  | "exam"          // اختبار (قدرات/تحصيلي/STEP/IELTS/CEFR)
  | "exam_session"  // محاولة الطالب لاختبار (درجة/وقت/أخطاء/مفاهيم ضعيفة)
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
  | "teaches"       // يُكسِب (مادة/مصدر → مهارة/مفهوم)
  | "depends_on"    // يعتمد على
  | "supported_by"  // مدعوم بـ (درس → مصدر)
  | "related_to";   // مرتبط بـ (صلة غير مباشرة: ETAP ↔ MATLAB · أوم ↔ كيرشوف)

export interface Relation { type: RelationType; to: EntityId; note?: string; }

/* نسخنة العقدة + وزنها — لمعرفة متى تحتاج تحديثاً وما الذي يبدأ به دويرب */
export interface NodeMeta {
  version: number;
  lastUpdated: string;   // ISO (YYYY-MM-DD)
  source?: string;       // من أين جاءت المعلومة
  confidence?: number;   // 0..1 ثقة المحتوى
  importance?: number;   // 0..100 أهمية العقدة (قانون أوم=100 · قانون ثانوي=25)
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
  category?: string; degreeYears?: number;
  /* المواد كيانات مستقلة تربطها belongs_to — لا تُخزَّن هنا (لا تكرار). */
}
export interface SubjectEntity extends EntityBase {
  kind: "subject";
  code?: string; category?: string; level?: "secondary" | "university";
}
/* حقول محتوى المفهوم الثابتة — تُنشأ أماكنها من البداية وتُملأ لاحقاً (لا نعيد
   الهيكلة عند بدء المحتوى الحقيقي). «يرتبط بـ» و«يستخدم في» علاقاتٌ لا حقول. */
export interface ConceptBody {
  definition?: string;          // التعريف
  whyImportant?: string;        // لماذا هو مهم
  commonMistakes?: string[];    // الأخطاء الشائعة
  examples?: string[];          // أمثلة
  simpleExplanation?: string;   // شرح مبسّط
  advancedExplanation?: string; // شرح متقدّم
}
/* مفهوم — يظهر عبر عدّة مواد/كتب/اختبارات؛ يُشار إليه بعلاقات لا يُنسَخ.
   نفكّر بالمفهوم لا المادة: «التفاضل» عقدةٌ واحدة قد تنتمي لعدّة اختبارات/مجالات. */
export interface ConceptEntity extends EntityBase {
  kind: "concept";
  category?: string;                          // المجال/المهارة: رياضيات/فيزياء/Grammar/Reading...
  difficulty?: "easy" | "medium" | "hard";    // صعوبة المفهوم
  examFrequency?: number;                      // 0..100 تقدير تكرار ظهوره في الاختبارات
  cefr?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"; // مستوى الإطار المرجعي (لمفاهيم اللغة)
  examWeights?: Record<string, number>;        // وزن المفهوم في كل اختبار (exam:step→95, exam:ielts→90)
  body?: ConceptBody;                          // أماكن المحتوى الغنيّ — فارغة الآن
}
export interface CourseEntity extends EntityBase {
  kind: "course";
  code?: string; credits?: number;
}
/* ─── محتوى الدرس المرن: كتلٌ مرتّبة (بلا تعقيد على المستخدم) ───
   الدرس ليس نصّاً واحداً: تسلسلٌ من كتلٍ مُصنّفة يعرضها LessonView بمكوّنٍ لكل نوع.
   الأسئلة/المفاهيم/المصادر المرتبطة علاقاتٌ في الرسم لا كتل — مصدر الحقيقة واحد. */
export type LessonBlock =
  | { type: "heading"; text: string }                                   // عنوان قسم
  | { type: "text"; text: string }                                      // شرح
  | { type: "equation"; latex: string; caption?: string }               // معادلة (تُعرض LTR)
  | { type: "image"; src: string; alt: string; caption?: string }       // صورة/رسم
  | { type: "video"; url: string; title?: string }                      // فيديو
  | { type: "steps"; title?: string; items: string[] }                  // خطوات
  | { type: "example"; title?: string; problem: string; solution: string } // مثال محلول
  | { type: "note"; text: string }                                      // تنبيه
  | { type: "warning"; text: string }                                   // خطأ شائع
  | { type: "keypoints"; items: string[] };                             // خلاصة/نقاط

export interface LessonEntity extends EntityBase {
  kind: "lesson";
  durationMin?: number;
  level?: "easy" | "medium" | "hard";
  blocks?: LessonBlock[];   // محتوى الدرس المرن — يُقرأ من الرسم ويُعرض للطالب
}

/* سؤال — كيان مستقل يُعاد استخدامه؛ صعوبته ومستواه المعرفي حقول ذاتية،
   وارتباطه بالمفهوم/الدرس/المادة/الاختبار/المهارة علاقاتٌ لا نسخٌ. */
export type BloomLevel = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
export interface QuestionEntity extends EntityBase {
  kind: "question";
  difficulty?: "easy" | "medium" | "hard";
  bloom?: BloomLevel;
  answer?: string;   // الإجابة الصحيحة (ذاتي للسؤال)
}

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
  tasks: string[]; salary?: SalaryRange; demand?: Demand;
  /* «ماذا تتعلّم للوصول» = علاقات requires/uses — لا قائمة نصّية مكرّرة. */
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
/* محاولة الطالب لاختبار — لا الاختبار. أرقامها ذاتية، والاختبار والمفاهيم
   الضعيفة علاقاتٌ (belongs_to exam · related_to concept). ليعرف دويرب الطالبَ. */
export interface ExamSessionEntity extends EntityBase {
  kind: "exam_session";
  score?: number; timeMin?: number; errors?: number; takenAt?: string;
}
export interface GoalEntity extends EntityBase {
  kind: "goal";
  metric?: string;   // معيار النجاح (مثل «STEP 85») — والعقدة الهدف تُعرَف بعلاقة (leads_to/works_at)
}

/* اتحاد كل العقد — مُميَّز بـ kind */
export type KBEntity =
  | UniversityEntity | CollegeEntity | MajorEntity | SubjectEntity | ConceptEntity
  | CourseEntity | LessonEntity | BookEntity | ResourceEntity | QuestionEntity
  | JobEntity | CareerPathEntity | CompanyEntity | SkillEntity | ToolEntity
  | AiToolEntity | ProjectEntity | CertificationEntity | ExamEntity | ExamSessionEntity
  | GoalEntity;

/* تسمية/أيقونة كل نوع */
export const KIND_META: Record<EntityKind, { label: string; icon: string }> = {
  university:    { label: "جامعة",           icon: "🏛️" },
  college:       { label: "كلية",            icon: "🏫" },
  major:         { label: "تخصص",            icon: "📚" },
  subject:       { label: "مادة",            icon: "📖" },
  concept:       { label: "مفهوم",           icon: "💡" },
  course:        { label: "مقرّر",           icon: "🗂️" },
  lesson:        { label: "درس",             icon: "📝" },
  book:          { label: "كتاب",            icon: "📕" },
  resource:      { label: "مصدر",            icon: "🎬" },
  question:      { label: "سؤال",            icon: "❓" },
  job:           { label: "وظيفة",           icon: "💼" },
  career_path:   { label: "مسار مهني",       icon: "🧭" },
  company:       { label: "شركة",            icon: "🏢" },
  skill:         { label: "مهارة",           icon: "🛠️" },
  tool:          { label: "أداة",            icon: "🧰" },
  ai_tool:       { label: "أداة ذكاء",       icon: "🤖" },
  project:       { label: "مشروع",           icon: "🚀" },
  certification: { label: "شهادة",           icon: "🎓" },
  exam:          { label: "اختبار",          icon: "🧪" },
  exam_session:  { label: "محاولة اختبار",   icon: "📊" },
  goal:          { label: "هدف",             icon: "🎯" },
};

/* تسمية العلاقة (اتجاه الخروج) — لعرضٍ موحّد */
export const RELATION_LABEL: Record<RelationType, string> = {
  requires: "يتطلّب", leads_to: "يقود إلى", uses: "يستخدم", belongs_to: "ينتمي إلى",
  recommends: "يُنصَح بـ", similar_to: "مشابه لـ", part_of: "جزء من", next_step: "الخطوة التالية",
  prerequisite: "متطلّب سابق", used_in: "يُستخدَم في", works_at: "يُمارَس في",
  certified_by: "مُعتمَد من", teaches: "يُكسِب", depends_on: "يعتمد على", supported_by: "مدعوم بـ",
  related_to: "مرتبط بـ",
};

export const entityId = (kind: EntityKind, slug: string): EntityId => `${kind}:${slug}`;

/* نسخنة/وزن افتراضي حين يغيب — فتبقى لكل عقدة meta عند القراءة */
export const DEFAULT_META: NodeMeta = { version: 1, lastUpdated: "2026-07-01", confidence: 0.9, importance: 50 };
