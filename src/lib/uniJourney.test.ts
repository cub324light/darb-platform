/* اختبارات «رحلة الطالب الجامعي» — تشغيل: TZ=UTC npx tsx --test src/lib/uniJourney.test.ts
   حتمية بلا أي IO: نمرّر تواريخ ثابتة من التقويم الرسمي (year 1447) ومعرّفات
   تخصصات حقيقية. نتحقق: الفصل داخل/خارج، حدود التقدّم، حالات محطات الرحلة،
   الإثراء بالتخصص والاحتياطي، ومهام الأسبوع غير الفارغة. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  semesterInfo, gradProgress, buildUniJourney, aiThisWeek, GRAD_TOTAL_HOURS, AI_INTEGRITY_NOTE,
  uniStage, stageGuidance,
} from "./uniJourney";

/* ════════ semesterInfo: داخل الفصل ════════ */
test("semesterInfo: داخل الفصل الثالث يعيد الفصل والأسبوع والفاينل", () => {
  const s = semesterInfo(new Date("2026-04-01T10:00:00"));
  assert.ok(s, "يجب ألا يكون null داخل الفصل");
  assert.match(s!.termLabel, /الثالث/);
  assert.ok(s!.weekNumber >= 1);
  assert.ok(s!.weeksLeft >= 0);
  assert.ok(s!.daysToFinals != null && s!.daysToFinals > 0, "فاينل قادم داخل الفصل");
  assert.match(s!.finalsLabel ?? "", /اختبارات/);
});

test("semesterInfo: أول يوم في الفصل = الأسبوع الأول", () => {
  const s = semesterInfo(new Date("2026-03-09T08:00:00")); // بداية الفصل الثالث
  assert.ok(s);
  assert.equal(s!.weekNumber, 1);
});

/* ════════ semesterInfo: خارج الفصل ════════ */
test("semesterInfo: إجازة بين الفصول تعيد null", () => {
  // 2026-02-28 داخل «إجازة الفصل الثاني» (لا يوجد term نشط)
  assert.equal(semesterInfo(new Date("2026-02-28T12:00:00")), null);
});

test("semesterInfo: الإجازة الصيفية تعيد null", () => {
  assert.equal(semesterInfo(new Date("2026-07-01T12:00:00")), null);
});

/* ════════ gradProgress: حدود/صفر/تجاوز ════════ */
test("gradProgress: صفر أو غياب → لا تقدّم", () => {
  for (const v of [undefined, 0, -5]) {
    const g = gradProgress(v);
    assert.equal(g.done, 0);
    assert.equal(g.total, GRAD_TOTAL_HOURS);
    assert.equal(g.remaining, GRAD_TOTAL_HOURS);
    assert.equal(g.pct, 0);
  }
});

test("gradProgress: منتصف الطريق", () => {
  const g = gradProgress(66);
  assert.equal(g.done, 66);
  assert.equal(g.remaining, 66);
  assert.equal(g.pct, 50);
});

test("gradProgress: تجاوز الإجمالي يُقص إلى 100٪ بلا متبقٍّ سالب", () => {
  const g = gradProgress(200);
  assert.equal(g.done, GRAD_TOTAL_HOURS);
  assert.equal(g.remaining, 0);
  assert.equal(g.pct, 100);
});

/* ════════ buildUniJourney: البنية والحالات ════════ */
test("buildUniJourney: ٦ محطات دائماً بأيقونات وتفاصيل غير فارغة", () => {
  const steps = buildUniJourney("ee", "الأولى");
  assert.equal(steps.length, 6);
  for (const s of steps) {
    assert.ok(s.title.trim() !== "", "عنوان فارغ");
    assert.ok(s.detail.trim() !== "", "تفصيل فارغ");
    assert.ok(s.icon.trim() !== "", "أيقونة فارغة");
    assert.ok(s.year.trim() !== "", "سنة فارغة");
  }
});

test("buildUniJourney: السنة الثالثة → قبلها done، الحالية current، بعدها upcoming", () => {
  const steps = buildUniJourney("cs", "الثالثة");
  assert.deepEqual(steps.map((s) => s.state), [
    "done", "done", "current", "upcoming", "upcoming", "upcoming",
  ]);
});

test("buildUniJourney: «الخامسة+» تضع محطة التخرّج كحالية", () => {
  const steps = buildUniJourney("cs", "الخامسة+");
  assert.equal(steps[3].state, "done");   // الرابعة
  assert.equal(steps[4].state, "current"); // التخرّج
  assert.equal(steps[5].state, "upcoming"); // أول وظيفة
});

test("buildUniJourney: سنة مجهولة/غائبة → لا محطة حالية (الكل upcoming)", () => {
  for (const y of [undefined, "غير معروف"]) {
    const steps = buildUniJourney("cs", y);
    assert.ok(steps.every((s) => s.state === "upcoming"), "لا يجب أن تُلفَّق محطة حالية");
  }
});

/* ════════ buildUniJourney: الإثراء بعالم التخصص ════════ */
test("buildUniJourney: يُثرى بعالم التخصص (ee)", () => {
  const steps = buildUniJourney("ee", "الأولى");
  assert.match(steps[0].detail, /AutoCAD|ETAP/);        // برامج
  assert.match(steps[1].detail, /FE|الهيئة السعودية/);  // أول شهادة
  assert.match(steps[2].detail, /أرامكو/);              // أبرز جهة
  assert.ok(steps[3].detail.trim() !== "");             // أول مشروع
  assert.ok(steps[5].detail.trim() !== "");             // مسار + راتب
});

test("buildUniJourney: بلا تخصص يستعمل الاحتياطي (كل التفاصيل غير فارغة)", () => {
  const steps = buildUniJourney(undefined, "الثانية");
  assert.equal(steps.length, 6);
  for (const s of steps) assert.ok(s.detail.trim() !== "", "الاحتياطي يجب أن يملأ التفاصيل");
});

/* ════════ aiThisWeek ════════ */
test("aiThisWeek: ٣–٤ عناصر بمهمة وأداة غير فارغتين", () => {
  const items = aiThisWeek("ee");
  assert.ok(items.length >= 3 && items.length <= 4);
  for (const it of items) {
    assert.ok(it.task.trim() !== "", "مهمة فارغة");
    assert.ok(it.via.trim() !== "", "أداة فارغة");
  }
});

test("aiThisWeek: يعكس أبرز برنامج تقني للتخصص (ee → AutoCAD)", () => {
  assert.ok(aiThisWeek("ee").some((it) => /AutoCAD/.test(it.task)));
});

test("aiThisWeek: بلا تخصص يبقى غير فارغ (احتياطي)", () => {
  assert.ok(aiThisWeek(undefined).length >= 3);
});

test("AI_INTEGRITY_NOTE: تنويه نزاهة غير فارغ", () => {
  assert.ok(AI_INTEGRITY_NOTE.trim().length > 0);
});

/* ════════ المرحلة الجامعية — اللوحة تتحوّل ════════ */
test("uniStage: سنة أولى → start، ثانية/ثالثة → mid، رابعة أو ساعات عالية → senior", () => {
  assert.equal(uniStage("الأولى", 10), "start");
  assert.equal(uniStage(undefined, undefined), "start");
  assert.equal(uniStage("الثانية", 40), "mid");
  assert.equal(uniStage("الثالثة", 70), "mid");
  assert.equal(uniStage("الرابعة", 120), "senior");
  assert.equal(uniStage("الخامسة+", 140), "senior");
  /* ساعات عالية تُدخِل «قرب التخرّج» ولو تأخّرت السنة */
  assert.equal(uniStage("الثالثة", 100), "senior");
});

test("stageGuidance: قرب التخرّج تتحوّل لعنوان التخرّج وإجراءات السوق", () => {
  const g = stageGuidance("senior", { majorName: "هندسة كهربائية" });
  assert.match(g.title, /التخرّج/);
  assert.ok(g.actions.length >= 4);
  const titles = g.actions.map((a) => a.title).join(" · ");
  assert.match(titles, /سيرت/);      // جهّز سيرتك
  assert.match(titles, /لينكدإن/);
  assert.match(titles, /STEP/);
  /* كل إجراء يقود إلى قسم فعلي (href غير فارغ) */
  assert.ok(g.actions.every((a) => a.href.startsWith("/")));
});

test("stageGuidance: البداية تركّز على المعدّل والتنظيم لا على التخرّج", () => {
  const g = stageGuidance("start");
  assert.doesNotMatch(g.title, /التخرّج/);
  assert.match(g.actions.map((a) => a.title).join(" "), /معدّل/);
});
