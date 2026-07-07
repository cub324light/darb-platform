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

/* ════════ الربط: من المادة إلى الوظيفة (لا معلومة معزولة) ════════
   نواة رؤية «كل شيء يقود إلى الذي بعده»: لكل تخصص موادُّه الأساسية كما تُدرَّس
   فعلاً، ولكل مادة أداتها التي تتقنها بها، وناتجها الملموس، والدور الذي تقود
   إليه. تُقرأ الجهة (أبرز شركة) والشهادة (أول شهادة) من عالم التخصص نفسه؛ فتكتمل
   السلسلة: مادة → أداة → مشروع → جهة → شهادة → دور. كلٌّ مرتبط بالذي بعده. */
export interface SubjectLink {
  subject: string; // المادة كما تُدرَّس
  via: string;     // البرنامج/الأداة التي تتقنها بها (من برامج التخصص نفسه)
  builds: string;  // ناتج/مشروع ملموس تصنعه بها
  role: string;    // الدور الوظيفي الذي تقود إليه هذه المادة
}

/* مواد كل تخصص الأساسية — معرّفات تطابق MAJOR_WORLDS. via من برامج التخصص نفسه
   (يحفظ العزل: مواد الكهرباء تشير لـ ETAP لا لـ Wireshark، والعكس). */
const CORE_SUBJECTS: Record<string, SubjectLink[]> = {
  /* ─── صحي ─── */
  medicine: [
    { subject: "علم التشريح", via: "Complete Anatomy", builds: "أطلس تشريحي تفاعلي لجهاز في الجسم", role: "طبيب" },
    { subject: "علم الأدوية", via: "UpToDate", builds: "جدول تفاعلات دوائية لحالة سريرية", role: "طبيب سريري" },
    { subject: "علم الأمراض", via: "AMBOSS", builds: "دراسة حالة مرضية موثّقة", role: "أخصائي" },
    { subject: "المهارات السريرية", via: "Anki", builds: "بطاقات تشخيص تفريقي", role: "طبيب مقيم" },
  ],
  dentistry: [
    { subject: "تعويضات الأسنان", via: "Exocad", builds: "تصميم تاج/جسر رقمي", role: "أخصائي تعويضات" },
    { subject: "أشعة الأسنان", via: "برامج الأشعة الرقمية", builds: "قراءة بانوراما وتشخيص", role: "طبيب أسنان" },
    { subject: "طب الأسنان الوقائي", via: "Dentrix / Open Dental", builds: "خطة علاجية لمريض", role: "طبيب أسنان عام" },
  ],
  pharmacy: [
    { subject: "علم الأدوية السريري", via: "Lexicomp", builds: "مراجعة دوائية لحالة", role: "صيدلي سريري" },
    { subject: "التفاعلات الدوائية", via: "Micromedex", builds: "تقرير تفاعلات لمريض متعدّد الأدوية", role: "صيدلي مستشفى" },
    { subject: "الصيدلة المجتمعية", via: "أنظمة صرف ومخزون الأدوية", builds: "خطة صرف وإرشاد للمريض", role: "صيدلي مجتمعي" },
  ],
  nursing: [
    { subject: "التمريض السريري", via: "أنظمة السجلات الصحية الإلكترونية (EHR)", builds: "خطة رعاية تمريضية لمريض", role: "ممرض سريري" },
    { subject: "العناية المركزة", via: "مراجع الأدوية السريرية", builds: "بروتوكول متابعة حالة حرجة", role: "ممرض عناية مركزة" },
    { subject: "مكافحة العدوى", via: "أدوات التوثيق التمريضي", builds: "خطة مكافحة عدوى لقسم", role: "مشرف مكافحة عدوى" },
  ],
  "applied-medical": [
    { subject: "علم المختبرات", via: "أنظمة معلومات المختبرات (LIS)", builds: "دراسة ضبط جودة لمختبر", role: "أخصائي مختبرات" },
    { subject: "الأشعة والتصوير الطبي", via: "أنظمة أرشفة الصور الطبية (PACS/RIS)", builds: "تقييم جرعات وسلامة أشعة", role: "تقني أشعة" },
    { subject: "العلاج الطبيعي", via: "أدوات التحليل الإحصائي الصحي", builds: "برنامج تأهيل حركي لحالة", role: "أخصائي علاج طبيعي" },
  ],

  /* ─── حاسب ─── */
  cs: [
    { subject: "هياكل البيانات والخوارزميات", via: "Python", builds: "محرّك بحث مصغّر", role: "مطوّر برمجيات" },
    { subject: "قواعد البيانات", via: "قواعد بيانات SQL", builds: "نظام إدارة قاعدة بيانات", role: "مهندس بيانات" },
    { subject: "أنظمة التشغيل والشبكات", via: "Linux", builds: "خدمة خلفية موزّعة", role: "مهندس أنظمة" },
    { subject: "تطوير الويب", via: "Git / GitHub", builds: "تطبيق ويب متكامل (Full-stack)", role: "مطوّر Full-stack" },
  ],
  swe: [
    { subject: "هندسة المتطلبات", via: "Jira", builds: "وثيقة متطلبات ونماذج أولية", role: "محلل نظم" },
    { subject: "بناء البرمجيات", via: "Docker", builds: "تطبيق بمعمارية خدمات مصغّرة", role: "مطوّر خلفي" },
    { subject: "اختبار البرمجيات", via: "أطر الاختبار الآلي", builds: "مجموعة اختبارات آلية لمشروع", role: "مهندس ضمان جودة (QA)" },
    { subject: "التكامل المستمر", via: "أنظمة CI/CD", builds: "خط CI/CD متكامل", role: "مهندس DevOps" },
  ],
  cybersec: [
    { subject: "أمن الشبكات", via: "Wireshark", builds: "تحليل حركة شبكة واكتشاف اختراق", role: "محلل مركز عمليات أمنية (SOC)" },
    { subject: "اختبار الاختراق", via: "Metasploit", builds: "مختبر اختبار اختراق معزول", role: "مختبر اختراق" },
    { subject: "أمن تطبيقات الويب", via: "Burp Suite", builds: "تقرير ثغرات تطبيق ومعالجتها", role: "مهندس أمن تطبيقات" },
    { subject: "الاستجابة للحوادث", via: "Kali Linux", builds: "محاكاة استجابة لحادث أمني", role: "محلل استجابة للحوادث" },
  ],
  ai: [
    { subject: "تعلّم الآلة", via: "scikit-learn", builds: "نموذج تنبؤ من بيانات واقعية", role: "مهندس تعلّم آلي" },
    { subject: "التعلّم العميق", via: "PyTorch", builds: "نموذج تصنيف صور", role: "باحث ذكاء اصطناعي" },
    { subject: "معالجة اللغة الطبيعية", via: "TensorFlow", builds: "معالج لغة طبيعية للعربية", role: "مهندس معالجة لغة" },
    { subject: "علم البيانات", via: "pandas / NumPy", builds: "لوحة تحليل بيانات", role: "عالم بيانات" },
  ],
  is: [
    { subject: "تحليل النظم", via: "أدوات نمذجة العمليات", builds: "نظام معلومات إداري متكامل", role: "محلل نظم" },
    { subject: "ذكاء الأعمال", via: "Power BI", builds: "لوحة مؤشرات أعمال (BI)", role: "محلل ذكاء أعمال" },
    { subject: "إدارة قواعد البيانات", via: "قواعد بيانات SQL", builds: "قاعدة بيانات وتقارير لجهة", role: "مدير قواعد بيانات" },
    { subject: "أنظمة تخطيط الموارد", via: "أنظمة تخطيط الموارد (SAP / ERP)", builds: "أتمتة عملية إدارية", role: "محلل ERP" },
  ],

  /* ─── هندسي ─── */
  ee: [
    { subject: "أنظمة القوى", via: "ETAP", builds: "تصميم شبكة توزيع كهربائي", role: "مهندس قوى" },
    { subject: "الإلكترونيات والدوائر", via: "Proteus", builds: "محاكاة وتصميم دائرة إلكترونية", role: "مهندس إلكترونيات" },
    { subject: "أنظمة التحكّم", via: "برمجة المتحكّمات (PLC)", builds: "نظام تحكّم آلي بـ PLC", role: "مهندس تحكّم" },
    { subject: "التصميم الكهربائي", via: "AutoCAD Electrical", builds: "مخطط كهربائي لمبنى", role: "مهندس تصميم كهربائي" },
  ],
  me: [
    { subject: "التصميم الميكانيكي", via: "SolidWorks", builds: "تصميم آلة أو جهاز ميكانيكي", role: "مهندس تصميم" },
    { subject: "تحليل العناصر المحدودة", via: "ANSYS", builds: "دراسة تحليل إجهادات لقطعة", role: "مهندس تحليل" },
    { subject: "الديناميكا الحرارية", via: "MATLAB", builds: "نظام تكييف وتبريد (HVAC)", role: "مهندس حراري" },
    { subject: "الرسم والنمذجة", via: "CATIA", builds: "نموذج تجميعي ثلاثي الأبعاد", role: "مهندس تصميم منتجات" },
  ],
  ce: [
    { subject: "التحليل الإنشائي", via: "SAP2000 / ETABS", builds: "تصميم منشأ خرساني مسلّح", role: "مهندس إنشائي" },
    { subject: "نمذجة معلومات البناء", via: "Revit", builds: "نموذج BIM لمبنى", role: "مهندس BIM" },
    { subject: "إدارة المشاريع الإنشائية", via: "Primavera P6", builds: "خطة إدارة مشروع إنشائي", role: "مدير مشاريع إنشاء" },
    { subject: "هندسة الطرق", via: "AutoCAD / Civil 3D", builds: "تصميم طريق أو جسر", role: "مهندس طرق ونقل" },
  ],
  industrial: [
    { subject: "تحسين العمليات والجودة", via: "Minitab", builds: "تحسين خط إنتاج وزيادة إنتاجيته", role: "مهندس تحسين" },
    { subject: "محاكاة الأنظمة", via: "Arena", builds: "نمذجة محاكاة لطابور خدمة", role: "مهندس محاكاة" },
    { subject: "إدارة سلاسل الإمداد", via: "أنظمة ERP", builds: "نظام إدارة مخزون وسلسلة إمداد", role: "مخطّط سلاسل إمداد" },
    { subject: "بحوث العمليات", via: "Microsoft Excel المتقدم", builds: "نموذج تحسين بـ Solver", role: "محلل عمليات" },
  ],

  /* ─── إداري ─── */
  business: [
    { subject: "الإدارة الاستراتيجية", via: "PowerPoint", builds: "خطة عمل لمشروع ناشئ", role: "مدير عمليات" },
    { subject: "تحليل الأعمال", via: "Power BI", builds: "تحليل سوق وتنافسية", role: "محلل أعمال" },
    { subject: "ريادة الأعمال", via: "أدوات إدارة المشاريع", builds: "دراسة جدوى اقتصادية", role: "رائد أعمال" },
    { subject: "إدارة الموارد البشرية", via: "أنظمة ERP", builds: "خطة إعادة هيكلة تنظيمية", role: "أخصائي موارد بشرية" },
  ],
  accounting: [
    { subject: "المحاسبة المالية", via: "SAP", builds: "إعداد وتحليل قوائم مالية", role: "محاسب مالي" },
    { subject: "محاسبة التكاليف", via: "Microsoft Excel المتقدم", builds: "نظام محاسبة تكاليف", role: "محاسب إداري" },
    { subject: "التدقيق والمراجعة", via: "Oracle Financials", builds: "دراسة تدقيق داخلي لعملية", role: "مدقق داخلي" },
    { subject: "الضرائب والزكاة", via: "QuickBooks", builds: "تحليل أثر ضريبة القيمة المضافة", role: "أخصائي ضرائب" },
  ],
  finance: [
    { subject: "التمويل المؤسسي", via: "Microsoft Excel المتقدم", builds: "نموذج تقييم شركة (DCF)", role: "محلل مالي" },
    { subject: "إدارة المحافظ والاستثمار", via: "Bloomberg Terminal", builds: "بناء وتحليل محفظة استثمارية", role: "مدير محافظ" },
    { subject: "إدارة المخاطر", via: "أنظمة التداول والتحليل المالي", builds: "دراسة مخاطر مالية", role: "محلل مخاطر" },
    { subject: "التحليل المالي", via: "Power BI", builds: "خطة تمويل مشروع", role: "محلل مالي" },
  ],
  marketing: [
    { subject: "التسويق الرقمي", via: "منصات الإعلانات (Google / Meta Ads)", builds: "حملة تسويق رقمي متكاملة", role: "أخصائي تسويق رقمي" },
    { subject: "تحليلات التسويق", via: "Google Analytics", builds: "تحليل أداء حملة إعلانية بالبيانات", role: "محلل تسويق" },
    { subject: "إدارة العلامة التجارية", via: "Canva", builds: "خطة بناء علامة تجارية", role: "مدير علامة تجارية" },
    { subject: "تحسين محركات البحث", via: "أدوات تحسين محركات البحث (SEO)", builds: "تحسين ظهور موقع في نتائج البحث", role: "أخصائي SEO" },
  ],

  /* ─── قانوني ─── */
  law: [
    { subject: "الأنظمة التجارية", via: "منصات البحث القانوني والسوابق", builds: "بحث قانوني في نظام تجاري", role: "مستشار قانوني" },
    { subject: "صياغة العقود", via: "أدوات إدارة القضايا والعقود", builds: "صياغة نموذج عقد متكامل", role: "صائغ عقود" },
    { subject: "الترافع والمرافعات", via: "البوابات النظامية الرسمية", builds: "مذكرة قانونية في قضية افتراضية", role: "محامٍ" },
    { subject: "الالتزام والامتثال", via: "أدوات مراجعة الوثائق (PDF)", builds: "سياسة امتثال لجهة", role: "أخصائي امتثال" },
  ],
};

/* مواد احتياطية عامة — لأي تخصص غير مُعرَّف (يبقى الربط حيّاً بلا تلفيق) */
const FALLBACK_SUBJECTS: SubjectLink[] = [
  { subject: "مواد تخصصك الأساسية", via: "أدوات تخصصك الأساسية", builds: "مشروع تطبيقي لمشكلة واقعية", role: "التوظيف في مجالك" },
  { subject: "مهارات البحث العلمي", via: "أدوات تدوين وتنظيم الملاحظات", builds: "دراسة تطبيقية لمشكلة", role: "باحث/متخصص" },
  { subject: "المهارات الرقمية", via: "حزمة مكتب (Word / Excel / PowerPoint)", builds: "تقرير احترافي أو عرض تقديمي", role: "التطوير المهني" },
];

/* عقدة في سلسلة الربط — كلٌّ يسلّم للذي بعده */
export interface FlowNode {
  kind: "subject" | "tool" | "project" | "company" | "cert" | "role";
  icon: string;
  lead: string;  // الجملة الرابطة قبل العنصر («تدرس»، «تتقنها بـ»...)
  label: string; // العنصر نفسه
}

/* سلسلة «من المادة إلى الوظيفة» لمادة واحدة */
export interface SubjectFlow {
  subject: string;
  nodes: FlowNode[];
}

/* أسماء المواد الأساسية للتخصص — لأزرار الاختيار (احتياطي عام إن غاب التخصص) */
export function coreSubjectsOf(id?: string | null): string[] {
  return (CORE_SUBJECTS[id ?? ""] ?? FALLBACK_SUBJECTS).map((s) => s.subject);
}

/* روابط المواد الكاملة للتخصص — يستهلكها محرّك الشبكة (graph.ts) لبناء الحواف
   (مادة↔أداة↔مشروع↔دور). احتياطي عام إن غاب التخصص، فلا تنقطع الشبكة أبداً. */
export function subjectLinksOf(id?: string | null): SubjectLink[] {
  return CORE_SUBJECTS[id ?? ""] ?? FALLBACK_SUBJECTS;
}

/* السلسلة المترابطة: مادة → أداة → مشروع → جهة → شهادة → دور.
   نقية تماماً (لا IO). الجهة والشهادة تُقرآن من عالم التخصص نفسه، فتبقى العُقد
   متّسقة مع أقسام الصفحة (نفس البيانات لا معلومة جديدة معزولة). */
export function subjectFlow(id?: string | null, subject?: string): SubjectFlow {
  const links = CORE_SUBJECTS[id ?? ""] ?? FALLBACK_SUBJECTS;
  const link = (subject && links.find((s) => s.subject === subject)) || links[0];
  const world = getMajorWorld(id);
  const company = world.companies[0];
  const cert = world.certs[0]?.name;

  const nodes: FlowNode[] = [
    { kind: "subject", icon: "📖", lead: "تدرس", label: link.subject },
    { kind: "tool", icon: "🧰", lead: "تتقنها بـ", label: link.via },
    { kind: "project", icon: "🚀", lead: "تبني بها", label: link.builds },
  ];
  if (company) nodes.push({ kind: "company", icon: "🏢", lead: "تشتغل بها في", label: company });
  if (cert) nodes.push({ kind: "cert", icon: "🎓", lead: "وتُثبِتها بشهادة", label: cert });
  nodes.push({ kind: "role", icon: "🎯", lead: "فتصير", label: link.role });

  return { subject: link.subject, nodes };
}
