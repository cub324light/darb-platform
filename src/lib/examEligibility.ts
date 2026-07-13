/* ─── جدول أهلية اختبارات القياس (Exam Board) — دالة نقيّة حتمية ───
   يقرّر أيّ اختبارات القياس تظهر للطالب وبأي حالةِ تسجيل، حسب: المرحلة + الفصل
   الدراسي + النافذة الرسمية (examProvider) + الاستهداف. لا يقرّر «متى» بتاريخٍ
   مُخمَّن — كل حالة نافذةٍ تأتي من examProvider (قاعدة درب: لا تاريخ مُخمَّن).

   الأصول (من قرار المالك):
   • أول ثانوي: لا قدرات ولا تحصيلي (يبني أساسه المدرسي). STEP اختياري (قسم اللغات).
   • ثاني ثانوي: القدرات. لا تحصيلي في الفصل الأول؛ التحصيلي المبكر بعده فقط إن كان
     مُستهدَفاً ونافذته قابلة للتسجيل.
   • ثالث ثانوي: القدرات. التحصيلي المبكر ما دامت نافذته لم تنتهِ، ثم يتحوّل تلقائياً
     إلى التحصيلي العادي حسب نافذة قياس.
   • خريج الثانوية: القدرات (بالنافذة). لا تحصيلي مبكر إطلاقاً. التحصيلي العادي دائماً
     يظهر: قابلاً للتسجيل أو «بانتظار فتح التسجيل».
   • الجامعي/خريج الجامعة: لا قياس (STEP اختياري فقط، خارج هذا الجدول).
   STEP واللغات: اختيارية لكل المراحل — يتكفّل بها قسم اللغات في التسجيل، لا هذا الجدول. */

import type { RegistrationStatus } from "./examProvider";

export type BoardStage = "first" | "second" | "third" | "graduate" | "university";
export type ExamBoardId = "qudurat" | "tahsiliEarly" | "tahsiliRegular";

/* حالة عرض الاختبار — تفصل «يخصّ مرحلتي» عن «هل التسجيل مفتوح الآن؟» */
export type ExamMode =
  | "register-open"     // 🟢 التسجيل مفتوح — سجّل الآن
  | "register-upcoming" // 🔔 التسجيل قادم قريباً
  | "prepare"           // استعد له (مؤهَّل، لا نافذة مفتوحة الآن)
  | "pending";          // ⏳ بانتظار فتح التسجيل (لم تُعلن الهيئة)

export interface ExamBoardEntry {
  id: ExamBoardId;
  label: string;
  mode: ExamMode;
  hint: string;
  canRegisterNow: boolean; // open فقط
}

export interface ExamBoardInput {
  stage: BoardStage;
  isUniGrad?: boolean;      // خريج جامعة — لا قياس إطلاقاً
  afterFirstTerm?: boolean; // تجاوزنا الفصل الأول؟ (قاعدة ثاني ثانوي)
  isTargeted?: boolean;     // له وجهة قبول/تجهيز مبكر (لتحصيلي ثاني ثانوي المبكر)
  windows?: Partial<Record<ExamBoardId, RegistrationStatus>>;
}

const LABEL: Record<ExamBoardId, string> = {
  qudurat: "القدرات",
  tahsiliEarly: "التحصيلي المبكر",
  tahsiliRegular: "التحصيلي",
};

const HINT: Record<ExamMode, string> = {
  "register-open": "🟢 التسجيل مفتوح الآن",
  "register-upcoming": "🔔 التسجيل قادم قريباً",
  "prepare": "استعد له — سجّل عند فتح النافذة القادمة",
  "pending": "⏳ بانتظار فتح التسجيل (هيئة تقويم التعليم والتدريب)",
};

/* حالة النافذة → وضع العرض. غير المعروف/المنتهي → «استعد له» (لا يُعرَض كمتاحٍ الآن). */
function modeFromWindow(w?: RegistrationStatus): ExamMode {
  return w === "open" ? "register-open"
    : w === "upcoming" ? "register-upcoming"
    : w === "pending" ? "pending"
    : "prepare"; // passed | undefined
}

function entry(id: ExamBoardId, mode: ExamMode): ExamBoardEntry {
  return { id, label: LABEL[id], mode, hint: HINT[mode], canRegisterNow: mode === "register-open" };
}

/** الجدول الكامل لاختبارات القياس للطالب — يستهلكه التسجيل (وأي واجهة تعرض المسار). */
export function examBoard(input: ExamBoardInput): ExamBoardEntry[] {
  const { stage, isUniGrad = false, afterFirstTerm = false, isTargeted = false, windows = {} } = input;
  const noQiyas = stage === "university" || isUniGrad;
  if (noQiyas) return []; // الجامعي/خريج الجامعة: لا قياس (STEP اختياري خارج الجدول)

  const out: ExamBoardEntry[] = [];

  /* ── القدرات: ثاني/ثالث/خريج (لا أول ثانوي) ── */
  if (stage === "second" || stage === "third" || stage === "graduate") {
    out.push(entry("qudurat", modeFromWindow(windows.qudurat)));
  }

  /* ── التحصيلي المبكر ── */
  const earlyWin = windows.tahsiliEarly;
  const earlyClosed = earlyWin === "passed" || earlyWin === undefined;
  if (stage === "second") {
    /* بعد الفصل الأول + مُستهدَف + النافذة قابلة للتسجيل (مفتوحة/قادمة) */
    if (afterFirstTerm && isTargeted && (earlyWin === "open" || earlyWin === "upcoming")) {
      out.push(entry("tahsiliEarly", modeFromWindow(earlyWin)));
    }
  } else if (stage === "third") {
    /* يظهر ما دامت نافذته لم تنتهِ؛ بعد انتهائها يتحوّل للعادي */
    if (!earlyClosed) out.push(entry("tahsiliEarly", modeFromWindow(earlyWin)));
  }
  /* first/graduate: لا تحصيلي مبكر إطلاقاً */

  /* ── التحصيلي العادي ── */
  if (stage === "third") {
    /* بعد انتهاء نافذة المبكر فقط */
    if (earlyClosed) out.push(entry("tahsiliRegular", modeFromWindow(windows.tahsiliRegular)));
  } else if (stage === "graduate") {
    /* دائماً يظهر: قابلاً للتسجيل أو «بانتظار فتح التسجيل» */
    out.push(entry("tahsiliRegular", modeFromWindow(windows.tahsiliRegular)));
  }

  return out;
}
