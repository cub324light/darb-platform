/* ─── محرّك الاختبارات المطلوبة (Recommended Exams) — ADR-0001 ───
   المصدر الرسمي الوحيد لاشتقاق اختبارات الطالب من وجهته. التسلسل:
   الوجهة → الاختبارات المطلوبة → (تصفية بالمرحلة/الفصل/النافذة). الاختبارات وسائل
   لا أهداف: النظام يستنتج «القدرات مطلوبة» من الوجهة، لا يختارها الطالب كهدف.
   يقرأ منه: دويرب/الخطة/الرئيسية/الإشعارات/مساري (+ نتائج الطالب + نيّة الإعادة).
   نقيّ وحتمي — يعيد استخدام examBoard (القياس) وexamProvider (النوافذ) بلا تكرار. */

import { examBoard, toBoardStage, type BoardStage, type ExamBoardId, type ExamMode } from "./examEligibility";
import { currentRegistrationStatus } from "./examProvider";

/* أنواع الاختبارات التي قد تتطلّبها وجهة (وسائل الوصول). */
export type ExamKind = "qudurat" | "tahsili" | "aramco" | "itc" | "language";

/* ما تتطلّبه كل وجهة (requirementsOf). المفاتيح = معرّفات وجهات التسجيل.
   يشمل الكتالوج القديم (sabic/military/training) للتوافق حتى تُوحَّد الوجهات (خطوة 1). */
export const DESTINATION_REQUIREMENTS: Record<string, ExamKind[]> = {
  university:  ["qudurat", "tahsili"],
  major:       ["qudurat", "tahsili"],
  aramco:      ["qudurat", "tahsili", "aramco"],
  itc:         ["qudurat", "itc"],
  scholarship: ["qudurat", "tahsili", "language"], // ابتعاث
  job:         ["language"],                        // وظيفة
  english:     ["language"],                        // تطوير الإنجليزية
  /* توافق مؤقّت مع كتالوج ADMISSION_TARGETS القديم */
  sabic:       ["qudurat", "tahsili"],
  military:    ["qudurat"],
  training:    ["language"],
};

const PROGRAM_LABEL: Record<"aramco" | "itc", string> = {
  aramco: "أرامكو", itc: "ITC",
};

/* ── مخرجات الطبقة الأولى (Domain) لكل نوع: سبب الترشيح + الأولوية ──
   بلا أي معرفةٍ بالواجهة (لا ألوان ولا نصوص عرض). العقل (Life Engine) يبني عليها. */
const KIND_REASON: Record<ExamKind, string> = {
  qudurat: "أساس القبول الجامعي والبرامج",
  tahsili: "مطلوب للتخصصات العلمية والصحية",
  aramco: "اختبار برنامج أرامكو",
  itc: "اختبار مسار ITC",
  language: "لوجهات الابتعاث/الوظيفة/تطوير الإنجليزية",
};
const KIND_PRIORITY: Record<ExamKind, number> = {
  qudurat: 1, tahsili: 2, aramco: 3, itc: 3, language: 4,
};

/* حالة الاختبار (Domain) — من نافذة التسجيل؛ ما لا نافذة له (لغة/برامج) = متاح. */
export type ExamState = "open" | "upcoming" | "pending" | "prepare" | "available";
function stateFromMode(mode?: ExamMode): ExamState {
  return mode === "register-open" ? "open"
    : mode === "register-upcoming" ? "upcoming"
    : mode === "pending" ? "pending"
    : mode === "prepare" ? "prepare" : "available";
}

/* مجموعة أنواع الاختبارات التي تتطلّبها الوجهات المختارة (بلا تصفية أهلية). */
export function requirementsOf(destinations: string[]): Set<ExamKind> {
  const kinds = new Set<ExamKind>();
  for (const d of destinations) for (const k of DESTINATION_REQUIREMENTS[d] ?? []) kinds.add(k);
  return kinds;
}

/* اختبارٌ مطلوبٌ مشتقّ (Domain) — معرفةٌ خام لا واجهة: النوع + الاسم + السبب + الحالة + الأولوية. */
export interface RecommendedExam {
  kind: ExamKind;
  boardId?: ExamBoardId; // للقياس: qudurat | tahsiliEarly | tahsiliRegular
  label: string;         // اسم الاختبار (القياس: المبكر/العادي حسب النافذة)
  reason: string;        // سبب الترشيح (من الوجهة) — Domain
  state: ExamState;      // حالة النافذة/الإتاحة — Domain
  priority: number;      // أولوية الاختبار (الأصغر أهمّ) — Domain
  mode?: ExamMode;       // حالة نافذة القياس الخام (للعقل إن احتاجها)
  hint?: string;         // نصّ حالة النافذة الجاهز (اشتقاق examBoard — يستهلكه العقل/الواجهة)
}

export interface RecommendInput {
  destinations: string[];
  stage: BoardStage;
  isUniGrad?: boolean;
  afterFirstTerm?: boolean;
  today: string; // YYYY-MM-DD
}

/* الاشتقاق الكامل: الوجهة → الاختبارات المطلوبة → تصفية بالمرحلة/الفصل/النافذة.
   القياس عبر examBoard (فأول ثانوي لا قياس مهما كانت الوجهة). البرامج لمرحلة القبول.
   اللغة بلا قيد صفّي (مجموعة واحدة). */
export function recommendedExams(input: RecommendInput): RecommendedExam[] {
  const kinds = requirementsOf(input.destinations);
  const out: RecommendedExam[] = [];

  /* ① القياس (qudurat/tahsili) — مصفّىً بجدول examBoard بنوافذ examProvider.
     اختيار وجهةٍ تتطلّب قياساً ⇒ مُستهدَف (isTargeted) — فيظهر التحصيلي المبكر لثاني ثانوي. */
  if (kinds.has("qudurat") || kinds.has("tahsili")) {
    const board = examBoard({
      stage: input.stage,
      isUniGrad: input.isUniGrad,
      afterFirstTerm: input.afterFirstTerm,
      isTargeted: true,
      windows: {
        qudurat: currentRegistrationStatus("قدرات", input.today),
        tahsiliEarly: currentRegistrationStatus("تحصيلي مبكر", input.today),
        tahsiliRegular: currentRegistrationStatus("تحصيلي", input.today),
      },
    });
    for (const e of board) {
      const kind: ExamKind = e.id === "qudurat" ? "qudurat" : "tahsili";
      if (!kinds.has(kind)) continue; // الوجهة لا تتطلّب هذا القياس
      out.push({ kind, boardId: e.id, label: e.label, reason: KIND_REASON[kind], state: stateFromMode(e.mode), priority: KIND_PRIORITY[kind], mode: e.mode, hint: e.hint });
    }
  }

  /* ② البرامج (أرامكو/ITC) — لمرحلة القبول (ثالث ثانوي أو خريج ثانوي) فقط. */
  const admissionStage = (input.stage === "third" || input.stage === "graduate") && !input.isUniGrad;
  for (const k of ["aramco", "itc"] as const) {
    if (kinds.has(k) && admissionStage) out.push({ kind: k, label: PROGRAM_LABEL[k], reason: KIND_REASON[k], state: "available", priority: KIND_PRIORITY[k] });
  }

  /* ③ اللغة — مجموعة واحدة، بلا قيد صفّي (وسيلةٌ لوجهاتٍ كالابتعاث/تطوير الإنجليزية). */
  if (kinds.has("language")) out.push({ kind: "language", label: "اختبارات اللغة الإنجليزية", reason: KIND_REASON.language, state: "available", priority: KIND_PRIORITY.language });

  /* ترتيب حسب الأولوية (الأصغر أهمّ) — Domain لا يعرف الواجهة. */
  return out.sort((a, b) => a.priority - b.priority);
}

/* ── جسر الملف → المعرفة (Domain): يشتقّ recommendedExams من ملف الطالب ──
   البذرة الوحيدة التي يستهلكها العقل (Life Engine). لا يعرف شيئاً عن الواجهة. */
export interface RecommendProfile {
  studyLevel?: string;
  grade?: string;
  gradStage?: string;
  targets?: string[];
  academicTerm?: string;
}
export function recommendedExamsForUser(p: RecommendProfile | null | undefined, today: string): RecommendedExam[] {
  if (!p) return [];
  const stage = toBoardStage({ studyLevel: p.studyLevel, grade: p.grade });
  if (!stage) return [];
  return recommendedExams({
    destinations: p.targets ?? [],
    stage,
    isUniGrad: p.gradStage === "خريج جامعة",
    afterFirstTerm: p.academicTerm ? p.academicTerm !== "first" : false,
    today,
  });
}
