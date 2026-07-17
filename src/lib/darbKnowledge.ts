/* ═══════════════════════════════════════════════════════════════════════
   Darb Knowledge Engine — مُحرّك المعرفة التعليمية (مصدر الحقيقة الواحد)
   ───────────────────────────────────────────────────────────────────────
   كل القواعد التعليمية في درب تُعرَّف هنا مرة واحدة: المراحل، الصفوف، شروط
   دخول الاختبارات (قدرات/تحصيلي/تحصيلي مبكر/STEP)، نطاقات الدرجات، مفاهيم
   القبول الجامعي والموزونة والمعدل التراكمي ومؤشر الوصول.

   القاعدة الحاكمة:
   • أي نظام جديد (دويرب، الخطة، المسار الذهبي، اللوحة، الملف، القبول) يجب أن
     *يستهلك* هذا المحرّك بدل تكرار شروط تعليمية متناثرة (if studyLevel === …).
   • الهدف: أن «يفهم درب» القواعد التعليمية بنيوياً لا عبر شروط مبعثرة.

   هذا الملف نقيّ (لا يقرأ localStorage ولا الشبكة) — صالح للعميل والخادم.
   يعيد تصدير مفاهيم المرحلة (phase.ts) والقبول (university.ts) ليكون نقطة
   الاستيراد الموحّدة لكل المعرفة التعليمية.
   ═══════════════════════════════════════════════════════════════════════ */

import type { DarbUser } from "./storage";
import {
  computeStudentPhase,
  isUniversityGraduate,
  phaseLabel,
  type StudentPhase,
} from "./phase";

/* ════════════════════════════════════════════════════════════
   ١) المراحل والصفوف الدراسية
   ════════════════════════════════════════════════════════════ */

export type { StudentPhase } from "./phase";

/* إعادة تصدير مفاهيم المرحلة — نقطة استيراد واحدة لكل المعرفة */
export {
  computeStudentPhase,
  isSecondaryPhase,
  isUniversityPhase,
  isGraduatePhase,
  isUniversityGraduate,
  phaseLabel,
  UNIVERSITY_HIDDEN_CONCEPTS,
  SECONDARY_HIDDEN_CONCEPTS,
} from "./phase";

/* إعادة تصدير مفاهيم القبول الجامعي والموزونة (university.ts) */
export {
  computeWeighted,
  weightedVerdict,
  requiredScores,
  requirementsText,
  universityReadiness,
  gapAnalysis,
  admissionSeason,
  findUniversity,
  findMajor,
  UNIVERSITIES,
  MAJORS,
} from "./university";
export type {
  WeightedFormula,
  WeightedInputs,
  WeightedResult,
  MajorRequirements,
  MajorOption,
  MajorCategory,
  UniversityOption,
  ReqLevel,
  ReadinessLevel,
  UniversityReadinessInputs,
  UniversityReadinessResult,
} from "./university";

/* الصفوف الثانوية — قيم نصّية ثابتة يستعملها التسجيل والتخزين */
export type SchoolStage = "أول ثانوي" | "ثاني ثانوي" | "ثالث ثانوي";
export const SCHOOL_STAGES: readonly SchoolStage[] = [
  "أول ثانوي",
  "ثاني ثانوي",
  "ثالث ثانوي",
] as const;

/* الحالة التعليمية الخام كما تُخزَّن في DarbUser.studyLevel */
export type EduStatus = "ثانوي" | "جامعي" | "خريج";

export const stageOf = (u?: DarbUser | null): SchoolStage | undefined => {
  const g = u?.grade;
  return (SCHOOL_STAGES as readonly string[]).includes(g ?? "")
    ? (g as SchoolStage)
    : undefined;
};

/** المرحلة الأساسية للطالب (واجهة الـ API المطلوبة — تفويض لـ computeStudentPhase). */
export function getStudentPhase(u?: DarbUser | null): StudentPhase {
  return computeStudentPhase(u);
}

/* ════════════════════════════════════════════════════════════
   ٢) نطاقات الدرجات (Score Bands) — مقياس موحّد
   ────────────────────────────────────────────────────────────
   خمس طبقات ثابتة. القدرات/التحصيلي/STEP على مقياس ٠–١٠٠،
   والمعدل التراكمي على مقياس ٠–٥. العتبات متّسقة مع
   LEVEL_THRESHOLD في university.ts (مرتفع ٨٥ · متوسط ٧٥ · منخفض ٦٥).
   ════════════════════════════════════════════════════════════ */

export type BandTier = "excellent" | "high" | "good" | "fair" | "low";

export interface ScoreBand {
  tier: BandTier;
  label: string;     // التسمية العربية
  min: number;       // أدنى درجة تدخل في هذه الطبقة (شاملة)
  icon: "🟢" | "🟡" | "🔴";
  note: string;      // إرشاد موجز
}

/* القدرات (GAT) — ٠–١٠٠ */
export const QUDURAT_BANDS: readonly ScoreBand[] = [
  { tier: "excellent", label: "ممتاز",  min: 90, icon: "🟢", note: "تنافسي لأقوى التخصصات (طب/حاسب/هندسة)" },
  { tier: "high",      label: "مرتفع",  min: 85, icon: "🟢", note: "تنافسي لأغلب التخصصات" },
  { tier: "good",      label: "جيد",    min: 75, icon: "🟡", note: "تنافسي لتخصصات كثيرة — رفعه يوسّع خياراتك" },
  { tier: "fair",      label: "مقبول",  min: 65, icon: "🟡", note: "يحتاج رفعاً للتخصصات التنافسية" },
  { tier: "low",       label: "منخفض",  min: 0,  icon: "🔴", note: "أولوية الرفع قبل أي شيء" },
] as const;

/* التحصيلي (SAAT) — ٠–١٠٠ (نفس مقياس القدرات) */
export const TAHSILI_BANDS: readonly ScoreBand[] = [
  { tier: "excellent", label: "ممتاز",  min: 90, icon: "🟢", note: "تنافسي للتخصصات الصحية والهندسية العليا" },
  { tier: "high",      label: "مرتفع",  min: 85, icon: "🟢", note: "تنافسي لأغلب التخصصات العلمية" },
  { tier: "good",      label: "جيد",    min: 75, icon: "🟡", note: "جيد — رفعه يفتح التخصصات الصحية" },
  { tier: "fair",      label: "مقبول",  min: 65, icon: "🟡", note: "يحتاج رفعاً للتخصصات العلمية التنافسية" },
  { tier: "low",       label: "منخفض",  min: 0,  icon: "🔴", note: "أولوية الرفع — يؤثر بقوة على الموزونة" },
] as const;

/* STEP (الإنجليزي) — ٠–١٠٠ */
export const STEP_BANDS: readonly ScoreBand[] = [
  { tier: "excellent", label: "متقدّم",       min: 90, icon: "🟢", note: "يغطّي أعلى متطلبات الجامعات" },
  { tier: "high",      label: "فوق المتوسط",  min: 83, icon: "🟢", note: "يلبّي متطلب أغلب البرامج الإنجليزية" },
  { tier: "good",      label: "متوسط",        min: 70, icon: "🟡", note: "مقبول لبرامج كثيرة — تحقّق من حدّ وجهتك" },
  { tier: "fair",      label: "أساسي",        min: 50, icon: "🟡", note: "يحتاج رفعاً لأغلب البرامج" },
  { tier: "low",       label: "مبتدئ",        min: 0,  icon: "🔴", note: "أولوية بناء الأساس اللغوي" },
] as const;

/* المعدل التراكمي الجامعي — ٠–٥ (تصنيف الجامعات السعودية) */
export const GPA_BANDS: readonly ScoreBand[] = [
  { tier: "excellent", label: "ممتاز",     min: 4.5,  icon: "🟢", note: "مؤهّل للمراتب العلمية والدراسات العليا والابتعاث" },
  { tier: "high",      label: "جيد جداً",  min: 3.75, icon: "🟢", note: "قوي — يفتح أغلب فرص التوظيف والدراسات العليا" },
  { tier: "good",      label: "جيد",       min: 2.75, icon: "🟡", note: "جيد — رفعه يوسّع فرص التوظيف" },
  { tier: "fair",      label: "مقبول",     min: 2.0,  icon: "🟡", note: "يحتاج تحسيناً — انتبه لشرط الإنذار الأكاديمي" },
  { tier: "low",       label: "ضعيف",      min: 0,    icon: "🔴", note: "أولوية قصوى — خطر الفصل/الإنذار الأكاديمي" },
] as const;

/* اختيار الطبقة المطابقة لدرجة (نطاقات مرتّبة تنازلياً بالحدّ الأدنى) */
function bandFor(bands: readonly ScoreBand[], score?: number | null): ScoreBand | null {
  if (score == null || Number.isNaN(score)) return null;
  for (const b of bands) if (score >= b.min) return b;
  return bands[bands.length - 1] ?? null;
}

/** نطاق درجة القدرات (٠–١٠٠) — null إن لم تتوفّر درجة. */
export const getQuduratBand = (score?: number | null): ScoreBand | null =>
  bandFor(QUDURAT_BANDS, score);

/** نطاق درجة التحصيلي (٠–١٠٠). */
export const getTahsiliBand = (score?: number | null): ScoreBand | null =>
  bandFor(TAHSILI_BANDS, score);

/** نطاق درجة STEP (٠–١٠٠). */
export const getStepBand = (score?: number | null): ScoreBand | null =>
  bandFor(STEP_BANDS, score);

/** نطاق المعدل التراكمي الجامعي (٠–٥). */
export const getGpaBand = (gpa?: number | null): ScoreBand | null =>
  bandFor(GPA_BANDS, gpa);

/* ════════════════════════════════════════════════════════════
   ٣) قواعد الاختبارات الرسمية — معرفة بنيوية
   ────────────────────────────────────────────────────────────
   كل اختبار يحمل: المقياس، الصفوف المؤهَّلة، الصلاحية، والوصف.
   مواعيد التسجيل الفعلية تبقى في examProvider.ts (مصدرها قياس)؛
   هنا نعرّف *قواعد الأهلية والمفهوم* فقط.
   ════════════════════════════════════════════════════════════ */

export interface ExamRule {
  id: string;
  nameEn: string;
  scale: number;                       // أقصى درجة
  eligibleStages: readonly SchoolStage[]; // صفوف ثانوية مؤهَّلة
  graduatesEligible: boolean;          // هل يدخله الخريج؟
  recommendedStart?: SchoolStage;      // البداية المثلى
  validityYears?: number;              // صلاحية النتيجة
  description: string;
  bands: readonly ScoreBand[];
}

/** قدرات (GAT) — لفظي وكمي. من ثاني ثانوي فصاعداً + الخريجون (أول ثانوي يبني أساسه المدرسي أولاً). */
export const QUDURAT_RULES: ExamRule = {
  id: "قدرات",
  nameEn: "GAT",
  scale: 100,
  eligibleStages: ["ثاني ثانوي", "ثالث ثانوي"],
  graduatesEligible: true,
  recommendedStart: "ثاني ثانوي",
  validityYears: 5,
  description: "اختبار القدرات العامة (لفظي + كمي). صالح خمس سنوات، ويُعاد لرفع الدرجة.",
  bands: QUDURAT_BANDS,
};

/** التحصيلي (SAAT) — للمواد العلمية (أحياء/كيمياء/فيزياء/رياضيات). لطلاب ثالث ثانوي والخريجين. */
export const TAHSILI_RULES: ExamRule = {
  id: "تحصيلي",
  nameEn: "SAAT",
  scale: 100,
  eligibleStages: ["ثالث ثانوي"],
  graduatesEligible: true,
  recommendedStart: "ثالث ثانوي",
  validityYears: 5,
  description: "الاختبار التحصيلي للقسم العلمي — يقيس تحصيل مواد الثانوية. يخدم القبول للتخصصات العلمية.",
  bands: TAHSILI_BANDS,
};

/** التحصيلي المبكر — لطلاب الثاني والثالث ثانوي (كثير من المدارس لا تبدأ التحصيلي في أول ثانوي). */
export const EARLY_TAHSILI_RULES: ExamRule = {
  id: "تحصيلي مبكر",
  nameEn: "Early SAAT",
  scale: 100,
  eligibleStages: ["ثاني ثانوي", "ثالث ثانوي"],
  graduatesEligible: false,
  recommendedStart: "ثاني ثانوي",
  validityYears: 5,
  description: "التحصيلي المبكر لطلاب الثاني والثالث ثانوي — يبني التحصيل مبكراً ويسبق به الطالب دفعته.",
  bands: TAHSILI_BANDS,
};

/** STEP — اختبار إتقان اللغة الإنجليزية. مفتوح لكل المراحل؛ يُطلب لوجهات/تخصصات إنجليزية. */
export const STEP_RULES: ExamRule = {
  id: "ستيب",
  nameEn: "STEP",
  scale: 100,
  eligibleStages: SCHOOL_STAGES,
  graduatesEligible: true,
  validityYears: 2,
  description: "اختبار إتقان اللغة الإنجليزية (STEP). يُطلب لبرامج تُدرَّس بالإنجليزية (جامعة البترول مثلاً).",
  bands: STEP_BANDS,
};

export const EXAM_RULES: Record<string, ExamRule> = {
  قدرات: QUDURAT_RULES,
  تحصيلي: TAHSILI_RULES,
  "تحصيلي مبكر": EARLY_TAHSILI_RULES,
  ستيب: STEP_RULES,
};

/* ════════════════════════════════════════════════════════════
   ٤) قواعد الأهلية (Eligibility) — قابلة لإعادة الاستخدام
   ────────────────────────────────────────────────────────────
   تُرجِع منطقاً واحداً يستهلكه التسجيل/التوصيات/الخطة بدل تكراره.
   القاعدة الجوهرية: الطالب الجامعي خرج من عالم القياس/القبول كلياً.
   ════════════════════════════════════════════════════════════ */

/** هل يحقّ للطالب دخول القدرات؟ (ثاني/ثالث ثانوي + خريج الثانوية · لا أول ثانوي
    ولا الجامعي/خريج الجامعة). أول ثانوي يبني أساسه المدرسي أولاً — القدرات تبدأ من
    ثاني ثانوي. الثانوي بلا صفٍّ محدّد يُعامَل كأول ثانوي (الأكثر تحفّظاً). */
export function canTakeQudurat(u?: DarbUser | null): boolean {
  if (isUniversityGraduate(u)) return false; // خرج من عالم القياس نهائياً
  const phase = getStudentPhase(u);
  if (phase === "graduate") return true;
  if (phase !== "secondary") return false;
  const stage = stageOf(u);
  return stage === "ثاني ثانوي" || stage === "ثالث ثانوي";
}

/** هل يحقّ له دخول التحصيلي؟ (ثالث ثانوي + خريج الثانوية · ليس الجامعي/خريج الجامعة/الصفوف الأدنى) */
export function canTakeTahsili(u?: DarbUser | null): boolean {
  if (isUniversityGraduate(u)) return false;
  const phase = getStudentPhase(u);
  if (phase === "graduate") return true;
  if (phase !== "secondary") return false;
  return stageOf(u) === "ثالث ثانوي";
}

/** هل يحقّ له دخول التحصيلي المبكر؟ (ثاني/ثالث ثانوي فقط — لا يظهر أبداً لأول ثانوي) */
export function canTakeEarlyTahsili(u?: DarbUser | null): boolean {
  if (getStudentPhase(u) !== "secondary") return false;
  const stage = stageOf(u);
  return stage === "ثاني ثانوي" || stage === "ثالث ثانوي";
}


/* أنماط الوجهات التي تتطلب إثبات لغة إنجليزية (SSoT — يستهلكها المسار الذهبي وغيره) */
const ENGLISH_REQUIRED_UNIVERSITY = /بترول|فهد للبترول|kfupm|عفت|effat|الفيصل|alfaisal/i;

/** هل وجهة الطالب تتطلب إثبات إنجليزي (STEP/IELTS/TOEFL)؟ */
export function destinationNeedsEnglish(opts?: {
  university?: string;
  stepTarget?: number | null;
}): boolean {
  if (opts?.stepTarget != null) return true;
  if (opts?.university && ENGLISH_REQUIRED_UNIVERSITY.test(opts.university)) return true;
  return false;
}

/** هل نوصي الطالب بـ STEP؟ (مؤهَّل لمرحلة القبول ووجهته تتطلب إنجليزي) */
export function shouldRecommendSTEP(
  u?: DarbUser | null,
  opts?: { university?: string; stepTarget?: number | null },
): boolean {
  // الجامعي خارج مرحلة القبول — لا نوصي ضمن مسار القياس
  if (getStudentPhase(u) === "university") return false;
  return destinationNeedsEnglish(opts);
}

/** هل الطالب على أعتاب القبول الجامعي؟ (ثالث ثانوي أو خريج · ليس الجامعي/الصفوف الأدنى)
    يطابق منطق showsUniversityUI في storage — مصدر واحد للمستهلكين. */
export function canApplyUniversity(u?: DarbUser | null): boolean {
  if (isUniversityGraduate(u)) return false; // التحق وتخرّج — لا قبول جديد
  const phase = getStudentPhase(u);
  if (phase === "graduate") return true;
  if (phase !== "secondary") return false;
  return stageOf(u) === "ثالث ثانوي";
}

/* ════════════════════════════════════════════════════════════
   ٥) ملف معرفي موحّد — لقطة واحدة يستهلكها أي نظام
   ════════════════════════════════════════════════════════════ */

export interface EducationalProfile {
  phase: StudentPhase;
  phaseLabel: string;
  stage?: SchoolStage;          // الصف (للثانوي)
  eligibility: {
    qudurat: boolean;
    tahsili: boolean;
    earlyTahsili: boolean;
    universityAdmission: boolean;
    recommendSTEP: boolean;
  };
  bands: {
    qudurat: ScoreBand | null;
    tahsili: ScoreBand | null;
    step: ScoreBand | null;
    gpa: ScoreBand | null;
  };
}

/** يبني لقطة معرفية كاملة عن الطالب — نقطة الدخول الموصى بها للأنظمة الجديدة. */
export function buildEducationalProfile(
  u?: DarbUser | null,
  scores?: {
    qudurat?: number | null;
    tahsili?: number | null;
    step?: number | null;
    gpa?: number | null;
    university?: string;
    stepTarget?: number | null;
  },
): EducationalProfile {
  const phase = getStudentPhase(u);
  return {
    phase,
    phaseLabel: phaseLabel(phase),
    stage: stageOf(u),
    eligibility: {
      qudurat: canTakeQudurat(u),
      tahsili: canTakeTahsili(u),
      earlyTahsili: canTakeEarlyTahsili(u),
      universityAdmission: canApplyUniversity(u),
      recommendSTEP: shouldRecommendSTEP(u, {
        university: scores?.university,
        stepTarget: scores?.stepTarget,
      }),
    },
    bands: {
      qudurat: getQuduratBand(scores?.qudurat),
      tahsili: getTahsiliBand(scores?.tahsili),
      step: getStepBand(scores?.step),
      gpa: getGpaBand(scores?.gpa ?? u?.universityGpa),
    },
  };
}
