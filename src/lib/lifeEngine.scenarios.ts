/* ─── حالات التحقّق — «لا ربط قبل أن نراجع القرارات على حالات حقيقية» ───
   ٤٠+ حالة تغطّي رحلة الطالب كاملة (ثانوي/جامعي/خريج × معدّلات/تدريب/اختبارات).
   يستهلكها اختبارُ الانحدار وصفحةُ المصفوفة (dev) معاً. بيانات نقية بلا IO.
   expectTop اختياري: نثبّته للحالات القاطعة فقط (نترك الغامضة لمراجعة العين). */
import type { LifeContext, PriorityKey } from "./lifeEngine";

const uni = (o: Partial<LifeContext>): LifeContext => ({
  stage: "university", uniStage: "mid", gpa: 3.0, hours: 60, year: "الثانية",
  majorId: "ee", majorName: "هندسة كهربائية", coopDone: false, gradInterest: false,
  inSchoolFinals: false, daysToSchoolFinals: null, qiyas: null,
  uniFinalsInDays: null, termLabel: "الفصل الثاني", inStudyTerm: true, ...o,
});
const sec = (o: Partial<LifeContext>): LifeContext => ({
  stage: "first", uniStage: null, gpa: null, hours: null, year: null,
  majorId: null, majorName: null, coopDone: false, gradInterest: false,
  inSchoolFinals: false, daysToSchoolFinals: null, qiyas: null,
  uniFinalsInDays: null, termLabel: null, inStudyTerm: true, ...o,
});
const q = (days: number, kind: "qudurat" | "tahsili" | "step" = "qudurat", label = "القدرات العامة") =>
  ({ kind, label, days, weeks: Math.ceil(days / 7), approximate: true });

export interface Scenario {
  id: string;
  name: string;
  ctx: LifeContext;
  expectTop?: PriorityKey; // نُثبّته للحالات القاطعة فقط
}

export const SCENARIOS: Scenario[] = [
  /* ═════ ثانوي ═════ */
  { id: "s01", name: "أول ثانوي — بلا ضغط", ctx: sec({ stage: "first" }), expectTop: "early" },
  { id: "s02", name: "أول ثانوي — قدرات بعد ٦ أسابيع", ctx: sec({ stage: "first", qiyas: q(42) }), expectTop: "qiyas" },
  { id: "s03", name: "ثاني ثانوي — بلا ضغط", ctx: sec({ stage: "second" }), expectTop: "early" },
  { id: "s04", name: "ثاني ثانوي — تحصيلي مبكر بعد ٣ أسابيع", ctx: sec({ stage: "second", qiyas: q(21, "tahsili", "التحصيلي") }), expectTop: "qiyas" },
  { id: "s05", name: "ثالث ثانوي — درجاته ممتازة", ctx: sec({ stage: "third" }), expectTop: "admission" },
  { id: "s06", name: "ثالث ثانوي — درجاته منخفضة", ctx: sec({ stage: "third" }), expectTop: "admission" },
  { id: "s07", name: "ثالث ثانوي — اختبارات مدرسية بعد ١٠ أيام", ctx: sec({ stage: "third", daysToSchoolFinals: 10 }), expectTop: "school-finals-soon" },
  { id: "s08", name: "ثالث ثانوي — اختبارات مدرسية الآن", ctx: sec({ stage: "third", inSchoolFinals: true }), expectTop: "school-finals-now" },
  { id: "s09", name: "ثالث ثانوي — قدرات بعد أسبوعين", ctx: sec({ stage: "third", qiyas: q(14) }) },
  { id: "s10", name: "خريج ثانوي — ينتظر القبول", ctx: sec({ stage: "graduate" }), expectTop: "admission" },
  { id: "s11", name: "خريج — سنة استدراك + قدرات قريبة", ctx: sec({ stage: "graduate", qiyas: q(30) }) },

  /* ═════ جامعي — بداية ═════ */
  { id: "u01", name: "سنة أولى — معدّل ٣٫٢", ctx: uni({ uniStage: "start", year: "الأولى", hours: 18, gpa: 3.2 }), expectTop: "foundation" },
  { id: "u02", name: "سنة أولى — معدّل ٢٫٤ (متعثّر مبكّر)", ctx: uni({ uniStage: "start", year: "الأولى", hours: 20, gpa: 2.4 }), expectTop: "gpa" },
  { id: "u03", name: "سنة أولى — معدّل ٤٫٧", ctx: uni({ uniStage: "start", year: "الأولى", hours: 22, gpa: 4.7 }), expectTop: "foundation" },
  { id: "u04", name: "سنة أولى — خارج الفصل (إجازة)", ctx: uni({ uniStage: "start", year: "الأولى", hours: 15, gpa: 3.0, inStudyTerm: false }), expectTop: "foundation" },

  /* ═════ جامعي — منتصف ═════ */
  { id: "u05", name: "سنة ثانية — معدّل ٣٫٦ بلا تدريب", ctx: uni({ uniStage: "mid", gpa: 3.6, coopDone: false }), expectTop: "coop" },
  { id: "u06", name: "سنة ثانية — معدّل ٣٫٤ أنهى التدريب", ctx: uni({ uniStage: "mid", gpa: 3.4, coopDone: true }), expectTop: "cert" },
  { id: "u07", name: "سنة ثالثة — معدّل ٤٫٩", ctx: uni({ uniStage: "mid", year: "الثالثة", hours: 90, gpa: 4.9 }), expectTop: "research" },
  { id: "u08", name: "سنة ثالثة — معدّل ٢٫١ (متعثّر)", ctx: uni({ uniStage: "mid", year: "الثالثة", hours: 88, gpa: 2.1 }), expectTop: "gpa" },
  { id: "u09", name: "سنة ثالثة — معدّل ٢٫١ + اختبارات بعد ٥ أيام", ctx: uni({ uniStage: "mid", year: "الثالثة", hours: 88, gpa: 2.1, uniFinalsInDays: 5 }), expectTop: "uni-finals" },
  { id: "u10", name: "منتصف — معدّل ٢٫٧ (على الحدّ تحت)", ctx: uni({ uniStage: "mid", gpa: 2.7 }), expectTop: "gpa" },
  { id: "u11", name: "منتصف — معدّل ٢٫٧٥ (على الحدّ فوق)", ctx: uni({ uniStage: "mid", gpa: 2.75 }), expectTop: "coop" },
  { id: "u12", name: "منتصف — معدّل مجهول (لم يُدخِل)", ctx: uni({ uniStage: "mid", gpa: null }), expectTop: "coop" },

  /* ═════ جامعي — قرب التخرّج ═════ */
  { id: "u13", name: "قرب التخرّج — معدّل ٣٫٥ بلا تدريب", ctx: uni({ uniStage: "senior", year: "الرابعة", hours: 115, gpa: 3.5, coopDone: false }), expectTop: "cv" },
  { id: "u14", name: "قرب التخرّج — معدّل ٣٫٥ أنهى التدريب", ctx: uni({ uniStage: "senior", year: "الرابعة", hours: 118, gpa: 3.5, coopDone: true }), expectTop: "cv" },
  { id: "u15", name: "قرب التخرّج — معدّل ٤٫٩ (متميّز)", ctx: uni({ uniStage: "senior", year: "الرابعة", hours: 120, gpa: 4.9 }), expectTop: "research" },
  { id: "u16", name: "قرب التخرّج — معدّل ٢٫٣ (متعثّر)", ctx: uni({ uniStage: "senior", year: "الرابعة", hours: 115, gpa: 2.3 }), expectTop: "gpa" },
  { id: "u17", name: "قرب التخرّج — اختبارات بعد ٣ أيام", ctx: uni({ uniStage: "senior", year: "الرابعة", hours: 120, gpa: 3.4, uniFinalsInDays: 3 }), expectTop: "uni-finals" },
  { id: "u18", name: "قرب التخرّج — معدّل مجهول", ctx: uni({ uniStage: "senior", year: "الرابعة", hours: 120, gpa: null }), expectTop: "cv" },
  { id: "u19", name: "خريج جامعة يبحث عن وظيفة (قرب التخرّج)", ctx: uni({ uniStage: "senior", year: "الخامسة+", hours: 130, gpa: 3.2, coopDone: true }), expectTop: "cv" },
  { id: "u20", name: "خريج جامعة متميّز يريد دراسات عليا", ctx: uni({ uniStage: "senior", year: "الخامسة+", hours: 132, gpa: 4.8, gradInterest: true }), expectTop: "research" },

  /* ═════ اختبارات/فصل — تنويعات ═════ */
  { id: "u21", name: "منتصف — اختبارات بعد ٢٠ يوماً (داخل النافذة)", ctx: uni({ uniStage: "mid", gpa: 3.3, uniFinalsInDays: 20 }), expectTop: "uni-finals" },
  { id: "u22", name: "منتصف — اختبارات بعد ٢٥ يوماً (خارج النافذة)", ctx: uni({ uniStage: "mid", gpa: 3.3, uniFinalsInDays: 25 }), expectTop: "coop" },
  { id: "u23", name: "بداية — داخل الفصل بلا اختبارات", ctx: uni({ uniStage: "start", year: "الأولى", hours: 16, gpa: 3.1, inStudyTerm: true }), expectTop: "foundation" },
  { id: "u24", name: "قرب التخرّج — بلا تخصص محدّد", ctx: uni({ uniStage: "senior", year: "الرابعة", hours: 116, gpa: 3.4, majorId: null, majorName: null }), expectTop: "cv" },

  /* ═════ حالات دقيقة/متطرّفة ═════ */
  { id: "e01", name: "منتصف — معدّل ١٫٩ (تعثّر شديد)", ctx: uni({ uniStage: "mid", year: "الثالثة", hours: 85, gpa: 1.9 }), expectTop: "gpa" },
  { id: "e02", name: "منتصف — معدّل ٤٫٥ بالضبط", ctx: uni({ uniStage: "mid", gpa: 4.5 }), expectTop: "research" },
  { id: "e03", name: "منتصف — معدّل ٤٫٤٩ (تحت عتبة التميّز)", ctx: uni({ uniStage: "mid", gpa: 4.49 }), expectTop: "coop" },
  { id: "e04", name: "قرب التخرّج — أنهى التدريب + متعثّر", ctx: uni({ uniStage: "senior", year: "الرابعة", hours: 118, gpa: 2.2, coopDone: true }), expectTop: "gpa" },
  { id: "e05", name: "ثالث ثانوي — اختبارات الآن + قدرات قريبة", ctx: sec({ stage: "third", inSchoolFinals: true, qiyas: q(20) }), expectTop: "school-finals-now" },
  { id: "e06", name: "أول ثانوي — اختبارات مدرسية بعد ١٥ يوماً", ctx: sec({ stage: "first", daysToSchoolFinals: 15 }), expectTop: "school-finals-soon" },
];
