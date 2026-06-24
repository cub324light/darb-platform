/* ─── مستقبلي الجامعي: مصدر الحقيقة الواحد للجامعات والتخصصات ───
   ملف بيانات نقي (لا يقرأ التخزين) — يستعمله العميل والخادم.

   ▸ هذا الملف هو نقطة التحديث الوحيدة للجامعات/التخصصات/المتطلبات.
     صُمّم ليُستبدَل مستقبلاً بمصدر بعيد (Firestore/لوحة إدارة) دون تغيير
     أي مستهلك: تكفي تعبئة UNIVERSITIES / MAJORS بنفس الشكل.

   ▸ كل المتطلبات إرشادية وتعليمية فقط — ليست شروط قبول رسمية. */

export type ReqLevel = "مرتفع" | "متوسط" | "منخفض" | "يفضّل مرتفع";
export type MajorCategory = "صحي" | "هندسي" | "حاسب" | "إداري" | "قانوني" | "عام";

/* مسار القبول — يحدّد أي معادلة موزونة تنطبق */
export type AdmissionTrack = "علمي" | "إنساني";

/* معادلة الموزونة: أوزان مئوية على الثانوية + القدرات + التحصيلي (مجموعها 100) */
export interface WeightedFormula {
  id: string;          // معرّف فريد داخل الجامعة
  label: string;       // وصف للعرض: «علمي» / «إنساني» / «علمي - طالبات» ...
  track: AdmissionTrack;
  highschool: number;  // وزن الثانوية (نسبة مئوية 0–100)
  qudurat: number;     // وزن القدرات
  tahsili: number;     // وزن التحصيلي
  note?: string;       // ملاحظة إضافية (شرط لغة إنجليزية، مقابلة...)
}

export interface UniversityOption {
  id: string;
  name: string;
  region?: string;
  kind?: "حكومية" | "أهلية";
  formulas?: WeightedFormula[];   // معادلات الموزونة الرسمية (إن توفّرت)
  colleges?: string[];            // الكليات المتاحة
  admissionNote?: string;         // ملاحظة قبول عامة (للأهلية غالباً)
}

/* متطلبات إرشادية لتخصص — أي حقل غير مذكور = غير حاسم */
export interface MajorRequirements {
  qudurat?: ReqLevel;   // القدرات
  tahsili?: ReqLevel;   // التحصيلي
  step?: ReqLevel;      // STEP (للمسارات التي تطلبه)
  gpa?: ReqLevel;       // المعدل التراكمي/الثانوي
}

export interface MajorOption {
  id: string;
  name: string;
  category: MajorCategory;
  requirements: MajorRequirements;
  /* المواد/الاختبارات الأهم لهذا التخصص — تُستعمل لتوجيه دويرب */
  focusHint?: string;
}

/* ════════ معادلات الموزونة الشائعة (تُعاد كقراءة فقط) ════════
   كل البيانات إرشادية وتعليمية — تتغيّر سنوياً؛ راجع موقع الجامعة الرسمي. */
const F_SCI: WeightedFormula = { id: "sci", label: "علمي / صحي", track: "علمي", highschool: 30, qudurat: 30, tahsili: 40 };
const F_HUM_5050: WeightedFormula = { id: "hum", label: "إنساني", track: "إنساني", highschool: 50, qudurat: 50, tahsili: 0 };
const F_HUM_4060: WeightedFormula = { id: "hum", label: "إنساني", track: "إنساني", highschool: 40, qudurat: 60, tahsili: 0 };
/* الأغلب الحكومي = علمي 30/30/40 + إنساني 50/50 */
const STD_GOV: WeightedFormula[] = [F_SCI, F_HUM_5050];

/* ════════ بيانات الجامعات (نقطة التحديث الوحيدة) ════════ */
export const UNIVERSITIES: UniversityOption[] = [
  /* ─── منطقة الرياض ─── */
  { id: "ksu", name: "جامعة الملك سعود", region: "الرياض", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "طب الأسنان", "الصيدلة", "العلوم الطبية التطبيقية", "التمريض", "الهندسة", "علوم الحاسب والمعلومات", "العمارة والتخطيط", "إدارة الأعمال", "الحقوق والعلوم السياسية", "اللغات والترجمة", "السياحة والآثار", "الآداب", "التربية", "العلوم", "علوم الأغذية والزراعة", "علوم الرياضة والنشاط البدني"] },
  { id: "imam", name: "جامعة الإمام محمد بن سعود الإسلامية", region: "الرياض", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الشريعة", "أصول الدين", "اللغة العربية", "الإعلام والاتصال", "اللغات والترجمة", "علوم الحاسب والمعلومات", "العلوم", "الطب", "الهندسة", "الاقتصاد والعلوم الإدارية", "العلوم الاجتماعية", "التربية"] },
  { id: "pnu", name: "جامعة الأميرة نورة بنت عبدالرحمن", region: "الرياض", kind: "حكومية",
    formulas: [F_SCI, { id: "hum", label: "إنساني", track: "إنساني", highschool: 50, qudurat: 25, tahsili: 25 }],
    colleges: ["الطب البشري", "طب الأسنان", "الصيدلة", "الصحة والتأهيل", "التمريض", "الهندسة", "علوم الحاسب والمعلومات", "الإدارة والأعمال", "العلوم", "التصاميم والفنون", "اللغات", "الآداب", "التربية", "الخدمة الاجتماعية"] },
  { id: "ksau", name: "جامعة الملك سعود للعلوم الصحية", region: "الرياض", kind: "حكومية",
    formulas: [{ id: "health", label: "صحي", track: "علمي", highschool: 30, qudurat: 30, tahsili: 40 }],
    colleges: ["الطب", "طب الأسنان", "الصيدلة", "الصحة العامة والمعلوماتية الصحية", "العلوم الطبية التطبيقية", "التمريض", "العلوم والمهن الصحية"] },
  { id: "psau", name: "جامعة الأمير سطام بن عبدالعزيز", region: "الخرج", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "طب الأسنان", "الصيدلة", "العلوم الطبية التطبيقية", "الهندسة", "هندسة وعلوم الحاسب", "إدارة الأعمال", "التربية", "العلوم والدراسات الإنسانية"] },
  { id: "mu", name: "جامعة المجمعة", region: "الرياض", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "طب الأسنان", "العلوم الطبية التطبيقية", "الهندسة", "علوم الحاسب والمعلومات", "إدارة الأعمال", "التربية", "العلوم", "العلوم والدراسات الإنسانية"] },
  { id: "su", name: "جامعة شقراء", region: "الرياض", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "العلوم الطبية التطبيقية", "الهندسة", "الحاسب الآلي وتقنية المعلومات", "إدارة الأعمال", "التربية", "العلوم", "العلوم والدراسات الإنسانية"] },

  /* ─── منطقة مكة المكرمة ─── */
  { id: "kau", name: "جامعة الملك عبدالعزيز", region: "مكة المكرمة", kind: "حكومية",
    formulas: [
      { id: "sci-m", label: "تحضيري علمي - طلاب", track: "علمي", highschool: 40, qudurat: 40, tahsili: 20 },
      { id: "sci-f", label: "تحضيري علمي - طالبات", track: "علمي", highschool: 40, qudurat: 30, tahsili: 30 },
      { id: "hum-m", label: "إنساني - طلاب", track: "إنساني", highschool: 50, qudurat: 50, tahsili: 0 },
      { id: "hum-f", label: "إنساني - طالبات", track: "إنساني", highschool: 50, qudurat: 25, tahsili: 25 },
    ],
    colleges: ["الطب", "طب الأسنان", "الصيدلة", "العلوم الطبية التطبيقية", "التمريض", "الهندسة", "تصاميم البيئة", "الحاسبات وتقنية المعلومات", "علوم البحار", "الأرصاد والبيئة وزراعة المناطق الجافة", "علوم الأرض", "العلوم", "الاقتصاد والإدارة", "الحقوق", "الآداب والعلوم الإنسانية", "الاتصال والإعلام", "السياحة"] },
  { id: "uqu", name: "جامعة أم القرى", region: "مكة المكرمة", kind: "حكومية",
    formulas: [F_SCI, F_HUM_4060],
    colleges: ["الشريعة والدراسات الإسلامية", "الدعوة وأصول الدين", "الطب", "طب الأسنان", "الصيدلة", "العلوم الطبية التطبيقية", "التمريض", "الهندسة والعمارة الإسلامية", "الحاسب الآلي ونظم المعلومات", "إدارة الأعمال", "العلوم الاجتماعية", "العلوم التطبيقية", "التربية", "اللغة العربية", "التصاميم والفنون"] },
  { id: "tu", name: "جامعة الطائف", region: "الطائف", kind: "حكومية",
    formulas: [F_SCI, F_HUM_4060],
    colleges: ["الطب", "طب الأسنان", "الصيدلة", "العلوم الطبية التطبيقية", "الهندسة", "الحاسبات وتقنية المعلومات", "إدارة الأعمال", "العلوم", "الشريعة والأنظمة", "الآداب", "التربية", "التصاميم والفنون التطبيقية"] },
  { id: "uj", name: "جامعة جدة", region: "مكة المكرمة", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "العلوم الطبية التطبيقية", "الهندسة", "علوم وهندسة الحاسب", "الأعمال", "العلوم", "التربية", "العلوم الاجتماعية", "اللغات والترجمة", "علوم الرياضة", "التصاميم والفنون"] },

  /* ─── المدينة المنورة ─── */
  { id: "iu", name: "الجامعة الإسلامية", region: "المدينة المنورة", kind: "حكومية",
    formulas: [F_SCI, { id: "shar", label: "شرعي", track: "إنساني", highschool: 50, qudurat: 50, tahsili: 0 }],
    colleges: ["الشريعة", "الدعوة وأصول الدين", "القرآن الكريم والدراسات الإسلامية", "الحديث الشريف والدراسات الإسلامية", "اللغة العربية", "العلوم", "الهندسة", "الحاسب الآلي", "الأنظمة والدراسات القضائية"] },
  { id: "taibah", name: "جامعة طيبة", region: "المدينة المنورة", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "طب الأسنان", "الصيدلة", "العلوم الطبية التطبيقية", "التمريض", "التأهيل الطبي", "الهندسة", "علوم وهندسة الحاسبات", "إدارة الأعمال", "العلوم", "الآداب والعلوم الإنسانية", "التربية", "الحقوق", "علوم الأسرة"] },

  /* ─── المنطقة الشرقية ─── */
  { id: "kfupm", name: "جامعة الملك فهد للبترول والمعادن", region: "المنطقة الشرقية", kind: "حكومية",
    formulas: [{ id: "all", label: "جميع التخصصات", track: "علمي", highschool: 10, qudurat: 50, tahsili: 40, note: "تُطلب درجة محدّدة في اختبار اللغة الإنجليزية (كفايات/توفل/آيلتس)" }],
    colleges: ["علوم وهندسة الحاسب الآلي", "العلوم الهندسية", "الهندسة التطبيقية (طيران، كيميائية، مدنية، كهربائية، ميكانيكية، بترول)", "العلوم (كيمياء، علوم أرض، رياضيات، فيزياء)", "تصاميم البيئة", "الإدارة الصناعية"] },
  { id: "iau", name: "جامعة الإمام عبدالرحمن بن فيصل", region: "المنطقة الشرقية", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "طب الأسنان", "الصيدلة الإكلينيكية", "العلوم الطبية التطبيقية", "التمريض", "الصحة العامة", "العمارة والتخطيط", "الهندسة", "علوم الحاسب وتقنية المعلومات", "إدارة الأعمال", "العلوم", "الآداب", "التربية", "التصاميم"] },
  { id: "kfu", name: "جامعة الملك فيصل", region: "الأحساء", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "الصيدلة الإكلينيكية", "العلوم الطبية التطبيقية", "الطب البيطري", "العلوم الزراعية والأغذية", "الهندسة", "علوم الحاسب وتقنية المعلومات", "إدارة الأعمال", "الحقوق", "العلوم", "الآداب", "التربية"] },
  { id: "uhb", name: "جامعة حفر الباطن", region: "المنطقة الشرقية", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الهندسة", "علوم وهندسة الحاسب الآلي", "العلوم الطبية التطبيقية", "إدارة الأعمال", "العلوم", "التربية", "الآداب"] },

  /* ─── القصيم وحائل ─── */
  { id: "qu", name: "جامعة القصيم", region: "القصيم", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "طب الأسنان", "الصيدلة", "العلوم الطبية التطبيقية", "التمريض", "الهندسة", "الحاسب", "الزراعة والطب البيطري", "الاقتصاد والإدارة", "العلوم", "الشريعة والدراسات الإسلامية", "اللغة العربية والدراسات الاجتماعية", "التربية", "العمارة والتخطيط", "التصاميم"] },
  { id: "uoh", name: "جامعة حائل", region: "حائل", kind: "حكومية",
    formulas: [{ id: "sci", label: "علمي", track: "علمي", highschool: 35, qudurat: 35, tahsili: 30 }, F_HUM_5050],
    colleges: ["الطب", "طب الأسنان", "الصيدلة", "العلوم الطبية التطبيقية", "التمريض", "الصحة العامة والمعلوماتية الصحية", "الهندسة", "علوم وهندسة الحاسب الآلي", "إدارة الأعمال", "العلوم", "الآداب والفنون", "التربية", "الشريعة والقانون"] },

  /* ─── المنطقة الجنوبية ─── */
  { id: "kku", name: "جامعة الملك خالد", region: "عسير", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "طب الأسنان", "الصيدلة", "العلوم الطبية التطبيقية", "التمريض", "الهندسة", "علوم الحاسب الآلي", "الأعمال", "العلوم", "العلوم الإنسانية", "التربية", "الشريعة وأصول الدين", "اللغات والترجمة"] },
  { id: "ju", name: "جامعة جازان", region: "جازان", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "طب الأسنان", "الصيدلة", "العلوم الطبية التطبيقية", "التمريض", "الصحة العامة وطب المناطق الحارة", "الهندسة", "علوم الحاسب وتقنية المعلومات", "التصميم والعمارة", "إدارة الأعمال", "العلوم", "الآداب والعلوم الإنسانية", "التربية", "الشريعة والقانون"] },
  { id: "nu", name: "جامعة نجران", region: "نجران", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "طب الأسنان", "الصيدلة", "العلوم الطبية التطبيقية", "التمريض", "الهندسة", "علوم الحاسب ونظم المعلومات", "العلوم الإدارية", "العلوم والآداب", "التربية", "الشريعة وأصول الدين", "اللغات"] },
  { id: "ub", name: "جامعة بيشة", region: "عسير", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "العلوم الطبية التطبيقية", "الهندسة", "الحاسبات وتقنية المعلومات", "الأعمال", "العلوم", "الآداب", "التربية", "الاقتصاد المنزلي"] },
  { id: "bu", name: "جامعة الباحة", region: "الباحة", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "طب الأسنان", "الصيدلة السريرية", "العلوم الطبية التطبيقية", "الهندسة", "علوم الحاسب وتقنية المعلومات", "إدارة الأعمال", "العلوم", "الآداب والعلوم الإنسانية", "التربية"] },

  /* ─── المنطقة الشمالية ─── */
  { id: "ut", name: "جامعة تبوك", region: "تبوك", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "الصيدلة", "العلوم الطبية التطبيقية", "الهندسة", "الحاسبات وتقنية المعلومات", "إدارة الأعمال", "العلوم", "التربية والآداب", "الشريعة والأنظمة", "التصاميم والفنون"] },
  { id: "jouf", name: "جامعة الجوف", region: "الجوف", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "طب الأسنان", "الصيدلة", "العلوم الطبية التطبيقية", "الهندسة", "علوم الحاسب والمعلومات", "الأعمال", "العلوم", "الشريعة والقانون", "الآداب", "التربية"] },
  { id: "nbu", name: "جامعة الحدود الشمالية", region: "عرعر", kind: "حكومية",
    formulas: STD_GOV,
    colleges: ["الطب", "الصيدلة", "العلوم الطبية التطبيقية", "التمريض", "الهندسة", "الحاسبات وتقنية المعلومات", "إدارة الأعمال", "العلوم", "الآداب", "التربية", "الاقتصاد المنزلي"] },

  /* ─── جامعات أهلية (المعايير تختلف — راجع موقع الجامعة) ─── */
  { id: "psu", name: "جامعة الأمير سلطان", region: "الرياض", kind: "أهلية",
    admissionNote: "القبول غالباً: الثانوية + القدرات + اختبار لغة إنجليزية لتحديد المستوى.",
    colleges: ["الهندسة", "علوم الحاسب والمعلومات", "إدارة الأعمال", "القانون", "العمارة والتصميم", "الإنسانيات والعلوم"] },
  { id: "alfaisal", name: "جامعة الفيصل", region: "الرياض", kind: "أهلية",
    formulas: [{ id: "med", label: "طب", track: "علمي", highschool: 30, qudurat: 30, tahsili: 40, note: "+ مقابلة شخصية" }],
    admissionNote: "الطب: ثانوية ٣٠٪ + قدرات ٣٠٪ + تحصيلي ٤٠٪ + مقابلة. باقي التخصصات تختلف.",
    colleges: ["الطب", "الصيدلة", "الهندسة", "إدارة الأعمال", "العلوم"] },
  { id: "yu", name: "جامعة اليمامة", region: "الرياض", kind: "أهلية",
    admissionNote: "القبول غالباً: الثانوية + القدرات + اختبار لغة إنجليزية.",
    colleges: ["إدارة الأعمال", "الهندسة والعمارة", "القانون"] },
  { id: "dau", name: "جامعة دار العلوم", region: "الرياض", kind: "أهلية",
    admissionNote: "الطب وطب الأسنان: ثانوية + قدرات + تحصيلي + مقابلة. باقي التخصصات تختلف.",
    colleges: ["الطب البشري", "طب الأسنان", "الحقوق", "إدارة الأعمال", "الهندسة المعمارية والتصميم الرقمي"] },
  { id: "almaarefa", name: "جامعة المعرفة", region: "الرياض", kind: "أهلية",
    admissionNote: "التخصصات الصحية تطلب التحصيلي ومقابلة؛ راجع الموقع.",
    colleges: ["الطب", "الصيدلة", "العلوم التطبيقية (تمريض، علاج تنفسي)", "علوم الحاسب"] },
  { id: "pmu", name: "جامعة الأمير محمد بن فهد", region: "المنطقة الشرقية", kind: "أهلية",
    admissionNote: "القبول غالباً: الثانوية + القدرات + اختبار لغة إنجليزية.",
    colleges: ["الهندسة", "هندسة وعلوم الحاسب الآلي", "إدارة الأعمال", "القانون", "العمارة والتصميم"] },
  { id: "effat", name: "جامعة عفت", region: "مكة المكرمة", kind: "أهلية",
    admissionNote: "للبنات. القبول غالباً: الثانوية + القدرات + اختبار لغة إنجليزية.",
    colleges: ["الهندسة", "العمارة والتصميم", "الأعمال", "العلوم والإنسانيات"] },
  { id: "ksaru", name: "جامعة سليمان الراجحي", region: "القصيم", kind: "أهلية",
    admissionNote: "التخصصات الصحية تطلب التحصيلي ومقابلة؛ راجع الموقع.",
    colleges: ["الطب", "الأعمال", "التمريض", "العلوم التطبيقية"] },

  { id: "other", name: "أخرى" },
];

/* ════════ بيانات التخصصات + متطلباتها الإرشادية ════════ */
export const MAJORS: MajorOption[] = [
  { id: "medicine",  name: "طب", category: "صحي",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", step: "يفضّل مرتفع", gpa: "مرتفع" },
    focusHint: "الكمي والتحصيلي (أحياء/كيمياء) لهما الأولوية القصوى" },
  { id: "dentistry", name: "طب أسنان", category: "صحي",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "مرتفع" },
    focusHint: "التحصيلي والكمي أساس القبول" },
  { id: "pharmacy",  name: "صيدلة", category: "صحي",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "مرتفع" },
    focusHint: "الكيمياء والأحياء في التحصيلي مهمة جداً" },
  { id: "nursing",   name: "تمريض", category: "صحي",
    requirements: { qudurat: "متوسط", tahsili: "متوسط", gpa: "متوسط" },
    focusHint: "توازن بين القدرات والتحصيلي" },
  { id: "applied-medical", name: "علوم صحية تطبيقية", category: "صحي",
    requirements: { qudurat: "متوسط", tahsili: "مرتفع", gpa: "متوسط" } },

  { id: "cs",        name: "علوم حاسب", category: "حاسب",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "متوسط" },
    focusHint: "الكمي (الرياضيات) والإنجليزي محوريان" },
  { id: "swe",       name: "هندسة برمجيات", category: "حاسب",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "متوسط" },
    focusHint: "الرياضيات والمنطق في القدرات أولوية" },
  { id: "cybersec",  name: "أمن سيبراني", category: "حاسب",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "متوسط" },
    focusHint: "الكمي والإنجليزي والشبكات" },
  { id: "ai",        name: "ذكاء اصطناعي", category: "حاسب",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "مرتفع" },
    focusHint: "رياضيات قوية (كمي) أساس لا غنى عنه" },
  { id: "is",        name: "نظم معلومات", category: "حاسب",
    requirements: { qudurat: "متوسط", tahsili: "متوسط", gpa: "متوسط" } },

  { id: "ee",        name: "هندسة كهربائية", category: "هندسي",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "مرتفع" },
    focusHint: "الفيزياء والرياضيات في التحصيلي أولوية" },
  { id: "me",        name: "هندسة ميكانيكية", category: "هندسي",
    requirements: { qudurat: "مرتفع", tahsili: "مرتفع", gpa: "مرتفع" },
    focusHint: "الفيزياء والرياضيات محوريتان" },
  { id: "ce",        name: "هندسة مدنية", category: "هندسي",
    requirements: { qudurat: "متوسط", tahsili: "مرتفع", gpa: "متوسط" } },
  { id: "industrial", name: "هندسة صناعية", category: "هندسي",
    requirements: { qudurat: "مرتفع", tahsili: "متوسط", gpa: "متوسط" } },

  { id: "business",  name: "إدارة أعمال", category: "إداري",
    requirements: { qudurat: "متوسط", tahsili: "متوسط", gpa: "متوسط" },
    focusHint: "القدرات (اللفظي والكمي) والإنجليزي" },
  { id: "accounting", name: "محاسبة", category: "إداري",
    requirements: { qudurat: "متوسط", tahsili: "متوسط", gpa: "متوسط" },
    focusHint: "الكمي مهم في المحاسبة" },
  { id: "finance",   name: "تمويل", category: "إداري",
    requirements: { qudurat: "متوسط", tahsili: "متوسط", gpa: "متوسط" } },
  { id: "marketing", name: "تسويق", category: "إداري",
    requirements: { qudurat: "متوسط", gpa: "منخفض" } },

  { id: "law",       name: "قانون / أنظمة", category: "قانوني",
    requirements: { qudurat: "متوسط", gpa: "متوسط" },
    focusHint: "اللفظي في القدرات والمعدل" },

  { id: "other",     name: "أخرى", category: "عام", requirements: {} },
];

/* ── helpers ── */
export const findUniversity = (id?: string): UniversityOption | undefined =>
  id ? UNIVERSITIES.find((u) => u.id === id) : undefined;
export const findMajor = (id?: string): MajorOption | undefined =>
  id ? MAJORS.find((m) => m.id === id) : undefined;

/* ════════ محرّك الموزونة (نقي وحتمي) ════════
   يحسب النسبة الموزونة من معادلة جامعة + درجات الطالب.
   الدرجات كلها بمقياس 0–100 (الثانوية كنسبة مئوية). */
export interface WeightedInputs {
  highschool?: number | null;  // نسبة الثانوية 0–100
  qudurat?: number | null;     // درجة القدرات 0–100
  tahsili?: number | null;     // درجة التحصيلي 0–100
}

export interface WeightedResult {
  score: number | null;        // النسبة الموزونة 0–100 (null إن نقص مكوّن مطلوب)
  missing: string[];           // مكوّنات مطلوبة وغير مُدخلة
  parts: { label: string; weight: number; value: number; contribution: number }[];
}

const clamp100 = (n: number) => Math.max(0, Math.min(100, n));

export function computeWeighted(f: WeightedFormula, inp: WeightedInputs): WeightedResult {
  const comps: { label: string; weight: number; value: number | null | undefined }[] = [
    { label: "الثانوية", weight: f.highschool, value: inp.highschool },
    { label: "القدرات", weight: f.qudurat, value: inp.qudurat },
    { label: "التحصيلي", weight: f.tahsili, value: inp.tahsili },
  ];
  const missing: string[] = [];
  const parts: WeightedResult["parts"] = [];
  let score = 0;
  let ok = true;
  for (const c of comps) {
    if (c.weight <= 0) continue;
    if (c.value == null || Number.isNaN(c.value)) { missing.push(c.label); ok = false; continue; }
    const v = clamp100(c.value);
    const contribution = (c.weight / 100) * v;
    score += contribution;
    parts.push({ label: c.label, weight: c.weight, value: v, contribution });
  }
  return { score: ok ? Math.round(score * 100) / 100 : null, missing, parts };
}

/* تصنيف الموزونة لإشارة سريعة (إرشادي — العتبات تقديرية) */
export function weightedVerdict(score: number): { icon: "🟢" | "🟡" | "🔴"; label: string } {
  if (score >= 85) return { icon: "🟢", label: "نسبة قوية — تنافسية لأغلب التخصصات" };
  if (score >= 75) return { icon: "🟡", label: "نسبة متوسطة — تنافسية لتخصصات كثيرة" };
  return { icon: "🔴", label: "تحتاج رفع — ركّز على القدرات والتحصيلي" };
}

/* نص متطلبات مختصر للعرض/الحقن في برومبت دويرب */
export function requirementsText(req: MajorRequirements): string {
  const parts: string[] = [];
  if (req.qudurat) parts.push(`قدرات: ${req.qudurat}`);
  if (req.tahsili) parts.push(`تحصيلي: ${req.tahsili}`);
  if (req.step)    parts.push(`STEP: ${req.step}`);
  if (req.gpa)     parts.push(`المعدل: ${req.gpa}`);
  return parts.join("، ");
}

/* عتبة الدرجة المقابلة لكل مستوى (قدرات/تحصيلي من 100) */
const LEVEL_THRESHOLD: Record<Exclude<ReqLevel, never>, number> = {
  "مرتفع": 85,
  "يفضّل مرتفع": 80,
  "متوسط": 75,
  "منخفض": 65,
};
function thresholdFor(level: ReqLevel): number { return LEVEL_THRESHOLD[level] ?? 75; }

/* ════════ محرّك مؤشر الوصول الجامعي (نقي وحتمي) ════════ */
export type ReadinessLevel = "منخفض" | "متوسط" | "مرتفع";

export interface UniversityReadinessInputs {
  requirements?: MajorRequirements;
  readinessPct?: number | null;           // الجاهزية الحالية (محرّك الاستراتيجية)
  quduratScore?: number | null;           // أحدث/أعلى درجة قدرات
  tahsiliScore?: number | null;           // أحدث/أعلى درجة تحصيلي
  stepScore?: number | null;
  weeklyHours?: number | null;            // ساعات أسبوعية (من الاستراتيجية)
  planProgressPct?: number | null;        // تقدّم الخطة/المسار
  majorName?: string;
}

export interface UniversityReadinessResult {
  level: ReadinessLevel;
  icon: "🟢" | "🟡" | "🔴";
  score: number;        // 0–100
  reasons: string[];    // أسباب موجزة
  hasData: boolean;     // هل توفّرت بيانات كافية للحكم؟
}

export function universityReadiness(inp: UniversityReadinessInputs): UniversityReadinessResult {
  const req = inp.requirements ?? {};
  const reasons: string[] = [];
  let score = 0;
  let weight = 0;

  /* ١) الجاهزية العامة — العمود الأساسي */
  if (inp.readinessPct != null) {
    score += inp.readinessPct * 0.4;
    weight += 40;
    reasons.push(`جاهزيتك الحالية ${Math.round(inp.readinessPct)}٪`);
  }

  /* ٢) مطابقة الدرجات الفعلية للمتطلبات */
  const examChecks: { label: string; have: number | null | undefined; level?: ReqLevel }[] = [
    { label: "القدرات", have: inp.quduratScore, level: req.qudurat },
    { label: "التحصيلي", have: inp.tahsiliScore, level: req.tahsili },
    { label: "STEP", have: inp.stepScore, level: req.step },
  ];
  for (const c of examChecks) {
    if (c.level == null || c.have == null) continue;
    const need = thresholdFor(c.level);
    const ratio = Math.max(0, Math.min(1.1, c.have / need));
    score += ratio * 20;
    weight += 20;
    if (c.have >= need) reasons.push(`${c.label}: ${c.have} يلبّي المطلوب (${c.level})`);
    else reasons.push(`${c.label}: ${c.have} دون المطلوب (${c.level} ≈ ${need})`);
  }

  /* ٣) الطاقة الأسبوعية */
  if (inp.weeklyHours != null) {
    const h = inp.weeklyHours;
    const hScore = h >= 20 ? 100 : h >= 12 ? 75 : h >= 6 ? 55 : 30;
    score += hScore * 0.12;
    weight += 12;
    if (h < 6) reasons.push(`ساعات أسبوعية قليلة (${h})`);
  }

  /* ٤) تقدّم الخطة */
  if (inp.planProgressPct != null) {
    score += inp.planProgressPct * 0.1;
    weight += 10;
    if (inp.planProgressPct < 30) reasons.push("تقدّمك في الخطة ما زال مبكّراً");
  }

  const hasData = weight >= 20;
  const normalized = hasData ? Math.round((score / weight) * 100) : 0;
  const clamped = Math.max(0, Math.min(100, normalized));

  let level: ReadinessLevel;
  let icon: "🟢" | "🟡" | "🔴";
  if (clamped >= 70) { level = "مرتفع"; icon = "🟢"; }
  else if (clamped >= 45) { level = "متوسط"; icon = "🟡"; }
  else { level = "منخفض"; icon = "🔴"; }

  if (!hasData) {
    reasons.push("أضف نتائجك وحدّد هدفك لأحسب مؤشر وصول دقيقاً");
  }

  return { level, icon, score: clamped, reasons: reasons.slice(0, 4), hasData };
}
