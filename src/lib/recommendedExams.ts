/* ─── محرّك الاختبارات المطلوبة (Recommended Exams) — ADR-0001 ───
   المصدر الرسمي الوحيد لاشتقاق اختبارات الطالب من وجهته. التسلسل:
   الوجهة → الاختبارات المطلوبة → (تصفية بالمرحلة/الفصل/النافذة). الاختبارات وسائل
   لا أهداف: النظام يستنتج «القدرات مطلوبة» من الوجهة، لا يختارها الطالب كهدف.
   يقرأ منه: دويرب/الخطة/الرئيسية/الإشعارات/مساري (+ نتائج الطالب + نيّة الإعادة).
   نقيّ وحتمي — يعيد استخدام examBoard (القياس) وexamProvider (النوافذ) بلا تكرار. */

import { examBoard, type BoardStage, type ExamBoardId, type ExamMode } from "./examEligibility";
import { currentRegistrationStatus } from "./examProvider";

/* أنواع الاختبارات التي قد تتطلّبها وجهة (وسائل الوصول). */
export type ExamKind = "qudurat" | "tahsili" | "aramco" | "itc" | "niti" | "language";

/* ما تتطلّبه كل وجهة (requirementsOf). المفاتيح = معرّفات وجهات التسجيل.
   يشمل الكتالوج القديم (sabic/military/training) للتوافق حتى تُوحَّد الوجهات (خطوة ١). */
export const DESTINATION_REQUIREMENTS: Record<string, ExamKind[]> = {
  university:  ["qudurat", "tahsili"],
  major:       ["qudurat", "tahsili"],
  aramco:      ["qudurat", "tahsili", "aramco"],
  itc:         ["qudurat", "itc"],
  niti:        ["qudurat", "niti"],
  scholarship: ["qudurat", "tahsili", "language"], // ابتعاث
  job:         ["language"],                        // وظيفة
  english:     ["language"],                        // تطوير الإنجليزية
  /* توافق مؤقّت مع كتالوج ADMISSION_TARGETS القديم */
  sabic:       ["qudurat", "tahsili"],
  military:    ["qudurat"],
  training:    ["language"],
};

const PROGRAM_LABEL: Record<"aramco" | "itc" | "niti", string> = {
  aramco: "أرامكو", itc: "ITC", niti: "NITI",
};

/* مجموعة أنواع الاختبارات التي تتطلّبها الوجهات المختارة (بلا تصفية أهلية). */
export function requirementsOf(destinations: string[]): Set<ExamKind> {
  const kinds = new Set<ExamKind>();
  for (const d of destinations) for (const k of DESTINATION_REQUIREMENTS[d] ?? []) kinds.add(k);
  return kinds;
}

/* اختبارٌ مطلوبٌ مشتقّ — مع حالة نافذته (للقياس) واسمه المعروض. */
export interface RecommendedExam {
  kind: ExamKind;
  boardId?: ExamBoardId; // للقياس: qudurat | tahsiliEarly | tahsiliRegular
  label: string;         // الاسم المعروض (القياس: المبكر/العادي حسب النافذة)
  mode?: ExamMode;       // حالة النافذة (للقياس)
  hint?: string;         // نصّ حالة النافذة (🟢/🔔/⏳)
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
      out.push({ kind, boardId: e.id, label: e.label, mode: e.mode, hint: e.hint });
    }
  }

  /* ② البرامج (أرامكو/ITC/NITI) — لمرحلة القبول (ثالث ثانوي أو خريج ثانوي) فقط. */
  const admissionStage = (input.stage === "third" || input.stage === "graduate") && !input.isUniGrad;
  for (const k of ["aramco", "itc", "niti"] as const) {
    if (kinds.has(k) && admissionStage) out.push({ kind: k, label: PROGRAM_LABEL[k] });
  }

  /* ③ اللغة — مجموعة واحدة، بلا قيد صفّي (وسيلةٌ لوجهاتٍ كالابتعاث/تطوير الإنجليزية). */
  if (kinds.has("language")) out.push({ kind: "language", label: "اختبارات اللغة الإنجليزية" });

  return out;
}
