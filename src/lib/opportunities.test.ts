/* اختبارات محرّك الفرص — تشغيل: npx tsx --test src/lib/opportunities.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOpportunities, type OpportunityInputs } from "./opportunities";
import { UNIVERSITIES } from "./university";

/* طالب ثالث ثانوي علمي ببيانات كاملة */
const FULL: OpportunityInputs = {
  studyLevel: "ثانوي", grade: "ثالث ثانوي", trackType: "صحي", region: "الرياض",
  highschoolPct: 95, qudurat: 88, tahsili: 84, step: 78,
  universityId: "ksu", majorId: "medicine",
};

const GROUP_ORDER = [
  "universities", "colleges", "scholarships-abroad", "technical", "grants", "gov-programs",
];

test("حتمية: نفس المدخلات → نفس المخرجات تماماً", () => {
  assert.deepEqual(buildOpportunities(FULL), buildOpportunities(FULL));
  assert.deepEqual(buildOpportunities({}), buildOpportunities({}));
});

test("الترتيب الثابت للمجموعات الست وكل مجموعة لها عناصر دائماً (لا قسم فارغ صامت)", () => {
  const cases: OpportunityInputs[] = [
    FULL,
    {},
    { studyLevel: "جامعي" },
    { studyLevel: "ثانوي", grade: "أول ثانوي" },
    { studyLevel: "ثانوي", grade: "ثاني ثانوي" },
    { studyLevel: "خريج", gradStage: "خريج ثانوي" },
    { studyLevel: "خريج", highschoolPct: 80, qudurat: 70 },
  ];
  for (const c of cases) {
    const groups = buildOpportunities(c);
    assert.deepEqual(groups.map((g) => g.id), GROUP_ORDER);
    for (const g of groups) {
      assert.ok(g.items.length > 0, `${g.id} فارغة`);
      for (const it of g.items) {
        assert.ok(it.id && it.title && it.detail, `${g.id}: عنصر ناقص`);
        assert.ok(["متاح", "قريب", "يحتاج شرط"].includes(it.status), `${g.id}: حالة غير معروفة`);
      }
    }
  }
});

test("الجامعات مفروزة تنازلياً بالموزونة مع حكم 🟢🟡🔴 وعددها 8–10", () => {
  const unis = buildOpportunities(FULL)[0];
  assert.ok(unis.items.length >= 8 && unis.items.length <= 10, `العدد ${unis.items.length}`);
  for (const it of unis.items) {
    assert.equal(typeof it.score, "number", `${it.id}: بلا موزونة`);
    assert.ok(it.verdict, `${it.id}: بلا حكم`);
    assert.match(it.detail, /سكن/, `${it.id}: بلا ملاحظة سكن`);
  }
  for (let i = 1; i < unis.items.length; i++) {
    assert.ok(
      (unis.items[i - 1].score ?? 0) >= (unis.items[i].score ?? 0),
      `الفرز انكسر عند ${unis.items[i].id}`,
    );
  }
});

test("بلا تحصيلي: تُستعمل المعادلات الإنسانية وتبقى القائمة قابلة للحساب", () => {
  const unis = buildOpportunities({
    studyLevel: "ثانوي", grade: "ثالث ثانوي", highschoolPct: 90, qudurat: 80,
  })[0];
  assert.ok(unis.items.length > 1, "ما انحسبت أي جامعة بالمعادلة الإنسانية");
  for (const it of unis.items) assert.ok(typeof it.score === "number");
});

test("غياب الدرجات: عنصر «أدخل درجاتك أولاً» بدل الإخفاء", () => {
  const unis = buildOpportunities({ studyLevel: "ثانوي", grade: "ثالث ثانوي" })[0];
  assert.equal(unis.items.length, 1);
  assert.equal(unis.items[0].id, "uni-need-scores");
  assert.match(unis.items[0].title, /أدخل درجاتك/);
  assert.match(unis.items[0].detail, /نسبة الثانوية/);
  assert.equal(unis.items[0].linkTo, "/plan");
});

test("الجامعي يُخبَر بلطف أن القبول لمرحلة الثانوية/الخريجين (حتى مع درجات)", () => {
  const groups = buildOpportunities({ studyLevel: "جامعي", highschoolPct: 95, qudurat: 92, tahsili: 90 });
  const unis = groups[0];
  assert.equal(unis.items.length, 1);
  assert.equal(unis.items[0].id, "uni-university-phase");
  assert.match(unis.items[0].detail, /الموزونة/);
  assert.ok(unis.items.every((i) => i.score == null), "لا موزونة تُعرض للجامعي");
  assert.equal(groups[1].items[0].id, "colleges-university-phase");
  assert.equal(groups[4].items[0].id, "grants-university-phase");
});

test("ثاني ثانوي: «القبول قدامك» مع ما يتاح فعلاً (القدرات والتحصيلي المبكر)", () => {
  const unis = buildOpportunities({ studyLevel: "ثانوي", grade: "ثاني ثانوي" })[0];
  assert.match(unis.note ?? "", /القبول قدامك/);
  assert.match(unis.note ?? "", /القدرات/);
  assert.match(unis.note ?? "", /التحصيلي المبكر/);
});

test("أول ثانوي: المدرسة فقط متاحة، لا قدرات ولا تحصيلي مبكر (القدرات تبدأ من ثاني ثانوي)", () => {
  const unis = buildOpportunities({ studyLevel: "ثانوي", grade: "أول ثانوي" })[0];
  assert.match(unis.note ?? "", /القبول قدامك/);
  assert.match(unis.note ?? "", /مواد المدرسة/);
  assert.ok(!(unis.note ?? "").includes("القدرات"));
  assert.ok(!(unis.note ?? "").includes("التحصيلي المبكر"));
});

test("الكليات: الجامعة المستهدفة أولاً + متطلبات التخصص مع الفجوة", () => {
  const colleges = buildOpportunities(FULL)[1];
  assert.ok(colleges.items[0].title.includes("جامعة الملك سعود"), colleges.items[0].title);
  const req = colleges.items.find((i) => i.id === "major-medicine");
  assert.ok(req, "لا عنصر متطلبات للتخصص");
  assert.match(req.detail, /قدرات/);
  assert.equal(req.linkTo, "/university");
});

test("بدون جامعة مستهدفة: كليات أعلى جامعة ملاءمةً لدرجات الطالب", () => {
  const groups = buildOpportunities({ ...FULL, universityId: undefined });
  const topUniName = groups[0].items[0].title;
  assert.ok(groups[1].items[0].title.includes(topUniName), groups[1].items[0].title);
});

test("المنح: كل الجامعات الأهلية بالاسم من البيانات (لا أسماء مخترعة)", () => {
  const grants = buildOpportunities(FULL)[4];
  const privates = UNIVERSITIES.filter((u) => u.kind === "أهلية");
  assert.equal(grants.items.length, privates.length);
  for (const p of privates) {
    assert.ok(grants.items.some((i) => i.title === p.name), `${p.name} مفقودة`);
  }
});

test("الابتعاث: بطاقة إمداد بلا أرقام + جاهزية اللغة تتبع نطاق ستيب", () => {
  const abroad = buildOpportunities(FULL)[2];
  const emdad = abroad.items.find((i) => i.id === "abroad-emdad");
  assert.ok(emdad);
  assert.match(emdad.title, /إمداد/);
  assert.equal(emdad.linkTo, "/guide");
  const lang = buildOpportunities({ ...FULL, step: null })[2].items.find((i) => i.id === "abroad-language");
  assert.ok(lang);
  assert.equal(lang.status, "يحتاج شرط");
});
