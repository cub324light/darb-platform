/* ═══ حرّاسُ الإغلاق (المرحلة الحادية عشرة) ═══
   `StudentProfileCorrected` · `ResultDeleted` · قرارُ الهدف · الدمجُ قبل الرفع.
   تشغيل: TZ=UTC npx tsx --test src/lib/closure.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MemoryEngine } from "./memory/engine";
import { InMemoryStore } from "./memory/store";
import { EventEngine, InMemoryEventStore } from "./events";
import { makeMemoryReactor } from "./events/reactors";
import { mergeGoals, mergeKey, mergeForUpload, GOAL_DECISION_FIELDS } from "./backupMerge";
import type { DarbUser, DarbStats } from "./storage";

const src = (p: string) => readFileSync(p, "utf8");
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const AT = () => Date.parse("2026-08-14T09:00:00Z");
function wired() {
  const mem = new MemoryEngine(new InMemoryStore(), AT);
  const events = new EventEngine(new InMemoryEventStore(), { clock: AT });
  const r = makeMemoryReactor(mem);
  events.subscribe(r.react, r.handles, r.name);
  return { mem, events };
}
/* ملفُّ طالبٍ كاملٌ كما يبذره التسجيل */
const registerFull = (events: EventEngine) => events.emit({
  eventType: "StudentRegistered",
  metadata: { snapshot: { name: "سارة", studyLevel: "ثانوي", grade: "أول ثانوي",
    targets: [{ exam: "قدرات", target: 90 }], university: "جامعة الملك سعود", major: "طب" } },
  source: "migration", educationalStage: "secondary", actor: { kind: "system" },
});
const val = (mem: MemoryEngine, id: string) => mem.all().find((m) => m.id === id);

/* ════════════════ ١) StudentProfileCorrected ════════════════ */

test("تصحيحُ الصفّ يُحدِّث الهويةَ في الذاكرة", () => {
  const { mem, events } = wired();
  registerFull(events);
  assert.equal((val(mem, "identity.grade:self")!.value as { grade: string }).grade, "أول ثانوي");
  events.emit({ eventType: "StudentProfileCorrected", metadata: { grade: "ثالث ثانوي", studyLevel: "ثانوي" } });
  assert.equal((val(mem, "identity.grade:self")!.value as { grade: string }).grade, "ثالث ثانوي");
  assert.equal(mem.buildStudentContext().identity.grade, "ثالث ثانوي", "البرومبتُ ما زال على القديم");
});

test("ولا يمسّ الأهدافَ ولا الدرجات", () => {
  const { mem, events } = wired();
  registerFull(events);
  const before = mem.all().filter((m) => m.type.startsWith("goal.")).map((m) => `${m.id}=${JSON.stringify(m.value)}`).sort();
  events.emit({ eventType: "StudentProfileCorrected", metadata: { grade: "ثالث ثانوي", studyLevel: "ثانوي" } });
  const after = mem.all().filter((m) => m.type.startsWith("goal.")).map((m) => `${m.id}=${JSON.stringify(m.value)}`).sort();
  assert.deepEqual(after, before, "الأهدافُ تغيّرت مع تصحيح الصفّ");
  const ctx = mem.buildStudentContext();
  assert.equal(ctx.currentGoal.university, "جامعة الملك سعود");
  assert.deepEqual(ctx.currentGoal.targets, [{ exam: "قدرات", target: 90 }]);
});

test("ولا يُطلق حدثَ المرحلة ولا يمسّ `phaseId`", () => {
  const { events } = wired();
  registerFull(events);
  events.emit({ eventType: "StudentProfileCorrected", metadata: { grade: "ثالث ثانوي", studyLevel: "ثانوي" } });
  assert.equal(events.all().filter((e) => e.eventType === "StudentPhaseChanged").length, 0);
  /* والواجهةُ لا تُطلقه ولا تنتقل */
  const cmd = stripComments(src("src/lib/userCommands.ts"));
  assert.ok(!/StudentPhaseChanged/.test(cmd) && !/transitionTo/.test(cmd));
  assert.ok(/eventType: "StudentProfileCorrected"/.test(cmd), "الأمرُ لا يُطلق التصحيح");
});

test("متماثلٌ: ألفُ تصحيحٍ بنفس القيمة = سجلٌّ واحد", () => {
  const { mem, events } = wired();
  registerFull(events);
  for (let i = 0; i < 50; i++) events.emit({ eventType: "StudentProfileCorrected", metadata: { grade: "ثالث ثانوي", studyLevel: "ثانوي" } });
  const recs = mem.all().filter((m) => m.type === "identity.grade");
  assert.equal(recs.length, 1, "تكرارٌ في الذاكرة");
  assert.equal((recs[0].value as { grade: string }).grade, "ثالث ثانوي");
});

test("خرّيجٌ بلا صفّ: يُبطَل صفُّه ولا يُحذف", () => {
  const { mem, events } = wired();
  registerFull(events);
  events.emit({ eventType: "StudentProfileCorrected", metadata: { studyLevel: "خريج", clearedGrade: true } });
  const rec = val(mem, "identity.grade:self")!;
  assert.equal(rec.status, "invalidated");
  assert.equal(mem.buildStudentContext().identity.grade, undefined, "صفٌّ مُبطَلٌ ما زال يصل البرومبت");
});

test("لا تكتب الواجهةُ الذاكرةَ مباشرةً", () => {
  const cmd = stripComments(src("src/lib/userCommands.ts"));
  assert.ok(!/\.remember\(|invalidateMemory\(|darb_memory/.test(cmd));
});

/* ════════════════ ٢) ResultDeleted ════════════════ */

const withScore = () => {
  const w = wired();
  w.events.emit({ eventType: "ScoreUpdated", metadata: { exam: "قدرات", score: 95 } });
  w.events.emit({ eventType: "ExamCompleted", metadata: { exam: "قدرات", score: 95 } });
  return w;
};

test("الحذفُ يُبطل الذاكرةَ المعتمدةَ على النتيجة — بمعرّفٍ حتميّ", () => {
  const { mem, events } = withScore();
  assert.equal(val(mem, "learning.subjectMastery:قدرات")!.status, "active");
  events.emit({ eventType: "ResultDeleted", metadata: { resultId: "r1", exam: "قدرات", score: 95 } });
  assert.equal(val(mem, "learning.subjectMastery:قدرات")!.status, "invalidated");
});

test("والتاريخُ يبقى: لا يُحذف حدثٌ ولا يُفلتَر سجلّ", () => {
  const { events } = withScore();
  events.emit({ eventType: "ResultDeleted", metadata: { resultId: "r1", exam: "قدرات", score: 95 } });
  const types = events.all().map((e) => e.eventType);
  assert.ok(types.includes("ScoreUpdated") && types.includes("ExamCompleted"), "مُحي تاريخٌ صادق");
  assert.ok(types.includes("ResultDeleted"));
});

test("والحذفُ يصير آخرَ النشاط الذي يقرؤه دويرب", () => {
  const { events } = withScore();
  events.emit({ eventType: "ResultDeleted", metadata: { resultId: "r1", exam: "قدرات", score: 95 } });
  /* `formatDuwairbContext` يأخذ آخرَ ثلاثة من الجدول الزمنيّ */
  const last3 = events.buildTimeline({ limit: 6 }).map((t) => t.summary).slice(-3);
  assert.ok(last3.some((s) => /حذف نتيجة قدرات/.test(s)), "الحذفُ لا يظهر في آخر النشاط");
  assert.equal(last3[last3.length - 1], "حذف نتيجة قدرات", "الحذفُ ليس الأحدث");
});

test("الحدثُ يحمل هويةَ النتيجة — لا مطابقةَ لنصّ عرض", () => {
  const gp = stripComments(src("src/components/GoalsPanel.tsx"));
  assert.ok(/eventType: "ResultDeleted"/.test(gp), "الحذفُ لا يُطلق شيئاً");
  assert.ok(/resultId: gone\.id/.test(gp) && /exam: gone\.exam/.test(gp), "الحدثُ بلا هويةٍ للنتيجة");
  const rc = stripComments(src("src/lib/events/reactors.ts"));
  const block = rc.match(/case "ResultDeleted":[\s\S]*?break;/)![0];
  assert.ok(/learning\.subjectMastery:\$\{e\.metadata\.exam\}/.test(block), "الإبطالُ ليس حتمياً");
  assert.ok(!/أكمل اختبار/.test(block), "يطابق نصَّ عرض");
});

/* ════════════════ ٣) darb_goals — قرارٌ لا يتراجع ════════════════ */

const goals = (o: object) => JSON.stringify(o);

test("الأقدمُ لا يستبدل الأحدث", () => {
  const mine = goals({ university: "جامعة الملك سعود", major: "طب", updatedAt: 2000 });
  const theirs = goals({ university: "جامعة الملك فهد", major: "هندسة", updatedAt: 1000 });
  const out = JSON.parse(mergeKey("darb_goals", mine, theirs));
  assert.equal(out.university, "جامعة الملك سعود");
  assert.equal(out.major, "طب");
});

test("والأحدثُ يُقبل", () => {
  const mine = goals({ university: "جامعة الملك سعود", major: "طب", updatedAt: 1000 });
  const theirs = goals({ university: "جامعة الملك فهد", major: "هندسة", updatedAt: 3000 });
  const out = JSON.parse(mergeKey("darb_goals", mine, theirs));
  assert.equal(out.university, "جامعة الملك فهد");
  assert.equal(out.major, "هندسة");
});

test("وبلا ختمٍ موثوق لا نخترع مقارنة — يبقى قرارُ صاحب النداء", () => {
  const mine = goals({ university: "جامعة الملك سعود", major: "طب" });
  const theirs = goals({ university: "جامعة الملك فهد", major: "هندسة" });
  assert.equal(JSON.parse(mergeKey("darb_goals", mine, theirs)).university, "جامعة الملك سعود");
  /* ختمٌ في طرفٍ واحدٍ ليس مقارنةً */
  const half = goals({ university: "جامعة الملك فهد", updatedAt: 9999 });
  assert.equal(JSON.parse(mergeKey("darb_goals", mine, half)).university, "جامعة الملك سعود");
});

test("والحقولُ خارج القرار تبقى LWW", () => {
  const mine = goals({ university: "جامعة الملك سعود", quduratTarget: 90, highschoolPct: 95, updatedAt: 2000 });
  const theirs = goals({ university: "جامعة الملك فهد", quduratTarget: 80, highschoolPct: 88, updatedAt: 1000 });
  const out = JSON.parse(mergeKey("darb_goals", mine, theirs));
  assert.equal(out.university, "جامعة الملك سعود", "القرارُ تراجع");
  assert.equal(out.quduratTarget, 80, "الدرجةُ المستهدفة ليست قراراً — LWW");
  assert.equal(out.highschoolPct, 88);
  assert.deepEqual([...GOAL_DECISION_FIELDS], ["university", "universityId", "major", "majorId", "college"]);
});

test("mergeGoals متماثل", () => {
  const a = { university: "س", updatedAt: 2000 }, b = { university: "ف", updatedAt: 1000 };
  const once = mergeGoals(a, b)!;
  assert.deepEqual(mergeGoals(once, b), once);
});

test("`saveGoals` تختم كلَّ حفظ", () => {
  const st = stripComments(src("src/lib/storage.ts"));
  assert.ok(/updatedAt: Date\.now\(\)/.test(st), "لا ختمَ على الأهداف");
});

/* ════════════════ ٤) الدمجُ قبل الرفع ════════════════ */

const user = (o: Partial<DarbUser>): string => JSON.stringify({ name: "سارة", track: "تحصيلي", onboarded: true, ...o });
const mod = (id: string, progress: number) => ({ id, kind: "exam", state: "added", progress, order: 0, hidden: false, lastActivityAt: 1 });
const stats = (o: Partial<DarbStats>): string => JSON.stringify({ silver: 0, totalFocusMins: 0, sessionsCount: 0, sessionDays: [], todayFocusMins: 0, todayKey: "", dayMins: {}, ...o });

test("الرفعُ لا يمحو تقدّمَ الجهاز الآخر", () => {
  const mine = user({ workspace: { modules: [mod("qudurat", 80)], updatedAt: 1 } as never });
  const remote = user({ workspace: { modules: [mod("tahsili", 75)], updatedAt: 1 } as never });
  const out = JSON.parse(mergeForUpload("darb_user", mine, remote));
  assert.deepEqual(out.workspace.modules.map((m: { id: string; progress: number }) => `${m.id}:${m.progress}`).sort(),
    ["qudurat:80", "tahsili:75"]);
});

test("والرفعُ لا يعكس المرحلة", () => {
  /* المحلّيُّ متقدّم ⇒ يُرفع المتقدّم */
  let out = JSON.parse(mergeForUpload("darb_user",
    user({ studyLevel: "ثانوي", grade: "ثالث ثانوي", gradeYearId: "1447" }),
    user({ studyLevel: "ثانوي", grade: "ثاني ثانوي", gradeYearId: "1446" })));
  assert.equal(out.grade, "ثالث ثانوي");
  assert.equal(out.gradeYearId, "1447");
  /* والسحابةُ متقدّمة ⇒ لا يُرجعها هذا الجهاز للخلف */
  out = JSON.parse(mergeForUpload("darb_user",
    user({ studyLevel: "ثانوي", grade: "ثاني ثانوي", gradeYearId: "1446" }),
    user({ studyLevel: "ثانوي", grade: "ثالث ثانوي", gradeYearId: "1447" })));
  assert.equal(out.grade, "ثالث ثانوي", "الرفعُ أرجع المرحلة");
});

test("والرفعُ لا يمحو الأيامَ ولا العدّادات", () => {
  const out = JSON.parse(mergeForUpload("darb_stats",
    stats({ silver: 50, totalFocusMins: 90, sessionDays: ["d1"], dayMins: { d1: 90 } }),
    stats({ silver: 200, totalFocusMins: 500, sessionDays: ["d2"], dayMins: { d2: 60 } })));
  assert.equal(out.silver, 200);
  assert.equal(out.totalFocusMins, 500);
  assert.deepEqual(out.sessionDays.sort(), ["d1", "d2"]);
  assert.deepEqual(out.dayMins, { d1: 90, d2: 60 });
});

test("والرفعُ لا يمحو النتائجَ ولا الجلساتِ ولا الخزنة", () => {
  for (const k of ["darb_results", "darb_vault", "darb_sessions", "darb_homework", "darb_admissions"]) {
    const out = JSON.parse(mergeForUpload(k, '[{"id":"mine"}]', '[{"id":"theirs"}]'));
    assert.deepEqual(out.map((x: { id: string }) => x.id).sort(), ["mine", "theirs"], k);
  }
});

test("وحالةُ هذا الجهاز تفوز فيما لا قاعدةَ له (LWW عند الرفع)", () => {
  assert.equal(mergeForUpload("darb_study_plan", '{"mine":1}', '{"theirs":1}'), '{"mine":1}');
  const out = JSON.parse(mergeForUpload("darb_user", user({ bio: "جديدة" }), user({ bio: "قديمة" })));
  assert.equal(out.bio, "جديدة", "الرفعُ رفع سيرةَ السحابة محلَّ سيرة الجهاز");
});

test("ولا سحابةَ ⇒ يُرفع المحلّيُّ كما كان", () => {
  assert.equal(mergeForUpload("darb_results", '[{"id":"a"}]', null), '[{"id":"a"}]');
});

test("الرفعُ متماثل: تكرارُه لا يُنتج تكراراً", () => {
  const once = mergeForUpload("darb_results", '[{"id":"a"}]', '[{"id":"b"}]');
  assert.deepEqual(JSON.parse(mergeForUpload("darb_results", once, '[{"id":"b"}]')).map((x: { id: string }) => x.id).sort(), ["a", "b"]);
});

test("و«ابدأ من الصفر» يستبدل ولا يدمج", () => {
  const c = src("src/lib/cloud.ts");
  assert.ok(/pushBackup\(\{ merge: false \}\)/.test(c), "المسحُ يدمج فيُعيد ما مُحي");
  assert.ok(/opts\?\.merge === false \? collectBackup\(\)/.test(c));
  assert.ok(/mergedBackupForUpload/.test(c), "الرفعُ العاديُّ لا يدمج");
});

test("لا حدثَ ثالثٌ أُضيف", () => {
  const reg = src("src/lib/events/registry.ts");
  const added = ["StudentProfileCorrected", "ResultDeleted"];
  for (const a of added) assert.ok(reg.includes(a), `${a} غيرُ مسجَّل`);
  /* ومحرّكُ الانتقال ما زال المُطلِقَ الوحيد لحدث المرحلة */
  const emitters = ["src/lib/transition/index.ts"];
  const found = ["src/lib/transition/index.ts", "src/lib/userCommands.ts", "src/components/GoalsPanel.tsx"]
    .filter((f) => /eventType: "StudentPhaseChanged"/.test(stripComments(src(f))));
  assert.deepEqual(found, emitters);
});
