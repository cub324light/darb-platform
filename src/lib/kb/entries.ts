/* ─── مدخلات المعرفة المبدئية (Seed KB Entries) ───
   الحقائق دائمة الصلاحية التي يجيب منها دويرب دون إنترنت. مُسنَدة لمصادرها
   الرسمية. يُدمج فوقها ما يضيفه المشرف من Firestore. التواريخ ثابتة (بذرة). */
import type { KBEntry } from "./types";
import { SEED_VERIFIED_AT } from "./sources";

type Seed = {
  id: string; category: KBEntry["category"]; question: string; answer: string;
  keywords: string[]; sourceIds: string[]; trust: number;
};

const SEEDS: Seed[] = [
  {
    id: "qudurat-structure",
    category: "qudurat",
    question: "ما هو اختبار القدرات العامة وما أقسامه؟",
    answer: "اختبار القدرات العامة (تشرف عليه هيئة تقويم التعليم والتدريب) يقيس القدرة على التعلّم عبر قسمين: لفظي وكمي. يُقدَّم ورقياً ومحوسباً، والدرجة من 100. يُسمح بعدد محاولات، وتُحتسب أفضل درجة. ركّز على فهم أنماط الأسئلة والسرعة لا الحفظ.",
    keywords: ["قدرات", "القدرات العامة", "لفظي", "كمي", "قياس", "أقسام القدرات"],
    sourceIds: ["etec-qudurat", "qiyas-qudurat"], trust: 96,
  },
  {
    id: "tahsili-structure",
    category: "tahsili",
    question: "ما هو الاختبار التحصيلي وما المواد التي يغطّيها؟",
    answer: "الاختبار التحصيلي (هيئة تقويم التعليم) يقيس تحصيل طالب الثانوي في مواد التخصص العلمي: الأحياء والفيزياء والكيمياء والرياضيات (وأحياناً مواد أخرى حسب المسار). الدرجة من 100، ويُركّز على مناهج المرحلة الثانوية. التحضير يكون بمراجعة منهج الثانوية بدقّة وحلّ نماذج سابقة.",
    keywords: ["تحصيلي", "التحصيلي", "أحياء", "فيزياء", "كيمياء", "رياضيات", "علمي"],
    sourceIds: ["etec-tahsili", "qiyas-tahsili"], trust: 96,
  },
  {
    id: "step-overview",
    category: "step",
    question: "ما هو اختبار STEP؟",
    answer: "اختبار STEP (الكفايات اللغوية في الإنجليزية، من هيئة تقويم التعليم) يقيس مهارات القراءة والاستماع والتركيب اللغوي. الدرجة من 100، ويُستخدم لبعض القبول الجامعي وبرامج اللغة. التحضير: قراءة وتدريب على نماذج الاختبار وتقوية المفردات والقواعد.",
    keywords: ["step", "ستيب", "إنجليزي", "كفايات لغوية", "اللغة الإنجليزية"],
    sourceIds: ["etec-step"], trust: 95,
  },
  {
    id: "weighted-ratio",
    category: "admission",
    question: "كيف تُحسب النسبة الموزونة للقبول الجامعي؟",
    answer: "تختلف أوزان النسبة الموزونة بين الجامعات، لكنها غالباً تجمع: نسبة الثانوية العامة + درجة القدرات + درجة التحصيلي بأوزان محددة تعلنها كل جامعة (مثلاً 30% ثانوية + 30% قدرات + 40% تحصيلي). راجع موقع عمادة القبول في الجامعة المستهدفة للأوزان الدقيقة لسنتك.",
    keywords: ["موزونة", "النسبة الموزونة", "قبول", "حساب القبول", "أوزان"],
    sourceIds: ["admission-riyadh", "admission-deanships"], trust: 88,
  },
  {
    id: "admission-timing",
    category: "admission",
    question: "متى يفتح القبول الجامعي؟",
    answer: "يفتح القبول الموحّد للجامعات الحكومية عادةً بعد ظهور نتائج الثانوية واختبارات القدرات والتحصيلي (غالباً في فصل الصيف). المواعيد تتغيّر سنوياً وتُعلن عبر بوابات القبول الموحّد وعمادات القبول — تحقّق من البوابة الرسمية لمنطقتك قبل كل موسم.",
    keywords: ["موعد القبول", "متى القبول", "القبول الموحد", "تقديم الجامعات"],
    sourceIds: ["admission-riyadh"], trust: 85,
  },
];

export const SEED_ENTRIES: KBEntry[] = SEEDS.map((s) => ({
  id: s.id,
  category: s.category,
  question: s.question,
  answer: s.answer,
  keywords: s.keywords,
  sourceIds: s.sourceIds,
  trust: s.trust,
  lastVerified: SEED_VERIFIED_AT,
  expiresAt: null,
  status: "active",
  version: 1,
  updatedAt: SEED_VERIFIED_AT,
  origin: "seed",
}));
