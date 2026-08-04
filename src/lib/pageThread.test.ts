/* اختبار خيط الصفحة التالية.
   تشغيل: npx tsx --test src/lib/pageThread.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pageThread, type ThreadSignals, type ThreadPage } from "./pageThread";
import type { Priority } from "./lifeEngine";

const S = (o: Partial<ThreadSignals> = {}): ThreadSignals => ({
  activeErrors: 0, remainingDrills: 0, hasPlanToday: false, focusMinsToday: 0,
  homeworkDue: 0, hasDestination: true, admissionOpen: true, ...o,
});

const prio = (href: string, key = "study"): Priority => ({
  rank: 1, key: key as Priority["key"], area: "study", tier: "important",
  icon: "📌", title: "ت", why: "سبب", benefit: "", time: "", next: "",
  cta: "افعل", href, urgent: false, costHours: 1, payoff: "",
} as Priority);

const PAGES: ThreadPage[] = ["/dashboard", "/plan", "/roadmap", "/orbit", "/vault", "/school", "/profile", "/university", "/future",
  "/universities", "/opportunities", "/career", "/uni-tools", "/uni-gear"];

const JOURNEY_PAGES: ThreadPage[] = ["/universities", "/opportunities", "/career", "/uni-tools", "/uni-gear", "/university", "/future"];

/* ═══ القاعدة التي لا تُكسر ═══ */

test("لا يعيد الطالب إلى الصفحة التي هو فيها — أبداً", () => {
  for (const page of PAGES) {
    for (const s of [S(), S({ activeErrors: 3, focusMinsToday: 50, hasPlanToday: true, homeworkDue: 2, hasDestination: false })]) {
      const t = pageThread(page, [prio(page), prio("/dashboard")], s);
      if (t) assert.notEqual(t.href, page, `${page}: الخيط يعيد إلى الصفحة نفسها`);
    }
  }
});

test("كل صفحةٍ مربوطة: لا صفحةَ بلا خيط", () => {
  for (const page of PAGES) {
    /* أولويّتان مختلفتان كي تبقى واحدةٌ صالحةً مهما كانت الصفحة الحالية */
    const t = pageThread(page, [prio("/dashboard"), prio("/orbit")], S());
    assert.ok(t, `${page}: بلا خيط — تبقى غرفةً مغلقة`);
    assert.ok(t!.cta.trim().length > 0 && t!.href.startsWith("/"), `${page}: خيطٌ ناقص`);
  }
});

/* ═══ الوصلات السياقية ═══ */

test("أخطائي ← تركيز حين توجد أخطاءٌ لم تُراجَع", () => {
  const t = pageThread("/vault", [], S({ activeErrors: 5 }))!;
  assert.equal(t.href, "/orbit");
  assert.match(t.reason, /5 أخطاء/);
});

test("أخطائي: صياغةٌ عربية سليمة للواحد والاثنين", () => {
  assert.match(pageThread("/vault", [], S({ activeErrors: 1 }))!.reason, /خطأ واحد/);
  assert.match(pageThread("/vault", [], S({ activeErrors: 2 }))!.reason, /خطآن/);
  assert.match(pageThread("/vault", [], S({ activeErrors: 12 }))!.reason, /12 خطأً/);
});

test("أخطائي بلا أخطاء ← مساري لا تركيز", () => {
  assert.equal(pageThread("/vault", [], S())!.href, "/roadmap");
});

test("تركيز بعد جلسة ← أخطائي (لا يضيع ما أخطأ فيه)", () => {
  assert.equal(pageThread("/orbit", [], S({ focusMinsToday: 50 }))!.href, "/vault");
});

test("تركيز بلا جدول ← خطتي", () => {
  assert.equal(pageThread("/orbit", [], S({ focusMinsToday: 0, hasPlanToday: false }))!.href, "/plan");
});

test("مساري بلا جدول ← خطتي", () => {
  assert.equal(pageThread("/roadmap", [], S())!.href, "/plan");
});

test("المدرسة بواجباتٍ مستحقّة ← خطتي مع ذكر عددها", () => {
  const t = pageThread("/school", [], S({ homeworkDue: 3 }))!;
  assert.equal(t.href, "/plan");
  assert.match(t.reason, /3 واجبات/);
});

test("خطتي: جدولٌ جاهز وما بدأ ← تركيز", () => {
  assert.equal(pageThread("/plan", [], S({ hasPlanToday: true, focusMinsToday: 0 }))!.href, "/orbit");
});

test("الصفحاتُ اليتيمة تُوصَل: وجهتي والمستقبل ← دليل الجامعات", () => {
  assert.equal(pageThread("/university", [], S({ hasDestination: false }))!.href, "/universities");
  assert.equal(pageThread("/future", [], S({ hasDestination: true }))!.href, "/universities");
});

/* ═══ السقوط إلى lifeEngine ═══ */

test("الرئيسية تأخذ أعلى أولويةٍ تُخرجها من الصفحة", () => {
  const t = pageThread("/dashboard", [prio("/dashboard"), prio("/vault")], S())!;
  assert.equal(t.href, "/vault", "تخطّى الأولوية التي تشير إلى الصفحة نفسها");
});

test("الرئيسية بلا أولوياتٍ صالحة ← لا خيط (لا نخترع)", () => {
  assert.equal(pageThread("/dashboard", [prio("/dashboard")], S()), null);
});

/* ═══ قوسُ الرحلة: صفحاتُ عالم الجامعة لم تعد نهاياتِ طريق ═══ */

const STEP = { stage: "apply" as const, icon: "🗂️", reason: "وجهتك وأهدافك جاهزة",
  cta: "سجّل تقديماتك", href: "/opportunities" };

test("خطوةُ القوس تصل إلى كل صفحات عالم الجامعة", () => {
  for (const page of JOURNEY_PAGES) {
    const t = pageThread(page, [], S({ journey: STEP }));
    if (page === STEP.href) continue;          // لا يعيدها إلى نفسها (محروسٌ أعلاه)
    assert.ok(t, `${page}: بلا خيط`);
    assert.equal(t.cta, STEP.cta, `${page}: لم تصل خطوةُ القوس`);
  }
});

test("بلا قوسٍ (أول/ثاني ثانوي): السلوكُ القديم كما هو حرفاً بحرف", () => {
  const before = pageThread("/university", [], S({ journey: null, hasDestination: false }));
  assert.deepEqual(before, { icon: "🏛️", reason: "ما حدّدت وجهتك بعد", cta: "استكشف الجامعات وتخصصاتها", href: "/universities" });
  const after = pageThread("/future", [], S({ journey: null, hasDestination: true }));
  assert.deepEqual(after, { icon: "🏛️", reason: "قارن وجهتك بغيرها", cta: "تصفّح دليل الجامعات", href: "/universities" });
});

test("بلا قوسٍ: الصفحاتُ الخمسُ الجديدة تسقط إلى أولويات lifeEngine لا إلى فراغ", () => {
  for (const page of ["/universities", "/opportunities", "/career", "/uni-tools", "/uni-gear"] as ThreadPage[]) {
    assert.equal(pageThread(page, [], S({ journey: null })), null, `${page}: خيطٌ بلا مصدر`);
    const t = pageThread(page, [prio("/dashboard")], S({ journey: null }));
    assert.equal(t?.href, "/dashboard", `${page}: لم يسقط إلى الأولويات`);
  }
});

test("خطوةُ القوس لا تعيد الطالب إلى صفحته — تسقط إلى الأولويات بدلاً منها", () => {
  const t = pageThread("/opportunities", [prio("/dashboard")], S({ journey: STEP }));
  assert.equal(t?.href, "/dashboard");
});

test("«/career» و«/future» محتوىً واحد — فلا خيطَ بينهما في أيّ اتجاه", () => {
  const toFuture = { stage: "career" as const, icon: "💼", reason: "تخرّجت", cta: "ابنِ سيرتك", href: "/future" };
  for (const page of ["/career", "/future"] as ThreadPage[]) {
    const t = pageThread(page, [prio("/future"), prio("/career")], S({ journey: toFuture }));
    assert.ok(!t || (t.href !== "/career" && t.href !== "/future"),
      `${page}: الخيط يسلّم الطالبَ الصفحةَ التي هو فيها (${t?.href})`);
  }
});

test("خطوةُ القوس التي تشير إلى صفحة الطالب نفسِها تُسقِطه إلى سلوكه القديم لا إلى فراغ", () => {
  const here = { stage: "university" as const, icon: "🏛️", reason: "ر", cta: "ك", href: "/university" };
  const t = pageThread("/university", [], S({ journey: here, hasDestination: false }));
  assert.deepEqual(t, { icon: "🏛️", reason: "ما حدّدت وجهتك بعد", cta: "استكشف الجامعات وتخصصاتها", href: "/universities" });
});

test("مَن خرج من عالم القبول (جامعيّ/خرّيج) لا يُساق إلى دليل الجامعات", () => {
  for (const page of ["/university", "/future"] as ThreadPage[]) {
    for (const hasDestination of [true, false]) {
      const t = pageThread(page, [], S({ journey: null, admissionOpen: false, hasDestination }));
      assert.equal(t, null, `${page}: خيطٌ إلى الوراء لمن تجاوز القبول`);
    }
  }
});
