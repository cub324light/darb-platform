/* ═══ حرّاسُ الدمج — ما يتراكم لا يُمحى، والمرحلةُ لا تتراجع ═══
   كلُّ اختبارٍ هنا يُثبت **السلوك الصحيح بعد الإصلاح** لا السلوكَ القديم.
   تشغيل: TZ=UTC npx tsx --test src/lib/backupMerge.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeUser, mergeStats, mergeById, mergeWorkspace, mergeKey, phaseRank, MERGE_RULES } from "./backupMerge";
import type { DarbUser, DarbStats } from "./storage";

const user = (o: Partial<DarbUser>): DarbUser =>
  ({ name: "سارة", track: "تحصيلي", onboarded: true, ...o } as DarbUser);
const mod = (id: string, progress: number) =>
  ({ id, kind: "exam", state: "added", progress, order: 0, hidden: false, lastActivityAt: 1 });
const ws = (...ms: ReturnType<typeof mod>[]) => ({ modules: ms, updatedAt: 1 });
const stats = (o: Partial<DarbStats>): DarbStats =>
  ({ silver: 0, totalFocusMins: 0, sessionsCount: 0, sessionDays: [], todayFocusMins: 0, todayKey: "", dayMins: {}, ...o });

const progressOf = (u: DarbUser | null) =>
  Object.fromEntries(((u?.workspace?.modules ?? []) as { id: string; progress: number }[])
    .map((m) => [m.id, m.progress]));

/* ═══ Test A — تقدّمُ جهازين لا يمحو بعضُه بعضاً ═══ */
test("A · جهازٌ ٨٠٪ قدرات وآخرُ ٧٥٪ تحصيلي ⇒ كلاهما باقٍ", () => {
  const a = user({ workspace: ws(mod("qudurat", 80), mod("tahsili", 20)) as never });
  const b = user({ workspace: ws(mod("qudurat", 10), mod("tahsili", 75)) as never });
  assert.deepEqual(progressOf(mergeUser(a, b)), { qudurat: 80, tahsili: 75 });
  assert.deepEqual(progressOf(mergeUser(b, a)), { qudurat: 80, tahsili: 75 }, "الدمجُ لا يتعلّق بالاتجاه");
});

/* ═══ Test B — الدقائقُ والفضّةُ لا تضيع ═══ */
test("B · تسعون دقيقةً وخمسون فضّةً تبقى بعد مزامنةِ جهازٍ أفقر", () => {
  const a = stats({ silver: 50, totalFocusMins: 90, sessionsCount: 3, dayMins: { "2026-08-14": 90 }, sessionDays: ["2026-08-14"], todayKey: "2026-08-14", todayFocusMins: 90 });
  const b = stats({ silver: 5, totalFocusMins: 10, sessionsCount: 1, dayMins: { "2026-08-14": 10 }, sessionDays: ["2026-08-14"], todayKey: "2026-08-14", todayFocusMins: 10 });
  const m = mergeStats(a, b)!;
  assert.equal(m.silver, 50);
  assert.equal(m.totalFocusMins, 90);
  assert.equal(m.sessionsCount, 3);
  assert.equal(m.dayMins["2026-08-14"], 90);
  assert.equal(m.todayFocusMins, 90);
});

/* ═══ Test C — المرحلةُ لا تتراجع ═══ */
test("C · نسخةٌ أقدمُ (hs-2) لا تُرجع طالبَ hs-3", () => {
  const local = user({ studyLevel: "ثانوي", grade: "ثالث ثانوي", gradeYearId: "1447" });
  const cloud = user({ studyLevel: "ثانوي", grade: "ثاني ثانوي", gradeYearId: "1446" });
  const m = mergeUser(local, cloud)!;
  assert.equal(m.grade, "ثالث ثانوي");
  assert.equal(m.gradeYearId, "1447", "المرساةُ تُنقل مع الصفّ — تخلّفُها يُعيد الترقيةَ وحدثَها");
});

test("C٢ · نسخةٌ أحدثُ مرحلةً تتقدّم كما ينبغي", () => {
  const local = user({ studyLevel: "ثانوي", grade: "ثاني ثانوي", gradeYearId: "1446" });
  const cloud = user({ studyLevel: "ثانوي", grade: "ثالث ثانوي", gradeYearId: "1447" });
  const m = mergeUser(local, cloud)!;
  assert.equal(m.grade, "ثالث ثانوي");
  assert.equal(m.gradeYearId, "1447");
});

test("C٣ · حقولُ المرحلة تُنقل معاً — والخرّيجُ لا يعود صفّاً", () => {
  const local = user({ studyLevel: "خريج", gradStage: "خريج ثانوي" });     // grad-hs
  const cloud = user({ studyLevel: "ثانوي", grade: "ثالث ثانوي" });        // hs-3
  const m = mergeUser(local, cloud)!;
  assert.equal(m.studyLevel, "خريج");
  assert.equal(m.gradStage, "خريج ثانوي");
  assert.equal(m.grade, undefined, "الخرّيجُ بلا صفّ — لا يبقى صفٌّ معلّق");
});

test("C٤ · المرحلةُ المجهولةُ تخسر أمام أيّ مرحلةٍ معلومة", () => {
  assert.equal(phaseRank(user({ studyLevel: "ثانوي" })), -1, "ثانويٌّ بلا صفّ = مجهول");
  assert.ok(phaseRank(user({ studyLevel: "ثانوي", grade: "أول ثانوي" })) > -1);
  const m = mergeUser(user({ studyLevel: "ثانوي" }), user({ studyLevel: "ثانوي", grade: "أول ثانوي" }))!;
  assert.equal(m.grade, "أول ثانوي");
});

/* ═══ Test D — الأيامُ اتّحاد ═══ */
test("D · أيامُ الجهازين تتّحد ولا يُلغي أحدُهما الآخر", () => {
  const a = stats({ sessionDays: ["2026-08-12", "2026-08-13"], dayMins: { "2026-08-12": 30, "2026-08-13": 40 } });
  const b = stats({ sessionDays: ["2026-08-14"], dayMins: { "2026-08-14": 60 } });
  const m = mergeStats(a, b)!;
  assert.deepEqual(m.sessionDays, ["2026-08-12", "2026-08-13", "2026-08-14"]);
  assert.deepEqual(m.dayMins, { "2026-08-12": 30, "2026-08-13": 40, "2026-08-14": 60 });
});

/* ═══ Test E — أعلى تقدّمٍ للوحدة نفسِها ═══ */
test("E · وحدةٌ واحدةٌ بتقدّمين ⇒ الأعلى", () => {
  const m = mergeWorkspace(ws(mod("qudurat", 30)), ws(mod("qudurat", 65)))!;
  assert.deepEqual((m.modules as { id: string; progress: number }[]).map((x) => [x.id, x.progress]), [["qudurat", 65]]);
});

/* ═══ Test F — التماثل: تكرارُ الدمج لا يُنتج تكراراً ═══ */
test("F · الدمجُ متماثلٌ (idempotent)", () => {
  const a = user({ workspace: ws(mod("qudurat", 80)) as never, rewardedFields: ["name"], studyLevel: "ثانوي", grade: "ثالث ثانوي" });
  const b = user({ workspace: ws(mod("tahsili", 75)) as never, rewardedFields: ["bio"], studyLevel: "ثانوي", grade: "ثاني ثانوي" });
  const once = mergeUser(a, b)!;
  const twice = mergeUser(once, b)!;
  assert.deepEqual(progressOf(twice), progressOf(once));
  assert.deepEqual(twice.rewardedFields!.sort(), once.rewardedFields!.sort());
  assert.equal(twice.grade, once.grade);

  const s1 = mergeStats(stats({ silver: 50, sessionDays: ["d1"] }), stats({ silver: 20, sessionDays: ["d2"] }))!;
  const s2 = mergeStats(s1, stats({ silver: 20, sessionDays: ["d2"] }))!;
  assert.deepEqual(s2.sessionDays, s1.sessionDays);
  assert.equal(s2.silver, s1.silver);

  const c1 = mergeById([{ id: "a" }], [{ id: "b" }]);
  assert.deepEqual(mergeById(c1, [{ id: "b" }]).map((x) => x.id), ["a", "b"]);
});

/* ═══ المجموعاتُ ذاتُ المعرّفات ═══ */
test("مجموعاتُ المعرّفات تتّحد، والأحدثُ ختماً يفوز عند التعارض", () => {
  const a = [{ id: "r1", score: "80", updatedAt: 100 }, { id: "r2", score: "70" }];
  const b = [{ id: "r1", score: "95", updatedAt: 200 }, { id: "r3", score: "60" }];
  const m = mergeById(a, b);
  assert.deepEqual(m.map((x) => x.id).sort(), ["r1", "r2", "r3"]);
  assert.equal(m.find((x) => x.id === "r1")!.score, "95");
});

test("بلا ختمٍ يبقى المحلّيُّ — لا نخمّن", () => {
  const m = mergeById([{ id: "x", v: 1 }], [{ id: "x", v: 2 }]);
  assert.equal(m[0].v, 1);
});

/* ═══ الأوسمةُ والمستويات والمنجَز ═══ */
test("ما أُنجز لا يُنتقَض: الأوسمةُ والمستوياتُ والدروسُ اتّحاد", () => {
  for (const key of ["darb_badges_claimed", "darb_levels_claimed", "darb_challenges_claimed", "darb_done_lessons"]) {
    const out = JSON.parse(mergeKey(key, JSON.stringify(["a", "b"]), JSON.stringify(["b", "c"])));
    assert.deepEqual(out.sort(), ["a", "b", "c"], key);
  }
  assert.equal(mergeKey("darb_rp", "350", "120"), "350", "نقاطُ الأرينا لا تتراجع");
});

/* ═══ حدُّ القاعدة: ما لا دلالةَ له يبقى كما كان ═══ */
test("ما ليس له قاعدةٌ يبقى على LWW — لا اختراع", () => {
  assert.equal(mergeKey("darb_theme", "dark", "light"), "light");
  assert.equal(mergeKey("darb_study_plan", '{"a":1}', '{"b":2}'), '{"b":2}');
  assert.ok(!("darb_calendar" in MERGE_RULES), "التقويمُ تفضيلاتٌ لا تراكم");
});

test("محلّيٌّ غائبٌ أو تالفٌ لا يُسقط الاسترجاع", () => {
  assert.equal(mergeKey("darb_stats", null, '{"silver":5}'), '{"silver":5}');
  assert.equal(mergeKey("darb_results", "ليس JSON", "[]"), "[]");
  assert.equal(mergeKey("darb_user", "{{{", '{"name":"سارة"}'), '{"name":"سارة"}');
});

/* ═══ الفئةُ الأولى تبقى كما كانت ═══ */
test("ما يحرّره الطالبُ كحالةٍ واحدة تفوز فيه السحابة", () => {
  const m = mergeUser(
    user({ bio: "قديمة", studyTime: "فجر", avatar: "a1", studyHours: 2 }),
    user({ bio: "جديدة", studyTime: "ليل", avatar: "a2", studyHours: 4 }),
  )!;
  assert.equal(m.bio, "جديدة");
  assert.equal(m.studyTime, "ليل");
  assert.equal(m.avatar, "a2");
  assert.equal(m.studyHours, 4);
});

test("المكافآتُ المصروفةُ لا تُنتقَض فتُصرف مرّتين", () => {
  const m = mergeUser(
    user({ rewardedFields: ["name", "bio"], awardedProfileComplete: true }),
    user({ rewardedFields: ["region"] }),
  )!;
  assert.deepEqual(m.rewardedFields!.sort(), ["bio", "name", "region"]);
  assert.equal(m.awardedProfileComplete, true);
});
