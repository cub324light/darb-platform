/* اختبارات محرّك المطابقة وحسم المباراة —
   تشغيل: npx tsx --test src/lib/arena/engine.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pickOpponent, mmRange, isStale, scoreAnswers, decideWinner, seedFromMatchId,
  QUEUE_TTL_MS, type QueueTicket,
} from "./engine";
import { buildMatchQuestions } from "./questions";

const T = (uid: string, rp: number, createdAt: number, track = "قدرات"): QueueTicket =>
  ({ uid, name: uid, rp, track, createdAt });

test("لا مطابقة مع النفس", () => {
  const me = T("a", 500, 0);
  assert.equal(pickOpponent(me, [me], 1000), null);
});

test("مطابقة فورية مع منافس ضمن النطاق", () => {
  const me = T("b", 500, 1000);
  const opp = T("a", 520, 0);
  const m = pickOpponent(me, [opp], 1000);
  assert.equal(m?.uid, "a");
});

test("يفضّل الأقرب RP", () => {
  const me = T("me", 500, 2000);
  const near = T("near", 510, 1000);
  const far = T("far", 600, 1000);
  assert.equal(pickOpponent(me, [far, near], 2000)?.uid, "near");
});

test("عند تساوي فرق RP يفضّل الأقدم انتظاراً", () => {
  const me = T("me", 500, 5000);
  const older = T("older", 490, 0);    // فرق 10، انتظر أطول
  const newer = T("newer", 510, 4000); // فرق 10، أحدث
  assert.equal(pickOpponent(me, [newer, older], 5000)?.uid, "older");
});

test("نطاق المطابقة يتوسّع مع الانتظار", () => {
  assert.ok(mmRange(0) < mmRange(10_000));
  assert.ok(mmRange(30_000) >= 700);
  assert.equal(mmRange(10 * 60_000), 3000); // مسقوف
});

test("فرق RP كبير لا يُطابَق مبكراً، لكن يُطابَق بعد انتظار طويل", () => {
  const me = T("me", 100, 0);
  const strong = T("strong", 1200, 0);
  assert.equal(pickOpponent(me, [strong], 1000), null, "بعيد جداً في البداية");
  // بعد انتظار طويل يتوسّع النطاق حتى يشملهما
  const later = 60_000 - 1; // قبل أن يصبحا ميتين
  assert.equal(pickOpponent(T("me", 100, 0), [T("strong", 1200, 0)], later)?.uid, "strong");
});

test("التذاكر الميتة (انقطاع) تُتجاهَل", () => {
  const me = T("me", 500, QUEUE_TTL_MS + 2000);
  const dead = T("dead", 500, 0); // أقدم من TTL
  assert.ok(isStale(dead, QUEUE_TTL_MS + 2000));
  assert.equal(pickOpponent(me, [dead], QUEUE_TTL_MS + 2000), null);
});

/* ── السباق الحرج: لاعبان يضغطان «ابدأ» ⇒ مباراة واحدة فقط، بلا تكرار ──
   نحاكي معاملة الخادم على مخزن مشترك مع منطق pickOpponent النقي. */
test("سباق لاعبَين ⇒ مباراة واحدة بالضبط والطابور يُفرَّغ", () => {
  // مخزن طابور مشترك
  const queue = new Map<string, QueueTicket>();
  const matches: { a: string; b: string }[] = [];

  /* محاكاة enqueue الذرّية: ابحث عن خصم؛ إن وُجد أنشئ مباراة واحدة واحذف
     التذكرتين (نموذج المعاملة)، وإلا أضِف تذكرتك. التسلسل = ذرّية المعاملة. */
  function enqueue(t: QueueTicket, now: number) {
    const candidates = [...queue.values()];
    const opp = pickOpponent(t, candidates, now);
    if (opp) {
      queue.delete(opp.uid);
      queue.delete(t.uid);
      matches.push({ a: opp.uid, b: t.uid });
    } else {
      queue.set(t.uid, t);
    }
  }

  // اللاعب الأول يدخل، لا أحد ⇒ ينتظر
  enqueue(T("p1", 500, 0), 0);
  assert.equal(queue.size, 1);
  assert.equal(matches.length, 0);

  // اللاعب الثاني يدخل ⇒ يجد الأول فوراً ⇒ مباراة واحدة
  enqueue(T("p2", 510, 1000), 1000);
  assert.equal(matches.length, 1, "مباراة واحدة فقط");
  assert.equal(queue.size, 0, "الطابور فُرّغ من اللاعبَين");
  assert.deepEqual(matches[0], { a: "p1", b: "p2" });

  // محاولة ثالثة من نفس اللاعبين لا تنشئ تكراراً (خرجا من الطابور)
  enqueue(T("p2", 510, 2000), 2000);
  assert.equal(matches.length, 1, "لا تكرار");
  assert.equal(queue.size, 1); // p2 ينتظر الآن وحده
});

test("حسم المباراة: تصحيح الإجابات مقابل المفتاح", () => {
  const key = [0, 1, 2, 3];
  assert.equal(scoreAnswers(key, [0, 1, 2, 3]), 4);
  assert.equal(scoreAnswers(key, [0, 0, 2, 0]), 2);
  assert.equal(scoreAnswers(key, [null, null, null, null]), 0);
  assert.equal(scoreAnswers(key, [1, 0, 3, 2]), 0);
});

test("تحديد الفائز/التعادل", () => {
  assert.equal(decideWinner(3, 1), "a");
  assert.equal(decideWinner(1, 3), "b");
  assert.equal(decideWinner(2, 2), "draw");
});

test("نفس المباراة ⇒ نفس الأسئلة لكلا اللاعبين (بذرة حتمية)", () => {
  const seed = seedFromMatchId("match_xyz_123");
  const a = buildMatchQuestions("قدرات", seed);
  const b = buildMatchQuestions("قدرات", seed);
  assert.deepEqual(a.questions, b.questions, "ترتيب متطابق للاعبَين");
  assert.deepEqual(a.key, b.key);
  // مباراة أخرى ⇒ بذرة مختلفة (غالباً ترتيب مختلف)
  assert.notEqual(seedFromMatchId("match_other"), seed);
});

test("أسئلة المباراة لا تحمل الإجابة الصحيحة (مقاومة الغش)", () => {
  const { questions } = buildMatchQuestions("تحصيلي", 42);
  for (const q of questions) {
    assert.equal((q as unknown as Record<string, unknown>).correct, undefined, "لا حقل correct للعميل");
    assert.ok(Array.isArray(q.options) && q.options.length > 0);
  }
});
