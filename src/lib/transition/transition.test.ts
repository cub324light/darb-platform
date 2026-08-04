/* اختبارات محرّك الانتقال — تشغيل: npx tsx --test src/lib/transition/transition.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PHASE_REGISTRY, ALL_PHASE_IDS, phaseDef, type PhaseId,
} from "./registry";
import {
  phaseIdOf, phaseAllows, canTransition, declarableFrom, applyTransition, withCoreForPhase,
} from "./engine";
import { computeStudentPhase } from "../phase";
import { toBoardStage } from "../examEligibility";
import { phaseExperience } from "../experience";
import type { DarbUser } from "../storage";
import type { Workspace } from "../modules/workspace";
import { EventEngine } from "../events/engine";
import { InMemoryEventStore } from "../events/store";
import { MemoryEngine } from "../memory/engine";
import { InMemoryStore } from "../memory/store";
import { makeMemoryReactor } from "../events/reactors";

/* طالبٌ بملفٍّ ممتلئ — كلُّ ما يجب ألّا يضيع في الانتقال */
const FULL = (o: Partial<DarbUser> = {}): DarbUser => ({
  name: "سعد", onboarded: true,
  studyLevel: "ثانوي", grade: "ثالث ثانوي", gradeYearId: "1447",
  track: "تحصيلي", activeTracks: ["تحصيلي", "قدرات"],
  academicTrack: "علمي", region: "الرياض", studyHours: 3,
  targets: ["university"], rewardedFields: ["name", "region"],
  universityGpa: 4.2, creditHoursCompleted: 40,
  workspace: { modules: [{ id: "qudurat", kind: "optional", state: "active", progress: 55, order: 0, hidden: false, lastActivityAt: 1 }], updatedAt: 1 },
  ...o,
} as DarbUser);

/* ═══════════ السجلُّ هو المصدر الوحيد ═══════════ */

test("السجلّ متماسك: معرّفاتٌ فريدة، ووجهاتٌ حقيقية، وقدراتٌ غير فارغة", () => {
  const ids = PHASE_REGISTRY.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "معرّفٌ مكرّر");
  for (const p of PHASE_REGISTRY) {
    assert.ok(p.label.trim(), `${p.id}: بلا اسم`);
    assert.ok(p.allows.length > 0, `${p.id}: بلا قدرةٍ واحدة`);
    for (const n of p.next) assert.ok(phaseDef(n), `${p.id}: وجهةٌ لا وجود لها (${n})`);
    assert.ok(!p.next.includes(p.id), `${p.id}: وجهةٌ إلى نفسها`);
  }
});

test("كلُّ مرحلةٍ في السجلّ تُشتقّ من ملفّها — لا مدخلَ لا يمكن الوصول إليه", () => {
  for (const p of PHASE_REGISTRY) {
    const u = { onboarded: true, ...p.profile } as DarbUser;
    assert.equal(phaseIdOf(u), p.id, `${p.id}: الملفُّ لا يُعيدها`);
    /* واتّساقُ الجسور القائمة: لا تعريفَ سادسٌ للمرحلة */
    assert.equal(toBoardStage({ studyLevel: p.profile.studyLevel, grade: p.profile.grade }), p.boardStage,
      `${p.id}: boardStage يخالف toBoardStage`);
  }
});

test("اتّساقُ السجلّ مع phaseExperience — حارسُ التفرّق", () => {
  for (const p of PHASE_REGISTRY) {
    const u = { onboarded: true, ...p.profile } as DarbUser;
    const exp = phaseExperience(u);
    assert.equal(exp.phase, computeStudentPhase(u), `${p.id}: تعارضٌ في المرحلة`);
    /* قدرةُ «القبول» هي عالمُه الكامل (موزونة/مقارنة/تقديم) = `admission: "full"`.
       و«explore» لأول/ثاني ثانوي استكشافٌ تعريفيّ لا منافسة — فليست القدرة. */
    assert.equal(exp.admission === "full", p.allows.includes("admission"),
      `${p.id}: صلاحيةُ القبول في السجلّ تخالف phaseExperience`);
    assert.equal(exp.showsUniLife, p.allows.includes("uni-life"),
      `${p.id}: صلاحيةُ الحياة الجامعية تخالف phaseExperience`);
  }
});

/* ═══════════ ما يجوز وما لا يجوز ═══════════ */

test("لا انتقالَ خارج ما يسمح به السجلّ — ولا إلى النفس", () => {
  for (const from of ALL_PHASE_IDS) {
    for (const to of ALL_PHASE_IDS) {
      const allowed = phaseDef(from)!.next.includes(to);
      assert.equal(canTransition(from, to), allowed && from !== to, `${from} → ${to}`);
    }
  }
  assert.equal(canTransition(null, "university"), false, "بلا مرحلةٍ معروفة لا انتقال");
});

test("المسارُ المطلوب كلُّه مسموح", () => {
  const path: [PhaseId, PhaseId][] = [
    ["hs-1", "hs-2"], ["hs-2", "hs-3"], ["hs-3", "grad-hs"],
    ["grad-hs", "university"], ["university", "grad-uni"],
  ];
  for (const [a, b] of path) assert.ok(canTransition(a, b), `${a} → ${b} مرفوض`);
});

test("المُعلَنُ يُعلَن والتلقائيُّ لا يُعلَن", () => {
  assert.deepEqual(declarableFrom(FULL()), ["university"]);                    // ثالث: الجامعة إعلانٌ، والتخرّج بالتقويم
  assert.deepEqual(declarableFrom(FULL({ studyLevel: "جامعي", grade: undefined })), ["grad-uni"]);
  assert.deepEqual(declarableFrom(FULL({ studyLevel: "خريج", gradStage: "خريج جامعة", grade: undefined })), []);
  assert.deepEqual(declarableFrom(FULL({ grade: "أول ثانوي" })), [], "أول ثانوي لا يُعلن شيئاً");
});

/* ═══════════ لا يخسر الطالبُ شيئاً ═══════════ */

test("الانتقال يكتب أربعة حقولٍ لا غير — وكلُّ ما عداها كما هو مفتاحاً مفتاحاً", () => {
  const before = FULL();
  const res = applyTransition(before, "grad-hs", { yearId: "1448" });
  assert.ok(res);
  const MUTABLE = new Set(["studyLevel", "grade", "gradStage", "gradeYearId"]);
  for (const k of Object.keys(before) as (keyof DarbUser)[]) {
    if (MUTABLE.has(k)) continue;
    assert.deepEqual(res.user[k], before[k], `ضاع/تغيّر: ${k}`);
  }
  /* ولا مفتاحَ جديدٌ في **الملفّ المحفوظ** (الحقلُ المُفرَّغ يُكتب `undefined`
     عمداً ليُمحى، و`JSON` يُسقطه — وهذا ما يصل التخزينَ فعلاً). */
  const stored = JSON.parse(JSON.stringify(res.user)) as Record<string, unknown>;
  assert.deepEqual(
    Object.keys(stored).filter((k) => !(k in before) && !MUTABLE.has(k)), [],
    "مفتاحٌ لم يكن في الملفّ ولا يخصّ المرحلة",
  );
  assert.equal(res.user.workspace?.modules[0].progress, 55, "تقدّمُ القدرات باقٍ");
});

test("الحقولُ التي لا تخصّ المرحلة الجديدة تُمسَح لا تبقى كاذبة", () => {
  const toGrad = applyTransition(FULL(), "grad-hs")!;
  assert.equal(toGrad.user.studyLevel, "خريج");
  assert.equal(toGrad.user.gradStage, "خريج ثانوي");
  assert.equal(toGrad.user.grade, undefined, "خرّيجٌ بلا صف");

  const toUni = applyTransition(toGrad.user, "university")!;
  assert.equal(toUni.user.studyLevel, "جامعي");
  assert.equal(toUni.user.gradStage, undefined, "جامعيٌّ بلا نوع تخرّج");
});

test("الانتقال غير المسموح لا يغيّر شيئاً — يعيد null", () => {
  assert.equal(applyTransition(FULL(), "grad-uni"), null);
  assert.equal(applyTransition(FULL({ grade: "أول ثانوي" }), "university"), null);
});

/* ═══════════ الأحداث ═══════════ */

test("كلُّ انتقالٍ يُطلق StudentPhaseChanged، والمَعلَمُ يُضاف حيث يستحقّ", () => {
  const step = (u: DarbUser, to: PhaseId) => applyTransition(u, to)!;

  const a = step(FULL(), "grad-hs");
  assert.deepEqual(a.events.map((e) => e.type), ["StudentPhaseChanged"]);
  assert.equal(a.events[0].studyLevel, "خريج");
  assert.equal(a.events[0].grade, undefined);
  assert.equal(a.events[0].clearedGrade, true, "الصفُّ السابق لم يعد صحيحاً");

  const b = step(a.user, "university");
  assert.deepEqual(b.events.map((e) => e.type), ["StudentPhaseChanged", "UniversityPhaseEntered"]);
  assert.equal(b.events[0].eduStage, "university");

  const c = step(b.user, "grad-uni");
  assert.deepEqual(c.events.map((e) => e.type), ["StudentPhaseChanged", "CareerPhaseEntered"]);
  assert.equal(c.events[1].eduStage, "career");
});

test("الترقيةُ بين الصفوف تحمل الصفَّ الجديد ولا تُبطِل شيئاً", () => {
  const e = applyTransition(FULL({ grade: "ثاني ثانوي" }), "hs-3")!.events[0];
  assert.equal(e.grade, "ثالث ثانوي");
  assert.equal(e.clearedGrade, false);
  assert.equal(e.studyLevel, "ثانوي");
});

/* ═══════════ البوابة ═══════════ */

test("البوابة: الجامعيُّ خارج دراسة الثانوية، والثانويُّ خارج الحياة الجامعية", () => {
  assert.equal(phaseAllows("hs-3", "secondary-study"), true);
  assert.equal(phaseAllows("hs-3", "uni-life"), false);
  assert.equal(phaseAllows("grad-hs", "secondary-study"), true);
  assert.equal(phaseAllows("university", "secondary-study"), false);
  assert.equal(phaseAllows("university", "uni-life"), true);
  assert.equal(phaseAllows("grad-uni", "admission"), false);
  assert.equal(phaseAllows("grad-uni", "career"), true);
});

test("البوابة حارسٌ لا مانعٌ افتراضيّ: مرحلةٌ مجهولة تُبقي كلَّ شيءٍ كما كان", () => {
  for (const cap of ["secondary-study", "admission", "uni-life", "career"] as const) {
    assert.equal(phaseAllows(null, cap), true);
  }
});

/* ═══════════ Workspace: يُضاف ولا يُحذف ═══════════ */

test("وحداتُ المرحلة الجديدة تُضاف، وما كان قبلها يبقى بتقدّمه", () => {
  const ws: Workspace = FULL().workspace!;
  const next = withCoreForPhase(ws, "university", 2);
  assert.ok(next.modules.some((m) => m.id === "university"), "لم تُضَف وحدةُ الجامعة");
  const q = next.modules.find((m) => m.id === "qudurat");
  assert.ok(q, "حُذفت وحدةُ القدرات");
  assert.equal(q.progress, 55, "ضاع تقدّمُ القدرات");
});

test("الرجوعُ عن مرحلةٍ لا يحذف وحداتها — الاختفاءُ عرضٌ لا حذف", () => {
  const withUni = withCoreForPhase(FULL().workspace!, "university", 2);
  const after = withCoreForPhase(withUni, "grad-uni", 3);
  assert.ok(after.modules.some((m) => m.id === "university"), "حُذفت وحدةُ الجامعة عند التخرّج");
  assert.ok(after.modules.some((m) => m.id === "qudurat"));
});

test("لا تكرارَ عند إعادة التطبيق (idempotent)", () => {
  const once = withCoreForPhase(FULL().workspace!, "university", 2);
  const twice = withCoreForPhase(once, "university", 3);
  assert.equal(twice, once, "أعاد بناءَ نفس المصفوفة بلا داعٍ");
  assert.equal(twice.modules.filter((m) => m.id === "university").length, 1);
});

/* ═══════════ الذاكرة: تُحدَّث ولا تُبنى من جديد ═══════════ */

test("StudentPhaseChanged يحدّث الذاكرة في مكانها ولا يضاعفها", () => {
  const mem = new MemoryEngine(new InMemoryStore());
  const eng = new EventEngine(new InMemoryEventStore());
  const r = makeMemoryReactor(mem);
  eng.subscribe(r.react, r.handles, r.name);

  /* حالةُ البداية كما يكتبها التمهيد: ثانويٌّ في ثالث */
  mem.remember({ type: "identity.studyLevel", value: { level: "ثانوي" }, source: "onboarding" });
  mem.remember({ type: "identity.grade", value: { grade: "ثالث ثانوي" }, source: "onboarding" });

  eng.emit({
    eventType: "StudentPhaseChanged",
    metadata: { from: "hs-3", to: "grad-hs", studyLevel: "خريج", clearedGrade: true },
    educationalStage: "general",
  });

  const levels = mem.all().filter((m) => m.type === "identity.studyLevel");
  assert.equal(levels.length, 1, "سجلٌّ ثانٍ بدل التحديث");
  assert.deepEqual(levels[0].value, { level: "خريج" }, "بقيت الذاكرة تقول «ثانوي» عن خرّيج");
  assert.equal(levels[0].status, "active");
  assert.ok(levels[0].version > 1, "لم تُرفَع النسخة — لم يحدث دمج");

  /* الصفُّ الذي لم يعد صحيحاً: يُبطَل ولا يُحذف — يبقى بتاريخه ودليله */
  const grade = mem.all().find((m) => m.type === "identity.grade");
  assert.ok(grade, "حُذف الصفُّ من الذاكرة");
  assert.equal(grade.status, "invalidated");
  assert.deepEqual(grade.value, { grade: "ثالث ثانوي" }, "تغيّرت القيمةُ بدل إبطالها");
});

test("الترقيةُ بين الصفوف تكتب الصفَّ الجديد ولا تُبطِل شيئاً", () => {
  const mem = new MemoryEngine(new InMemoryStore());
  const eng = new EventEngine(new InMemoryEventStore());
  const r = makeMemoryReactor(mem);
  eng.subscribe(r.react, r.handles, r.name);
  mem.remember({ type: "identity.grade", value: { grade: "ثاني ثانوي" }, source: "onboarding" });

  eng.emit({
    eventType: "StudentPhaseChanged",
    metadata: { from: "hs-2", to: "hs-3", studyLevel: "ثانوي", grade: "ثالث ثانوي", clearedGrade: false },
    educationalStage: "secondary",
  });

  const g = mem.all().filter((m) => m.type === "identity.grade");
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].value, { grade: "ثالث ثانوي" });
  assert.equal(g[0].status, "active");
});
