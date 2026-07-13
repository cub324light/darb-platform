/* ─── إمكانية إعادة الاختبار (Retake Availability) — دالة نقيّة حتمية ───
   قرار «هل أعيد هذا الاختبار؟» لا يُعرَض إلا إذا كانت الإعادة ممكنة فعلاً:
     ١) المرحلة تسمح بها (أول ثانوي مبكّر جداً · جامعي/خريج جامعة خارج القبول).
     ٢) باب التسجيل الرسمي غير منتهٍ (نافذة مفتوحة/قادمة/بانتظار الإعلان — لا نافذة منتهية).
   إن تعذّرت الإعادة: لا نقترحها، ونكشف «أفضل خطوة تالية» بدلاً منها. Life Engine
   يقرأ نفس المنطق (achievableRetakes) فلا يقترح إعادةً مستحيلة أبداً.
   المصدر الوحيد لحالة النوافذ: examProvider (قاعدة درب: لا تاريخ مُخمَّن ولا منتهٍ). */
import type { Stage } from "./experience";
import type { TrackId } from "./tracks";
import { examKeyOf, type ExamKey } from "./satisfaction";
import { nearestActiveWindow, type RegistrationStatus } from "./examProvider";

/* أي اختبارات قياس يُعرَض قرار إعادتها لكل مرحلة؟
   أول ثانوي: لا شيء (مبكّر — الدرجة ليست «نهائية» بعد، والتركيز على البناء).
   ثاني ثانوي: القدرات فقط (التحصيلي/STEP سابقان لأوانهما).
   ثالث ثانوي / خريج ثانوي: كل اختبارات القياس (سنة/موسم القبول).
   جامعي / خريج جامعة: لا شيء (خارج عالم القبول — يُحكَم أيضاً بـ admissionOpen). */
const STAGE_RETAKE_EXAMS: Record<Stage, ExamKey[]> = {
  first: [],
  second: ["qudurat"],
  third: ["qudurat", "tahsili", "step"],
  university: [],
  graduate: ["qudurat", "tahsili", "step"],
};

const EXAM_TRACK: Record<ExamKey, TrackId> = {
  qudurat: "قدرات",
  tahsili: "تحصيلي",
  step: "ستيب",
};

export type RetakeReason =
  | "ok"             // ممكنة — نافذة مفتوحة/قادمة
  | "pending"        // ممكنة مستقبلاً — بانتظار إعلان الموعد الرسمي
  | "stage"          // المرحلة لا تطرح إعادة هذا الاختبار الآن
  | "window-closed"; // لا نافذة تسجيل قادمة (انتهى باب هذه الدورة)

export interface RetakeAvailability {
  possible: boolean;              // هل يمكن تفعيل خطة إعادة فعلاً؟
  reason: RetakeReason;
  windowStatus: RegistrationStatus | null; // حالة أقرب نافذة (للعرض بلا تخمين)
  windowLabel: string | null;     // «1448هـ — الموعد الأول» أو نص الانتظار
}

/* هل يسمح وضع القبول بإعادة أصلاً؟ (خريج الجامعة/الجامعي → القبول مخفي → لا) */
function admissionAllows(stage: Stage, admissionOpen: boolean): boolean {
  if (stage === "university") return false;
  return admissionOpen;
}

/* الحكم النقي لاختبارٍ واحد */
export function retakeAvailability(
  key: ExamKey,
  stage: Stage,
  today: string,
  opts?: { admissionOpen?: boolean },
): RetakeAvailability {
  const admissionOpen = opts?.admissionOpen ?? true;
  const stageAllows = admissionAllows(stage, admissionOpen) && STAGE_RETAKE_EXAMS[stage].includes(key);
  if (!stageAllows) {
    return { possible: false, reason: "stage", windowStatus: null, windowLabel: null };
  }
  const near = nearestActiveWindow(EXAM_TRACK[key], today);
  if (!near) {
    /* لا نافذة مفتوحة/قادمة/بانتظار — باب هذه الدورة انتهى */
    return { possible: false, reason: "window-closed", windowStatus: null, windowLabel: null };
  }
  const { window: w, status } = near;
  if (status === "pending") {
    return { possible: true, reason: "pending", windowStatus: status, windowLabel: w.yearLabel };
  }
  return { possible: true, reason: "ok", windowStatus: status, windowLabel: w.yearLabel };
}

/* أفضل خطوة تالية حين تتعذّر الإعادة — لا نترك الطالب معلّقاً.
   (لا نغيّر أهدافه الرقمية سرّاً؛ نكشف الوجهة الأصدق فيتبعها بنفسه.) */
export interface NextStep { label: string; href: string; }

export function bestNextStep(stage: Stage, key: ExamKey): NextStep {
  /* مبكّر (أول/ثاني): ابنِ الآن — لا «إعادة» بل بداية */
  if (stage === "first" || stage === "second") {
    return { label: "ماذا تريد أن تبدأ الآن؟ نظّم مذاكرتك من مساري.", href: "/roadmap" };
  }
  /* ثالث/خريج ثانوي: الدرجة الحالية = مدخل موزونتك، فرتّب رغباتك بها */
  const examAr = key === "qudurat" ? "القدرات" : key === "tahsili" ? "التحصيلي" : "STEP";
  return {
    label: `لا نافذة تسجيل مفتوحة لإعادة ${examAr} الآن — احسب نسبتك الموزونة بدرجتك الحالية ورتّب رغباتك.`,
    href: "/university",
  };
}

/* حالة قرار الطالب لكل اختبار (ثلاث حالات صريحة) */
export type FinalityState = "final" | "retake" | "undecided";

/* ─── الجسر إلى Life Engine ─── */

/* يُصفّي نوايا الإعادة المخزّنة إلى ما يمكن تحقيقه فعلاً (مرحلة + نافذة).
   قياس فقط يُحكَم بالنافذة؛ ما لا مفتاح قياس له (CPC/ITC) يمرّ كما هو. */
export function achievableRetakes(
  retakeExams: string[],
  stage: Stage,
  today: string,
  opts?: { admissionOpen?: boolean },
): string[] {
  return retakeExams.filter((exam) => {
    const key = examKeyOf(exam);
    if (!key) return true; // خارج نطاق قياس — لا نحكمه بالنافذة
    return retakeAvailability(key, stage, today, opts).possible;
  });
}
