/* ─── المحتوى التعليمي العام — نماذج البيانات ───
   محتوى مستخرج من أرشيف تليجرام: أسئلة القبول الشائعة، قوائم مرجعية، نصائح،
   بطاقات حقائق التحصيلي، استراتيجيات مذاكرة، وقصص نجاح. يُعرض في صفحات عامة
   بدون تسجيل دخول. هذه الوحدة أنواع نقية فقط — لا اعتماد على المتصفح ولا على
   البذرة (فلا تُحمَّل seed.json في حزم العميل التي تحتاج الأنواع فقط). */

/* سؤال شائع — للقبول الجامعي العام (faq_general) أو منصة قبول (faq_qubool) */
export interface FaqDoc {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

/* قائمة مرجعية (سكن جامعي، STEP، طي القيد...) — بعضها يتغيّر كل موسم قبول */
export interface ReferenceListDoc {
  id: string;
  title: string;
  content: string;
  needsAnnualReview: boolean;
}

/* نصيحة (تقديم رغبات / بداية الحياة الجامعية) */
export interface TipDoc {
  id: string;
  title: string;
  content: string;
  section: string;
}

/* بطاقة حقائق تحصيلي — كل حقيقة بصيغة «مفهوم → تطبيق» */
export interface TahsiliFlashcardDoc {
  id: string;
  topic: string;
  subject: string; // physics / biology / ...
  facts: string[];
}

/* استراتيجية مذاكرة مستخلصة من تجارب الطلاب */
export interface StudyStrategyDoc {
  id: string;
  title: string;
  content: string;
}

/* قصة نجاح — الدرجات بمفاتيح عربية (قدرات/تحصيلي/ستيب/ثانوي...) وقيم رقمية أو نصية */
export interface SuccessStoryDoc {
  id: string;
  name: string;
  scores: Record<string, number | string>;
  note: string;
  verified: boolean;
}

/* ─── المجموعات السبع — أسماء collections في Firestore (نفس مفاتيح البذرة) ─── */
export const CONTENT_COLLECTIONS = [
  "faq_general",
  "faq_qubool",
  "reference_lists",
  "tips",
  "tahsili_flashcards",
  "study_strategies",
  "success_stories",
] as const;

export type ContentCollection = (typeof CONTENT_COLLECTIONS)[number];

/* overlay من Firestore — كل مجموعة اختيارية (offline-first: البذرة تكفي) */
export interface ContentOverlay {
  faq_general?: FaqDoc[];
  faq_qubool?: FaqDoc[];
  reference_lists?: ReferenceListDoc[];
  tips?: TipDoc[];
  tahsili_flashcards?: TahsiliFlashcardDoc[];
  study_strategies?: StudyStrategyDoc[];
  success_stories?: SuccessStoryDoc[];
}

/* اللقطة الجاهزة للعرض — بذرة + overlay مدموجين ومفروزين */
export interface ContentSnapshot {
  faqGeneral: FaqDoc[];
  faqQubool: FaqDoc[];
  referenceLists: ReferenceListDoc[];
  tips: TipDoc[];
  tahsiliFlashcards: TahsiliFlashcardDoc[];
  studyStrategies: StudyStrategyDoc[];
  successStories: SuccessStoryDoc[];
}

/* ─── تعريفات العرض (بنمط SOURCE_CATEGORIES في kb/types.ts) ─── */

/* مواد بطاقات التحصيلي — الألوان مطابقة لألوان المواد في tracks.ts */
export interface SubjectDef { label: string; color: string; icon: string; }

export const SUBJECT_META: Record<string, SubjectDef> = {
  physics:   { label: "فيزياء",  color: "#8B5CF6", icon: "⚛️" },
  biology:   { label: "أحياء",   color: "#F59E0B", icon: "🧬" },
  chemistry: { label: "كيمياء",  color: "#EF4444", icon: "🧪" },
  math:      { label: "رياضيات", color: "#10B981", icon: "📐" },
};

export function subjectMeta(subject: string): SubjectDef {
  return SUBJECT_META[subject] ?? { label: subject, color: "#06B6D4", icon: "📚" };
}

/* ألوان شارات الدرجات في قصص النجاح — نفس عائلة ألوان بطاقات الصفحة الرئيسية */
export const SCORE_COLORS: Record<string, string> = {
  "قدرات":   "#3B82F6",
  "تحصيلي":  "#10B981",
  "ستيب":    "#8B5CF6",
  "ثانوي":   "#F59E0B",
};

export function scoreColor(key: string): string {
  return SCORE_COLORS[key] ?? "#06B6D4";
}
