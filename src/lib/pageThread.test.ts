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

const PAGES: ThreadPage[] = ["/dashboard", "/plan", "/roadmap", "/orbit", "/vault", "/school", "/profile", "/university", "/future"];

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
