/* ─── دليل أجهزة الجامعة: بيانات منسّقة + منطق فلترة نقي ───
   ملف نقي (لا يقرأ التخزين) — توصيات «مواصفات» لا موديلات سريعة التقادم،
   مصنّفة بفئة الجهاز وشريحة الميزانية وملاءمة التخصص (MajorCategory من
   university.ts — مصدر الحقيقة الواحد لفئات التخصصات، لا نعرّف بديلاً).

   ▸ كل الأسعار استرشادية بالريال السعودي وتتغير مع السوق — للعرض التعليمي فقط.
   ▸ examples أمثلة عامة على عائلات أجهزة، ليست روابط شراء ولا توصية حصرية. */

import type { MajorCategory } from "./university";

export type GearCategory = "laptop" | "tablet" | "printer" | "accessory" | "software" | "ai";
export type BudgetTier = "economy" | "mid" | "premium";

export interface GearItem {
  id: string;
  category: GearCategory;
  title: string;                          // اسم التوصية (بروفايل مواصفات)
  specs: string[];                        // نقاط المواصفات المهمة
  reason: string;                         // ليش يناسب — بنبرة درب
  fitsMajors: MajorCategory[];            // فئات التخصصات الملائمة
  budget: BudgetTier;
  priceRangeSAR: { min: number; max: number }; // مدى استرشادي بالريال ({0,0} = مجاني؛ برامج/AI اشتراك = شهري)
  examples?: string[];                    // أمثلة عامة (عائلات أجهزة/برامج)
}

export interface GearFilter {
  category?: GearCategory;
  major?: MajorCategory;
  budget?: BudgetTier;
}

/* ── تعريفات العرض (ترتيب الشرائح في الواجهة) ── */
export const GEAR_CATEGORIES: ReadonlyArray<{ id: GearCategory; label: string; icon: string }> = [
  { id: "laptop",    label: "لابتوب",    icon: "💻" },
  { id: "tablet",    label: "لوحي",      icon: "📱" },
  { id: "printer",   label: "طابعة",     icon: "🖨️" },
  { id: "accessory", label: "إكسسوار",   icon: "🎧" },
  { id: "software",  label: "برامج",     icon: "💿" },
  { id: "ai",        label: "أدوات AI",  icon: "🤖" },
];

/* شرائح الميزانية — الألوان متغيرات ثيم (سلم مقروء: أخضر=أوفر، ذهبي=وسط، أحمر=أغلى) */
export const BUDGET_TIERS: ReadonlyArray<{ id: BudgetTier; label: string; color: string }> = [
  { id: "economy", label: "اقتصادية", color: "var(--success)" },
  { id: "mid",     label: "متوسطة",   color: "var(--gold)" },
  { id: "premium", label: "عالية",    color: "var(--danger)" },
];

/* فئات التخصصات الست — القيم من نوع MajorCategory في university.ts (TS يضمن التطابق) */
export const GEAR_MAJORS: ReadonlyArray<{ id: MajorCategory; label: string; icon: string }> = [
  { id: "صحي",    label: "صحي",    icon: "🩺" },
  { id: "هندسي",  label: "هندسي",  icon: "📐" },
  { id: "حاسب",   label: "حاسب",   icon: "🖥️" },
  { id: "إداري",  label: "إداري",  icon: "💼" },
  { id: "قانوني", label: "قانوني", icon: "⚖️" },
  { id: "عام",    label: "عام",    icon: "🎓" },
];

export const gearCategoryMeta = (id: GearCategory) =>
  GEAR_CATEGORIES.find((c) => c.id === id) ?? GEAR_CATEGORIES[0];
export const budgetMeta = (id: BudgetTier) =>
  BUDGET_TIERS.find((b) => b.id === id) ?? BUDGET_TIERS[0];

/* اختصارات لتقليل التكرار في البيانات */
const ALL: MajorCategory[] = ["صحي", "هندسي", "حاسب", "إداري", "قانوني", "عام"];

/* ════════ البيانات (٥٣ توصية: ٩ لابتوب، ٦ لوحي، ٦ طابعة، ٩ إكسسوار، ١٦ برامج، ٧ أدوات AI) ════════
   الأجهزة مؤلفة فئة ← شريحة؛ البرامج وأدوات AI مجمّعة حسب المجال — والفرز في
   filterGear يعيد ترتيبها فئة ← شريحة للعرض. البرامج/AI أغلبها مجاني/طلابي
   ({min:0,max:0}) والمدفوع منها اشتراك شهري تقريبي — للعرض التعليمي فقط. */
export const GEAR_ITEMS: GearItem[] = [
  /* ── لابتوبات · اقتصادية ── */
  {
    id: "lap-eco-light", category: "laptop", budget: "economy",
    title: "لابتوب خفيف للمهام اليومية",
    specs: [
      "معالج حديث فئة i3 / Ryzen 3 أو أعلى",
      "ذاكرة 8GB (يفضّل قابلة للترقية)",
      "تخزين SSD بسعة 256GB أو أكثر",
      "وزن 1.6 كغ أو أقل",
      "بطارية تصمد يوماً دراسياً (8 ساعات+)",
    ],
    reason: "محاضراتك أغلبها كتابة وتصفح ومنصات جامعة — الخفة والبطارية أهم من قوة المعالج، وهذي الفئة تغطيها بأقل تكلفة.",
    fitsMajors: ["صحي", "إداري", "قانوني", "عام"],
    priceRangeSAR: { min: 1600, max: 2600 },
    examples: ["Lenovo IdeaPad Slim 3", "HP 15"],
  },
  {
    id: "lap-eco-upgrade", category: "laptop", budget: "economy",
    title: "لابتوب اقتصادي قابل للترقية",
    specs: [
      "معالج فئة i5 / Ryzen 5",
      "ذاكرة 8–16GB قابلة للترقية لاحقاً",
      "تخزين SSD بسعة 512GB",
      "منافذ كاملة (HDMI / USB-A) للمعامل",
    ],
    reason: "يشغّل بيئات البرمجة وبرامج الرسم الخفيفة أول سنتين، وترقية الذاكرة لاحقاً أرخص بكثير من جهاز جديد.",
    fitsMajors: ["حاسب", "هندسي"],
    priceRangeSAR: { min: 2300, max: 3200 },
    examples: ["Acer Aspire 5", "Lenovo IdeaPad 5"],
  },
  {
    id: "lap-eco-refurb", category: "laptop", budget: "economy",
    title: "لابتوب أعمال مجدَّد (Refurbished)",
    specs: [
      "فئة أعمال: هيكل متين وكيبورد مريح",
      "معالج i5 من جيل حديث نسبياً",
      "ذاكرة 16GB بسعر الفئة الاقتصادية",
      "ضمان بائع معتمد لا يقل عن سنة",
    ],
    reason: "أجهزة الأعمال المجدَّدة تعطيك جودة تصنيع أعلى من الجديد الرخيص بنفس السعر — بشرط بائع موثوق بضمان واضح.",
    fitsMajors: ["عام", "إداري", "قانوني"],
    priceRangeSAR: { min: 1200, max: 2200 },
    examples: ["ThinkPad مجدَّد", "Dell Latitude مجدَّد"],
  },

  /* ── لابتوبات · متوسطة ── */
  {
    id: "lap-mid-ultrabook", category: "laptop", budget: "mid",
    title: "ألترابوك خفيف ببطارية طويلة",
    specs: [
      "معالج i5 / Ryzen 5 من جيل حديث",
      "ذاكرة 16GB",
      "تخزين SSD بسعة 512GB",
      "وزن 1.4 كغ أو أقل",
      "بطارية 10 ساعات أو أكثر",
    ],
    reason: "تتنقل بين قاعات ومعامل طول اليوم — جهاز يفتح فوراً ويصمد بلا شاحن يوفّر عليك عناءً يومياً حقيقياً.",
    fitsMajors: ["صحي", "إداري", "قانوني", "عام"],
    priceRangeSAR: { min: 3200, max: 5000 },
    examples: ["ASUS Zenbook 14", "Lenovo Yoga Slim 7"],
  },
  {
    id: "lap-mid-perf", category: "laptop", budget: "mid",
    title: "لابتوب أداء للهندسة والبرمجة",
    specs: [
      "معالج فئة H (أداء عالٍ)",
      "ذاكرة 16GB",
      "رسوميات مستقلة للفئة المبتدئة (RTX 3050/4050)",
      "شاشة 15–16 بوصة بدقة عالية",
    ],
    reason: "برامج CAD والمحاكاة وبيئات التطوير الثقيلة تحتاج معالجاً قوياً ورسوميات مستقلة — هذي أقل فئة تشتغل فيها بارتياح.",
    fitsMajors: ["هندسي", "حاسب"],
    priceRangeSAR: { min: 3800, max: 5500 },
    examples: ["ASUS Vivobook Pro", "Lenovo LOQ"],
  },
  {
    id: "lap-mid-2in1", category: "laptop", budget: "mid",
    title: "جهاز 2 في 1 بقلم",
    specs: [
      "شاشة لمس قابلة للطي 360°",
      "دعم قلم نشط للتدوين",
      "ذاكرة 16GB",
      "وزن 1.5 كغ أو أقل",
    ],
    reason: "لابتوب ولوحي بجهاز واحد: تدوّن على الشرائح بالقلم وتكتب تقاريرك بالكيبورد — بدون ما تشتري جهازين.",
    fitsMajors: ["صحي", "عام", "إداري"],
    priceRangeSAR: { min: 3500, max: 5500 },
    examples: ["HP Envy x360", "Lenovo Yoga 7"],
  },

  /* ── لابتوبات · عالية ── */
  {
    id: "lap-pre-flag", category: "laptop", budget: "premium",
    title: "ألترابوك رائد خفيف",
    specs: [
      "معالج Apple Silicon أو Core Ultra",
      "ذاكرة 16GB أو أكثر",
      "بطارية 15 ساعة أو أكثر",
      "وزن نحو 1.2 كغ",
      "شاشة عالية الجودة مريحة للقراءة الطويلة",
    ],
    reason: "استثمار يخدمك سنوات الجامعة كلها: صامت وبارد وسريع، وبطاريته تنسيك الشاحن — الأنسب لمن يذاكر في كل مكان.",
    fitsMajors: ["صحي", "إداري", "قانوني", "عام"],
    priceRangeSAR: { min: 5500, max: 8500 },
    examples: ["MacBook Air", "Dell XPS 13"],
  },
  {
    id: "lap-pre-ws", category: "laptop", budget: "premium",
    title: "محطة عمل متنقلة للتصميم الهندسي",
    specs: [
      "معالج فئة H/HX متعدد الأنوية",
      "ذاكرة 32GB",
      "رسوميات RTX فئة متوسطة أو أعلى",
      "شاشة دقيقة الألوان (تغطية sRGB كاملة)",
    ],
    reason: "مشاريع CAD والريندر والمحاكاة تستهلك الذاكرة والرسوميات بشراهة — المواصفات الأقل بتعلّقك وقت التسليم.",
    fitsMajors: ["هندسي"],
    priceRangeSAR: { min: 7000, max: 12000 },
    examples: ["ASUS ProArt", "Dell XPS 15", "Lenovo Legion Slim"],
  },
  {
    id: "lap-pre-dev", category: "laptop", budget: "premium",
    title: "جهاز تطوير قوي لطلاب الحاسب",
    specs: [
      "معالج قوي متعدد الأنوية",
      "ذاكرة 18–32GB",
      "تخزين SSD بسعة 1TB",
      "تبريد ممتاز لجلسات الترجمة والتشغيل الطويلة",
    ],
    reason: "بيئات افتراضية وحاويات ومشاريع تخرج ثقيلة — الذاكرة الكبيرة والتبريد الجيد يفرقان أكثر من أي رقم تسويقي.",
    fitsMajors: ["حاسب", "هندسي"],
    priceRangeSAR: { min: 7500, max: 12000 },
    examples: ["MacBook Pro 14", "ThinkPad X1 Extreme"],
  },

  /* ── لوحية · اقتصادية ── */
  {
    id: "tab-eco-basic", category: "tablet", budget: "economy",
    title: "لوحي أساسي للقراءة والتصفح",
    specs: [
      "شاشة 10–11 بوصة",
      "ذاكرة 4GB أو أكثر",
      "تخزين 64GB+ أو دعم بطاقة ذاكرة",
      "بطارية يوم دراسي كامل",
    ],
    reason: "ملازمك ومراجعك PDF؟ لوحي بسيط أريح للقراءة الطويلة من اللابتوب وأرخص بكثير من الفئات الأعلى.",
    fitsMajors: ["عام", "إداري", "قانوني", "هندسي", "حاسب"],
    priceRangeSAR: { min: 500, max: 1000 },
    examples: ["Lenovo Tab M11", "Galaxy Tab A9+"],
  },
  {
    id: "tab-eco-pen", category: "tablet", budget: "economy",
    title: "لوحي اقتصادي بدعم قلم",
    specs: [
      "دعم قلم (قد يُباع منفصلاً)",
      "شاشة 10.5 بوصة أو أكبر",
      "تخزين 128GB للملازم والملاحظات",
    ],
    reason: "بداية معقولة للتدوين اليدوي على المحاضرات بدون سعر الفئة المتوسطة — القلم أبطأ استجابة لكنه يفي بالغرض.",
    fitsMajors: ["صحي", "عام"],
    priceRangeSAR: { min: 800, max: 1500 },
    examples: ["Galaxy Tab A9+ مع قلم متوافق", "Redmi Pad SE"],
  },

  /* ── لوحية · متوسطة ── */
  {
    id: "tab-mid-note", category: "tablet", budget: "mid",
    title: "لوحي تدوين بقلم منخفض التأخير",
    specs: [
      "قلم أصلي منخفض التأخير",
      "شاشة 11 بوصة بمعدل تحديث سلس",
      "ذاكرة 6–8GB",
      "تخزين 128–256GB",
    ],
    reason: "طلاب الصحي يرسمون مخططات وتشريحاً بالقلم يومياً — استجابة القلم السريعة تفرق فعلاً في سرعة الملاحظات.",
    fitsMajors: ["صحي", "عام", "قانوني", "إداري"],
    priceRangeSAR: { min: 1500, max: 2600 },
    examples: ["iPad 11", "Galaxy Tab S9 FE"],
  },
  {
    id: "tab-mid-sketch", category: "tablet", budget: "mid",
    title: "لوحي للرسم الهندسي الخفيف وتعدد المهام",
    specs: [
      "شاشة 11–12.4 بوصة",
      "تقسيم شاشة سلس لتطبيقين معاً",
      "قلم دقيق للرسم والمخططات",
      "ذاكرة 8GB",
    ],
    reason: "مراجعة المخططات ورسم الاسكتشات وتصفح المراجع جنب بعض — شاشة أوسع وقلم دقيق يخلّونها مريحة.",
    fitsMajors: ["هندسي", "حاسب"],
    priceRangeSAR: { min: 2000, max: 3300 },
    examples: ["Galaxy Tab S9 FE+", "iPad Air"],
  },

  /* ── لوحية · عالية ── */
  {
    id: "tab-pre-health", category: "tablet", budget: "premium",
    title: "لوحي احترافي لطلاب الصحي",
    specs: [
      "معالج فئة عليا (M-series أو ما يعادله)",
      "قلم بدقة ضغط عالية",
      "شاشة 11–13 بوصة عالية الجودة",
      "تخزين 256GB+ للأطالس والمراجع",
    ],
    reason: "أطالس التشريح التفاعلية وتدوين آلاف الصفحات — الفئة العليا تضمن سلاسة تخدمك سنوات الكلية كلها.",
    fitsMajors: ["صحي"],
    priceRangeSAR: { min: 3000, max: 5500 },
    examples: ["iPad Air M3", "iPad Pro"],
  },
  {
    id: "tab-pre-replace", category: "tablet", budget: "premium",
    title: "لوحي رائد يقارب اللابتوب",
    specs: [
      "معالج بمستوى لابتوب",
      "ذاكرة 8–16GB",
      "دعم كيبورد مغناطيسي",
      "شاشة 12 بوصة+ عالية التحديث",
    ],
    reason: "مع كيبورد وقلم يغطي القراءة والتدوين والعروض — رفيق ثانٍ خفيف لما يصير اللابتوب الثقيل عبئاً في الشنطة.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 3500, max: 6500 },
    examples: ["iPad Pro", "Galaxy Tab S10+"],
  },

  /* ── طابعات · اقتصادية ── */
  {
    id: "prn-eco-laser", category: "printer", budget: "economy",
    title: "ليزر أبيض وأسود للطباعة الكثيفة",
    specs: [
      "طباعة ليزر أحادية اللون",
      "تكلفة منخفضة للورقة الواحدة",
      "سرعة 20 صفحة بالدقيقة أو أكثر",
    ],
    reason: "ملازم ومذكرات بمئات الصفحات كل ترم — الليزر الأحادي أرخص طباعة على المدى الطويل وحبره ما يجف.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 350, max: 700 },
    examples: ["HP Laser 107a", "Brother HL-L2320"],
  },
  {
    id: "prn-eco-ink", category: "printer", budget: "economy",
    title: "حبر منزلية للطباعة الخفيفة",
    specs: [
      "طباعة ملونة أساسية",
      "سكانر مدمج في أغلب الموديلات",
      "حجم صغير يناسب غرفة السكن",
    ],
    reason: "لو طباعتك صفحات قليلة متفرقة وتحتاج ألواناً أحياناً — أرخص دخول، بس انتبه: خراطيشها تكلف مع الاستخدام الكثيف.",
    fitsMajors: ["عام", "إداري"],
    priceRangeSAR: { min: 200, max: 450 },
    examples: ["HP DeskJet 2720", "Canon PIXMA"],
  },

  /* ── طابعات · متوسطة ── */
  {
    id: "prn-mid-mfp", category: "printer", budget: "mid",
    title: "ليزر متعددة الوظائف بسكانر",
    specs: [
      "طباعة + تصوير + سكانر بجهاز واحد",
      "طباعة على الوجهين تلقائياً",
      "واي فاي للطباعة من الجوال",
    ],
    reason: "تصوير المراجع وسحب الأوراق الرسمية PDF حاجة متكررة بالجامعة — جهاز واحد يغنيك عن مكتبة التصوير.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 700, max: 1300 },
    examples: ["Brother DCP-L2540DW", "HP Laser MFP 135w"],
  },
  {
    id: "prn-mid-tank", category: "printer", budget: "mid",
    title: "حبر بخزانات للألوان الكثيفة",
    specs: [
      "خزانات حبر تُعبّأ (بلا خراطيش)",
      "تكلفة ألوان منخفضة جداً للورقة",
      "سكانر مدمج",
    ],
    reason: "مخططات ملونة وشرائح وأطالس؟ الخزانات تطبع آلاف الصفحات الملونة بتكلفة زهيدة مقارنة بالخراطيش.",
    fitsMajors: ["هندسي", "صحي", "عام"],
    priceRangeSAR: { min: 700, max: 1300 },
    examples: ["Epson EcoTank L3250", "Canon MegaTank G2420"],
  },

  /* ── طابعات · عالية ── */
  {
    id: "prn-pre-tank", category: "printer", budget: "premium",
    title: "خزانات متكاملة بدوبلكس وتغذية مستندات",
    specs: [
      "خزانات ألوان + سكانر بتغذية تلقائية (ADF)",
      "طباعة على الوجهين تلقائياً",
      "واي فاي وطباعة من السحابة",
    ],
    reason: "لمن يطبع ويصوّر بكثافة (مشاريع، أبحاث، ملفات تدريب) — راحة كاملة وتكلفة تشغيل شبه معدومة.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 1400, max: 2600 },
    examples: ["Epson EcoTank L6270", "Canon MAXIFY GX"],
  },
  {
    id: "prn-pre-color-laser", category: "printer", budget: "premium",
    title: "ليزر ألوان سريعة للمستندات الرسمية",
    specs: [
      "ليزر ألوان بنصوص حادة",
      "سرعة عالية للدفعات الكبيرة",
      "طباعة على الوجهين تلقائياً",
    ],
    reason: "مذكرات وعروض ومستندات بمظهر احترافي — الليزر الملون أسرع وأثبت من الحبر للنصوص الرسمية.",
    fitsMajors: ["قانوني", "إداري", "هندسي"],
    priceRangeSAR: { min: 1300, max: 2800 },
    examples: ["HP Color Laser 178nw", "Brother HL-L3230"],
  },

  /* ── إكسسوارات · اقتصادية ── */
  {
    id: "acc-eco-combo", category: "accessory", budget: "economy",
    title: "طقم ماوس وكيبورد لاسلكي",
    specs: [
      "اتصال لاسلكي بمستقبل واحد",
      "كيبورد بأحرف عربية واضحة",
      "بطارية تدوم شهوراً",
    ],
    reason: "الكتابة الطويلة على كيبورد اللابتوب مباشرة تتعب الرقبة والمعصم — طقم خارجي رخيص يحسّن جلستك فوراً.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 80, max: 250 },
    examples: ["Logitech MK270"],
  },
  {
    id: "acc-eco-stand", category: "accessory", budget: "economy",
    title: "ستاند لابتوب معدني",
    specs: [
      "ارتفاع قابل للتعديل",
      "معدن يشتّت الحرارة",
      "قابل للطي في الشنطة",
    ],
    reason: "يرفع الشاشة لمستوى النظر — جلسة مذاكرة أطول بلا آلام رقبة، وتهوية أفضل لجهازك.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 50, max: 150 },
  },
  {
    id: "acc-eco-power", category: "accessory", budget: "economy",
    title: "شاحن متنقل للجوال واللوحي",
    specs: [
      "سعة 10,000–20,000mAh",
      "شحن سريع 20W أو أكثر",
      "منفذان على الأقل",
    ],
    reason: "يوم جامعي طويل ومقاعد الشحن دايماً محجوزة — يبقي جوالك ولوحيك أحياء لآخر محاضرة.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 60, max: 180 },
    examples: ["Anker PowerCore"],
  },

  /* ── إكسسوارات · متوسطة ── */
  {
    id: "acc-mid-anc", category: "accessory", budget: "mid",
    title: "سماعات عزل ضوضاء للمذاكرة",
    specs: [
      "عزل ضوضاء نشط (ANC)",
      "راحة للبس ساعات طويلة",
      "بطارية 30 ساعة أو أكثر",
    ],
    reason: "سكن مشترك ومكتبات مزدحمة — العزل النشط يخلق لك فقاعة تركيز في أي مكان.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 250, max: 600 },
    examples: ["Soundcore Space One", "JBL Tune 770NC"],
  },
  {
    id: "acc-mid-bag", category: "accessory", budget: "mid",
    title: "حقيبة ظهر مبطنة للابتوب",
    specs: [
      "جيب لابتوب مبطن حتى 16 بوصة",
      "توزيع وزن مريح للظهر",
      "جيوب منظمة للشواحن والأوراق",
      "قماش مقاوم للرذاذ",
    ],
    reason: "بتحمل جهازك يومياً لسنوات — تبطين جيد يحمي أغلى أجهزتك، وتوزيع الوزن يحمي ظهرك.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 200, max: 450 },
  },
  {
    id: "acc-mid-pd", category: "accessory", budget: "mid",
    title: "شاحن متنقل PD يشحن اللابتوب",
    specs: [
      "قدرة 65W أو أكثر عبر USB-C PD",
      "سعة 20,000mAh",
      "يشحن لابتوبات USB-C الحديثة",
    ],
    reason: "لو لابتوبك يشحن عبر USB-C فهذا كهرباء احتياطية بجيبك — ينقذك بأيام المشاريع والمعامل الطويلة.",
    fitsMajors: ["حاسب", "هندسي", "عام"],
    priceRangeSAR: { min: 250, max: 600 },
    examples: ["UGREEN Nexode", "Anker 737"],
  },

  /* ── إكسسوارات · عالية ── */
  {
    id: "acc-pre-anc", category: "accessory", budget: "premium",
    title: "سماعات عزل رائدة",
    specs: [
      "أفضل عزل ضوضاء في فئتها",
      "خامات مريحة للبس يوم كامل",
      "اتصال بجهازين معاً",
    ],
    reason: "لو المذاكرة وسط ضوضاء واقعك اليومي — الفئة الرائدة فرقها محسوس في العزل والراحة، وتخدمك سنوات.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 700, max: 1700 },
    examples: ["Sony WH-1000XM5", "Bose QuietComfort", "AirPods Pro"],
  },
  {
    id: "acc-pre-ssd", category: "accessory", budget: "premium",
    title: "قرص SSD خارجي للنسخ الاحتياطي",
    specs: [
      "سعة 1TB أو أكثر",
      "سرعة 1,000MB/s+ عبر USB-C",
      "حجم جيب ومقاوم للصدمات",
    ],
    reason: "مشاريع تخرج وملفات تصميم ضخمة — نسخة احتياطية سريعة خارج جهازك تحميك من كارثة ضياع ترم كامل.",
    fitsMajors: ["حاسب", "هندسي", "عام"],
    priceRangeSAR: { min: 400, max: 900 },
    examples: ["Samsung T7", "SanDisk Extreme"],
  },
  {
    id: "acc-pre-ergo", category: "accessory", budget: "premium",
    title: "طقم كتابة مريح (كيبورد ميكانيكي + ماوس إرغونومي)",
    specs: [
      "كيبورد ميكانيكي بمفاتيح هادئة",
      "ماوس بتصميم مريح للمعصم",
      "اتصال متعدد الأجهزة",
    ],
    reason: "ساعات كتابة يومية طويلة (أكواد، مذكرات، تقارير) — العتاد المريح يقلل إجهاد اليد على المدى الطويل.",
    fitsMajors: ["حاسب", "إداري", "قانوني"],
    priceRangeSAR: { min: 500, max: 1200 },
    examples: ["Keychron", "Logitech MX"],
  },

  /* ════════ برامج حسب التخصص (💿) — فئات لا إصدارات؛ أغلبها مجاني/طلابي ════════ */

  /* ── برامج · حاسب وبرمجة ── */
  {
    id: "sw-code-editor", category: "software", budget: "economy",
    title: "محرّر أكواد خفيف بإضافات",
    specs: [
      "تلوين وإكمال ذكي لأغلب لغات البرمجة",
      "طرفية مدمجة وتصحيح أخطاء (Debugger)",
      "آلاف الإضافات المجانية حسب لغتك",
      "مجاني ومفتوح المصدر بالكامل",
    ],
    reason: "أول أداة تفتحها كل يوم كطالب حاسب — خفيف وسريع ويكبر معك بالإضافات، وما يكلفك ريال.",
    fitsMajors: ["حاسب", "هندسي", "عام"],
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["VS Code", "محررات مفتوحة المصدر"],
  },
  {
    id: "sw-version-control", category: "software", budget: "economy",
    title: "نظام إدارة إصدارات ومستودعات",
    specs: [
      "تتبّع تغييرات مشاريعك وتراجع عن أي خطأ",
      "تعاون على نفس الكود مع فريقك",
      "مستودع سحابي عام/خاص مجاني",
      "أساس مطلوب في أغلب وظائف التقنية",
    ],
    reason: "مشروع التخرج والتعاون الجماعي بلا إدارة إصدارات فوضى — تعلّمها مبكراً يفرق في سيرتك المهنية.",
    fitsMajors: ["حاسب", "هندسي"],
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["Git", "منصات استضافة المستودعات"],
  },
  {
    id: "sw-containers", category: "software", budget: "economy",
    title: "حاويات وبيئات تطوير معزولة",
    specs: [
      "تشغيل مشاريعك في بيئة نظيفة معزولة",
      "نفس الإعداد يشتغل على أي جهاز",
      "تجربة قواعد بيانات وخوادم بلا تلويث نظامك",
      "مجاني للأفراد والطلاب",
    ],
    reason: "«يشتغل عندي بس ما يشتغل عندك»؟ الحاويات تنهي هذا الصداع وتجهّزك لبيئة العمل الحقيقية.",
    fitsMajors: ["حاسب", "هندسي"],
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["Docker", "بيئات حاويات مفتوحة"],
  },
  {
    id: "sw-database", category: "software", budget: "economy",
    title: "أدوات قواعد بيانات وعميل استعلام",
    specs: [
      "واجهة رسومية لإدارة قواعد البيانات",
      "تشغيل استعلامات SQL بسهولة",
      "دعم أشهر المحركات المفتوحة",
      "نسخ مجانية كافية للدراسة",
    ],
    reason: "مقرر قواعد البيانات ومشاريعك يحتاجون عميلاً مريحاً — أداة واحدة تدير كل قواعدك من مكان واحد.",
    fitsMajors: ["حاسب", "إداري"],
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["عملاء SQL مفتوحون", "محركات قواعد مفتوحة"],
  },

  /* ── برامج · هندسي ── */
  {
    id: "sw-cad", category: "software", budget: "economy",
    title: "برامج التصميم والرسم الهندسي (CAD)",
    specs: [
      "رسم ونمذجة ثنائية وثلاثية الأبعاد",
      "محاكاة وتحليل للقطع والتجميعات",
      "رخص طلابية مجانية من أغلب الشركات",
      "مهارة مطلوبة في سوق العمل الهندسي",
    ],
    reason: "مشاريع الهندسة تعيش على الـCAD — سجّل برخصتك الجامعية المجانية وتمرّن مبكراً قبل ضغط التسليم.",
    fitsMajors: ["هندسي"],
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["AutoCAD", "SolidWorks", "Fusion (رخص طلابية)"],
  },
  {
    id: "sw-numerical", category: "software", budget: "economy",
    title: "بيئة حساب رقمي وهندسي",
    specs: [
      "حل معادلات ومصفوفات ورسم بياني علمي",
      "برمجة خوارزميات المحاكاة والتحليل",
      "بدائل مفتوحة مجانية قوية",
      "رخصة جامعية غالباً متوفّرة للنسخ المدفوعة",
    ],
    reason: "مواد التحليل العددي والإشارات تحتاج أداة حساب قوية — ابدأ بالبديل المجاني ولا تدفع من جيبك.",
    fitsMajors: ["هندسي", "حاسب"],
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["MATLAB (رخصة جامعية)", "GNU Octave", "Scilab"],
  },

  /* ── برامج · صحي ── */
  {
    id: "sw-med-reference", category: "software", budget: "mid",
    title: "مراجع طبية وسريرية رقمية",
    specs: [
      "مرجع أدوية وجرعات وتفاعلات محدّث",
      "أطالس تشريح وحالات سريرية تفاعلية",
      "مراجع أساسية مجانية + اشتراكات سريرية أعمق",
      "بحث سريع أثناء التدريب في المستشفى",
    ],
    reason: "بتحتاج مرجعاً موثوقاً بجيبك في الرواند والتدريب — ابدأ بالمجاني، والاشتراك المدفوع يجي وقت التخصص.",
    fitsMajors: ["صحي"],
    priceRangeSAR: { min: 30, max: 120 },
    examples: ["مراجع أدوية", "أطالس تشريح تفاعلية"],
  },
  {
    id: "sw-stats", category: "software", budget: "economy",
    title: "أدوات تحليل إحصائي",
    specs: [
      "اختبارات إحصائية ورسوم بيانية للبيانات",
      "تحليل نتائج الأبحاث والاستبيانات",
      "بدائل مجانية قوية عن البرامج المدفوعة",
      "واجهات سهلة لغير المتخصص",
    ],
    reason: "بحثك ومشروع التخرج يحتاجان تحليلاً إحصائياً سليماً — أدوات مجانية تعطيك نفس نتائج البرامج الغالية.",
    fitsMajors: ["صحي", "إداري", "عام"],
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["JASP", "PSPP", "R"],
  },

  /* ── برامج · إداري ── */
  {
    id: "sw-spreadsheet", category: "software", budget: "economy",
    title: "جداول بيانات متقدمة",
    specs: [
      "دوال وجداول محورية (Pivot) وتحليل بيانات",
      "نمذجة مالية وميزانيات ولوحات مؤشرات",
      "نسخة سحابية مجانية + نسخة طلابية للمكتب",
      "أكثر مهارة عملية مطلوبة في الوظائف الإدارية",
    ],
    reason: "إتقان الجداول المتقدمة وحده يرفع فرص توظيفك — تمرّن على الدوال والجداول المحورية من الآن.",
    fitsMajors: ["إداري", "حاسب", "عام"],
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["Excel (نسخة طلابية)", "Google Sheets", "LibreOffice Calc"],
  },
  {
    id: "sw-bi", category: "software", budget: "economy",
    title: "أدوات ذكاء الأعمال ولوحات البيانات",
    specs: [
      "لوحات تفاعلية تحوّل البيانات لقصة مرئية",
      "ربط مصادر بيانات متعددة",
      "نسخة سطح مكتب مجانية للتعلّم",
      "مهارة مميّزة في تخصصات الأعمال والتحليل",
    ],
    reason: "الشركات تدفع لمن يحوّل الأرقام لقرارات — أداة لوحات مجانية تبني بها معرضك (Portfolio) وأنت طالب.",
    fitsMajors: ["إداري"],
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["Power BI Desktop", "Looker Studio"],
  },
  {
    id: "sw-project-mgmt", category: "software", budget: "mid",
    title: "أدوات إدارة المشاريع والمهام",
    specs: [
      "لوحات مهام (Kanban) وخطط زمنية",
      "تنظيم مشاريع الفرق والتسليمات",
      "نسخة مجانية سخيّة + خطط مدفوعة للفرق",
      "تنظّم مشاريعك الجامعية ومهامك الشخصية",
    ],
    reason: "مشاريع جماعية متعثّرة بسبب سوء التنسيق؟ لوحة مهام واحدة تخلّي الفريق يشوف مين يسوي وش ومتى.",
    fitsMajors: ["إداري", "عام"],
    priceRangeSAR: { min: 15, max: 60 },
    examples: ["Trello", "Asana", "Notion"],
  },

  /* ── برامج · قانوني ── */
  {
    id: "sw-legal-research", category: "software", budget: "mid",
    title: "أدوات البحث القانوني والأنظمة",
    specs: [
      "بحث في الأنظمة واللوائح والسوابق",
      "بوابات حكومية رسمية مجانية للأنظمة",
      "منصات تجارية باشتراك لبحث أعمق",
      "توفّر عليك ساعات تصفّح يدوي",
    ],
    reason: "القانوني الشاطر يلقى النظام الصحيح بسرعة — ابدأ بالبوابات الرسمية المجانية قبل أي اشتراك مدفوع.",
    fitsMajors: ["قانوني"],
    priceRangeSAR: { min: 50, max: 200 },
    examples: ["بوابات الأنظمة الرسمية", "منصات بحث قانوني"],
  },
  {
    id: "sw-doc-mgmt", category: "software", budget: "economy",
    title: "إدارة الوثائق والملفات (PDF)",
    specs: [
      "تنظيم ودمج وتوقيع ملفات PDF",
      "تعليقات ومراجعة على العقود والمستندات",
      "أدوات مجانية تغطي أغلب الاحتياج",
      "توقيع إلكتروني للمعاملات",
    ],
    reason: "شغلك القانوني والإداري وثائق وعقود — أدوات PDF مجانية تنظّم وتوقّع بلا ما تطبع ورقة.",
    fitsMajors: ["قانوني", "إداري"],
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["أدوات PDF مجانية", "توقيع إلكتروني"],
  },

  /* ── برامج · عام (تخدم كل التخصصات) ── */
  {
    id: "sw-office", category: "software", budget: "economy",
    title: "حزمة مكتب متكاملة",
    specs: [
      "مستندات وعروض وجداول بيانات",
      "نسخة طلابية مجانية عبر بريد جامعتك غالباً",
      "بدائل مفتوحة المصدر مجانية بالكامل",
      "تخزين سحابي وتعاون فوري",
    ],
    reason: "لا تدفع مقابل حزمة مكتب وأنت طالب — بريدك الجامعي غالباً يفتح لك النسخة الكاملة مجاناً.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["Microsoft 365 (طلابي)", "Google Workspace", "LibreOffice"],
  },
  {
    id: "sw-reference-mgr", category: "software", budget: "economy",
    title: "إدارة المراجع والاقتباسات",
    specs: [
      "حفظ المراجع وتوليد قوائمها تلقائياً",
      "اقتباس بصيغ APA/MLA وغيرها بضغطة",
      "مزامنة مكتبتك بين أجهزتك",
      "مجاني ومفتوح المصدر",
    ],
    reason: "بحث بمئة مرجع بلا أداة تنسيق كابوس — تحفظ وتقتبس تلقائياً وتوفّر ساعات قبل التسليم.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["Zotero", "Mendeley"],
  },
  {
    id: "sw-notes", category: "software", budget: "economy",
    title: "تطبيقات تدوين وتنظيم معرفة",
    specs: [
      "ملاحظات منظّمة بروابط وعلامات",
      "قاعدة معرفة شخصية تكبر معك",
      "نسخ مجانية سخيّة تكفي الطالب",
      "مزامنة عبر الجوال واللابتوب",
    ],
    reason: "ملاحظاتك مبعثرة في كل مكان؟ تطبيق تدوين واحد يجمع مذاكرتك وأفكارك ومشاريعك بمكان تلقاه فيه بسرعة.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["Notion", "Obsidian", "OneNote"],
  },

  /* ════════ أدوات الذكاء الاصطناعي (🤖) — للفهم والمساعدة لا للغش ════════ */

  /* ── AI · عامة للدراسة (كل التخصصات) ── */
  {
    id: "ai-study-assistant", category: "ai", budget: "economy",
    title: "مساعد دراسة ومحادثة عام",
    specs: [
      "يشرح المفاهيم الصعبة بلغة تفهمها",
      "يلخّص ويطرح عليك أسئلة مراجعة",
      "نسخة مجانية كافية لأغلب الاستخدام",
      "متاح على الجوال والمتصفح",
    ],
    reason: "كأنه مدرّس خصوصي متاح ٢٤ ساعة يشرح لك اللي ما فهمته — بشرط تستخدمه لتفهم، لا لينجز واجبك مكانك.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["مساعدات محادثة عامة"],
  },
  {
    id: "ai-writing", category: "ai", budget: "economy",
    title: "مساعد كتابة وتدقيق لغوي",
    specs: [
      "تدقيق إملائي ونحوي وتحسين الصياغة",
      "إعادة صياغة وضبط نبرة النص",
      "دعم العربية والإنجليزية",
      "نسخ مجانية تغطي الأساسيات",
    ],
    reason: "تقاريرك وأبحاثك تستاهل لغة نظيفة — يصلّح صياغتك ويعلّمك تكتب أحسن، لا يكتب النص كامل بدالك.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["مدققات لغوية ذكية"],
  },
  {
    id: "ai-summarize", category: "ai", budget: "economy",
    title: "تلخيص المستندات والمحاضرات",
    specs: [
      "تلخيص ملفات PDF وأوراق طويلة",
      "استخراج النقاط والمفاهيم الأساسية",
      "أسئلة ومراجعة سريعة من المحتوى",
      "يوفّر وقت القراءة الأولى",
    ],
    reason: "مئة صفحة قبل الاختبار؟ خلّه يعطيك الخريطة الكبيرة، بعدها ارجع للمصدر واقرأ المهم بنفسك — الفهم مسؤوليتك.",
    fitsMajors: ALL,
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["أدوات تلخيص المستندات"],
  },
  {
    id: "ai-math", category: "ai", budget: "economy",
    title: "مساعد حل وشرح المسائل العلمية",
    specs: [
      "شرح خطوات حل المسائل الرياضية",
      "حل رمزي ورسم دوال وتفاضل وتكامل",
      "نسخ مجانية للأساسيات",
      "يوضّح «ليش» لا «الجواب» فقط",
    ],
    reason: "علّقت في مسألة؟ خلّه يفصّل لك الخطوات لتفهم الطريقة — بعدها حل مسألة مشابهة بنفسك للتأكد إنك فهمت.",
    fitsMajors: ["هندسي", "حاسب", "صحي", "عام"],
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["حاسبات رمزية وشرح خطوات"],
  },

  /* ── AI · للحاسب والبرمجة ── */
  {
    id: "ai-coding", category: "ai", budget: "mid",
    title: "مساعد برمجة وإكمال أكواد",
    specs: [
      "اقتراح وإكمال الكود داخل محررك",
      "شرح الأخطاء واقتراح إصلاحها",
      "خطط طلابية مجانية عبر البريد الجامعي غالباً",
      "يسرّع التعلّم لو استُخدم بوعي",
    ],
    reason: "أداة قوية تسرّعك، بس خطر لو صرت تنسخ بلا فهم — استخدمها تشرح لك الكود، وتأكد تقدر تكتبه بنفسك.",
    fitsMajors: ["حاسب", "هندسي"],
    priceRangeSAR: { min: 30, max: 80 },
    examples: ["مساعدات إكمال الأكواد"],
  },

  /* ── AI · للتصميم والعروض ── */
  {
    id: "ai-design", category: "ai", budget: "mid",
    title: "أدوات تصميم وعروض بالذكاء الاصطناعي",
    specs: [
      "توليد وتحرير صور ورسومات",
      "قوالب عروض تقديمية احترافية بسرعة",
      "نسخ مجانية محدودة + اشتراك للمزايا",
      "ترفع جودة مشاريعك وعروضك",
    ],
    reason: "عرضك التقديمي واجهتك — أدوات التصميم الذكية تعطيك مظهراً احترافياً بسرعة، والأفكار والمحتوى منك أنت.",
    fitsMajors: ["هندسي", "إداري", "عام"],
    priceRangeSAR: { min: 40, max: 90 },
    examples: ["مولّدات ومحرّرات تصميم"],
  },

  /* ── AI · للبحث العلمي ── */
  {
    id: "ai-research", category: "ai", budget: "economy",
    title: "أدوات البحث العلمي واكتشاف الأوراق",
    specs: [
      "اكتشاف أوراق بحثية ذات صلة بموضوعك",
      "خرائط استشهادات وربط الأبحاث",
      "تلخيص وتقييم موثوقية المصادر",
      "نسخ مجانية كافية لبحث الطالب",
    ],
    reason: "بحث التخرج يبدأ بمراجعة أدبيات صحيحة — هالأدوات تلقّى لك المصادر بسرعة، والقراءة النقدية دورك أنت.",
    fitsMajors: ["صحي", "هندسي", "حاسب", "قانوني", "عام"],
    priceRangeSAR: { min: 0, max: 0 },
    examples: ["أدوات اكتشاف الأوراق العلمية"],
  },
];

/* ════════ المنطق النقي ════════ */

const CATEGORY_ORDER: Record<GearCategory, number> = { laptop: 0, tablet: 1, printer: 2, accessory: 3, software: 4, ai: 5 };
const BUDGET_ORDER: Record<BudgetTier, number> = { economy: 0, mid: 1, premium: 2 };

/* فلترة + ترتيب حتمي: فئة الجهاز ← شريحة الميزانية ← عند تحديد تخصص، الأخص
   أولاً (fitsMajors أقصر = توصية أكثر استهدافاً). الفرز مستقر فيحفظ ترتيب
   التأليف عند التعادل، ولا يعدّل المصفوفة الأصلية. */
export function filterGear(items: readonly GearItem[], filter: GearFilter = {}): GearItem[] {
  const kept = items.filter((it) =>
    (filter.category === undefined || it.category === filter.category) &&
    (filter.budget === undefined || it.budget === filter.budget) &&
    (filter.major === undefined || it.fitsMajors.includes(filter.major)),
  );
  return kept.sort((a, b) =>
    (CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]) ||
    (BUDGET_ORDER[a.budget] - BUDGET_ORDER[b.budget]) ||
    (filter.major !== undefined ? a.fitsMajors.length - b.fitsMajors.length : 0),
  );
}

/* تنسيق المدى السعري بفواصل آلاف (بلا Intl — حتمي في كل بيئة): "1,500–2,500" */
const fmtNum = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export function formatPriceRange({ min, max }: { min: number; max: number }): string {
  return min === max ? fmtNum(min) : `${fmtNum(min)}–${fmtNum(max)}`;
}
