/* ═══════════════════════════════════════════════════════════════════════
   Student Memory Engine — الأنواع (Typed Registry)
   ───────────────────────────────────────────────────────────────────────
   «الدماغ الدائم» للعلاقة بين درب والطالب. ليس ملفاً شخصياً ولا تفضيلات ولا
   سجلّ محادثة — بل ذاكرة تعليمية مهيكلة وقابلة للبحث والشرح والتركيب والاختبار
   والتوسّع، مستقلّة عن الواجهة وعن نماذج الذكاء.

   مبدأ Typed Registry: لكل نوع ذاكرة مخطّط قيمة مُلزَم بـ TypeScript.
   لا JSON عشوائي. إضافة نوع جديد إلى MemoryValueMap تُجبر TypeScript على
   المطالبة بإدخاله في السجلّ (MEMORY_REGISTRY) وفي كل switch شامل.
   ═══════════════════════════════════════════════════════════════════════ */

/* محور التعلّم مدى الحياة — المرحلة التي تخصّها الذاكرة */
export type EduStage =
  | "secondary" | "qudurat" | "tahsili" | "step"
  | "university" | "courses" | "certificate" | "career" | "general";

/* فئات الذاكرة (سجلّ مفتوح للتوسّع — تُضاف فئات لاحقاً دون إعادة تصميم) */
export type MemoryCategory =
  | "identity" | "learning" | "behavior" | "goal" | "conversation" | "relationship";

/* مصدر الذاكرة — يحدّد الثقة الابتدائية وسرعة الاضمحلال */
export type MemorySource =
  | "onboarding" | "explicit" | "event" | "inferred" | "duwairb" | "imported";

export type MemoryStatus = "active" | "archived" | "invalidated";

/* الدليل — «لماذا نعتقد هذا» (قابلية الشرح) */
export interface MemoryEvidence {
  kind: "event" | "message" | "score" | "manual" | "rollup" | "migration";
  ref: string;
  at: number;
  note?: string;
}

/* أنماط مساعدة للقيم */
export type ExplanationStyle = "مبسّط" | "تفصيلي" | "بالأمثلة" | "بصري" | "سريع";
export type StudyWindow = "صباح" | "ظهر" | "مساء" | "ليل";
export type Pace = "بطيء" | "متوسط" | "سريع";
export type ConsistencyLevel = "منخفض" | "متوسط" | "عالٍ";
export type TonePreference = "لطيف" | "مباشر" | "محفّز" | "رسمي";
export type Sentiment = "positive" | "negative" | "neutral";

/* ════════════════════════════════════════════════════════════
   خريطة القيم — مصدر الحقيقة لشكل كل نوع ذاكرة
   اسم النوع مسبوق بالفئة للوضوح وتفادي التصادم (الفئة تبقى صريحة في السجلّ).
   ════════════════════════════════════════════════════════════ */
export interface MemoryValueMap {
  /* ── Identity ── */
  "identity.name":       { name: string };
  "identity.age":        { age: number };
  "identity.region":     { region: string };
  "identity.school":     { school: string };
  "identity.studyLevel": { level: "ثانوي" | "جامعي" | "خريج" };
  "identity.grade":      { grade: string };

  /* ── Learning ── */
  "learning.weakSubject":     { subject: string; severity?: number };
  "learning.strongSubject":   { subject: string };
  "learning.subjectMastery":  { subject: string; mastery: number }; // 0..1
  "learning.explanationStyle":{ style: ExplanationStyle };
  "learning.method":          { method: string };
  "learning.pace":            { pace: Pace };

  /* ── Behavior ── */
  "behavior.studyWindow":     { window: StudyWindow };
  "behavior.sessionLength":   { minutes: number };
  "behavior.consistency":     { level: ConsistencyLevel; streakAvg?: number };
  "behavior.studyHoursPerDay":{ hours: number };
  "behavior.nudgeResponse":   { source: string; acceptedRate: number; samples: number };

  /* ── Goal ── */
  "goal.targetScore":     { exam: string; target: number };
  "goal.targetUniversity":{ university: string };
  "goal.targetMajor":     { major: string };
  "goal.examDeadline":    { exam: string; date: string }; // YYYY-MM-DD
  "goal.ambition":        { text: string; horizon: "short" | "long" };

  /* ── Conversation ── */
  "conversation.salientFact":{ text: string; topic?: string };
  "conversation.openThread": { question: string; topic?: string };
  "conversation.summary":    { text: string; period?: string; count?: number };

  /* ── Relationship ── */
  "relationship.tone":     { tone: TonePreference };
  "relationship.lifeEvent":{ text: string; sentiment?: Sentiment };
  "relationship.milestone":{ text: string };
  "relationship.trust":    { level: number }; // 0..1
}

export type MemoryType = keyof MemoryValueMap;

/* ════════════════════════════════════════════════════════════
   ذرّة الذاكرة — Memory<T>
   ════════════════════════════════════════════════════════════ */
export interface Memory<T extends MemoryType = MemoryType> {
  id: string;
  type: T;
  category: MemoryCategory;
  key?: string;                  // المفتاح الطبيعي (للدمج/الترقية)
  value: MemoryValueMap[T];
  confidence: number;            // 0..1 — هل هذا صحيح الآن؟
  importance: number;            // 0..1 — كم يهمّ للعلاقة/القرار؟
  source: MemorySource;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number | null;
  educationalStage: EduStage;
  tags: string[];
  evidence: MemoryEvidence[];
  status: MemoryStatus;
  version: number;
}

/* ذاكرة بأي نوع (للتخزين والمرور العام) */
export type AnyMemory = Memory<MemoryType>;

/* ════════════════════════════════════════════════════════════
   تعريف النوع في السجلّ — سياسات لكل نوع
   ════════════════════════════════════════════════════════════ */
export interface MemoryTypeDef<T extends MemoryType = MemoryType> {
  type: T;
  category: MemoryCategory;
  defaultImportance: number;     // 0..1
  defaultConfidence: number;     // 0..1
  /** نصف عمر اضمحلال الثقة بالأيام (Infinity = لا اضمحلال — حقائق دائمة) */
  decayHalfLifeDays: number;
  /** محميّ من القصّ/الحذف التلقائي (دماغ العلاقة) */
  pinned: boolean;
  /** اشتقاق المفتاح الطبيعي من القيمة (للدمج). undefined = كل ذرّة فريدة. */
  naturalKey?: (v: MemoryValueMap[T]) => string;
  /** تحقّق صحّة القيمة (لا JSON عشوائي) */
  validate: (v: MemoryValueMap[T]) => boolean;
  /** وسوم تُشتق من القيمة للاسترجاع */
  deriveTags?: (v: MemoryValueMap[T]) => string[];
}

/* السجلّ كنوع مُربَط (mapped) — يُجبر على إدخال كل نوع.
   حذف/إضافة نوع في MemoryValueMap = خطأ TypeScript حتى يُحدَّث السجلّ. */
export type MemoryRegistry = { [K in MemoryType]: MemoryTypeDef<K> };

/* ════════════════════════════════════════════════════════════
   مدخلات وعمليّات
   ════════════════════════════════════════════════════════════ */
export interface RememberInput<T extends MemoryType = MemoryType> {
  type: T;
  value: MemoryValueMap[T];
  source: MemorySource;
  educationalStage?: EduStage;
  confidence?: number;
  importance?: number;
  expiresAt?: number | null;
  tags?: string[];
  evidence?: MemoryEvidence[];
}

export interface MemorySearchFilter {
  category?: MemoryCategory | MemoryCategory[];
  type?: MemoryType | MemoryType[];
  stage?: EduStage | EduStage[];
  tags?: string[];               // أي وسم مطابِق
  source?: MemorySource;
  status?: MemoryStatus;         // الافتراضي: active
  text?: string;                 // بحث نصّي في القيمة المُسلسَلة
  minImportance?: number;
  minConfidence?: number;
}

export interface MemoryQuery {
  page?: string;
  stage?: EduStage;
  goal?: string;
  recommendationId?: string;
  conversationTopic?: string;
  recentEventTypes?: string[];
  categories?: MemoryCategory[];
  tags?: string[];
  minImportance?: number;
  limit?: number;                // سقف صارم
}

/* السياق المُركّب — ما يستهلكه محرّك التوصيات ودويرب (لا ذاكرة خام) */
export interface StudentContext {
  identity: { name?: string; studyLevel?: string; grade?: string; region?: string; school?: string };
  currentGoal: { university?: string; major?: string; targets: { exam: string; target: number }[] };
  weakSubjects: string[];
  strongSubjects: string[];
  preferredStyle?: ExplanationStyle;
  preferredMethods: string[];
  bestStudyWindow?: StudyWindow;
  tonePreference?: TonePreference;
  recentLifeEvents: string[];
  openThreads: string[];
  /* meta — للشرح */
  memoryCount: number;
  retrieved: AnyMemory[];
}

/* واجهة المُلخّص — قابلة للتوصيل، بلا أي نموذج في الإصدار الأول (حتمي فقط) */
export interface Summarizer {
  summarize(memories: AnyMemory[]): { text: string; count: number };
}
