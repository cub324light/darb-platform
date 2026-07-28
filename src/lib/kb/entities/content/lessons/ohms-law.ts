/* ═══════════ Vertical Slice — درس قانون أوم (النموذج الأول الكامل) ═══════════
   أول درسٍ حقيقي في درب: نبني له النظام كاملاً (Concept → Lesson → Examples →
   Questions → Resources) مربوطاً بالرسم، ليقرأه دويرب ويظهر في صفحة الطالب والبحث
   وشبكة المعرفة. إن نجح هذا النموذج كرّرناه. الدرس كتلٌ مرنة، والباقي علاقات.
   لا أنواع جديدة — استخدمنا LessonEntity المرن وعلاقات الرسم القائمة. */
import { entityId as E, type KBEntity } from "../../schema";

const UPDATED = "2026-07-10";
const SOURCE = "منهج الفيزياء — الكهرباء والدارات (درب)";

const LESSON: KBEntity = {
  kind: "lesson",
  id: E("lesson", "ohms-law"),
  name: "درس: قانون أوم",
  nameEn: "Ohm's Law — Lesson",
  summary: "درسٌ تطبيقي يشرح العلاقة بين الجهد والتيار والمقاومة (V = IR) خطوةً بخطوة مع أمثلة محلولة.",
  durationMin: 6,
  level: "easy",
  diagnostic: {
    prompt: "لديك بطارية جهدها 12 فولت ومقاومة 6 أوم. كم يكون التيار؟",
    answer: "2 أمبير — نقسم الجهد على المقاومة: I = V ÷ R = 12 ÷ 6 = 2.",
  },
  outcomes: [
    "تحسب التيار من الجهد والمقاومة",
    "تحسب الجهد من التيار والمقاومة",
    "تحسب المقاومة من الجهد والتيار",
  ],
  nextTeaser: "الآن بعد أن فهمت قانون أوم، الخطوة الطبيعية أن تحلّ دوائر فيها أكثر من مقاومة ومصدر — وهناك يأتي قانون كيرشوف ليُكمل ما بدأته.",
  meta: { version: 3, lastUpdated: UPDATED, source: SOURCE, confidence: 0.95, importance: 90 },
  blocks: [
    { type: "heading", text: "ما هو قانون أوم؟" },
    { type: "text", text: "قانون أوم يربط ثلاث كمياتٍ في أي دائرة كهربائية: الجهد (V)، والتيار (I)، والمقاومة (R). ببساطة: كلّما زاد الجهد زاد التيار، وكلّما زادت المقاومة قلّ التيار." },
    { type: "analogy", text: "تخيّل الماء في أنبوب: الجهد هو قوّة الضخّ، والتيار هو كمية الماء المتدفّقة، والمقاومة هي ضيق الأنبوب. ادفع أقوى ← يتدفّق ماءٌ أكثر. ضيّق الأنبوب ← يتدفّق أقلّ. الكهرباء تتصرّف بالطريقة نفسها تماماً." },
    { type: "equation", latex: "V = I × R", caption: "الجهد (فولت V) = التيار (أمبير A) × المقاومة (أوم Ω)" },
    { type: "image", src: "/lessons/ohm-circuit.svg", alt: "دائرة كهربائية بسيطة: بطارية جهدها V ومقاومة R يمرّ بها تيار I", caption: "دائرةٌ بسيطة: بطاريةٌ (V) تدفع تياراً (I) عبر مقاومة (R)." },
    { type: "keypoints", items: [
      "لإيجاد الجهد: V = I × R",
      "لإيجاد التيار: I = V ÷ R",
      "لإيجاد المقاومة: R = V ÷ I",
    ] },
    { type: "heading", text: "كيف تطبّقه — خطوة بخطوة" },
    { type: "steps", title: "منهجية الحل", items: [
      "اكتب المعلوم والمجهول بوحداتهما (فولت، أمبير، أوم).",
      "اختر الصيغة حسب المجهول (V = IR أو I = V/R أو R = V/I).",
      "وحّد الوحدات إن لزم (حوّل المللي أمبير إلى أمبير).",
      "عوّض واحسب، ثم راجع منطقية الناتج.",
    ] },
    { type: "example", title: "مثال 1 — المجهول: التيار", problem: "بطاريةٌ جهدها 12 فولت موصولةٌ بمقاومة 4 أوم. ما شدّة التيار؟", solution: "التيار مجهول ← نقسم: I = V ÷ R = 12 ÷ 4 = 3 أمبير." },
    { type: "example", title: "مثال 2 — المجهول: الجهد", problem: "يمرّ تيارٌ شدّته 2 أمبير عبر مقاومة 5 أوم. ما فرق الجهد بين طرفيها؟", solution: "الجهد مجهول ← نضرب: V = I × R = 2 × 5 = 10 فولت." },
    { type: "warning", text: "أكثر خطأٍ شيوعاً: التعويض بوحداتٍ غير موحّدة (مللي أمبير مع أوم) دون تحويل. راجع الوحدات دائماً قبل الحساب." },
    { type: "whenToUse", exam: "في التحصيلي والفيزياء: أي سؤالٍ يعطيك اثنين من (الجهد/التيار/المقاومة) ويطلب الثالث، أو يمهّد لحساب القدرة P = V×I.", life: "في الحياة: لتعرف كم تيّاراً يسحبه جهازٌ من الكهرباء، أو لتختار مقاومةً مناسبة تحمي دائرةً إلكترونية (كمصباح LED) من التلف." },
    { type: "video", url: "https://www.youtube.com/watch?v=HsLLq6Rm5tU", title: "شرح مرئي: قانون أوم والدارات البسيطة" },
  ],
  relations: [
    { type: "teaches", to: E("concept", "ohms-law") },
    { type: "related_to", to: E("concept", "kirchhoff") },
    { type: "belongs_to", to: E("subject", "circuits") },
    { type: "supported_by", to: E("resource", "ohms-law-article") },
    { type: "supported_by", to: E("resource", "ohms-law-video") },
  ],
};

/* مصدرٌ مرئي جديد يدعم الدرس (الأول كان مقالاً) */
const VIDEO_RESOURCE: KBEntity = {
  kind: "resource",
  id: E("resource", "ohms-law-video"),
  name: "فيديو: قانون أوم بالتطبيق",
  summary: "شرحٌ مرئي مختصر لقانون أوم مع أمثلة على الدارات.",
  format: "video", lang: "ar",
  meta: { version: 1, lastUpdated: UPDATED, source: SOURCE, confidence: 0.85, importance: 55 },
  relations: [{ type: "teaches", to: E("concept", "ohms-law") }],
};

/* أسئلة الدرس — كيانات مستقلة يُعاد استخدامها. نبدأ بسؤالٍ مفاهيمي يقيس الفهم
   (لا الحفظ ولا التعويض) ثم أسئلة تطبيقية على الصيغ الثلاث. */
const QUESTIONS: KBEntity[] = [
  {
    kind: "question", id: E("question", "ohm-relationship"), name: "سؤال: العلاقة بين المقاومة والتيار",
    summary: "بقي الجهد ثابتاً وضاعفنا المقاومة. ماذا يحدث لشدّة التيار؟ ولماذا؟",
    difficulty: "medium", bloom: "understand", answer: "ينتصف التيار — لأن التيار يتناسب عكسياً مع المقاومة عند ثبات الجهد (I = V ÷ R)، فمضاعفة R تقسم I على 2.",
    meta: { version: 1, lastUpdated: UPDATED, source: SOURCE, confidence: 0.9, importance: 65 },
    relations: [
      { type: "requires", to: E("concept", "ohms-law") },
      { type: "belongs_to", to: E("lesson", "ohms-law") },
      { type: "belongs_to", to: E("subject", "circuits") },
    ],
  },
  {
    kind: "question", id: E("question", "ohm-voltage"), name: "سؤال: حساب الجهد بقانون أوم",
    summary: "يمرّ تيارٌ شدّته 3 أمبير عبر مقاومة 6 أوم. ما فرق الجهد؟",
    difficulty: "easy", bloom: "apply", answer: "18 فولت (V = I × R = 3 × 6)",
    meta: { version: 1, lastUpdated: UPDATED, source: SOURCE, confidence: 0.9, importance: 60 },
    relations: [
      { type: "requires", to: E("concept", "ohms-law") },
      { type: "belongs_to", to: E("lesson", "ohms-law") },
      { type: "belongs_to", to: E("subject", "circuits") },
    ],
  },
  {
    kind: "question", id: E("question", "ohm-resistance"), name: "سؤال: حساب المقاومة بقانون أوم",
    summary: "جهدٌ مقداره 20 فولت يولّد تياراً شدّته 4 أمبير. ما المقاومة؟",
    difficulty: "medium", bloom: "apply", answer: "5 أوم (R = V ÷ I = 20 ÷ 4)",
    meta: { version: 1, lastUpdated: UPDATED, source: SOURCE, confidence: 0.9, importance: 60 },
    relations: [
      { type: "requires", to: E("concept", "ohms-law") },
      { type: "belongs_to", to: E("lesson", "ohms-law") },
      { type: "belongs_to", to: E("subject", "circuits") },
    ],
  },
];

export const OHMS_LAW_SLICE: KBEntity[] = [LESSON, VIDEO_RESOURCE, ...QUESTIONS];
