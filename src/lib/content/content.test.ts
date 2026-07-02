/* اختبارات المحتوى التعليمي العام — تشغيل: npx tsx --test src/lib/content/content.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SEED_CONTENT, CONTENT_COLLECTIONS,
  mergeContentById, sortByOrder, buildContentSnapshot, annualReviewLists,
  subjectMeta, scoreColor,
  type FaqDoc,
} from "./index";

test("البذرة تحوي المجموعات السبع كلها وبأعداد صحيحة", () => {
  assert.equal(CONTENT_COLLECTIONS.length, 7);
  assert.equal(SEED_CONTENT.faq_general.length, 10);
  assert.equal(SEED_CONTENT.faq_qubool.length, 25);
  assert.equal(SEED_CONTENT.reference_lists.length, 6);
  assert.equal(SEED_CONTENT.tips.length, 2);
  assert.equal(SEED_CONTENT.tahsili_flashcards.length, 4);
  assert.equal(SEED_CONTENT.study_strategies.length, 3);
  assert.equal(SEED_CONTENT.success_stories.length, 5);
});

test("كل معرّفات البذرة فريدة داخل كل مجموعة", () => {
  for (const name of CONTENT_COLLECTIONS) {
    const items = SEED_CONTENT[name] as { id: string }[];
    const ids = new Set(items.map((i) => i.id));
    assert.equal(ids.size, items.length, `معرّفات ${name} فريدة`);
  }
});

test("الدمج: overlay يطغى بالـ id والجديد يُضاف", () => {
  const seed: FaqDoc[] = [
    { id: "a", question: "س١", answer: "ج١", category: "c", order: 1 },
    { id: "b", question: "س٢", answer: "ج٢", category: "c", order: 2 },
  ];
  const overlay: FaqDoc[] = [
    { id: "b", question: "س٢ محدث", answer: "ج٢ محدث", category: "c", order: 2 },
    { id: "c", question: "س٣", answer: "ج٣", category: "c", order: 3 },
  ];
  const merged = mergeContentById(seed, overlay);
  assert.equal(merged.length, 3);
  assert.equal(merged.find((x) => x.id === "b")?.question, "س٢ محدث"); // overlay فاز
  assert.ok(merged.some((x) => x.id === "c")); // الجديد أُضيف
  assert.equal(seed.length, 2); // الأصل لم يتغيّر
});

test("الفرز بـ order تصاعدي دون تعديل الأصل", () => {
  const list = [{ order: 3 }, { order: 1 }, { order: 2 }];
  const sorted = sortByOrder(list);
  assert.deepEqual(sorted.map((x) => x.order), [1, 2, 3]);
  assert.deepEqual(list.map((x) => x.order), [3, 1, 2]);
});

test("اللقطة: الأسئلة مفروزة بـ order وoverlay يتجاوز البذرة", () => {
  const first = SEED_CONTENT.faq_general[0];
  const snap = buildContentSnapshot({
    faq_general: [{ ...first, question: "سؤال معدّل من الإدارة" }],
  });
  // الفرز صحيح في المجموعتين
  for (const list of [snap.faqGeneral, snap.faqQubool]) {
    for (let i = 1; i < list.length; i++) {
      assert.ok(list[i - 1].order <= list[i].order);
    }
  }
  // overlay تجاوز نص البذرة دون تغيير العدد
  assert.equal(snap.faqGeneral.length, SEED_CONTENT.faq_general.length);
  assert.equal(snap.faqGeneral.find((f) => f.id === first.id)?.question, "سؤال معدّل من الإدارة");
});

test("اللقطة بلا overlay تُرجع البذرة كاملة (offline-first)", () => {
  const snap = buildContentSnapshot();
  assert.equal(snap.referenceLists.length, 6);
  assert.equal(snap.tips.length, 2);
  assert.equal(snap.tahsiliFlashcards.length, 4);
  assert.equal(snap.studyStrategies.length, 3);
  assert.equal(snap.successStories.length, 5);
});

test("قوائم المراجعة السنوية تُرجع الموسومة needsAnnualReview فقط", () => {
  const lists = annualReviewLists();
  assert.ok(lists.length > 0);
  assert.ok(lists.every((r) => r.needsAnnualReview === true));
  assert.equal(lists.length, SEED_CONTENT.reference_lists.filter((r) => r.needsAnnualReview).length);
});

test("كل حقائق بطاقات التحصيلي بصيغة «مفهوم → تطبيق»", () => {
  for (const card of SEED_CONTENT.tahsili_flashcards) {
    assert.ok(card.facts.length > 0, `بطاقة ${card.id} فيها حقائق`);
    for (const fact of card.facts) {
      assert.ok(fact.includes("→"), `حقيقة في ${card.id} تحوي سهماً: ${fact}`);
    }
  }
});

test("تعريفات العرض: مادة معروفة ومجهولة ولون درجة معروف ومجهول", () => {
  assert.equal(subjectMeta("physics").label, "فيزياء");
  assert.equal(subjectMeta("geology").label, "geology"); // مجهولة → الاسم نفسه بلون افتراضي
  assert.ok(scoreColor("قدرات").startsWith("#"));
  assert.ok(scoreColor("اختبار أول").startsWith("#")); // مفتاح حر → لون افتراضي
});
