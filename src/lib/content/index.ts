/* ─── المحتوى التعليمي العام — الواجهة النقية ───
   تدمج بذرة seed.json المضمّنة مع overlay من Firestore (بنمط قاعدة المعرفة
   في kb/index.ts): overlay يطغى بالـ id، والجديد يُضاف، والأسئلة تُفرز بـ order.
   منطق نقي حتمي قابل للاختبار — لا IO هنا (الجلب في server.ts). */
import seedJson from "./seed.json";
import type {
  FaqDoc, ReferenceListDoc, TipDoc, TahsiliFlashcardDoc, StudyStrategyDoc,
  SuccessStoryDoc, ContentOverlay, ContentSnapshot,
} from "./types";

export * from "./types";

/* شكل البذرة — نفس مفاتيح المجموعات في Firestore */
interface SeedShape {
  faq_general: FaqDoc[];
  faq_qubool: FaqDoc[];
  reference_lists: ReferenceListDoc[];
  tips: TipDoc[];
  tahsili_flashcards: TahsiliFlashcardDoc[];
  study_strategies: StudyStrategyDoc[];
  success_stories: SuccessStoryDoc[];
}

/* استدلال JSON يجعل مفاتيح scores المتباينة اختيارية (?: undefined) فلا تُسند
   مباشرة إلى Record<string, number | string> — التحويل هنا آمن والبنية مضمونة
   باختبارات content.test.ts */
export const SEED_CONTENT: SeedShape = seedJson as unknown as SeedShape;

/* يدمج قائمة بذرة مع overlay (بالـ id): overlay يفوز، والجديد يُضاف —
   نفس عقد mergeById في kb/index.ts (منسوخ محلياً كي لا تسحب حزم المحتوى
   بذرة قاعدة المعرفة كاملة معها). */
export function mergeContentById<T extends { id: string }>(seed: T[], overlay: T[]): T[] {
  const map = new Map<string, T>();
  for (const s of seed) map.set(s.id, s);
  for (const o of overlay) map.set(o.id, o); // overlay يفوز
  return [...map.values()];
}

/* فرز ثابت تصاعدياً بحقل order (نسخة جديدة — لا يعدّل الأصل) */
export function sortByOrder<T extends { order: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.order - b.order);
}

/* لقطة كاملة من البذرة + overlay اختياري — الأسئلة الشائعة مفروزة بـ order */
export function buildContentSnapshot(overlay: ContentOverlay = {}): ContentSnapshot {
  return {
    faqGeneral: sortByOrder(mergeContentById(SEED_CONTENT.faq_general, overlay.faq_general ?? [])),
    faqQubool: sortByOrder(mergeContentById(SEED_CONTENT.faq_qubool, overlay.faq_qubool ?? [])),
    referenceLists: mergeContentById(SEED_CONTENT.reference_lists, overlay.reference_lists ?? []),
    tips: mergeContentById(SEED_CONTENT.tips, overlay.tips ?? []),
    tahsiliFlashcards: mergeContentById(SEED_CONTENT.tahsili_flashcards, overlay.tahsili_flashcards ?? []),
    studyStrategies: mergeContentById(SEED_CONTENT.study_strategies, overlay.study_strategies ?? []),
    successStories: mergeContentById(SEED_CONTENT.success_stories, overlay.success_stories ?? []),
  };
}

/* القوائم المرجعية التي تحتاج مراجعة كل موسم قبول — من البذرة مباشرة
   (تنبيه لوحة الإدارة: بلا استعلامات Firestore ولا راوت جديد) */
export function annualReviewLists(): ReferenceListDoc[] {
  return SEED_CONTENT.reference_lists.filter((r) => r.needsAnnualReview);
}
