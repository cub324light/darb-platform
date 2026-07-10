/* ═══════════ نموذج العالم — بذرة تحقّق (Proof Seed) ═══════════
   شريحةٌ واحدة مترابطة تُثبت أن المخطّط يستوعب الأنواع الـ١٨ وعلاقاتها الصريحة —
   لا محتوى كامل بعد (البنية أولاً). البيانات حقيقية (عالم الكهرباء + القياس +
   سلسلة أكاديمية + أهداف). حين تُقرّ البنية نضخّ البقيّة بنفس الشكل. */
import { entityId as E, type KBEntity } from "./schema";

export const SEED_ENTITIES: KBEntity[] = [
  /* ═══ البنية الأكاديمية ═══ */
  {
    kind: "university", id: E("university", "ksu"), name: "جامعة الملك سعود", nameEn: "King Saud University",
    summary: "أعرق جامعة حكومية سعودية في الرياض، واسعة التخصصات.",
    city: "الرياض", type: "government", founded: 1957, aliases: ["الملك سعود", "KSU"],
    stats: [{ label: "الكليات", value: "أكثر من ٢٠" }], tags: ["حكومية", "الرياض"],
    meta: { version: 1, lastUpdated: "2026-07-01", source: "الموقع الرسمي", confidence: 0.95 },
  },
  {
    kind: "college", id: E("college", "ksu-engineering"), name: "كلية الهندسة — جامعة الملك سعود",
    summary: "تضم أقسام الكهرباء والميكانيكا والمدني وغيرها.",
    aliases: ["كلية الهندسة"],
    relations: [{ type: "part_of", to: E("university", "ksu") }],
  },
  {
    kind: "major", id: E("major", "electrical-engineering"), name: "الهندسة الكهربائية", nameEn: "Electrical Engineering",
    summary: "تصميم وتشغيل أنظمة الكهرباء والطاقة والتحكّم والإلكترونيات.",
    category: "هندسي", degreeYears: 5, aliases: ["كهرباء", "EE"],
    meta: { version: 1, lastUpdated: "2026-07-01", confidence: 0.95, importance: 80 },
    relations: [
      { type: "part_of", to: E("college", "ksu-engineering") },
      { type: "leads_to", to: E("job", "power-systems-engineer") },
      { type: "leads_to", to: E("job", "control-engineer") },
      { type: "requires", to: E("exam", "qudurat"), note: "للقبول" },
      { type: "requires", to: E("exam", "tahsili"), note: "للقبول" },
    ],
  },

  /* ═══ المواد (كيانات مستقلة) + السلسلة ═══ */
  {
    kind: "subject", id: E("subject", "power-systems"), name: "أنظمة القوى", nameEn: "Power Systems",
    summary: "تحليل توليد ونقل وتوزيع الطاقة الكهربائية.", level: "university", aliases: ["القوى"],
    relations: [
      { type: "belongs_to", to: E("major", "electrical-engineering") },
      { type: "teaches", to: E("skill", "power-systems-analysis") },
      { type: "teaches", to: E("concept", "ohms-law") },       // مفهوم مُشترَك مع «الدوائر»
      { type: "uses", to: E("tool", "etap") },
      { type: "prerequisite", to: E("subject", "circuits") },
      { type: "recommends", to: E("ai_tool", "claude") },
    ],
  },
  {
    kind: "subject", id: E("subject", "circuits"), name: "الدوائر الكهربائية", nameEn: "Circuits",
    summary: "أساسيات تحليل الدوائر الكهربائية.", level: "university",
    relations: [
      { type: "belongs_to", to: E("major", "electrical-engineering") },
      { type: "prerequisite", to: E("subject", "calculus") },
      { type: "teaches", to: E("concept", "ohms-law") },
      { type: "teaches", to: E("concept", "kirchhoff") },
      { type: "teaches", to: E("concept", "parallel-connection") },
    ],
  },
  {
    kind: "subject", id: E("subject", "calculus"), name: "التفاضل والتكامل", nameEn: "Calculus",
    summary: "أساس رياضي لكل التخصصات الهندسية.", level: "university",
    relations: [
      { type: "belongs_to", to: E("major", "electrical-engineering") },
      { type: "teaches", to: E("concept", "integration") },
      { type: "recommends", to: E("ai_tool", "chatgpt") },
    ],
  },
  {
    kind: "course", id: E("course", "ee301"), name: "مقرّر أنظمة القوى (EE301)", code: "EE301", credits: 3,
    summary: "مقرّر جامعي في تحليل أنظمة القوى.",
    relations: [{ type: "belongs_to", to: E("subject", "power-systems") }],
  },
  {
    kind: "lesson", id: E("lesson", "load-flow"), name: "درس: تدفّق الأحمال", durationMin: 45,
    summary: "حساب تدفّق القدرة في شبكة كهربائية.",
    relations: [
      { type: "part_of", to: E("course", "ee301") },
      { type: "supported_by", to: E("resource", "load-flow-video") },
    ],
  },

  /* ═══ الكتب والمصادر ═══ */
  {
    kind: "book", id: E("book", "sadiku"), name: "Fundamentals of Electric Circuits", author: "Sadiku",
    summary: "مرجع أساسي في الدوائر الكهربائية.",
    relations: [
      { type: "belongs_to", to: E("subject", "circuits") },
      { type: "teaches", to: E("concept", "ohms-law") },   // نفس المفهوم في مادة وكتاب واختبار
      { type: "teaches", to: E("concept", "kirchhoff") },
    ],
  },
  {
    kind: "book", id: E("book", "barrons-step"), name: "Barron's — STEP/TOEFL", publisher: "Barron's", forExam: true,
    summary: "كتاب تحضير لاختبارات الإنجليزية.",
    relations: [{ type: "belongs_to", to: E("exam", "step") }],
  },
  {
    kind: "book", id: E("book", "naser-qudurat"), name: "ناصر عبدالكريم — القدرات", author: "ناصر عبدالكريم",
    summary: "من أشهر مراجع تحضير القدرات محلياً.",
    relations: [{ type: "belongs_to", to: E("exam", "qudurat") }],
  },
  {
    kind: "resource", id: E("resource", "load-flow-video"), name: "فيديو: شرح تدفّق الأحمال", format: "video", lang: "ar",
    summary: "شرح مرئي مبسّط لتدفّق الأحمال.",
    relations: [{ type: "teaches", to: E("skill", "power-systems-analysis") }],
  },

  /* ═══ المهني: وظائف/مسار/شركات ═══ */
  {
    kind: "job", id: E("job", "power-systems-engineer"), name: "مهندس أنظمة قوى", nameEn: "Power Systems Engineer",
    summary: "يصمّم ويحلّل شبكات توليد ونقل وتوزيع الكهرباء.",
    tasks: ["تصميم شبكات التوزيع", "دراسات الأحمال والحماية", "محاكاة الأعطال"],
    salary: { entrySar: "8,000–14,000 ريال/شهر", seniorSar: "18,000+ ريال/شهر", note: "استرشادي" },
    demand: "high", aliases: ["مهندس قوى"],
    meta: { version: 1, lastUpdated: "2026-07-01", confidence: 0.85, importance: 70 },
    relations: [
      { type: "requires", to: E("skill", "power-systems-analysis") },
      { type: "uses", to: E("tool", "etap") },
      { type: "requires", to: E("certification", "fe") },
      { type: "requires", to: E("certification", "saudi-council") },
      { type: "next_step", to: E("job", "control-engineer"), note: "تخصّص جانبي" },
      { type: "works_at", to: E("company", "aramco") },
      { type: "works_at", to: E("company", "sec") },
    ],
  },
  {
    kind: "job", id: E("job", "control-engineer"), name: "مهندس تحكّم", nameEn: "Control Engineer",
    summary: "يصمّم أنظمة التحكّم الآلي ويبرمج المتحكّمات.",
    tasks: ["برمجة PLC", "ضبط حلقات التحكّم", "أتمتة الإنتاج"],
    salary: { entrySar: "8,000–13,000 ريال/شهر" }, demand: "medium",
    relations: [
      { type: "uses", to: E("tool", "matlab") },
      { type: "uses", to: E("tool", "plc") },
      { type: "requires", to: E("certification", "fe") },
      { type: "works_at", to: E("company", "sec") },
    ],
  },
  {
    kind: "career_path", id: E("career_path", "power-engineering"), name: "مسار هندسة القوى",
    summary: "من خرّيج كهرباء إلى خبير أنظمة قوى.",
    stages: ["مهندس حديث", "مهندس أنظمة قوى", "قائد مشاريع", "استشاري"],
    relations: [
      { type: "leads_to", to: E("job", "power-systems-engineer") },
      { type: "belongs_to", to: E("major", "electrical-engineering") },
    ],
  },
  {
    kind: "company", id: E("company", "aramco"), name: "أرامكو السعودية", nameEn: "Saudi Aramco",
    summary: "أكبر شركة طاقة سعودية، توظّف مهندسي الكهرباء بكثافة.",
    sector: "الطاقة والبترول", locations: ["الظهران", "جدة"], aliases: ["ارامكو"],
  },
  {
    kind: "company", id: E("company", "sec"), name: "الشركة السعودية للكهرباء", nameEn: "Saudi Electricity Company",
    summary: "المشغّل الرئيس لشبكة الكهرباء في المملكة.",
    sector: "الكهرباء", locations: ["الرياض"], aliases: ["SEC"],
  },
  {
    kind: "company", id: E("company", "etec"), name: "هيئة تقويم التعليم والتدريب (قياس)", nameEn: "ETEC",
    summary: "الجهة الرسمية لاختبارات القدرات والتحصيلي وSTEP.",
    sector: "تعليم", official: true, aliases: ["قياس", "ETEC"],
  },

  /* ═══ مهارات / أدوات / ذكاء اصطناعي / مشاريع ═══ */
  {
    kind: "skill", id: E("skill", "power-systems-analysis"), name: "تحليل أنظمة القوى", category: "تحليلية",
    summary: "دراسة تدفّق الأحمال والأعطال والحماية.",
  },
  {
    kind: "tool", id: E("tool", "etap"), name: "ETAP", category: "محاكاة كهربائية", platform: "سطح المكتب",
    summary: "برنامج تحليل ومحاكاة أنظمة القوى.", aliases: ["إيتاب"],
    relations: [{ type: "related_to", to: E("tool", "matlab"), note: "صلة غير مباشرة" }],
  },
  {
    kind: "tool", id: E("tool", "matlab"), name: "MATLAB", category: "حساب ومحاكاة",
    summary: "بيئة حساب رقمي تُستخدم في التحكّم والإشارات.", aliases: ["ماتلاب"],
  },
  {
    kind: "tool", id: E("tool", "plc"), name: "برمجة المتحكّمات (PLC)", category: "أتمتة",
    summary: "برمجة المتحكّمات المنطقية في المنشآت الصناعية.",
  },
  {
    kind: "ai_tool", id: E("ai_tool", "claude"), name: "Claude", vendor: "Anthropic", bestFor: ["شرح المفاهيم", "التلخيص"],
    summary: "مساعد ذكاء اصطناعي للفهم والتلخيص — لا للغش.",
    meta: { version: 1, lastUpdated: "2026-07-01", confidence: 0.7, source: "يتغيّر باستمرار" },
  },
  {
    kind: "ai_tool", id: E("ai_tool", "chatgpt"), name: "ChatGPT", vendor: "OpenAI", bestFor: ["الشرح", "التدرّب"],
    summary: "مساعد ذكاء اصطناعي عام.",
    meta: { version: 1, lastUpdated: "2026-07-01", confidence: 0.7, source: "يتغيّر باستمرار" },
  },
  {
    kind: "project", id: E("project", "distribution-network"), name: "مشروع: شبكة توزيع كهربائي",
    summary: "تصميم شبكة توزيع كاملة ودراسة أحمالها.", difficulty: "intermediate",
    deliverables: ["مخطط الشبكة", "دراسة الأحمال", "تقرير الحماية"],
    relations: [
      { type: "belongs_to", to: E("subject", "power-systems") },
      { type: "uses", to: E("tool", "etap") },
      { type: "requires", to: E("skill", "power-systems-analysis") },
      { type: "used_in", to: E("company", "sec") },
    ],
  },

  /* ═══ الشهادات ═══ */
  {
    kind: "certification", id: E("certification", "fe"), name: "FE — أساسيات الهندسة", nameEn: "Fundamentals of Engineering",
    summary: "أول خطوة نحو الترخيص الهندسي المهني.", provider: "NCEES", level: "مبتدئ", aliases: ["FE"],
  },
  {
    kind: "certification", id: E("certification", "saudi-council"), name: "عضوية الهيئة السعودية للمهندسين",
    summary: "تصنيف مهني إلزامي لمزاولة الهندسة في السعودية.", provider: "الهيئة السعودية للمهندسين",
    aliases: ["الهيئة السعودية للمهندسين"],
  },

  /* ═══ الاختبارات (قدرات/تحصيلي/STEP/IELTS/CEFR) ═══ */
  {
    kind: "exam", id: E("exam", "qudurat"), name: "القدرات العامة", nameEn: "GAT",
    summary: "اختبار للقدرة اللفظية والكمية — ركن الموزونة.", scoreScale: "من ١٠٠",
    sections: [{ name: "كمي" }, { name: "لفظي" }], aliases: ["قدرات"],
    tips: ["التدرّب على النماذج السابقة يرفع الدرجة"],
    relations: [{ type: "certified_by", to: E("company", "etec") }],
  },
  {
    kind: "exam", id: E("exam", "tahsili"), name: "التحصيلي", nameEn: "SAAT",
    summary: "اختبار المواد العلمية للفرع العلمي.", scoreScale: "من ١٠٠",
    sections: [{ name: "رياضيات" }, { name: "فيزياء" }, { name: "كيمياء" }, { name: "أحياء" }], aliases: ["تحصيلي"],
    relations: [{ type: "certified_by", to: E("company", "etec") }],
  },
  {
    kind: "exam", id: E("exam", "step"), name: "STEP — اختبار الإنجليزية",
    summary: "اختبار كفاءة الإنجليزية المحلي.", scoreScale: "من ١٠٠",
    sections: [{ name: "القواعد" }, { name: "المفردات" }, { name: "القراءة" }, { name: "الاستماع" }], aliases: ["ستيب"],
    relations: [
      { type: "certified_by", to: E("company", "etec") },
      { type: "similar_to", to: E("exam", "cefr") },
    ],
  },
  {
    kind: "exam", id: E("exam", "ielts"), name: "IELTS",
    summary: "اختبار إنجليزية دولي بأربع مهارات.", provider: "British Council / IDP", scoreScale: "٠–٩", validityNote: "سنتان",
    sections: [{ name: "Listening" }, { name: "Reading" }, { name: "Writing" }, { name: "Speaking" }],
    levels: ["A1", "A2", "B1", "B2", "C1", "C2"], aliases: ["ايلتس"],
    relations: [{ type: "similar_to", to: E("exam", "cefr") }],
  },
  {
    kind: "exam", id: E("exam", "cefr"), name: "الإطار الأوروبي المرجعي (CEFR)", nameEn: "CEFR",
    summary: "المعيار الدولي لمستويات اللغة من A1 إلى C2.",
    levels: ["A1", "A2", "B1", "B2", "C1", "C2"], aliases: ["سيفر", "CEFR"],
  },

  /* ═══ الأهداف — أهمّ عقدة يقرؤها Life Engine ═══ */
  {
    kind: "goal", id: E("goal", "enter-ee"), name: "هدف: دخول الهندسة الكهربائية",
    summary: "القبول في تخصص الهندسة الكهربائية.",
    meta: { version: 1, lastUpdated: "2026-07-01", importance: 90 },
    relations: [
      { type: "leads_to", to: E("major", "electrical-engineering") },
      { type: "requires", to: E("exam", "qudurat") },
      { type: "requires", to: E("exam", "tahsili") },
    ],
  },
  {
    kind: "goal", id: E("goal", "step-85"), name: "هدف: STEP 85", metric: "STEP 85",
    summary: "تحقيق ٨٥ في اختبار STEP للإنجليزية.",
    relations: [{ type: "requires", to: E("exam", "step") }],
  },
  {
    kind: "goal", id: E("goal", "work-aramco"), name: "هدف: العمل في أرامكو",
    summary: "الوصول إلى وظيفة في أرامكو السعودية.",
    relations: [
      { type: "works_at", to: E("company", "aramco") },
      { type: "depends_on", to: E("major", "electrical-engineering") },
    ],
  },

  /* ═══ المفاهيم (تظهر عبر عدّة مواد/كتب/اختبارات — لا تُنسَخ) ═══ */
  {
    kind: "concept", id: E("concept", "ohms-law"), name: "قانون أوم", nameEn: "Ohm's Law", category: "فيزياء/كهرباء",
    summary: "العلاقة بين الجهد والتيار والمقاومة (V = IR).", aliases: ["أوم"],
    meta: { version: 1, lastUpdated: "2026-07-01", confidence: 1, importance: 100 },
    relations: [{ type: "related_to", to: E("concept", "kirchhoff") }],
  },
  {
    kind: "concept", id: E("concept", "kirchhoff"), name: "قانون كيرشوف", nameEn: "Kirchhoff's Laws", category: "فيزياء/كهرباء",
    summary: "قوانين حفظ التيار والجهد في الدوائر.", aliases: ["كيرشوف"],
    meta: { version: 1, lastUpdated: "2026-07-01", importance: 85 },
  },
  {
    kind: "concept", id: E("concept", "parallel-connection"), name: "التوصيل على التوازي", category: "فيزياء/كهرباء",
    summary: "توصيل العناصر بحيث يتساوى الجهد عليها.",
    meta: { version: 1, lastUpdated: "2026-07-01", importance: 70 },
  },
  {
    /* «التكامل» عقدةٌ واحدة تنتمي لتخصص الحاسب الجامعي واختبار التحصيلي معاً (لا تكرار) */
    kind: "concept", id: E("concept", "integration"), name: "التكامل", nameEn: "Integration", category: "رياضيات",
    summary: "العملية العكسية للاشتقاق — أساس رياضي واسع الاستخدام.",
    difficulty: "hard", examFrequency: 78,
    meta: { version: 1, lastUpdated: "2026-07-01", importance: 95 },
    relations: [{ type: "belongs_to", to: E("exam", "tahsili") }],
  },
  {
    /* مفهوم إنجليزي مُدمَج: المعرفة واحدة، وSTEP وIELTS مجرّد اختباران يقيسانها بوزنٍ مختلف */
    kind: "concept", id: E("concept", "passive-voice"), name: "المبني للمجهول (Passive Voice)", nameEn: "Passive Voice",
    category: "Grammar", cefr: "B1", difficulty: "medium", examFrequency: 75,
    examWeights: { [E("exam", "step")]: 80, [E("exam", "ielts")]: 70 },
    summary: "بناء الجملة الإنجليزية بصيغة المجهول (be + past participle).",
    meta: { version: 1, lastUpdated: "2026-07-10", importance: 80 },
    relations: [
      { type: "belongs_to", to: E("exam", "step") },
      { type: "belongs_to", to: E("exam", "ielts") },
    ],
  },

  /* ═══ ربط المفاهيم بالمواد/الكتب/الاختبارات (عبر العلاقات فقط) ═══ */
  /* نُضيفها كحواف على المواد/الكتب أدناه ليست ممكنة رجعياً — نُمثّلها بعقدٍ رابطة:
     المادة والكتاب يشيران للمفهوم بعلاقة teaches. */
  {
    kind: "resource", id: E("resource", "ohms-law-article"), name: "مقال: شرح قانون أوم", format: "article", lang: "ar",
    summary: "شرح نصّي مبسّط لقانون أوم.",
    relations: [{ type: "teaches", to: E("concept", "ohms-law") }],
  },

  /* ═══ الأسئلة (كيانات مستقلة يُعاد استخدامها) ═══ */
  {
    kind: "question", id: E("question", "ohm-basic"), name: "سؤال: حساب التيار بقانون أوم",
    summary: "إذا كان الجهد ١٢ فولت والمقاومة ٤ أوم، فما التيار؟",
    difficulty: "easy", bloom: "apply", answer: "٣ أمبير",
    relations: [
      { type: "requires", to: E("concept", "ohms-law") },
      { type: "belongs_to", to: E("subject", "circuits") },
      { type: "used_in", to: E("exam", "tahsili") },
      { type: "requires", to: E("skill", "power-systems-analysis") },
    ],
  },

  /* ═══ محاولة اختبار (الطالب لا الاختبار) ═══ */
  {
    kind: "exam_session", id: E("exam_session", "demo-tahsili-1"), name: "محاولة تحصيلي — الطالب",
    summary: "محاولة تجريبية: الدرجة ٧٢، ضعفٌ في التكامل.",
    score: 72, timeMin: 90, errors: 8, takenAt: "2026-06-20",
    meta: { version: 1, lastUpdated: "2026-06-20", confidence: 1, importance: 40 },
    relations: [
      { type: "belongs_to", to: E("exam", "tahsili") },
      { type: "related_to", to: E("concept", "integration"), note: "مفهوم ضعيف" },
    ],
  },
];
