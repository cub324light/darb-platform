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
  durationMin: 8,
  level: "easy",
  meta: { version: 1, lastUpdated: UPDATED, source: SOURCE, confidence: 0.95, importance: 90 },
  blocks: [
    { type: "heading", text: "ما هو قانون أوم؟" },
    { type: "text", text: "قانون أوم يربط ثلاث كمياتٍ في الدائرة الكهربائية: الجهد (V)، والتيار (I)، والمقاومة (R). يقول إن التيار المارّ في موصلٍ يزداد كلّما زاد الجهد، ويقلّ كلّما زادت المقاومة." },
    { type: "equation", latex: "V = I × R", caption: "الجهد (فولت) = التيار (أمبير) × المقاومة (أوم)" },
    { type: "image", src: "/lessons/ohm-circuit.svg", alt: "دائرة كهربائية بسيطة: بطارية جهدها V ومقاومة R يمرّ بها تيار I", caption: "دائرةٌ بسيطة: بطاريةٌ (V) تدفع تياراً (I) عبر مقاومة (R)." },
    { type: "keypoints", items: [
      "لإيجاد الجهد: V = I × R",
      "لإيجاد التيار: I = V ÷ R",
      "لإيجاد المقاومة: R = V ÷ I",
    ] },
    { type: "heading", text: "كيف تطبّقه خطوة بخطوة" },
    { type: "steps", title: "منهجية الحل", items: [
      "اكتب المعلوم والمجهول بوحداتهما (فولت، أمبير، أوم).",
      "اختر الصيغة المناسبة حسب المجهول (V = IR أو I = V/R أو R = V/I).",
      "وحّد الوحدات إن لزم (حوّل المللي أمبير إلى أمبير).",
      "عوّض واحسب، ثم راجع منطقية الناتج ووحدته.",
    ] },
    { type: "example", title: "مثال ١ — إيجاد التيار", problem: "بطاريةٌ جهدها ١٢ فولت موصولةٌ بمقاومة ٤ أوم. ما شدّة التيار؟", solution: "المجهول هو التيار، فنستخدم I = V ÷ R = ١٢ ÷ ٤ = ٣ أمبير." },
    { type: "example", title: "مثال ٢ — إيجاد الجهد", problem: "يمرّ تيارٌ شدّته ٢ أمبير عبر مقاومة ٥ أوم. ما فرق الجهد بين طرفيها؟", solution: "المجهول هو الجهد، فنستخدم V = I × R = ٢ × ٥ = ١٠ فولت." },
    { type: "note", text: "الوحدات: الجهد بالفولت (V)، والتيار بالأمبير (A)، والمقاومة بالأوم (Ω). ثبات هذه الوحدات شرطٌ لصحّة التعويض." },
    { type: "warning", text: "خطأٌ شائع: التعويض بوحداتٍ غير موحّدة (مثل مللي أمبير مع أوم) دون تحويل — راجع الوحدات دائماً قبل الحساب." },
    { type: "video", url: "https://www.youtube.com/watch?v=HsLLq6Rm5tU", title: "شرح مرئي: قانون أوم والدارات البسيطة" },
    { type: "keypoints", items: [
      "قانون أوم: V = I × R — علاقةٌ خطّية في العناصر الأومية.",
      "احفظ المثلث (V فوق، I و R تحت) لاشتقاق أي صيغة.",
      "وحّد الوحدات قبل التعويض.",
    ] },
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

/* سؤالان إضافيان للدرس (مع السؤال في seed = ثلاثة) — كيانات مستقلة يُعاد استخدامها */
const QUESTIONS: KBEntity[] = [
  {
    kind: "question", id: E("question", "ohm-voltage"), name: "سؤال: حساب الجهد بقانون أوم",
    summary: "يمرّ تيارٌ شدّته ٣ أمبير عبر مقاومة ٦ أوم. ما فرق الجهد؟",
    difficulty: "easy", bloom: "apply", answer: "١٨ فولت (V = I × R = ٣ × ٦)",
    meta: { version: 1, lastUpdated: UPDATED, source: SOURCE, confidence: 0.9, importance: 60 },
    relations: [
      { type: "requires", to: E("concept", "ohms-law") },
      { type: "belongs_to", to: E("lesson", "ohms-law") },
      { type: "belongs_to", to: E("subject", "circuits") },
    ],
  },
  {
    kind: "question", id: E("question", "ohm-resistance"), name: "سؤال: حساب المقاومة بقانون أوم",
    summary: "جهدٌ مقداره ٢٠ فولت يولّد تياراً شدّته ٤ أمبير. ما المقاومة؟",
    difficulty: "medium", bloom: "apply", answer: "٥ أوم (R = V ÷ I = ٢٠ ÷ ٤)",
    meta: { version: 1, lastUpdated: UPDATED, source: SOURCE, confidence: 0.9, importance: 60 },
    relations: [
      { type: "requires", to: E("concept", "ohms-law") },
      { type: "belongs_to", to: E("lesson", "ohms-law") },
      { type: "belongs_to", to: E("subject", "circuits") },
    ],
  },
];

export const OHMS_LAW_SLICE: KBEntity[] = [LESSON, VIDEO_RESOURCE, ...QUESTIONS];
