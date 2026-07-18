/* ─── أهلية الاختبارات حسب المرحلة الدراسية (منتقي التسجيل) ───
   المصدر النقيّ لخطوة اختيار الاختبارات في التسجيل: أي اختبارٍ متاحٌ للطالب الآن
   وأيّها مقفلٌ 🔒 (لا يُخفى — يبقى ظاهراً ليعرف الطالب ما ينتظره). قرار المالك:
   القدرات تبدأ فعلياً في الإجازة قبل ثاني ثانوي؛ التحصيلي (العادي والمبكر) والبرامج
   تُفتح في الإجازة قبل ثالث ثانوي. اللغة بلا قيدٍ صفّي. نقيّ — بيانات فقط، لا واجهة. */

/* مراحل التسجيل الستّ (+ الجامعي الذي يتخطّى هذه الخطوة). الإجازتان نقطتا انتقال. */
export type OnbStage = "first" | "summer2" | "second" | "summer3" | "third" | "graduate" | "university";

export interface StageExam {
  id: string;              // qudurat | tahsili | tahsiliEarly | step | ielts | toefl | duolingo | itc | cpc
  label: string;
  state: "open" | "locked";
  opens: string[];         // «يفتح لك» — مختصر
}

export const STAGE_LOCK_REASON = "يفتح لك لاحقاً عند انتقالك للمرحلة المناسبة.";

/* الترتيب الرسمي: قدرات → تحصيلي → STEP → مبكر → ITC → CPC → IELTS → TOEFL → Duolingo. */
const ORDER = ["qudurat", "tahsili", "step", "tahsiliEarly", "itc", "cpc", "ielts", "toefl", "duolingo"] as const;

const LABEL: Record<string, string> = {
  qudurat: "القدرات", tahsili: "التحصيلي", tahsiliEarly: "التحصيلي المبكر", step: "STEP",
  ielts: "IELTS", toefl: "TOEFL", duolingo: "Duolingo", itc: "ITC", cpc: "CPC",
};

const OPENS: Record<string, string[]> = {
  qudurat: ["الجامعات", "جامعة البترول", "ITC", "بعض الكليات العسكرية"],
  tahsili: ["الطب", "الهندسة", "التخصصات العلمية"],
  tahsiliEarly: ["القبول المبكر في جامعة البترول"],
  step: ["جامعة البترول", "الإعفاء من مقررات اللغة", "بعض برامج التوظيف"],
  ielts: ["الابتعاث", "الجامعات العالمية"],
  toefl: ["الابتعاث", "الجامعات الأمريكية"],
  duolingo: ["جامعة البترول (إن قُبل)", "بعض الجامعات العالمية"],
  itc: ["التدرّج المهني في أرامكو"],
  cpc: ["الإعداد الجامعي في أرامكو"],
};

const LANGS = ["step", "ielts", "toefl", "duolingo"];
const ALL = [...ORDER];

/* مجموعة الاختبارات المفتوحة لكل مرحلة (قرار المالك). */
function openIds(stage: OnbStage): Set<string> {
  switch (stage) {
    case "first":     return new Set(LANGS);                                  // اللغة فقط؛ القياس/البرامج مقفلة
    case "summer2":   return new Set(["qudurat", ...LANGS]);                  // القدرات تفتح، التحصيلي/البرامج مقفلة
    case "second":    return new Set(["qudurat", ...LANGS]);                  // كالإجازة قبل ثاني
    case "summer3":   return new Set(ALL);                                    // تُفتح جميع الاختبارات
    case "third":     return new Set(ALL);
    case "graduate":  return new Set(ALL);
    case "university": return new Set();                                      // الجامعي يتخطّى هذه الخطوة
  }
}

/** قائمة اختبارات المرحلة بالترتيب الرسمي مع حالة كلٍّ (مفتوح/مقفل) — لا يُخفى المقفل. */
export function stageExams(stage: OnbStage): StageExam[] {
  const open = openIds(stage);
  return ORDER.map((id) => ({ id, label: LABEL[id], state: open.has(id) ? "open" : "locked", opens: OPENS[id] }));
}

/** الاختبارات المفتوحة فقط (بالترتيب) — للتحقّق من الاقتراح والاختيار. */
export const openStageExams = (stage: OnbStage): StageExam[] => stageExams(stage).filter((e) => e.state === "open");

/** اسم اختبارٍ من معرّفه. */
export const examLabelOf = (id: string): string => LABEL[id] ?? id;

/* معرّف الاختبار → TrackId القديم (لبذر مساري عبر ensureWorkspace). */
export const EXAM_TO_TRACK: Record<string, string> = {
  qudurat: "قدرات", tahsili: "تحصيلي", tahsiliEarly: "تحصيلي مبكر",
  step: "ستيب", ielts: "ايلتس", toefl: "توفل", duolingo: "دوليقو", itc: "ITC", cpc: "CPC",
};

/* معرّف الاختبار → مفتاح إدخال الدرجة (قدرات/تحصيلي/step). غيرها لا يُدخَل بالتسجيل. */
export const EXAM_SCORE_KEY: Record<string, "qudurat" | "tahsili" | "step" | undefined> = {
  qudurat: "qudurat", tahsili: "tahsili", tahsiliEarly: "tahsili", step: "step",
};

export const MAX_EXAMS = 3;
