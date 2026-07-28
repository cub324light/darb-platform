/* اختبارات محرّك أهلية المسارات واشتقاق الهدف — تشغيل: npx tsx --test src/lib/tracks.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  trackEligibilityFor, orderSelectedTracks, deriveGoalFromTracks,
  defaultTracksFromEligibility,
  secondaryCoreTracks, secondaryActiveTracks, LANGUAGE_TESTS,
  type TrackEligibility, type TrackId,
} from "./tracks";

const byId = (list: TrackEligibility[], id: TrackId) => {
  const e = list.find((x) => x.id === id);
  assert.ok(e, `المسار ${id} موجود في نتيجة الأهلية`);
  return e!;
};

/* ════════ أول ثانوي ════════ */
test("أول ثانوي: القدرات والتحصيلي والمبكر مقفلة بسبب واضح، المدرسة فقط متاحة", () => {
  const list = trackEligibilityFor({ status: "ثانوي", grade: "أول ثانوي" });

  const tahsili = byId(list, "تحصيلي");
  assert.equal(tahsili.status, "locked");
  assert.ok(tahsili.reason && tahsili.reason.length > 0);

  const early = byId(list, "تحصيلي مبكر");
  assert.equal(early.status, "locked");
  assert.match(early.reason!, /ثاني ثانوي/);

  /* القدرات تبدأ من ثاني ثانوي — أول ثانوي يبني أساسه المدرسي أولاً */
  const qudurat = byId(list, "قدرات");
  assert.equal(qudurat.status, "locked");
  assert.match(qudurat.reason!, /ثاني ثانوي/);

  assert.equal(byId(list, "مدرسه").status, "available");
  assert.equal(byId(list, "ستيب").status, "available");
  assert.equal(byId(list, "ستيب").important, false);

  /* CPC/ITC لمرحلة القبول — مقفلة لأول ثانوي بسبب */
  assert.equal(byId(list, "CPC").status, "locked");
  assert.match(byId(list, "CPC").reason!, /القبول/);
  assert.equal(byId(list, "ITC").status, "locked");
});

/* ════════ ثاني ثانوي ════════ */
test("ثاني ثانوي: المبكر متاح بنجمة (جوهر مرحلته)، التحصيلي العادي مقفل، القدرات عادية", () => {
  const list = trackEligibilityFor({ status: "ثانوي", grade: "ثاني ثانوي" });

  const early = byId(list, "تحصيلي مبكر");
  assert.equal(early.status, "available");
  assert.equal(early.important, true);

  const tahsili = byId(list, "تحصيلي");
  assert.equal(tahsili.status, "locked");
  assert.ok(tahsili.reason && tahsili.reason.length > 0);

  const qudurat = byId(list, "قدرات");
  assert.equal(qudurat.status, "available");
  assert.equal(qudurat.important, false);

  assert.equal(byId(list, "CPC").status, "locked");
  assert.equal(byId(list, "مدرسه").status, "available");
});

/* ════════ ثالث ثانوي ════════ */
test("ثالث ثانوي: القدرات والتحصيلي بنجمة (سنة الاختبارات)، CPC متاح، المدرسة متاحة", () => {
  const list = trackEligibilityFor({ status: "ثانوي", grade: "ثالث ثانوي" });

  const qudurat = byId(list, "قدرات");
  assert.equal(qudurat.status, "available");
  assert.equal(qudurat.important, true);

  const tahsili = byId(list, "تحصيلي");
  assert.equal(tahsili.status, "available");
  assert.equal(tahsili.important, true);

  /* المبكر متاح لثالث ثانوي (قاعدة EARLY_TAHSILI) لكن بلا نجمة — التحصيلي العادي هو الجوهر */
  const early = byId(list, "تحصيلي مبكر");
  assert.equal(early.status, "available");
  assert.equal(early.important, false);

  assert.equal(byId(list, "CPC").status, "available");
  assert.equal(byId(list, "ITC").status, "available");
  assert.equal(byId(list, "مدرسه").status, "available");
});

/* ════════ الخريج بالحالتين ════════ */
test("خريج مع استدراك: القدرات والتحصيلي بنجمة، المبكر مقفل بسبب، CPC متاح", () => {
  const list = trackEligibilityFor({ status: "خريج", gradStage: "خريج ثانوي", gapYear: true });

  const qudurat = byId(list, "قدرات");
  assert.equal(qudurat.status, "available");
  assert.equal(qudurat.important, true);

  const tahsili = byId(list, "تحصيلي");
  assert.equal(tahsili.status, "available");
  assert.equal(tahsili.important, true);

  const early = byId(list, "تحصيلي مبكر");
  assert.equal(early.status, "locked");
  assert.ok(early.reason && early.reason.length > 0);

  assert.equal(byId(list, "CPC").status, "available");
});

test("خريج بدون استدراك: القدرات والتحصيلي متاحان بلا أي نجوم إطلاقاً", () => {
  const list = trackEligibilityFor({ status: "خريج", gradStage: "خريج جامعة", gapYear: false });
  assert.equal(byId(list, "قدرات").status, "available");
  assert.equal(byId(list, "تحصيلي").status, "available");
  assert.ok(list.every((e) => !e.important), "لا نجمة لأي مسار بدون استدراك");
});

/* ════════ كل مقفل له سبب ════════ */
test("كل مسار مقفل في كل الحالات يحمل سبباً غير فارغ", () => {
  const cases = [
    { status: "ثانوي", grade: "أول ثانوي" },
    { status: "ثانوي", grade: "ثاني ثانوي" },
    { status: "ثانوي", grade: "ثالث ثانوي" },
    { status: "خريج", gapYear: true },
    { status: "خريج", gapYear: false },
    { status: "جامعي" },
  ];
  for (const c of cases) {
    for (const e of trackEligibilityFor(c)) {
      if (e.status === "locked") {
        assert.ok(e.reason && e.reason.trim().length > 0, `${e.id} مقفل بلا سبب في ${JSON.stringify(c)}`);
      } else {
        assert.equal(e.reason, undefined, `${e.id} متاح لا يحمل سبب قفل`);
      }
    }
  }
});

/* ════════ المبدئيات المنطقية ════════ */
test("المبدئيات (اختبارات فقط، بلا مدرسة): أول → لا شيء · ثاني → مبكر+قدرات · ثالث → قدرات+تحصيلي", () => {
  const d1 = defaultTracksFromEligibility(trackEligibilityFor({ status: "ثانوي", grade: "أول ثانوي" }));
  assert.deepEqual(d1, []);

  const d2 = defaultTracksFromEligibility(trackEligibilityFor({ status: "ثانوي", grade: "ثاني ثانوي" }));
  assert.deepEqual(d2, ["تحصيلي مبكر", "قدرات"]);

  const d3 = defaultTracksFromEligibility(trackEligibilityFor({ status: "ثانوي", grade: "ثالث ثانوي" }));
  assert.deepEqual(d3, ["قدرات", "تحصيلي"]);
});


/* ════════ الترتيب القانوني واشتقاق الهدف ════════ */
test("orderSelectedTracks: نجمة المرحلة أولاً والمدرسة أخيراً", () => {
  const elig2 = trackEligibilityFor({ status: "ثانوي", grade: "ثاني ثانوي" });
  assert.deepEqual(
    orderSelectedTracks(["مدرسه", "قدرات", "تحصيلي مبكر"], elig2),
    ["تحصيلي مبكر", "قدرات", "مدرسه"],
  );

  const elig3 = trackEligibilityFor({ status: "ثانوي", grade: "ثالث ثانوي" });
  assert.deepEqual(
    orderSelectedTracks(["مدرسه", "تحصيلي", "قدرات"], elig3),
    ["قدرات", "تحصيلي", "مدرسه"],
  );
});

test("deriveGoalFromTracks: أبرز مسار مختار يحدّد الهدف — والمدرسة فقط بلا هدف", () => {
  const elig1 = trackEligibilityFor({ status: "ثانوي", grade: "أول ثانوي" });
  const elig2 = trackEligibilityFor({ status: "ثانوي", grade: "ثاني ثانوي" });
  const elig3 = trackEligibilityFor({ status: "ثانوي", grade: "ثالث ثانوي" });

  /* ثاني ثانوي: المبكر بنجمة → أبرز مسار → tahsili (لا «تحسين قدرات» مفروض) */
  assert.equal(deriveGoalFromTracks(["قدرات", "تحصيلي مبكر", "مدرسه"], elig2), "tahsili");
  /* ثالث ثانوي: قدرات وتحصيلي بنجمة — القدرات أسبق قانونياً → qudurat */
  assert.equal(deriveGoalFromTracks(["تحصيلي", "قدرات", "مدرسه"], elig3), "qudurat");
  /* أول ثانوي: قدرات → qudurat، وستيب وحدها → step */
  assert.equal(deriveGoalFromTracks(["قدرات", "مدرسه"], elig1), "qudurat");
  assert.equal(deriveGoalFromTracks(["ستيب", "مدرسه"], elig1), "step");
  /* مدرسة فقط: لا هدف مجرّد يُفرض على الطالب */
  assert.equal(deriveGoalFromTracks(["مدرسه"], elig1), undefined);
  assert.equal(deriveGoalFromTracks([], elig1), undefined);
});


/* ════════ النواة الثابتة لطلاب الثانوي ════════ */
test("secondaryCoreTracks: القدرات والمدرسة ثابتتان، وشقّ التحصيلي يتبدّل مع الصف", () => {
  assert.deepEqual(secondaryCoreTracks("أول ثانوي"),  ["قدرات", "تحصيلي", "مدرسه"]);
  assert.deepEqual(secondaryCoreTracks("ثاني ثانوي"), ["قدرات", "تحصيلي مبكر", "مدرسه"]);
  assert.deepEqual(secondaryCoreTracks("ثالث ثانوي"), ["قدرات", "تحصيلي", "مدرسه"]);
  /* ثانوي بلا صف محدّد: التحصيلي العادي (الأكثر تحفّظاً) */
  assert.deepEqual(secondaryCoreTracks(undefined),    ["قدرات", "تحصيلي", "مدرسه"]);
  /* اختبارات اللغة الأربعة */
  assert.deepEqual(LANGUAGE_TESTS, ["ستيب", "ايلتس", "توفل", "دوليقو"]);
});

/* ════════ المسارات النهائية للثانوي: نواة متاحة + لغات بلا حد ════════ */
test("secondaryActiveTracks: النواة المتاحة فقط بلا لغات، والقدرات دائماً أولاً والمدرسة أخيراً", () => {
  const e1 = trackEligibilityFor({ status: "ثانوي", grade: "أول ثانوي" });
  /* أول ثانوي: القدرات والتحصيلي مقفلان → المدرسة فقط في النواة المتاحة */
  assert.deepEqual(secondaryActiveTracks("أول ثانوي", e1, []), ["مدرسه"]);

  const e2 = trackEligibilityFor({ status: "ثانوي", grade: "ثاني ثانوي" });
  assert.deepEqual(secondaryActiveTracks("ثاني ثانوي", e2, []), ["قدرات", "تحصيلي مبكر", "مدرسه"]);

  const e3 = trackEligibilityFor({ status: "ثانوي", grade: "ثالث ثانوي" });
  assert.deepEqual(secondaryActiveTracks("ثالث ثانوي", e3, []), ["قدرات", "تحصيلي", "مدرسه"]);
});

test("secondaryActiveTracks: اختبارات اللغة متعددة بلا أي حدّ عددي", () => {
  const e3 = trackEligibilityFor({ status: "ثانوي", grade: "ثالث ثانوي" });

  /* اختباران لغة → 5 مسارات، والقدرات أولاً والمدرسة أخيراً — بلا سقف */
  const two = secondaryActiveTracks("ثالث ثانوي", e3, ["ايلتس", "توفل"]);
  assert.deepEqual(two, ["قدرات", "تحصيلي", "ايلتس", "توفل", "مدرسه"]);
  assert.ok(two.filter((t) => t !== "مدرسه").length > 3, "لا يُطبَّق أي حد على اختبارات اللغة");

  /* كل اختبارات اللغة الأربعة معاً — بترتيب LANGUAGE_TESTS بغضّ النظر عن ترتيب الاختيار */
  const all = secondaryActiveTracks("ثالث ثانوي", e3, ["دوليقو", "توفل", "ايلتس", "ستيب"]);
  assert.deepEqual(all, ["قدرات", "تحصيلي", "ستيب", "ايلتس", "توفل", "دوليقو", "مدرسه"]);
  for (const t of LANGUAGE_TESTS) assert.ok(all.includes(t), `${t} مضاف`);

  /* الأساسي دائماً القدرات (أول نواة متاحة) والمدرسة أخيراً */
  assert.equal(all[0], "قدرات");
  assert.equal(all[all.length - 1], "مدرسه");
});
