/* ═══════════ قاعدة المعرفة — بذرة تحقّق (Proof Seed) ═══════════
   شريحةٌ واحدة مترابطة تُثبت أن المخطّط يستوعب كل الأنواع التسعة وعلاقاتها — لا
   محتوى كامل بعد (البنية أولاً). البيانات حقيقية (عالم الهندسة الكهربائية + قياس)
   مأخوذة من مصادر درب القائمة. حين تُقرّ البنية، نضخّ بقيّة المحتوى بنفس الشكل. */
import { entityId as E, type KBEntity } from "./schema";

export const SEED_ENTITIES: KBEntity[] = [
  /* ─── جامعة + كلية ─── */
  {
    kind: "university", id: E("university", "ksu"), name: "جامعة الملك سعود", nameEn: "King Saud University",
    summary: "أعرق جامعة حكومية سعودية في الرياض، واسعة التخصصات.",
    city: "الرياض", type: "government", founded: 1957,
    aliases: ["الملك سعود", "KSU", "جامعة الرياض"],
    stats: [{ label: "الكليات", value: "أكثر من ٢٠ كلية" }, { label: "التصنيف المحلي", value: "من الأوائل" }],
    tags: ["حكومية", "الرياض"],
    relations: [{ type: "offers", to: E("college", "ksu-engineering") }],
  },
  {
    kind: "college", id: E("college", "ksu-engineering"), name: "كلية الهندسة — جامعة الملك سعود",
    summary: "كلية هندسية تضم أقسام الكهرباء والميكانيكا والمدني وغيرها.",
    aliases: ["كلية الهندسة", "هندسة الملك سعود"],
    relations: [
      { type: "part_of", to: E("university", "ksu") },
      { type: "offers", to: E("major", "electrical-engineering") },
    ],
  },

  /* ─── تخصص ─── */
  {
    kind: "major", id: E("major", "electrical-engineering"), name: "الهندسة الكهربائية", nameEn: "Electrical Engineering",
    summary: "تصميم وتشغيل أنظمة الكهرباء والطاقة والتحكّم والإلكترونيات.",
    category: "هندسي", degreeYears: 5,
    coreSubjects: ["أنظمة القوى", "الإلكترونيات والدوائر", "أنظمة التحكّم", "التصميم الكهربائي"],
    aliases: ["هندسة كهربائية", "كهرباء", "EE"],
    relations: [
      { type: "part_of", to: E("college", "ksu-engineering") },
      { type: "teaches", to: E("skill", "power-systems-analysis") },
      { type: "teaches", to: E("skill", "etap") },
      { type: "teaches", to: E("skill", "matlab") },
      { type: "leads_to", to: E("job", "power-systems-engineer") },
      { type: "leads_to", to: E("job", "control-engineer") },
      { type: "requires", to: E("exam", "qudurat"), note: "للقبول" },
      { type: "requires", to: E("exam", "tahsili"), note: "للقبول" },
    ],
  },

  /* ─── وظائف (مثال المالك الكامل) ─── */
  {
    kind: "job", id: E("job", "power-systems-engineer"), name: "مهندس أنظمة قوى", nameEn: "Power Systems Engineer",
    summary: "يصمّم ويحلّل شبكات توليد ونقل وتوزيع الكهرباء ويضمن كفاءتها وأمانها.",
    tasks: ["تصميم شبكات التوزيع", "دراسات الأحمال والحماية", "محاكاة الأعطال", "رفع كفاءة الطاقة"],
    salary: { entrySar: "8,000–14,000 ريال/شهر", seniorSar: "18,000+ ريال/شهر", note: "استرشادي — يختلف بالجهة والخبرة" },
    demand: "high",
    learnPath: ["إتقان أنظمة القوى", "برنامج ETAP", "أساسيات الحماية", "شهادة FE"],
    aliases: ["مهندس قوى", "مهندس طاقة كهربائية"],
    relations: [
      { type: "requires", to: E("skill", "power-systems-analysis") },
      { type: "requires", to: E("skill", "etap") },
      { type: "requires", to: E("certification", "fe") },
      { type: "requires", to: E("certification", "saudi-council") },
      { type: "leads_to", to: E("job", "control-engineer"), note: "تخصّص جانبي" },
    ],
  },
  {
    kind: "job", id: E("job", "control-engineer"), name: "مهندس تحكّم", nameEn: "Control Engineer",
    summary: "يصمّم أنظمة التحكّم الآلي ويبرمج المتحكّمات في المنشآت الصناعية.",
    tasks: ["برمجة PLC", "ضبط حلقات التحكّم", "أتمتة خطوط الإنتاج"],
    salary: { entrySar: "8,000–13,000 ريال/شهر", note: "استرشادي" },
    demand: "medium",
    learnPath: ["أنظمة التحكّم", "برمجة المتحكّمات (PLC)", "MATLAB/Simulink"],
    relations: [
      { type: "requires", to: E("skill", "matlab") },
      { type: "requires", to: E("certification", "fe") },
    ],
  },

  /* ─── مسار مهني ─── */
  {
    kind: "career_path", id: E("career_path", "power-engineering"), name: "مسار هندسة القوى",
    summary: "من خرّيج كهرباء إلى خبير أنظمة قوى في قطاع الطاقة.",
    stages: ["مهندس حديث", "مهندس أنظمة قوى", "قائد مشاريع طاقة", "استشاري"],
    relations: [
      { type: "leads_to", to: E("job", "power-systems-engineer") },
      { type: "related_to", to: E("major", "electrical-engineering") },
    ],
  },

  /* ─── شركات ─── */
  {
    kind: "company", id: E("company", "aramco"), name: "أرامكو السعودية", nameEn: "Saudi Aramco",
    summary: "أكبر شركة طاقة سعودية، توظّف مهندسي الكهرباء والطاقة بكثافة.",
    sector: "الطاقة والبترول", locations: ["الظهران", "جدة", "ينبع"], official: false,
    aliases: ["ارامكو", "Aramco"],
    relations: [
      { type: "employs", to: E("job", "power-systems-engineer") },
      { type: "hires_from", to: E("major", "electrical-engineering") },
    ],
  },
  {
    kind: "company", id: E("company", "sec"), name: "الشركة السعودية للكهرباء", nameEn: "Saudi Electricity Company",
    summary: "المشغّل الرئيس لشبكة الكهرباء في المملكة.",
    sector: "الكهرباء", locations: ["الرياض", "مناطق المملكة"], official: false,
    aliases: ["السعودية للكهرباء", "SEC"],
    relations: [
      { type: "employs", to: E("job", "power-systems-engineer") },
      { type: "employs", to: E("job", "control-engineer") },
      { type: "hires_from", to: E("major", "electrical-engineering") },
    ],
  },

  /* ─── مهارات ─── */
  {
    kind: "skill", id: E("skill", "power-systems-analysis"), name: "تحليل أنظمة القوى", category: "تحليلية",
    summary: "دراسة تدفّق الأحمال والأعطال والحماية في شبكات الكهرباء.",
  },
  {
    kind: "skill", id: E("skill", "etap"), name: "ETAP", category: "برنامج", toolFor: "تحليل أنظمة القوى",
    summary: "برنامج محاكاة وتحليل أنظمة القوى الكهربائية.", aliases: ["إيتاب"],
  },
  {
    kind: "skill", id: E("skill", "matlab"), name: "MATLAB", category: "برنامج", toolFor: "الحساب والمحاكاة",
    summary: "بيئة حساب رقمي ومحاكاة تُستخدم في التحكّم والإشارات.", aliases: ["ماتلاب"],
  },

  /* ─── شهادات ─── */
  {
    kind: "certification", id: E("certification", "fe"), name: "FE — أساسيات الهندسة", nameEn: "Fundamentals of Engineering",
    summary: "أول خطوة نحو الترخيص الهندسي المهني (PE).", provider: "NCEES", level: "مبتدئ",
    aliases: ["أساسيات الهندسة", "FE Exam"],
  },
  {
    kind: "certification", id: E("certification", "saudi-council"), name: "عضوية الهيئة السعودية للمهندسين",
    summary: "تصنيف مهني إلزامي لمزاولة الهندسة في السعودية.", provider: "الهيئة السعودية للمهندسين", level: "أساسي",
    aliases: ["الهيئة السعودية للمهندسين", "تصنيف المهندسين"],
  },

  /* ─── اختبارات (قدرات/تحصيلي/STEP/IELTS/CEFR) ─── */
  {
    kind: "exam", id: E("exam", "qudurat"), name: "القدرات العامة", nameEn: "GAT",
    summary: "اختبار قياس للقدرة اللفظية والكمية — ركن أساسي في الموزونة.",
    provider: "هيئة تقويم التعليم والتدريب (قياس)", scoreScale: "من ١٠٠",
    sections: [{ name: "كمي" }, { name: "لفظي" }], aliases: ["قدرات", "القدرات"],
    tips: ["التدرّب على نماذج سابقة يرفع الدرجة بوضوح"],
    relations: [{ type: "prepares_for", to: E("university", "ksu"), note: "القبول" }],
  },
  {
    kind: "exam", id: E("exam", "tahsili"), name: "التحصيلي", nameEn: "SAAT",
    summary: "اختبار قياس للمواد العلمية للفرع العلمي — جزء من الموزونة.",
    provider: "قياس", scoreScale: "من ١٠٠",
    sections: [{ name: "رياضيات" }, { name: "فيزياء" }, { name: "كيمياء" }, { name: "أحياء" }],
    aliases: ["تحصيلي"],
    relations: [{ type: "prepares_for", to: E("university", "ksu"), note: "القبول العلمي" }],
  },
  {
    kind: "exam", id: E("exam", "step"), name: "STEP — اختبار الإنجليزية",
    summary: "اختبار قياس لكفاءة اللغة الإنجليزية، مقبول في القبول والوظائف.",
    provider: "قياس", scoreScale: "من ١٠٠",
    sections: [{ name: "القواعد" }, { name: "المفردات" }, { name: "القراءة" }, { name: "الاستماع" }],
    aliases: ["ستيب", "STEP"],
    relations: [{ type: "related_to", to: E("exam", "cefr") }, { type: "prepares_for", to: E("university", "ksu") }],
  },
  {
    kind: "exam", id: E("exam", "ielts"), name: "IELTS",
    summary: "اختبار إنجليزية دولي بأربع مهارات، مطلوب للابتعاث والدراسات العليا.",
    provider: "British Council / IDP", scoreScale: "٠–٩", validityNote: "صالح سنتين",
    sections: [{ name: "Listening" }, { name: "Reading" }, { name: "Writing" }, { name: "Speaking" }],
    levels: ["A1", "A2", "B1", "B2", "C1", "C2"], aliases: ["ايلتس", "آيلتس"],
    relations: [{ type: "related_to", to: E("exam", "cefr") }],
  },
  {
    kind: "exam", id: E("exam", "cefr"), name: "الإطار الأوروبي المرجعي (CEFR)", nameEn: "CEFR",
    summary: "المعيار الدولي لوصف مستويات إتقان اللغة من A1 إلى C2.",
    levels: ["A1", "A2", "B1", "B2", "C1", "C2"], aliases: ["سيفر", "CEFR", "الإطار المرجعي"],
  },
];
