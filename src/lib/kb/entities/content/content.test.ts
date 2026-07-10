/* اختبار دفعات المحتوى — تشغيل: npx tsx --test src/lib/kb/entities/content/content.test.ts
   نتحقق أن الدفعة الأولى (مفاهيم القدرات) سليمة ومربوطة، وأن الرسم يبقى صحيحاً
   بعد دمجها، وأن لوحة القيادة تعكس الأعداد. البناء بالدفعات: ٢٠–٣٠ عقدة. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { KB } from "../index";
import { QUDURAT_CONCEPTS } from "./qudurat";
import { TAHSILI_CONCEPTS } from "./tahsili";
import { ENGLISH_CONCEPTS } from "./english";
import { domainProgress, conceptsByImportance, topConcepts } from "./domains";
import { knowledgeCoverage } from "./coverage";

test("الرسم يبقى سليماً بعد دمج دفعة المحتوى (لا حواف معلّقة)", () => {
  assert.deepEqual(KB.validate(), []);
});

test("دفعة القدرات: حجمها ضمن ٢٠–٣٠، كلها مفاهيم بمعرّفات فريدة", () => {
  assert.ok(QUDURAT_CONCEPTS.length >= 20 && QUDURAT_CONCEPTS.length <= 30, `حجم غير مطابق: ${QUDURAT_CONCEPTS.length}`);
  const ids = QUDURAT_CONCEPTS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "معرّف مكرّر");
  for (const c of QUDURAT_CONCEPTS) assert.equal(c.kind, "concept");
});

test("كل مفهوم ينتمي لاختبار القدرات وله مصدرٌ وثقةٌ ووزنٌ وتكرار", () => {
  for (const c of QUDURAT_CONCEPTS) {
    assert.ok(c.relations?.some((r) => r.type === "belongs_to" && r.to === "exam:qudurat"), `${c.id}: غير مربوط بالقدرات`);
    const m = c.meta!;
    assert.ok(m.source && m.source.trim() !== "", `${c.id}: بلا مصدر`);
    assert.ok(m.importance != null, `${c.id}: بلا أهمية`);
    assert.ok(m.confidence != null && m.confidence < 1, `${c.id}: ثقة ١٠٠٪ غير مبرّرة`);
    assert.ok(c.examFrequency != null && c.examFrequency >= 0 && c.examFrequency <= 100, `${c.id}: تكرارٌ مفقود أو خارج المدى`);
  }
});

test("لوحة القيادة: تقدّم القدرات يساوي عدد مفاهيم الدفعة", () => {
  const qudurat = domainProgress(KB).find((d) => d.key === "qudurat")!;
  assert.equal(qudurat.actual, QUDURAT_CONCEPTS.length);
  assert.ok(qudurat.pct > 0 && qudurat.pct <= 100);
});

test("المفاهيم تظهر عبر belongs_to العكسي على اختبار القدرات", () => {
  const concepts = KB.neighbors("exam:qudurat", { type: "belongs_to", dir: "in", kind: "concept" });
  assert.ok(concepts.some((c) => c.id === "concept:q-analogy"));
  assert.ok(concepts.length >= QUDURAT_CONCEPTS.length);
});

test("لوحة القيادة: تفصيلٌ لكل مجال مفاهيم (وطبقة ثانية صفر الآن)", () => {
  const qudurat = domainProgress(KB).find((d) => d.key === "qudurat")!;
  assert.ok(qudurat.counts, "بلا تفصيل");
  assert.equal(qudurat.counts!.concepts, QUDURAT_CONCEPTS.length);
  assert.equal(qudurat.counts!.lessons, 0);   // لم نبدأ الطبقة الثانية
  assert.equal(qudurat.counts!.questions, 0);
});

test("ترتيب المفاهيم حسب الأهمية: شرائح تنازلية غير فارغة", () => {
  const tiers = conceptsByImportance(KB, "exam:qudurat");
  assert.ok(tiers.length > 0);
  const flat = tiers.flatMap((t) => t.items);
  assert.equal(flat.length, QUDURAT_CONCEPTS.length);
  for (let i = 1; i < flat.length; i++) assert.ok(flat[i - 1].importance >= flat[i].importance, "غير مرتّبة تنازلياً");
});

test("لكل مفهوم أماكن حقوله الثابتة (body اختياري — بنيةٌ جاهزة للملء)", () => {
  /* الحقول اختيارية بالنوع؛ نتأكّد أن المخطّط يقبلها دون إعادة هيكلة */
  const withBody = { ...QUDURAT_CONCEPTS[0], body: { definition: "تعريف تجريبي" } };
  assert.equal(withBody.body.definition, "تعريف تجريبي");
});

/* ════════ دفعة التحصيلي ════════ */
test("دفعة التحصيلي: كلها مفاهيم بأهمية وصعوبة وتكرارٍ في الاختبارات، بلا تكرار معرّف", () => {
  const ids = TAHSILI_CONCEPTS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "معرّف مكرّر");
  for (const c of TAHSILI_CONCEPTS) {
    assert.equal(c.kind, "concept");
    assert.ok(c.relations?.some((r) => r.type === "belongs_to" && r.to === "exam:tahsili"), `${c.id}: غير مربوط بالتحصيلي`);
    assert.ok(c.difficulty, `${c.id}: بلا صعوبة`);
    assert.ok(c.examFrequency != null, `${c.id}: بلا تكرار`);
    assert.ok(c.meta?.importance != null, `${c.id}: بلا أهمية`);
  }
});

test("لا تكرار للمفهوم: «التكامل» و«الجبر» عقدةٌ واحدة تنتمي للاختبارين", () => {
  /* التكامل: عقدة seed واحدة تظهر في تحصيلي (belongs_to) */
  const tahsiliConcepts = KB.neighbors("exam:tahsili", { type: "belongs_to", dir: "in", kind: "concept" }).map((c) => c.id);
  assert.ok(tahsiliConcepts.includes("concept:integration"), "التكامل لم يُعَد استخدامه");
  assert.ok(tahsiliConcepts.includes("concept:q-algebra"), "الجبر لم يُشارَك");
  /* ولا توجد عقدة تكامل ثانية */
  const integrals = KB.all("concept").filter((c) => c.name === "التكامل");
  assert.equal(integrals.length, 1, "أُنشئ تكاملٌ مكرّر");
  /* الجبر يظهر في القدرات والتحصيلي معاً بعقدةٍ واحدة */
  const algebraExams = (KB.get("concept:q-algebra")?.relations ?? []).filter((r) => r.type === "belongs_to").map((r) => r.to);
  assert.ok(algebraExams.includes("exam:qudurat") && algebraExams.includes("exam:tahsili"));
});

test("Top 20: أعلى المفاهيم أهميةً عبر المنصة كلها، مرتّبة تنازلياً", () => {
  const top = topConcepts(KB, 20);
  assert.equal(top.length, 20);
  for (let i = 1; i < top.length; i++) assert.ok(top[i - 1].importance >= top[i].importance, "غير مرتّب");
  /* يخلط مجالات مختلفة (لا مادة واحدة) */
  const cats = new Set(top.map((t) => t.category));
  assert.ok(cats.size >= 3, "Top 20 من مادة واحدة فقط");
});

/* ════════ دفعة الإنجليزية — النموذج المُدمَج (STEP مجرّد اختبار) ════════ */
test("دفعة الإنجليزية: كل مفهوم يحمل مهارةً ومستوى CEFR ووزنَي STEP وIELTS وتكراراً وأهمية", () => {
  const ids = ENGLISH_CONCEPTS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "معرّف مكرّر");
  const skills = new Set(["Grammar", "Vocabulary", "Reading", "Listening", "Writing"]);
  for (const c of ENGLISH_CONCEPTS) {
    assert.equal(c.kind, "concept");
    assert.ok(c.category && skills.has(c.category), `${c.id}: مهارة غير صحيحة (${c.category})`);
    assert.ok(c.cefr, `${c.id}: بلا مستوى CEFR`);
    assert.ok(c.examWeights && "exam:step" in c.examWeights && "exam:ielts" in c.examWeights, `${c.id}: وزنا الاختبارين غير مكتملين`);
    assert.ok(c.examFrequency != null, `${c.id}: بلا تكرار`);
    assert.ok(c.meta?.importance != null, `${c.id}: بلا أهمية`);
  }
});

test("المعرفة مشتركة: المفهوم ينتمي للاختبار الذي وزنه فيه > 0 فقط (الكتابة في IELTS لا STEP)", () => {
  for (const c of ENGLISH_CONCEPTS) {
    const belongs = new Set((c.relations ?? []).filter((r) => r.type === "belongs_to").map((r) => r.to));
    const w = c.examWeights!;
    assert.equal(belongs.has("exam:step"), w["exam:step"] > 0, `${c.id}: انتماء STEP لا يطابق وزنه`);
    assert.equal(belongs.has("exam:ielts"), w["exam:ielts"] > 0, `${c.id}: انتماء IELTS لا يطابق وزنه`);
  }
  /* الكتابة: تظهر في IELTS دون STEP */
  const writing = ENGLISH_CONCEPTS.filter((c) => c.category === "Writing");
  assert.ok(writing.length >= 1, "لا مفاهيم كتابة");
  for (const c of writing) assert.equal(c.examWeights!["exam:step"], 0, `${c.id}: للكتابة وزنٌ في STEP`);
});

test("«المبني للمجهول» عقدةٌ واحدة (seed) مُثراة تنتمي للاختبارين — لا تكرار", () => {
  const passives = KB.all("concept").filter((c) => c.id === "concept:passive-voice");
  assert.equal(passives.length, 1, "تكرار للمبني للمجهول");
  const p = KB.get("concept:passive-voice")!;
  assert.equal(p.kind, "concept");
  if (p.kind === "concept") {
    assert.equal(p.category, "Grammar");
    assert.ok(p.cefr && p.examWeights, "المبني للمجهول لم يُثرَ بالنموذج المُدمَج");
  }
  const stepEnglish = KB.neighbors("exam:step", { type: "belongs_to", dir: "in", kind: "concept" });
  assert.ok(stepEnglish.some((c) => c.id === "concept:passive-voice"), "المبني للمجهول غير مربوط بـSTEP");
});

test("لوحة القيادة: مجال الإنجليزية يجمع مفاهيم STEP وIELTS بلا تكرار", () => {
  const english = domainProgress(KB).find((d) => d.key === "english")!;
  assert.ok(english, "لا مجال إنجليزية");
  const union = new Set([
    ...KB.neighbors("exam:step", { type: "belongs_to", dir: "in", kind: "concept" }).map((c) => c.id),
    ...KB.neighbors("exam:ielts", { type: "belongs_to", dir: "in", kind: "concept" }).map((c) => c.id),
  ]);
  assert.equal(english.actual, union.size);
  assert.ok(english.pct > 0 && english.pct <= 100);
});

/* ════════ تغطية المعرفة — نضج طبقة المفاهيم ════════ */
test("تغطية المعرفة: «قانون أوم» مكتملٌ (أول Vertical Slice)، والبقية تنتظر الطبقة الثانية", () => {
  const r = knowledgeCoverage(KB);
  assert.equal(r.total, KB.all("concept").length);
  assert.equal(r.concepts.length, r.total);
  /* مرتّبة تنازلياً بالأهمية */
  for (let i = 1; i < r.concepts.length; i++) assert.ok(r.concepts[i - 1].importance >= r.concepts[i].importance, "غير مرتّبة");
  const bySlice = (k: string) => r.slices.find((s) => s.key === k)!;
  /* أول درسٍ كامل: قانون أوم مكتمل عبر أبعاده الأربعة */
  assert.equal(r.complete, 1, "يجب أن يكون قانون أوم وحده مكتملاً");
  const ohm = r.concepts.find((c) => c.id === "concept:ohms-law")!;
  assert.ok(ohm.complete && ohm.hasExplanation && ohm.hasExamples && ohm.hasQuestions && ohm.hasResources, "قانون أوم غير مكتمل");
  assert.ok(bySlice("complete").ids.includes("concept:ohms-law"), "قانون أوم غائبٌ عن شريحة المكتمل");
  /* الشرح/الأمثلة يأتيان من الدرس الذي يُدرّس المفهوم — قانون أوم وحده الآن */
  assert.equal(bySlice("no-explanation").count, r.total - 1, "شرحٌ في غير قانون أوم");
  assert.equal(bySlice("no-examples").count, r.total - 1, "أمثلةٌ في غير قانون أوم");
  /* درسٌ مرتبطٌ (related_to) لا يُدرّس المفهوم لا يُحتسَب شرحاً له (كيرشوف) */
  const kirchhoff = r.concepts.find((c) => c.id === "concept:kirchhoff")!;
  assert.ok(!kirchhoff.hasExplanation && !kirchhoff.hasExamples, "درسٌ مرتبطٌ احتُسِب شرحاً خطأً");
  assert.ok(bySlice("no-questions").count >= r.total - 3, "أسئلةٌ أكثر من المتوقّع");
  assert.ok(bySlice("no-resources").count >= r.total - 3, "مصادرٌ أكثر من المتوقّع");
});

/* ════════ قالب الدرس الرسمي — معايير التجربة التعليمية (مراجعة المالك) ════════ */
test("قالب الدرس: قانون أوم يحمل تشبيهاً و«متى تستخدمه» وجسراً للتالي وسؤالاً مفاهيمياً واستعداداً", () => {
  const lesson = KB.get("lesson:ohms-law");
  assert.ok(lesson && lesson.kind === "lesson");
  if (!lesson || lesson.kind !== "lesson") return;
  const types = new Set((lesson.blocks ?? []).map((b) => b.type));
  assert.ok(types.has("analogy"), "بلا تشبيهٍ للمبتدئ (س١)");
  assert.ok(types.has("whenToUse"), "بلا «متى تستخدمه» (س٦) — الدرس ناقص");
  assert.ok(lesson.diagnostic?.prompt && lesson.diagnostic.answer, "بلا سؤال «اختبر نفسك» قبل/بعد الشرح");
  assert.ok((lesson.outcomes?.length ?? 0) >= 2, "بلا مخرجات «أنت الآن تستطيع»");
  assert.ok(lesson.nextTeaser && lesson.nextTeaser.trim() !== "", "بلا جسرٍ سرديّ للدرس التالي (س٧)");
  assert.ok((lesson.durationMin ?? 99) <= 8, "الدرس أطول من ٨ دقائق (س٨)");
  /* «أصبحت مستعداً لـ» تُشتقّ من الرسم — على الأقل كيرشوف + ثلاثة مسارات */
  const leadsTo = KB.neighbors("concept:ohms-law", { type: "leads_to", dir: "out", kind: "concept" }).map((c) => c.id);
  assert.ok(leadsTo.includes("concept:kirchhoff") && leadsTo.length >= 3, "بلا «أصبحت مستعداً لـ» كافية (س٩)");
  /* سؤالٌ مفاهيمي يقيس الفهم لا الحفظ (س٥) */
  const qs = KB.neighbors("lesson:ohms-law", { type: "belongs_to", dir: "in", kind: "question" });
  assert.ok(qs.some((q) => q.kind === "question" && q.bloom === "understand"), "بلا سؤالٍ مفاهيمي يقيس الفهم (س٥)");
});
