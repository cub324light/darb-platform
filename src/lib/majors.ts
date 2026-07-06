/* ─── «عالم كل تخصص دقيق» — طبقة بيانات نقية (لا تقرأ التخزين ولا الشبكة) ───
   أساس رؤية «كل تخصص له عالمه»: لكل تخصص دقيق (معرّفات MAJORS في university.ts)
   عالمٌ معزول من أدواته وشهاداته وجهات توظيفه ومشاريعه ومساراته — طالب هندسة
   كهربائية لا يرى أدوات أمن سيبراني، والعكس صحيح.

   ▸ طبقة مكمّلة لا مكرّرة: gear.ts و career.ts حسب الفئة العامة (MajorCategory
     الست)، وهذه الطبقة أدقّ — حسب التخصص الدقيق الـ19 نفسه.
   ▸ الدقّة أهم من الاكتمال: أُدرج فقط ما هو معيار فعلي معروف للتخصص في السياق
     السعودي؛ ما لم يكن مؤكّداً تُرك (لهذا books اختياري وغائب عن تخصصات).
   ▸ كل الأرقام (الرواتب) استرشادية تقريبية — لا قيم قاطعة. */

/* عالم تخصص واحد — نوع نقي واحد */
export interface MajorWorld {
  id: string;                                  // يطابق معرّف MAJORS في university.ts
  programs: { name: string; note?: string }[]; // برامج/أدوات التخصص العملية
  certs: { name: string; note?: string }[];    // شهادات احترافية معتمدة
  companies: string[];                         // جهات توظّف التخصص (سعودية + عالمية معروفة)
  projects: string[];                          // أفكار مشاريع/أبحاث تخرج مناسبة
  books?: { name: string; note?: string }[];   // مراجع أساسية (حيث تُعرف فقط)
  aiTools: { name: string; note?: string }[];  // أدوات ذكاء اصطناعي مفيدة للتخصص
  salary?: { entrySar: string; note?: string }; // مدى راتب مبتدئ استرشادي (نص تقريبي)
  careerPaths: string[];                       // المسارات الوظيفية داخل التخصص
}

/* ملاحظة موحّدة للرواتب — تمنع أي إيحاء بأنها أرقام قاطعة */
const SALARY_NOTE = "استرشادي تقريبي — يختلف حسب الجهة والخبرة والمدينة";

/* ════════ عوالم التخصصات الـ19 (المعرّفات تطابق MAJORS عدا «other») ════════ */
export const MAJOR_WORLDS: MajorWorld[] = [
  /* ─── صحي ─── */
  {
    id: "medicine",
    programs: [
      { name: "UpToDate", note: "مرجع سريري محدّث" },
      { name: "AMBOSS" },
      { name: "Osmosis" },
      { name: "Anki", note: "بطاقات تكرار متباعد للحفظ" },
      { name: "Complete Anatomy", note: "أطلس تشريح تفاعلي" },
    ],
    certs: [
      { name: "الرخصة السعودية للمهنيين الصحيين (SMLE)" },
      { name: "تصنيف الهيئة السعودية للتخصصات الصحية (SCFHS)" },
      { name: "BLS", note: "الإنعاش القلبي الأساسي" },
      { name: "ACLS", note: "دعم الحياة القلبي المتقدم" },
      { name: "USMLE", note: "للراغبين بالتدريب في الخارج" },
    ],
    companies: [
      "مستشفى الملك فيصل التخصصي", "وزارة الصحة والتجمعات الصحية",
      "الشؤون الصحية بالحرس الوطني", "مدينة الملك عبدالله الطبية",
      "مستشفيات أرامكو الطبية", "دله الصحية", "مجموعة المواساة", "السعودي الألماني",
    ],
    projects: [
      "بحث سريري عن انتشار مرض مزمن في المجتمع",
      "مراجعة منهجية لبروتوكول علاجي",
      "دراسة حالة سريرية موثّقة",
      "بحث في وبائيات مرض شائع محلياً",
    ],
    books: [
      { name: "Guyton and Hall", note: "فسيولوجيا" },
      { name: "Gray's Anatomy", note: "تشريح" },
      { name: "Robbins", note: "الباثولوجيا" },
      { name: "Harrison's", note: "الباطنة" },
    ],
    aiTools: [
      { name: "مساعد محادثة عام", note: "لشرح المفاهيم المعقّدة" },
      { name: "Consensus", note: "بحث مدعوم بأدلة علمية" },
      { name: "أدوات تلخيص المحاضرات والمراجع" },
    ],
    salary: { entrySar: "10,000–15,000 ريال/شهر (طبيب عام/مقيم مبتدئ)", note: SALARY_NOTE },
    careerPaths: [
      "طبيب مقيم ثم أخصائي", "التخصص الدقيق (باطنة/جراحة/أطفال...)",
      "الطب الأكاديمي والبحثي", "الصحة العامة", "إدارة المنشآت الصحية",
    ],
  },
  {
    id: "dentistry",
    programs: [
      { name: "Exocad", note: "تصميم تعويضات رقمي" },
      { name: "CEREC", note: "CAD/CAM لطب الأسنان" },
      { name: "برامج الأشعة الرقمية", note: "RVG / بانوراما" },
      { name: "Dentrix / Open Dental", note: "إدارة العيادات" },
    ],
    certs: [
      { name: "الرخصة السعودية لطب الأسنان (SCFHS)" },
      { name: "تصنيف الهيئة السعودية للتخصصات الصحية" },
      { name: "BLS" },
      { name: "البورد السعودي لطب الأسنان", note: "لمسار التخصص" },
    ],
    companies: [
      "وزارة الصحة والمستشفيات الحكومية", "الشؤون الصحية بالقطاعات العسكرية",
      "مجمعات ومراكز الأسنان الخاصة", "العيادات الخاصة", "كليات طب الأسنان",
    ],
    projects: [
      "بحث في انتشار تسوّس الأسنان لدى الأطفال",
      "دراسة عن أمراض اللثة وعوامل خطرها",
      "تقييم نتائج تقنية علاجية أو مادة حشو",
    ],
    aiTools: [
      { name: "مساعد محادثة عام", note: "لشرح المفاهيم السريرية" },
      { name: "أدوات تلخيص المراجع والمحاضرات" },
    ],
    salary: { entrySar: "10,000–15,000 ريال/شهر (طبيب أسنان عام)", note: SALARY_NOTE },
    careerPaths: [
      "طبيب أسنان عام", "التخصص (تقويم/جراحة فم/لبّية/تعويضات)",
      "العيادات والمراكز الخاصة", "الطب الأكاديمي والبحثي",
    ],
  },
  {
    id: "pharmacy",
    programs: [
      { name: "Lexicomp", note: "مرجع أدوية" },
      { name: "Micromedex", note: "تفاعلات دوائية" },
      { name: "Medscape" },
      { name: "أنظمة صرف ومخزون الأدوية", note: "Pharmacy Management" },
      { name: "UpToDate" },
    ],
    certs: [
      { name: "الرخصة السعودية للصيادلة (SPLE)" },
      { name: "تصنيف الهيئة السعودية للتخصصات الصحية" },
      { name: "BLS" },
      { name: "BPS", note: "شهادة تخصّص علاجي متقدمة" },
    ],
    companies: [
      "الهيئة العامة للغذاء والدواء (SFDA)", "وزارة الصحة والمستشفيات",
      "صيدليات النهدي", "صيدليات الدواء", "سبيماكو (SPIMACO)",
      "تبوك للصناعات الدوائية", "جمجوم فارما", "شركات الأدوية العالمية (Pfizer, GSK)",
    ],
    projects: [
      "تقييم صيغة دوائية أو ثباتها",
      "دراسة الالتزام الدوائي لدى المرضى",
      "بحث في التفاعلات الدوائية الشائعة",
      "تقييم استخدام مضادات حيوية في مستشفى",
    ],
    books: [
      { name: "Katzung", note: "فارماكولوجيا" },
      { name: "Goodman & Gilman", note: "الأساس الدوائي للعلاج" },
    ],
    aiTools: [
      { name: "مساعد محادثة عام", note: "لشرح آليات الأدوية" },
      { name: "أدوات تلخيص المراجع الدوائية" },
      { name: "Consensus", note: "بحث مدعوم بأدلة" },
    ],
    salary: { entrySar: "8,000–13,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "صيدلي مجتمعي (صيدليات)", "صيدلي سريري (مستشفيات)",
      "صناعة الأدوية والرقابة الدوائية", "التسجيل الدوائي في SFDA", "البحث والتطوير",
    ],
  },
  {
    id: "nursing",
    programs: [
      { name: "أنظمة السجلات الصحية الإلكترونية (EHR)" },
      { name: "مراجع الأدوية السريرية", note: "Medscape / Lexicomp" },
      { name: "أدوات التوثيق التمريضي" },
    ],
    certs: [
      { name: "تصنيف الهيئة السعودية للتخصصات الصحية", note: "رخصة مزاولة التمريض" },
      { name: "BLS" },
      { name: "ACLS" },
      { name: "شهادة مكافحة العدوى (IPC)" },
    ],
    companies: [
      "وزارة الصحة والتجمعات الصحية", "مستشفى الملك فيصل التخصصي",
      "المدن الطبية", "الشؤون الصحية بالحرس الوطني",
      "المستشفيات الخاصة (دله, المواساة)", "هيئة الهلال الأحمر السعودي",
    ],
    projects: [
      "تقييم رضا المرضى عن الخدمة التمريضية",
      "دراسة عن الوقاية من قرح الفراش",
      "بحث في ضغط العمل وأثره على جودة الرعاية",
      "برنامج تثقيف صحي لفئة من المرضى",
    ],
    aiTools: [
      { name: "مساعد محادثة عام", note: "لشرح الإجراءات والمفاهيم" },
      { name: "أدوات تلخيص المحاضرات والمراجع" },
    ],
    salary: { entrySar: "6,000–10,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "التمريض السريري بالأقسام", "العناية المركزة والطوارئ",
      "تمريض العمليات والتخدير", "الإشراف والإدارة التمريضية", "تعليم التمريض",
    ],
  },
  {
    id: "applied-medical",
    programs: [
      { name: "أنظمة معلومات المختبرات (LIS)" },
      { name: "أنظمة أرشفة الصور الطبية (PACS/RIS)" },
      { name: "أدوات التحليل الإحصائي الصحي" },
    ],
    certs: [
      { name: "تصنيف الهيئة السعودية للتخصصات الصحية" },
      { name: "BLS" },
      { name: "شهادات تخصصية حسب المسار", note: "مختبرات/أشعة/تأهيل" },
    ],
    companies: [
      "وزارة الصحة والمستشفيات", "مختبرات طبية خاصة (البرج, الفارابي)",
      "مراكز الأشعة والتأهيل", "المدن الطبية", "المستشفيات العسكرية",
    ],
    projects: [
      "دراسة ضبط جودة في مختبر طبي",
      "تقييم جرعات الأشعة وسلامتها",
      "برنامج تأهيل حركي لحالة مرضية",
    ],
    aiTools: [
      { name: "مساعد محادثة عام", note: "لشرح التقنيات والمفاهيم" },
      { name: "أدوات تلخيص المراجع والمحاضرات" },
    ],
    salary: { entrySar: "6,000–10,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "أخصائي مختبرات طبية", "تقنية الأشعة والتصوير الطبي",
      "العلاج الطبيعي والتأهيل", "العلاج التنفسي", "الصحة العامة والمعلوماتية الصحية",
    ],
  },

  /* ─── حاسب ─── */
  {
    id: "cs",
    programs: [
      { name: "VS Code", note: "محرّر أكواد" },
      { name: "Git / GitHub" },
      { name: "Python" },
      { name: "Java" },
      { name: "قواعد بيانات SQL" },
      { name: "Linux" },
      { name: "Docker" },
    ],
    certs: [
      { name: "AWS Certified Solutions Architect" },
      { name: "Google Cloud / Azure Fundamentals" },
      { name: "Oracle Certified Java" },
      { name: "CCNA", note: "أساسيات الشبكات" },
      { name: "Google Data Analytics" },
    ],
    companies: [
      "stc", "علم (Elm)", "أرامكو الرقمية", "SDAIA",
      "Google", "Microsoft", "Amazon (AWS)", "نيوم", "البنوك والشركات التقنية",
    ],
    projects: [
      "تطبيق ويب متكامل (Full-stack)",
      "نظام إدارة قاعدة بيانات",
      "تطبيق جوال",
      "تنفيذ خوارزمية أو محرّك بحث مصغّر",
    ],
    books: [
      { name: "Introduction to Algorithms (CLRS)" },
      { name: "Clean Code" },
      { name: "Structure and Interpretation of Computer Programs" },
    ],
    aiTools: [
      { name: "GitHub Copilot", note: "إكمال الأكواد" },
      { name: "مساعد محادثة برمجي عام" },
      { name: "أدوات شرح وتصحيح الأكواد" },
    ],
    salary: { entrySar: "8,000–14,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "تطوير البرمجيات", "علم البيانات", "هندسة الشبكات والأنظمة",
      "الحوسبة السحابية", "البحث الأكاديمي",
    ],
  },
  {
    id: "swe",
    programs: [
      { name: "VS Code" },
      { name: "Git / GitHub" },
      { name: "Docker" },
      { name: "Jira", note: "إدارة المهام" },
      { name: "أنظمة CI/CD", note: "Jenkins / GitHub Actions" },
      { name: "أطر الاختبار الآلي" },
    ],
    certs: [
      { name: "ISTQB", note: "اختبار البرمجيات" },
      { name: "Professional Scrum Master (PSM)" },
      { name: "AWS Certified Developer" },
      { name: "PMP", note: "إدارة المشاريع" },
    ],
    companies: [
      "stc", "علم (Elm)", "نون (noon)", "جاهز",
      "نيوم", "البنوك الرقمية", "Google", "Microsoft",
    ],
    projects: [
      "تطبيق بمعمارية خدمات مصغّرة (Microservices)",
      "نظام باختبارات آلية وخط CI/CD متكامل",
      "واجهة برمجية (API) موثّقة",
    ],
    books: [
      { name: "Clean Code" },
      { name: "The Pragmatic Programmer" },
      { name: "Design Patterns (GoF)" },
    ],
    aiTools: [
      { name: "GitHub Copilot", note: "إكمال الأكواد" },
      { name: "مساعد محادثة برمجي عام" },
      { name: "أدوات مراجعة وتوليد الاختبارات" },
    ],
    salary: { entrySar: "9,000–15,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "مطوّر واجهات أمامية/خلفية", "مهندس DevOps",
      "مهندس ضمان جودة (QA)", "معماري برمجيات", "إدارة المنتجات التقنية",
    ],
  },
  {
    id: "cybersec",
    programs: [
      { name: "Wireshark", note: "تحليل حركة الشبكات" },
      { name: "Metasploit", note: "اختبار الاختراق" },
      { name: "Burp Suite", note: "اختبار تطبيقات الويب" },
      { name: "Nmap", note: "مسح الشبكات" },
      { name: "Kali Linux" },
      { name: "Nessus", note: "فحص الثغرات" },
    ],
    certs: [
      { name: "CompTIA Security+" },
      { name: "Certified Ethical Hacker (CEH)" },
      { name: "OSCP", note: "اختبار اختراق عملي متقدم" },
      { name: "CISSP", note: "أمن معلومات قيادي" },
    ],
    companies: [
      "stc", "الهيئة الوطنية للأمن السيبراني (NCA)", "سايت (SITE)",
      "أرامكو", "البنوك السعودية", "نيوم",
    ],
    projects: [
      "بناء مختبر اختبار اختراق معزول",
      "نظام كشف تسلّل (IDS) مصغّر",
      "تحليل ثغرات تطبيق ويب وتقرير معالجتها",
      "مركز عمليات أمنية (SOC) تجريبي",
    ],
    books: [
      { name: "The Web Application Hacker's Handbook" },
      { name: "Hacking: The Art of Exploitation" },
    ],
    aiTools: [
      { name: "مساعد محادثة", note: "لتحليل السجلات وكتابة السكربتات" },
      { name: "أدوات تحليل الثغرات المدعومة بالذكاء الاصطناعي" },
    ],
    salary: { entrySar: "9,000–15,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "اختبار الاختراق (Penetration Testing)",
      "محلل مركز عمليات أمنية (SOC)",
      "الحوكمة والمخاطر والامتثال (GRC)",
      "الاستجابة للحوادث", "أمن التطبيقات",
    ],
  },
  {
    id: "ai",
    programs: [
      { name: "Python" },
      { name: "TensorFlow" },
      { name: "PyTorch" },
      { name: "Jupyter Notebook" },
      { name: "scikit-learn" },
      { name: "pandas / NumPy" },
    ],
    certs: [
      { name: "TensorFlow Developer Certificate" },
      { name: "AWS Certified Machine Learning" },
      { name: "DeepLearning.AI Specialization" },
      { name: "Azure AI Engineer" },
    ],
    companies: [
      "SDAIA (الهيئة السعودية للبيانات والذكاء الاصطناعي)", "نيوم (Tonomus)",
      "أرامكو", "stc", "Google", "شركات الذكاء الاصطناعي الناشئة",
    ],
    projects: [
      "نموذج تصنيف صور",
      "نظام توصية",
      "معالجة لغة طبيعية للعربية",
      "نموذج تنبؤ من بيانات واقعية",
    ],
    books: [
      { name: "Deep Learning (Goodfellow)" },
      { name: "Hands-On Machine Learning (Géron)" },
      { name: "Pattern Recognition and Machine Learning (Bishop)" },
    ],
    aiTools: [
      { name: "Hugging Face", note: "نماذج ومجموعات بيانات مفتوحة" },
      { name: "Google Colab" },
      { name: "مساعد إكمال الأكواد" },
    ],
    salary: { entrySar: "10,000–16,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "مهندس تعلّم آلي", "عالم بيانات", "هندسة البيانات",
      "معالجة اللغة/الرؤية الحاسوبية", "البحث في الذكاء الاصطناعي",
    ],
  },
  {
    id: "is",
    programs: [
      { name: "قواعد بيانات SQL" },
      { name: "Microsoft Excel المتقدم" },
      { name: "Power BI" },
      { name: "أنظمة تخطيط الموارد", note: "SAP / ERP" },
      { name: "أدوات نمذجة العمليات" },
    ],
    certs: [
      { name: "ITIL", note: "إدارة خدمات تقنية المعلومات" },
      { name: "Google Data Analytics" },
      { name: "CompTIA Project+" },
      { name: "شهادات SAP" },
    ],
    companies: [
      "البنوك والشركات الكبرى (إدارات تقنية المعلومات)", "stc", "علم (Elm)",
      "الجهات الحكومية", "شركات حلول الأعمال (SAP/Oracle)",
    ],
    projects: [
      "نظام معلومات إداري متكامل",
      "لوحة مؤشرات أعمال (BI Dashboard)",
      "تحليل وأتمتة عملية إدارية",
      "نظام إدارة موارد لجهة",
    ],
    aiTools: [
      { name: "مساعد محادثة عام" },
      { name: "أدوات تحليل البيانات المدعومة بالذكاء الاصطناعي" },
      { name: "مولّدات استعلامات SQL" },
    ],
    salary: { entrySar: "7,000–12,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "محلل نظم/أعمال", "إدارة قواعد البيانات", "إدارة المشاريع التقنية",
      "حوكمة تقنية المعلومات", "ذكاء الأعمال",
    ],
  },

  /* ─── هندسي ─── */
  {
    id: "ee",
    programs: [
      { name: "AutoCAD Electrical" },
      { name: "ETAP", note: "تحليل أنظمة القوى" },
      { name: "MATLAB / Simulink" },
      { name: "Proteus", note: "محاكاة الدوائر" },
      { name: "برمجة المتحكّمات (PLC)" },
    ],
    certs: [
      { name: "FE", note: "أساسيات الهندسة" },
      { name: "عضوية الهيئة السعودية للمهندسين" },
      { name: "PMP" },
      { name: "شهادات Schneider / Siemens" },
    ],
    companies: [
      "أرامكو", "سابك", "الشركة السعودية للكهرباء (SEC)", "نيوم", "معادن",
      "مرافق", "ABB", "Siemens", "Schneider", "الفنار",
    ],
    projects: [
      "تصميم شبكة توزيع كهربائي",
      "نظام طاقة شمسية كهروضوئية",
      "نظام تحكّم آلي بـ PLC",
      "دراسة كفاءة الطاقة لمنشأة",
    ],
    books: [
      { name: "Fundamentals of Electric Circuits (Sadiku)" },
      { name: "Electric Machinery (Fitzgerald)" },
    ],
    aiTools: [
      { name: "مساعد محادثة هندسي عام" },
      { name: "مساعد حساب رمزي وحل معادلات" },
      { name: "أدوات شرح المسائل العلمية خطوة بخطوة" },
    ],
    salary: { entrySar: "8,000–14,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "مهندس قوى", "أنظمة تحكّم", "طاقة متجددة", "صيانة", "مشاريع",
    ],
  },
  {
    id: "me",
    programs: [
      { name: "AutoCAD" },
      { name: "SolidWorks", note: "نمذجة ثلاثية الأبعاد" },
      { name: "ANSYS", note: "تحليل العناصر المحدودة" },
      { name: "CATIA" },
      { name: "MATLAB" },
    ],
    certs: [
      { name: "FE", note: "أساسيات الهندسة" },
      { name: "عضوية الهيئة السعودية للمهندسين" },
      { name: "شهادة SolidWorks (CSWA/CSWP)" },
      { name: "PMP" },
    ],
    companies: [
      "أرامكو", "سابك", "معادن", "نيوم",
      "الشركات الصناعية والتصنيعية", "GE", "Siemens Energy",
    ],
    projects: [
      "تصميم آلة أو جهاز ميكانيكي",
      "نظام تكييف وتبريد (HVAC)",
      "دراسة تحليل إجهادات لقطعة",
      "ذراع آلي أو نظام ميكاترونكس",
    ],
    books: [
      { name: "Shigley's Mechanical Engineering Design" },
      { name: "Thermodynamics (Çengel)" },
    ],
    aiTools: [
      { name: "مساعد محادثة هندسي عام" },
      { name: "مساعد حساب رمزي وحل معادلات" },
      { name: "أدوات شرح المسائل العلمية" },
    ],
    salary: { entrySar: "8,000–14,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "التصميم الميكانيكي", "الأنظمة الحرارية والتبريد (HVAC)",
      "الإنتاج والتصنيع", "الصيانة", "مشاريع الطاقة",
    ],
  },
  {
    id: "ce",
    programs: [
      { name: "AutoCAD / Civil 3D" },
      { name: "Revit", note: "نمذجة معلومات البناء (BIM)" },
      { name: "SAP2000 / ETABS", note: "تحليل إنشائي" },
      { name: "STAAD.Pro" },
      { name: "Primavera P6", note: "جدولة المشاريع" },
    ],
    certs: [
      { name: "FE", note: "أساسيات الهندسة" },
      { name: "عضوية الهيئة السعودية للمهندسين" },
      { name: "PMP" },
      { name: "Primavera P6" },
      { name: "LEED", note: "المباني الخضراء" },
    ],
    companies: [
      "نيوم", "روشن (ROSHN)", "البحر الأحمر", "أرامكو",
      "وزارة الشؤون البلدية والإسكان", "شركات المقاولات الكبرى", "Bechtel",
    ],
    projects: [
      "تصميم منشأ خرساني مسلّح",
      "دراسة تصميم طريق أو جسر",
      "نظام شبكات صرف ومياه",
      "خطة إدارة مشروع إنشائي",
    ],
    books: [
      { name: "Structural Analysis (Hibbeler)" },
      { name: "Design of Reinforced Concrete" },
    ],
    aiTools: [
      { name: "مساعد محادثة هندسي عام" },
      { name: "أدوات حساب الكميات والتقدير" },
      { name: "مساعد شرح المسائل الإنشائية" },
    ],
    salary: { entrySar: "7,000–13,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "الهندسة الإنشائية", "إدارة مشاريع الإنشاء", "هندسة الطرق والنقل",
      "الهندسة الجيوتقنية", "هندسة المياه والبيئة",
    ],
  },
  {
    id: "industrial",
    programs: [
      { name: "Minitab", note: "تحليل الجودة والإحصاء" },
      { name: "Arena", note: "محاكاة العمليات" },
      { name: "Microsoft Excel المتقدم", note: "Solver" },
      { name: "أنظمة ERP" },
      { name: "MATLAB" },
    ],
    certs: [
      { name: "Lean Six Sigma", note: "الحزام الأخضر/الأسود" },
      { name: "PMP" },
      { name: "FE", note: "أساسيات الهندسة" },
      { name: "عضوية الهيئة السعودية للمهندسين" },
      { name: "CSCP", note: "سلاسل الإمداد" },
    ],
    companies: [
      "أرامكو", "سابك", "الشركات الصناعية والمصانع",
      "الشركات اللوجستية (أرامكس, سبل)", "نيوم", "أمازون",
    ],
    projects: [
      "تحسين خط إنتاج وزيادة إنتاجيته",
      "دراسة كفاءة عملية تشغيلية",
      "نظام إدارة مخزون وسلسلة إمداد",
      "نمذجة محاكاة لطابور خدمة",
    ],
    aiTools: [
      { name: "مساعد محادثة عام" },
      { name: "أدوات تحليل البيانات وتحسين العمليات" },
      { name: "مساعد حساب رمزي وإحصائي" },
    ],
    salary: { entrySar: "8,000–13,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "تحسين العمليات والجودة", "إدارة سلاسل الإمداد واللوجستيات",
      "هندسة الإنتاج", "إدارة المشاريع", "تخطيط العمليات",
    ],
  },

  /* ─── إداري ─── */
  {
    id: "business",
    programs: [
      { name: "Microsoft Excel المتقدم" },
      { name: "PowerPoint" },
      { name: "Power BI" },
      { name: "أنظمة ERP", note: "SAP" },
      { name: "أدوات إدارة المشاريع", note: "Trello / Asana" },
    ],
    certs: [
      { name: "PMP", note: "إدارة المشاريع" },
      { name: "Lean Six Sigma" },
      { name: "Google Data Analytics" },
      { name: "CIPD", note: "الموارد البشرية" },
    ],
    companies: [
      "البنوك السعودية", "شركات الاستشارات (McKinsey, BCG, Deloitte)",
      "أرامكو", "سابك", "نيوم", "الشركات الكبرى والناشئة",
    ],
    projects: [
      "خطة عمل لمشروع ناشئ",
      "دراسة جدوى اقتصادية",
      "تحليل سوق وتنافسية",
      "خطة تشغيلية أو إعادة هيكلة",
    ],
    books: [
      { name: "The Lean Startup (Eric Ries)" },
      { name: "Good to Great (Jim Collins)" },
    ],
    aiTools: [
      { name: "مساعد محادثة عام" },
      { name: "أدوات تحليل البيانات ولوحات المؤشرات" },
      { name: "أدوات تصميم العروض التقديمية" },
    ],
    salary: { entrySar: "5,000–9,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "إدارة العمليات", "الموارد البشرية", "إدارة المشاريع",
      "ريادة الأعمال", "الاستشارات الإدارية",
    ],
  },
  {
    id: "accounting",
    programs: [
      { name: "Microsoft Excel المتقدم" },
      { name: "SAP", note: "المحاسبة والمالية" },
      { name: "QuickBooks" },
      { name: "Zoho Books" },
      { name: "Oracle Financials" },
    ],
    certs: [
      { name: "زمالة الهيئة السعودية للمحاسبين (SOCPA)" },
      { name: "CMA", note: "محاسب إداري معتمد" },
      { name: "CPA", note: "محاسب قانوني معتمد" },
      { name: "CIA", note: "مدقق داخلي معتمد" },
    ],
    companies: [
      "المكاتب الأربعة الكبرى (PwC, Deloitte, EY, KPMG)", "البنوك السعودية",
      "هيئة الزكاة والضريبة والجمارك (ZATCA)", "الشركات الكبرى", "ديوان المراقبة العامة",
    ],
    projects: [
      "إعداد وتحليل قوائم مالية",
      "نظام محاسبة تكاليف",
      "دراسة تدقيق داخلي لعملية",
      "تحليل أثر ضريبة القيمة المضافة",
    ],
    books: [
      { name: "Intermediate Accounting (Kieso)" },
    ],
    aiTools: [
      { name: "مساعد محادثة عام" },
      { name: "أدوات تحليل البيانات المالية في Excel" },
      { name: "مساعد تدقيق وتلخيص المستندات" },
    ],
    salary: { entrySar: "5,000–8,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "المحاسبة المالية", "التدقيق والمراجعة", "المحاسبة الإدارية والتكاليف",
      "الضرائب والزكاة", "المحاسبة الحكومية",
    ],
  },
  {
    id: "finance",
    programs: [
      { name: "Microsoft Excel المتقدم", note: "النمذجة المالية" },
      { name: "Bloomberg Terminal" },
      { name: "Power BI" },
      { name: "أنظمة التداول والتحليل المالي" },
    ],
    certs: [
      { name: "CFA", note: "محلل مالي معتمد" },
      { name: "FRM", note: "إدارة المخاطر المالية" },
      { name: "CME-1", note: "رخصة هيئة السوق المالية" },
      { name: "CMA" },
    ],
    companies: [
      "البنوك السعودية", "صندوق الاستثمارات العامة (PIF)", "شركة تداول السعودية",
      "هيئة السوق المالية (CMA)", "البنك المركزي (SAMA)", "شركات الاستثمار والوساطة",
    ],
    projects: [
      "نموذج تقييم شركة (DCF)",
      "تحليل وبناء محفظة استثمارية",
      "دراسة مخاطر مالية",
      "خطة تمويل مشروع",
    ],
    books: [
      { name: "Corporate Finance (Ross/Westerfield)" },
      { name: "The Intelligent Investor (Graham)" },
    ],
    aiTools: [
      { name: "مساعد محادثة عام" },
      { name: "أدوات تحليل البيانات المالية والنمذجة" },
      { name: "مساعد بحث وتلخيص التقارير المالية" },
    ],
    salary: { entrySar: "6,000–11,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "التحليل المالي", "إدارة المحافظ والاستثمار", "إدارة المخاطر",
      "التمويل المؤسسي", "الخزينة والمصرفية",
    ],
  },
  {
    id: "marketing",
    programs: [
      { name: "Google Analytics" },
      { name: "منصات الإعلانات", note: "Google Ads / Meta Ads" },
      { name: "أنظمة إدارة العملاء", note: "CRM / HubSpot" },
      { name: "Canva" },
      { name: "أدوات تحسين محركات البحث (SEO)" },
    ],
    certs: [
      { name: "شهادات Google (Ads / Analytics)" },
      { name: "Meta Blueprint" },
      { name: "HubSpot Content Marketing" },
      { name: "شهادات التسويق الرقمي" },
    ],
    companies: [
      "وكالات الإعلان والتسويق الرقمي", "المتاجر الإلكترونية (نون, جرير)",
      "الشركات الكبرى (إدارات التسويق)", "شركات التقنية والناشئة",
    ],
    projects: [
      "حملة تسويق رقمي متكاملة",
      "دراسة سلوك مستهلك",
      "خطة بناء علامة تجارية",
      "تحليل أداء حملة إعلانية بالبيانات",
    ],
    books: [
      { name: "Marketing Management (Philip Kotler)" },
    ],
    aiTools: [
      { name: "أدوات توليد المحتوى التسويقي" },
      { name: "أدوات التصميم بالذكاء الاصطناعي" },
      { name: "أدوات تحليل بيانات الحملات" },
    ],
    salary: { entrySar: "5,000–9,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "التسويق الرقمي", "إدارة العلامة التجارية",
      "تسويق المحتوى ووسائل التواصل", "بحوث التسويق", "إدارة المنتج",
    ],
  },

  /* ─── قانوني ─── */
  {
    id: "law",
    programs: [
      { name: "البوابات النظامية الرسمية", note: "نظام «معين» / هيئة الخبراء" },
      { name: "منصات البحث القانوني والسوابق" },
      { name: "أدوات إدارة القضايا والعقود" },
      { name: "أدوات مراجعة الوثائق (PDF)" },
    ],
    certs: [
      { name: "قيد وترخيص الهيئة السعودية للمحامين" },
      { name: "شهادة التحكيم التجاري" },
      { name: "شهادة الالتزام والامتثال (Compliance)" },
      { name: "CAMS", note: "مكافحة غسل الأموال" },
    ],
    companies: [
      "مكاتب المحاماة", "الإدارات القانونية في الشركات والبنوك", "وزارة العدل",
      "النيابة العامة", "ديوان المظالم", "هيئة الخبراء بمجلس الوزراء",
    ],
    projects: [
      "بحث قانوني في نظام معيّن (عمل/تجاري)",
      "دراسة نظامية مقارنة",
      "صياغة نموذج عقد متكامل",
      "مذكرة قانونية في قضية افتراضية",
    ],
    aiTools: [
      { name: "مساعد محادثة عام", note: "للبحث النظامي وشرح المفاهيم" },
      { name: "أدوات تلخيص ومراجعة الوثائق" },
      { name: "مساعد صياغة المسودات", note: "بمراجعة بشرية دائماً" },
    ],
    salary: { entrySar: "5,000–9,000 ريال/شهر", note: SALARY_NOTE },
    careerPaths: [
      "المحاماة والترافع", "المستشار القانوني للشركات", "الالتزام والامتثال",
      "القضاء والنيابة (بعد التأهيل)", "التحكيم وتسوية المنازعات",
    ],
  },
];

/* ════════ الفهرس والدوال النقية ════════ */

/* فهرس داخلي للبحث السريع (يُبنى مرة واحدة) */
const WORLD_INDEX: Map<string, MajorWorld> = new Map(MAJOR_WORLDS.map((w) => [w.id, w]));

/* عالم احتياطي عام آمن — يُعاد لـ«other» ولأي معرّف مجهول (لا يُرمى استثناء أبداً).
   محتوى محايد ينفع أي تخصص لم يُعرَّف له عالم دقيق بعد. */
const FALLBACK_WORLD: MajorWorld = {
  id: "other",
  programs: [
    { name: "حزمة مكتب (Word / Excel / PowerPoint)" },
    { name: "أدوات إدارة المهام والمشاريع" },
    { name: "أدوات تدوين وتنظيم الملاحظات" },
  ],
  certs: [
    { name: "IELTS / TOEFL", note: "إثبات اللغة الإنجليزية" },
    { name: "ICDL", note: "المهارات الرقمية الأساسية" },
    { name: "PMP", note: "إدارة المشاريع" },
  ],
  companies: [
    "الجهات الحكومية", "الشركات الكبرى", "القطاع الخاص", "الشركات الناشئة",
  ],
  projects: [
    "مشروع تخرج بحثي في مجال تخصصك",
    "دراسة تطبيقية لمشكلة واقعية",
    "حل عملي بأدوات تخصصك الأساسية",
  ],
  aiTools: [
    { name: "مساعد محادثة عام", note: "لشرح المفاهيم" },
    { name: "أدوات تلخيص المستندات" },
    { name: "مساعد كتابة وتدقيق لغوي" },
  ],
  salary: { entrySar: "5,000–8,000 ريال/شهر", note: SALARY_NOTE },
  careerPaths: [
    "التوظيف في مجال التخصص", "الدراسات العليا",
    "ريادة الأعمال", "التدريب والتطوير المهني",
  ],
};

/* هل للتخصص عالمٌ دقيق مُعرَّف؟ («other» والمجهول = false — يستعملان الاحتياطي) */
export function hasMajorWorld(id?: string | null): boolean {
  return !!id && WORLD_INDEX.has(id);
}

/* عالم التخصص — يُعيد العالم الدقيق إن وُجد وإلا الاحتياطي العام (لا يرمي أبداً) */
export function getMajorWorld(id?: string | null): MajorWorld {
  return (id ? WORLD_INDEX.get(id) : undefined) ?? FALLBACK_WORLD;
}
