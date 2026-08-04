import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSessionPlan } from "./session";

test("buildSessionPlan: وقتٌ غير كافٍ ⇒ لا جلسة + رسالةٌ لطيفة", () => {
  const p = buildSessionPlan({ subjects: ["لفظي"], remainingLessons: 5, remainingDrills: 5, activeErrors: 2, availableMinutes: 5 });
  assert.equal(p.available, false);
  assert.equal(p.tasks.length, 0);
  assert.ok(p.hint.includes("غداً"));
});

test("buildSessionPlan: 3 مهامّ بأهداف، المجموع ≈ الوقت المتاح", () => {
  const p = buildSessionPlan({
    subjects: ["لفظي", "كمي"], remainingLessons: 5, remainingDrills: 20, activeErrors: 3, availableMinutes: 70,
  });
  assert.equal(p.available, true);
  assert.equal(p.tasks.length, 3);
  assert.equal(p.tasks[0].kind, "review");
  assert.equal(p.tasks[0].subject, "لفظي");
  assert.equal(p.tasks[0].goalMins, 35);
  assert.equal(p.tasks[1].kind, "drill");
  assert.equal(p.tasks[1].goalCount, 20);
  assert.equal(p.tasks[2].kind, "errors");
  assert.equal(p.totalMins, 70);
  assert.ok(p.motivation.includes("جاهزيتك"));
});

test("buildSessionPlan: يبدأ بالمادة الأضعف؛ بلا تدريب/أخطاء ⇒ مراجعة فقط", () => {
  const weak = buildSessionPlan({ subjects: ["لفظي", "كمي"], weakestSubject: "كمي", remainingLessons: 3, remainingDrills: 0, activeErrors: 0, availableMinutes: 40 });
  assert.equal(weak.tasks[0].subject, "كمي");
  assert.equal(weak.tasks.length, 1);
  assert.equal(weak.tasks[0].kind, "review");
});

/* ═══════════ V2 — محرّك الأولويات ═══════════
   العقدُ الأهمّ أوّلاً: غيابُ الإشارات الجديدة يُبقي كلَّ شيءٍ كما كان (تحرسه
   الاختباراتُ الثلاثةُ أعلاه). وهذه تختبر ما تفعله الإشاراتُ حين تحضر. */

const base = {
  subjects: ["لفظي", "كمي"],
  remainingLessons: 5,
  remainingDrills: 20,
  activeErrors: 3,
  availableMinutes: 70,
};

test("V2: قربُ الاختبار يقدّم التدريبَ على المراجعة", () => {
  const far  = buildSessionPlan({ ...base, daysUntilExam: 90 });
  const near = buildSessionPlan({ ...base, daysUntilExam: 3 });
  assert.equal(far.tasks[0].kind, "review", "بعيدٌ ⇒ يبدأ بالتأسيس");
  assert.equal(near.tasks[0].kind, "drill", "قريبٌ ⇒ يبدأ بالتدريب");
  assert.equal(near.tasks[0].topFactor, "exam-urgency");
  assert.ok(near.tasks[0].reason?.includes("اختبارك بعد"));
});

test("V2: الدرجةُ الأضعف تصعد — ويجوز «مراجعة ← مراجعة»", () => {
  const p = buildSessionPlan({ ...base, scoreBySubject: { "لفظي": 92, "كمي": 55 } });
  assert.equal(p.tasks[0].kind, "review");
  assert.equal(p.tasks[0].subject, "كمي", "الأدنى درجةً يتقدّم");
  assert.equal(p.tasks[0].topFactor, "score-gap");
  assert.ok(p.tasks[0].reason?.includes("55"));
  /* بلا الدرجات كان الثاني تدريباً؛ ومعها يجوز أن يصعد مراجعةُ المادّة الأخرى. */
  assert.ok(p.tasks.length >= 2);
});

test("V2: التزامٌ منخفض يصير سببَ مهمّة الأخطاء", () => {
  const p = buildSessionPlan({ ...base, activeErrors: 4, commitmentPercentage: 25 });
  const err = p.tasks.find((t) => t.kind === "errors");
  assert.ok(err, "مهمّةُ الأخطاء موجودة");
  assert.equal(err.topFactor, "commitment");
  assert.equal(err.reason, "لأن التزامك هذا الأسبوع منخفض.");
});

test("V2: بلا إشارةٍ لا سبب — لا نخترع", () => {
  const p = buildSessionPlan(base);
  const invented = p.tasks.filter((t) => t.topFactor === "exam-urgency" || t.topFactor === "commitment" || t.topFactor === "readiness");
  assert.equal(invented.length, 0);
  for (const t of p.tasks) {
    if (!t.topFactor) assert.equal(t.reason, "", "بلا عاملٍ لا جملة");
  }
});

test("V2: وقتٌ ضيّق ⇒ تُقصَّر المهامّ ولا تُحذف كلُّها", () => {
  const p = buildSessionPlan({ ...base, availableMinutes: 25 });
  assert.equal(p.available, true);
  assert.ok(p.tasks.length >= 1 && p.tasks.length <= 2, "ما يتّسع له الوقتُ فقط");
  for (const t of p.tasks) {
    const m = t.goalMins ?? (t.goalCount ?? 0);
    assert.ok(m >= 10, "لا مهمّةَ دون الحدّ الأدنى");
  }
  assert.ok(p.totalMins <= 25);
});

test("V2: فائضُ وقتٍ ⇒ مهمّةٌ رابعة اختيارية لا إجبارية", () => {
  const p = buildSessionPlan({ ...base, remainingDrills: 8, availableMinutes: 180 });
  assert.ok(p.tasks.length <= 4);
  const opt = p.tasks.filter((t) => t.optional);
  assert.ok(opt.length <= 1, "واحدةٌ على الأكثر");
  for (const t of p.tasks.slice(0, 3)) assert.notEqual(t.optional, true, "الثلاثُ الأُوَل واجبة");
});

test("V2: لا مهمّةَ تتجاوز سقفَ المدّة، ولا تكرارَ لنوعٍ+مادّة", () => {
  const p = buildSessionPlan({ ...base, availableMinutes: 200, scoreBySubject: { "لفظي": 40, "كمي": 45 } });
  const keys = p.tasks.map((t) => `${t.kind}:${t.subject ?? ""}`);
  assert.equal(new Set(keys).size, keys.length, "بلا تكرار");
  for (const t of p.tasks) if (t.goalMins != null) assert.ok(t.goalMins <= 45);
});

test("V2: الأولويةُ مرتَّبةٌ تنازلياً — الترتيبُ نتيجةُ الدرجة لا العكس", () => {
  const p = buildSessionPlan({ ...base, daysUntilExam: 10, scoreBySubject: { "لفظي": 70, "كمي": 60 }, readinessPercentage: 40 });
  const core = p.tasks.filter((t) => !t.optional).map((t) => t.priority ?? 0);
  for (let k = 1; k < core.length; k++) assert.ok(core[k - 1] >= core[k], "غيرُ مرتَّبة");
});

/* التوصيل: القارئُ يمرّر الإشارتين المتاحتين، فتصلان المحرّكَ ويتغيّر القرار.
   (اختبارٌ واحدٌ يغطّي الاثنتين — لا اختباراتٍ لبقيّة المشروع.) */
test("التوصيل: daysUntilExam و scoreBySubject تصلان المحرّك وتغيّران الخطة", () => {
  const plain = buildSessionPlan(base);
  const wired = buildSessionPlan({ ...base, daysUntilExam: 3, scoreBySubject: { "لفظي": 92, "كمي": 55 } });

  /* daysUntilExam وصلت: القربُ رفع التدريبَ وصار سبباً مذكوراً بالرقم نفسه. */
  assert.notEqual(wired.tasks[0].kind, plain.tasks[0].kind, "القرار لم يتغيّر ⇒ الإشارة لم تصل");
  assert.ok(wired.tasks.some((t) => t.topFactor === "exam-urgency" && t.reason?.includes("3")),
    "daysUntilExam لم تصل المحرّك");

  /* scoreBySubject وصلت: الأدنى درجةً حاضرٌ في الخطة بفجوة درجته. */
  assert.ok(wired.tasks.some((t) => t.subject === "كمي"), "scoreBySubject لم تؤثّر في اختيار المادة");
  const byScore = buildSessionPlan({ ...base, scoreBySubject: { "لفظي": 92, "كمي": 55 } });
  assert.equal(byScore.tasks[0].subject, "كمي");
  assert.equal(byScore.tasks[0].topFactor, "score-gap");
});
