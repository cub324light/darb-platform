/* ─── الترتيب الرسمي للاختبارات + كتالوج «ما أدري» ───
   الترتيب الموحّد (قرار المالك) لأي عرضٍ للاختبارات في التسجيل، وكتالوج الفرص الذي
   يُعرض حين لا يحدّد الطالب هدفه («ما أدري») — كل اختبارٍ وما قد يفتحه من فرصٍ مستقبلية.
   محتوى ثابت — بيانات فقط، لا واجهة. */

/* الترتيب الرسمي: القدرات → التحصيلي → STEP → التحصيلي المبكر → ITC → CPC → IELTS → TOEFL → Duolingo. */
export const EXAM_ORDER: Record<string, number> = {
  qudurat: 1, tahsili: 2, step: 3, tahsiliEarly: 4, itc: 5, cpc: 6, ielts: 7, toefl: 8, duolingo: 9,
};

/* رتبة اختبارٍ مُوصىً به (من recommendedExams) وفق الترتيب الرسمي — لفرز العرض. */
export function recExamRank(e: { kind: string; boardId?: string }): number {
  if (e.kind === "qudurat") return EXAM_ORDER.qudurat;
  if (e.kind === "tahsili") return e.boardId === "tahsiliEarly" ? EXAM_ORDER.tahsiliEarly : EXAM_ORDER.tahsili;
  if (e.kind === "language") return EXAM_ORDER.step; // اللغة تُعرض مكان STEP في الترتيب
  if (e.kind === "itc") return EXAM_ORDER.itc;
  if (e.kind === "aramco") return EXAM_ORDER.cpc;
  return 99;
}

export interface ExamOpportunity { id: string; label: string; opens: string[]; }

/* كتالوج «ما أدري»: كل الاختبارات وما تفتحه — بالترتيب الرسمي (بلا التحصيلي المبكر،
   فهو حالةٌ خاصة بجامعة البترول تُعرض ضمن دليلها لا في اقتراح الفرص العام). */
export const UNDECIDED_EXAM_CARDS: ExamOpportunity[] = [
  { id: "qudurat",  label: "القدرات",  opens: ["الجامعات", "جامعة الملك فهد للبترول والمعادن", "ITC", "بعض الكليات العسكرية"] },
  { id: "tahsili",  label: "التحصيلي", opens: ["الطب", "الهندسة", "التخصصات العلمية", "جامعة الملك فهد"] },
  { id: "step",     label: "STEP",     opens: ["جامعة الملك فهد", "الإعفاء من مقررات اللغة الإنجليزية في بعض الجامعات", "بعض برامج التوظيف"] },
  { id: "itc",      label: "ITC",      opens: ["برنامج التدرّج المهني في أرامكو"] },
  { id: "cpc",      label: "CPC",      opens: ["برنامج الإعداد الجامعي في أرامكو"] },
  { id: "ielts",    label: "IELTS",    opens: ["الابتعاث", "الجامعات العالمية"] },
  { id: "toefl",    label: "TOEFL",    opens: ["الابتعاث", "الجامعات الأمريكية"] },
  { id: "duolingo", label: "Duolingo", opens: ["جامعة الملك فهد (إذا كان مقبولاً في تلك السنة)", "بعض الجامعات العالمية"] },
];
