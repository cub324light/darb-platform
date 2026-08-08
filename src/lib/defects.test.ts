/* ═══ حرّاسُ العيوب المُغلَقة (المرحلة التاسعة) ═══
   كلُّ اختبارٍ هنا يُثبت **السلوك الصحيح بعد الإصلاح**، ويسقط إن عاد العطل.
   تشغيل: TZ=UTC npx tsx --test src/lib/defects.test.ts */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* ── بيئةٌ صغيرةٌ تقوم مقام المتصفّح (التخزين + بثُّ الأحداث) ── */
class FakeStorage {
  m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
const store = new FakeStorage();
const fired: string[] = [];
(globalThis as Record<string, unknown>).localStorage = store;
(globalThis as Record<string, unknown>).window = {
  localStorage: store,
  addEventListener: () => {}, removeEventListener: () => {},
  dispatchEvent: (e: { type: string }) => { fired.push(e.type); return true; },
};
(globalThis as Record<string, unknown>).Event = class { type: string; constructor(t: string) { this.type = t; } };

import { setSchoolGrade } from "./userCommands";
import { phaseIdOf } from "./transition";
import { loadUser, saveList, saveGoals, resetAll, CONTENT_CHANGED, RESET_PENDING_KEY } from "./storage";
import { SCHOOL_STAGES } from "./darbKnowledge";

const src = (p: string) => readFileSync(p, "utf8");
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const seed = (grade: string) => {
  store.clear(); fired.length = 0;
  store.setItem("darb_user", JSON.stringify({
    name: "سارة", track: "تحصيلي", onboarded: true, studyLevel: "ثانوي", grade, gradeYearId: "1447",
  }));
};

beforeEach(() => { fired.length = 0; });

/* ════════ ع-١ · لا تستطيع الواجهةُ إنشاءَ مرحلةٍ مجهولة ════════ */

test("ع-١ · كلُّ قيمةٍ تقبلها الرقاقةُ تُنتج مرحلةً معلومة", () => {
  for (const from of SCHOOL_STAGES) {
    for (const to of SCHOOL_STAGES) {
      seed(from);
      setSchoolGrade(to);
      assert.notEqual(phaseIdOf(loadUser()), null, `${from} ⇒ ${to} أنتج مرحلةً مجهولة`);
    }
  }
});

test("ع-١ · ضغطُ الصفّ الحاليّ لا يُفرّغ المرحلة", () => {
  seed("أول ثانوي");
  const out = setSchoolGrade(null);          // ما تفعله الرقاقةُ المختارة
  assert.equal(out, null, "الكتابةُ تُرفض");
  assert.equal(loadUser()?.grade, "أول ثانوي", "الملفُّ كما هو");
  assert.equal(phaseIdOf(loadUser()), "hs-1");
});

test("ع-١ · الانتقالُ بين صفّين معلومين يمرّ", () => {
  seed("أول ثانوي");
  const out = setSchoolGrade("ثالث ثانوي");
  assert.ok(out);
  assert.equal(phaseIdOf(loadUser()), "hs-3");
});

test("ع-١ · قيمةٌ غير صالحةٍ تُرفض ولا تُكتب", () => {
  seed("ثاني ثانوي");
  assert.equal(setSchoolGrade("سادس ابتدائي"), null);
  assert.equal(loadUser()?.grade, "ثاني ثانوي");
  assert.equal(setSchoolGrade(""), null);
  assert.equal(loadUser()?.grade, "ثاني ثانوي");
});

test("ع-١ · بعد إعادةِ التحميل تبقى المرحلةُ معلومة", () => {
  seed("ثالث ثانوي");
  setSchoolGrade(null); setSchoolGrade("");
  const reloaded = JSON.parse(store.getItem("darb_user")!);   // كما يُقرأ من جديد
  assert.equal(phaseIdOf(reloaded), "hs-3");
});

test("ع-١ · الواجهةُ لا تُطلق حدثَ المرحلة ولا تنقل ملكيّتَه", () => {
  /* على **الكود** لا التعليقات: شرحُ القاعدة يذكر اسمَ ما مُنع. */
  const cmd = stripComments(src("src/lib/userCommands.ts"));
  assert.ok(!/StudentPhaseChanged/.test(cmd), "أمرُ الواجهة يُطلق حدثَ المرحلة");
  assert.ok(!/transitionTo/.test(cmd), "أمرُ الواجهة ينتقل بالمرحلة");
});

/* ════════ ع-٤ · الدرجةُ نفسُها من الشاشتين ⇒ الأثرُ نفسُه ════════ */

test("ع-٤ · «مساري» تُطلق حدثَي الدرجة كما «نتائجي» — وبلا نوعٍ جديد", () => {
  const mw = src("src/components/roadmap/ModuleWorkspace.tsx");
  const gp = src("src/components/GoalsPanel.tsx");
  for (const ev of ["ScoreUpdated", "ExamCompleted"]) {
    assert.ok(new RegExp(`eventType: "${ev}"`).test(mw), `«مساري» لا تُطلق ${ev}`);
    assert.ok(new RegExp(`eventType: "${ev}"`).test(gp), `«نتائجي» لا تُطلق ${ev}`);
  }
  /* نفسُ الدلالات: المادّةُ والدرجةُ والسابقة */
  assert.ok(/metadata: \{ exam: label, score: g, prev:/.test(mw), "دلالاتٌ مختلفة عن «نتائجي»");
});

/* ════════ ع-٣ · الهدفُ نفسُه من الشاشتين ⇒ الأثرُ نفسُه ════════ */

test("ع-٣ · «مستقبلي» تُطلق `GoalChanged` كما «نتائجي» — وبلا نوعٍ جديد", () => {
  const uf = src("src/components/UniversityFuture.tsx");
  assert.ok(/eventType: "GoalChanged"/.test(uf), "«مستقبلي» صامتة");
  assert.ok(/field: "university"/.test(uf) && /field: "major"/.test(uf), "لا تُغطّي الحقلين");
  assert.ok(/prev: prev\.university/.test(uf), "لا تحمل القيمةَ السابقة كما «نتائجي»");
});

/* ════════ ع-٦ · الكتابةُ التي يقرؤها الخيطُ تُبطل خزنتَه ════════ */

test("ع-٦ · كتابةُ الخزنة/الواجبات/القبول/الأهداف تبثّ الإبطال", () => {
  for (const key of ["darb_vault", "darb_homework", "darb_admissions"]) {
    fired.length = 0;
    saveList(key, [{ id: "x" }]);
    assert.ok(fired.includes(CONTENT_CHANGED), `${key} لا يبثّ الإبطال`);
  }
  fired.length = 0;
  saveGoals({ university: "جامعة الملك سعود" });
  assert.ok(fired.includes(CONTENT_CHANGED), "الأهدافُ لا تبثّ الإبطال");
});

test("ع-٦ · ولا تبثّ الكتاباتُ التي لا يقرؤها — لا إبطالَ عشوائيّ", () => {
  for (const key of ["darb_cards", "darb_lessons", "darb_done_lessons", "darb_tadreeb_done", "darb_results"]) {
    fired.length = 0;
    saveList(key, ["a"]);
    assert.ok(!fired.includes(CONTENT_CHANGED), `${key} يبثّ إبطالاً لا يحتاجه أحد`);
  }
});

test("ع-٦ · الخيطُ يشترك في القنوات الأربع ولا يستجوب دورياً", () => {
  const nt = src("src/components/NextThread.tsx");
  for (const ch of ["darb:eventsChanged", "USER_CHANGED", "STATS_CHANGED", "CONTENT_CHANGED"]) {
    assert.ok(nt.includes(ch), `الخيطُ لا يسمع ${ch}`);
  }
  assert.ok(!/setInterval|setTimeout\(/.test(nt), "استجوابٌ دوريّ في الخيط");
});

/* ════════ ع-٧ب · «ابدأ من الصفر» يصمد لإعادة التحميل ════════ */

test("ع-٧ب · المسحُ يترك علامةً تمنع الاسترجاعَ التالي", () => {
  store.clear();
  store.setItem("darb_user", '{"name":"سارة"}');
  store.setItem("darb_sessions", '[{"id":"s"}]');
  store.setItem("darb_theme", "light");
  resetAll();
  assert.equal(store.getItem("darb_user"), null);
  assert.equal(store.getItem("darb_sessions"), null);
  assert.equal(store.getItem("darb_theme"), "light", "إعدادُ الجهاز لا يُمحى");
  assert.equal(store.getItem(RESET_PENDING_KEY), "1", "لا علامةَ ⇒ يعود كلُّ شيءٍ في الإقلاع التالي");
});

test("ع-٧ب · العلامةُ تنجو من المسح نفسِه ولا تُرفع للسحابة", async () => {
  const { RESET_KEYS, BACKUP_KEYS } = await import("./storageKeys");
  assert.ok(!RESET_KEYS.includes(RESET_PENDING_KEY), "العلامةُ تُمحى مع ما تحرسه");
  assert.ok(!BACKUP_KEYS.includes(RESET_PENDING_KEY), "العلامةُ تُرفع للسحابة");
});

test("ع-٧ب · الإقلاعُ التالي يرفع ولا يسحب، ولا يُمسح العلمُ إلا بنجاح", () => {
  const c = src("src/lib/cloud.ts");
  const block = c.match(/if \(consumeResetPending\(\)\)[\s\S]{0,320}?\n  \}/)![0];
  assert.ok(/pushBackup\(\)/.test(block), "لا يرفع الحالةَ الجديدة");
  assert.ok(!/pullBackup|pullEngineState/.test(block), "ما زال يسحب النسخةَ القديمة");
  assert.ok(/if \(pushed\) clearResetPending\(\)/.test(block), "يمسح العلامةَ ولو فشل الرفع");
});

/* ════════ ع-٨ · الاسترجاعُ يمرّ بالدمج لا بالكتابة العمياء ════════ */

test("ع-٨ · `pullBackup` يدمج ولا يكتب فوق المحلّيّ", () => {
  const c = src("src/lib/cloud.ts");
  assert.ok(/localStorage\.setItem\(k, mergeKey\(k, localStorage\.getItem\(k\), v\)\)/.test(c),
    "الاسترجاعُ ما زال كتابةً عمياء");
});

/* ════════ حدودٌ لم تُمَسّ ════════ */

test("المحرّكاتُ المغلقةُ لم تُمَسّ", () => {
  /* محرّكُ الانتقال يبقى المُطلِقَ الوحيد لحدث المرحلة */
  const t = src("src/lib/transition/index.ts");
  assert.ok(/eventType: "StudentPhaseChanged"/.test(t));
  /* والدمجُ يقرأ السجلَّ ولا يكتب فيه */
  const bm = src("src/lib/backupMerge.ts");
  assert.ok(/from "\.\/transition"/.test(bm));
  assert.ok(!/PHASE_REGISTRY\s*=|registry\.ts/.test(bm), "الدمجُ يعدّل السجلّ");
});
