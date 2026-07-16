/* اختبارات دويرب — تشغيل: npx tsx --test src/lib/duwairb.test.ts
   العقد المعماري (ADR-0001 §6): دويرب لا يفسّر حالة الطالب، بل يشرح قرار Life Engine.
   نتحقّق أن كتلة البرومبت تحمل الحالة المقطّرة (أولوية/تركيز/إعادة) بدل مفهوم «الهدف» القديم،
   وأن عالم الجامعي لا يتسرّب إليه قياس/قبول. formatProfileBlock نقيّة (من ملف، بلا تخزين). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatProfileBlock, type DuwairbProfile } from "./duwairb";

test("الثانوي: الكتلة تحمل قرار Life Engine (أولوية/تركيز/إعادة) لا «هدفه الحالي»", () => {
  const p: DuwairbProfile = {
    name: "سارة",
    eduStatus: "ثانوي",
    stage: "third",
    currentPriority: { title: "التحصيلي — أولوية كاملة", why: "أنت في سنة القبول الجامعي." },
    focus: "تحسين التحصيلي",
    retakeIntent: ["القدرات"],
    exams: [{ name: "التحصيلي", target: 90 }],
  };
  const block = formatProfileBlock(p);
  assert.ok(block.includes("التحصيلي — أولوية كاملة"), "أولوية Life Engine غائبة");
  assert.ok(block.includes("قرار Life Engine"), "لم يُصرَّح أنها قرار العقل (يشرح لا يقرّر)");
  assert.ok(block.includes("تحسين التحصيلي"), "التركيز الأول غائب");
  assert.ok(block.includes("اختار إعادة"), "نيّة الإعادة غائبة");
  assert.ok(!/هدفه الحالي/.test(block), "ما زال يذكر مفهوم «الهدف» القديم المحذوف");
});

test("الجامعي: الكتلة تحمل أولوية العقل، والأولوية نفسها لا تذكر قياساً، والحارس الجامعي قائم", () => {
  const p: DuwairbProfile = {
    name: "خالد",
    eduStatus: "جامعي",
    universityYear: "الرابعة",
    stage: "university",
    currentPriority: { title: "تجهيز سيرتك الذاتية", why: "أنت قريب من التخرّج." },
    universityGpa: 3.6,
  };
  const block = formatProfileBlock(p);
  assert.ok(block.includes("تجهيز سيرتك الذاتية"), "أولوية Life Engine الجامعية غائبة");
  /* سطر الأولوية نفسه (لا الحارس الذي يذكرها كمحظور) خالٍ من عالم القياس/القبول */
  const priorityLine = block.split("\n").find((l) => l.includes("أولوية الطالب الآن")) ?? "";
  assert.ok(!/قدرات|تحصيلي|موزون|القبول الجامعي/.test(priorityLine), "تسرّب عالم القياس لسطر الأولوية الجامعية");
  /* الحارس الجامعي (الحكم الأساسي) ما زال يمنع ذكر القياس/القبول */
  assert.ok(/لا تذكر أبداً القدرات أو التحصيلي/.test(block), "حارس عالم الجامعي غائب");
});

test("بلا حالة مقطّرة: لا سطر أولوية، ولا ينكسر", () => {
  const block = formatProfileBlock({ name: "ندى", eduStatus: "ثانوي", exams: [{ name: "القدرات العامة" }] });
  assert.ok(!/قرار Life Engine/.test(block), "أظهر سطر أولوية بلا قرار");
  assert.ok(block.includes("القدرات العامة"), "الاختبارات المطلوبة غائبة");
});
