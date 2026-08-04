/* ─── اختبارات بيانات الجامعات + حقول الملف ───
   تحمي سلامة UNIVERSITIES/MAJORS ودوال الملف النقية:
   فرادة المعرفات، صحة الروابط والسنوات، تماسك معادلات الموزونة، ورابط الخرائط. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  UNIVERSITIES, MAJORS, universityMapUrl, universityCity, universitiesByRegion,
  majorsAt, hasMajorList, gapAnalysis, universityReadiness, qsRankText,
} from "./university";
import {
  UNIVERSITY_COLLEGES, collegesAt, majorsIn, allMajorsAt, collegeOfMajor, categoryOfMajor, UNIVERSITY_YEARS,
} from "./universityColleges";

test("فرادة معرّفات الجامعات والتخصصات", () => {
  const uniIds = UNIVERSITIES.map((u) => u.id);
  assert.equal(new Set(uniIds).size, uniIds.length, "معرّفات جامعات مكررة");
  const majorIds = MAJORS.map((m) => m.id);
  assert.equal(new Set(majorIds).size, majorIds.length, "معرّفات تخصصات مكررة");
});

test("كل موقع رسمي https ونطاق ‎.edu.sa", () => {
  for (const u of UNIVERSITIES) {
    if (u.website === undefined) continue;
    assert.ok(u.website.startsWith("https://"), `${u.id}: الموقع ليس https`);
    assert.ok(/\.edu\.sa\/?$/.test(u.website), `${u.id}: النطاق ليس .edu.sa (${u.website})`);
  }
});

test("سنة التأسيس (إن وُجدت) ضمن مدى معقول", () => {
  for (const u of UNIVERSITIES) {
    if (u.foundedYear === undefined) continue;
    assert.ok(Number.isInteger(u.foundedYear), `${u.id}: سنة غير صحيحة`);
    assert.ok(u.foundedYear >= 1950 && u.foundedYear <= 2020, `${u.id}: سنة خارج المدى (${u.foundedYear})`);
  }
});

test("مجموع أوزان كل معادلة موزونة = 100", () => {
  for (const u of UNIVERSITIES) {
    for (const f of u.formulas ?? []) {
      const sum = f.highschool + f.qudurat + f.tahsili;
      assert.equal(sum, 100, `${u.id}/${f.id}: مجموع الأوزان ${sum} ≠ 100`);
    }
  }
});

test("مميزات/اعتبارات/تميز (إن وُجدت) قوائم غير فارغة", () => {
  for (const u of UNIVERSITIES) {
    for (const key of ["pros", "cons", "strengths"] as const) {
      const arr = u[key];
      if (arr === undefined) continue;
      assert.ok(Array.isArray(arr) && arr.length > 0, `${u.id}.${key} فارغة`);
      assert.ok(arr.every((s) => typeof s === "string" && s.trim().length > 0), `${u.id}.${key} فيها نص فارغ`);
    }
  }
});

test("universityMapUrl يرمّز اسم الجامعة", () => {
  const u = UNIVERSITIES.find((x) => x.name.includes(" "))!;
  const url = universityMapUrl(u);
  assert.ok(url.startsWith("https://www.google.com/maps/search/?api=1&query="));
  assert.ok(url.includes(encodeURIComponent(u.name)));
  assert.ok(!/ /.test(url), "الرابط يحوي مسافة غير مرمّزة");
});

test("universityCity يرجع المدينة أو المنطقة", () => {
  for (const u of UNIVERSITIES) {
    const c = universityCity(u);
    if (u.city) assert.equal(c, u.city);
    else assert.equal(c, u.region);
  }
});

test("universitiesByRegion يتجاوز ما لا منطقة له", () => {
  const byRegion = universitiesByRegion();
  const grouped = Object.values(byRegion).flat().length;
  const withRegion = UNIVERSITIES.filter((u) => u.region).length;
  assert.equal(grouped, withRegion);
  for (const [region, list] of Object.entries(byRegion)) {
    assert.ok(list.every((u) => u.region === region), `تجميع خاطئ للمنطقة ${region}`);
  }
});

test("ترتيب QS: عددٌ موجبٌ صحيح وسنةُ إصدارٍ مصاحبةٌ له دائماً", () => {
  const ranked = UNIVERSITIES.filter((u) => u.qsRank !== undefined);
  assert.ok(ranked.length > 0, "لا جامعةَ مصنّفة — الحقل بلا فائدة");
  for (const u of ranked) {
    assert.ok(Number.isInteger(u.qsRank) && u.qsRank! > 0, `ترتيب غير صالح: ${u.id}`);
    assert.ok(u.qsRank! <= 2000, `ترتيب خارج المدى المعقول: ${u.id}`);
    /* الترتيب بلا سنةِ إصدارٍ كذبةٌ صامتة: QS يتغيّر كل سنة */
    assert.ok(Number.isInteger(u.qsYear), `ترتيب بلا سنة إصدار: ${u.id}`);
    assert.ok(u.qsYear! >= 2020 && u.qsYear! <= 2100, `سنة إصدار غير معقولة: ${u.id}`);
  }
  /* النطاق: النهاية بعد البداية دائماً */
  for (const u of ranked) {
    if (u.qsRankTo != null) {
      assert.ok(Number.isInteger(u.qsRankTo) && u.qsRankTo > u.qsRank!, `نطاق مقلوب: ${u.id}`);
    }
  }
});

test("الترتيب العربي: مركزٌ مفرد أو «ضمن أفضل N» لا الاثنان معاً", () => {
  for (const u of UNIVERSITIES) {
    if (u.arabRank != null) {
      assert.ok(Number.isInteger(u.arabRank) && u.arabRank > 0, `مركز عربي غير صالح: ${u.id}`);
      assert.equal(u.arabTopN, undefined, `مركزٌ ونطاقٌ معاً: ${u.id}`);
    }
    if (u.arabTopN != null) assert.ok(Number.isInteger(u.arabTopN) && u.arabTopN > 0, `أفضل N غير صالح: ${u.id}`);
  }
});

test("qsRankText/arabRankText: نصٌّ صادقٌ أو فارغ", async () => {
  const { qsRankText, arabRankText } = await import("./university");
  const id = (x: number) => String(x);
  assert.equal(qsRankText({ qsRank: 63 }, id), "63");
  assert.equal(qsRankText({ qsRank: 741, qsRankTo: 750 }, id), "741–750");
  assert.equal(qsRankText({}, id), "", "بلا ترتيب ⇒ نصٌّ فارغ لا صفر");
  assert.equal(arabRankText({ arabRank: 4 }, id), "الـ4 عربياً");
  assert.equal(arabRankText({ arabTopN: 10 }, id), "ضمن أفضل 10 عربياً");
  assert.equal(arabRankText({}, id), "");
});

test("سنةُ إصدار QS لا تُذكر بلا ترتيب", () => {
  for (const u of UNIVERSITIES) {
    if (u.qsYear !== undefined) assert.ok(u.qsRank !== undefined, `سنة بلا ترتيب: ${u.id}`);
  }
});

/* ═══ الكليات والتخصصات الدقيقة — من دليل المالك ═══ */

test("كل مفتاحٍ في جدول الكليات جامعةٌ حقيقية", () => {
  const ids = new Set(UNIVERSITIES.map((u) => u.id));
  for (const key of Object.keys(UNIVERSITY_COLLEGES)) {
    assert.ok(ids.has(key), `جامعةٌ غير موجودة في الجدول: ${key}`);
  }
});

test("كل كليةٍ لها اسمٌ فريد وتخصصاتٌ غير مكرّرة", () => {
  for (const [uni, colleges] of Object.entries(UNIVERSITY_COLLEGES)) {
    assert.ok(colleges.length > 0, `${uni}: بلا كليات — الغياب يُعبَّر عنه بحذف المفتاح`);
    const names = colleges.map((k) => k.name);
    assert.equal(new Set(names).size, names.length, `${uni}: اسم كليةٍ مكرّر`);
    for (const k of colleges) {
      assert.ok(k.majors.length > 0, `${uni}/${k.name}: كليةٌ بلا تخصصات`);
      const majors = k.majors.map((m) => m.name);
      assert.equal(new Set(majors).size, majors.length, `${uni}/${k.name}: تخصّصٌ مكرّر`);
      for (const m of k.majors) assert.ok(m.name.trim().length > 1, `${uni}/${k.name}: اسمٌ فارغ`);
    }
  }
});

test("كل categoryId جسرٌ إلى تصنيفٍ حقيقيّ في MAJORS", () => {
  const ids = new Set(MAJORS.map((m) => m.id));
  for (const [uni, colleges] of Object.entries(UNIVERSITY_COLLEGES)) {
    for (const k of colleges) for (const m of k.majors) {
      if (m.categoryId === undefined) continue;
      assert.ok(ids.has(m.categoryId), `${uni}/${m.name}: تصنيفٌ مجهول «${m.categoryId}»`);
      assert.notEqual(m.categoryId, "other", `${uni}/${m.name}: «أخرى» ليست تصنيفاً`);
    }
  }
});

test("كلية العمارة والتخطيط موجودةٌ في الإمام عبدالرحمن (العطل الذي أبلغ عنه المالك)", () => {
  const names = collegesAt("iau").map((k) => k.name);
  assert.ok(names.includes("كلية العمارة والتخطيط"), names.join(" · "));
  const majors = majorsIn("iau", "كلية العمارة والتخطيط").map((m) => m.name);
  assert.deepEqual(majors, ["العمارة", "عمارة البيئة", "التخطيط العمراني الإقليمي", "التصميم الداخلي", "تقنية البناء"]);
});

test("collegeOfMajor يستعيد الكلية من اسم التخصص", () => {
  assert.equal(collegeOfMajor("iau", "العمارة"), "كلية العمارة والتخطيط");
  assert.equal(collegeOfMajor("iau", "الأمن السيبراني"), "كلية علوم الحاسب وتقنية المعلومات");
  assert.equal(collegeOfMajor("iau", "تخصّصٌ لا وجود له"), undefined);
});

test("categoryOfMajor يجسر إلى MAJORS حين يوجد تصنيف", () => {
  assert.equal(categoryOfMajor("iau", "الطب والجراحة"), "medicine");
  assert.equal(categoryOfMajor("iau", "العمارة"), undefined, "لا تصنيفَ خشناً للعمارة — ولا نخترع");
});

test("majorsAt: مشتقٌّ من الكليات، وجامعةٌ خارج الدليل ⇒ كل التخصصات", () => {
  const iau = majorsAt("iau").map((m) => m.id);
  assert.ok(iau.includes("medicine") && iau.includes("cybersec"));
  assert.ok(!iau.includes("me"), "الدليل لا يذكر الهندسة الميكانيكية في الإمام عبدالرحمن");
  assert.ok(iau.includes("other"), "«أخرى» مخرجٌ دائم");
  assert.equal(majorsAt(undefined).length, MAJORS.length);
  assert.equal(majorsAt("alfaisal").length, MAJORS.length, "الفيصل خارج الدليل ⇒ لا حجب");
});

test("majorsAt يحفظ ترتيب MAJORS", () => {
  const order = MAJORS.map((m) => m.id);
  const got = majorsAt("ksu").map((m) => m.id);
  assert.deepEqual(got, order.filter((id) => got.includes(id)));
});

test("hasMajorList يفرّق «لا نعلم» عن «نعلم»", () => {
  assert.equal(hasMajorList("iau"), true);
  assert.equal(hasMajorList("alfaisal"), false);
  assert.equal(hasMajorList(undefined), false);
});

test("KFUPM بلا تخصصاتٍ طبية — يوافق ما تقوله بطاقتها", () => {
  const names = allMajorsAt("kfupm").map((m) => m.name);
  for (const med of ["الطب", "طب الأسنان", "الصيدلة", "التمريض"]) {
    assert.ok(!names.includes(med), `KFUPM لا تضم ${med}`);
  }
});

test("السنوات الجامعية خمسٌ، ومفاتيحها هي المخزَّنة اليوم", () => {
  assert.equal(UNIVERSITY_YEARS.length, 5);
  assert.deepEqual(UNIVERSITY_YEARS.map((y) => y.key),
    ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة+"],
    "تغييرُ المفاتيح يفقد سنةَ كل مسجَّلٍ سابق");
  assert.equal(UNIVERSITY_YEARS[0].label, "السنة الأولى");
});

/* ═══════════ «المطلوب» لا يأتي إلا من الطالب ═══════════
   حارسُ العطل الذي أُصلح: كان مستوى التخصّص النوعيّ («مرتفع») يُترجَم رقماً
   (٨٥) ثم يُعرَض على الطالب شرطَ قبول. لا مصدرَ لذلك الرقم — فحُذف. */

test("الفجوة: بلا هدفٍ من الطالب لا صفَّ ولا رقم — ولو كانت درجاته كلُّها موجودة", () => {
  const g = gapAnalysis(undefined, { qudurat: 82, tahsili: 79, step: 60 }, 4);
  assert.equal(g.hasData, false);
  assert.equal(g.items.length, 0);
  assert.equal(g.remainingTotal, 0);
  assert.equal(g.allMet, false, "«الكلُّ مكتمل» ادّعاءٌ لا يصحّ بلا هدفٍ واحد");
});

test("الفجوة: صفٌّ لكلِّ هدفٍ حدّده الطالب وحدَه", () => {
  const g = gapAnalysis({ qudurat: 90, tahsili: null, step: undefined },
    { qudurat: 82, tahsili: 79, step: 60 }, 4);
  assert.equal(g.items.length, 1, "التحصيلي وSTEP بلا هدفٍ فلا صفَّ لهما رغم وجود درجتيهما");
  assert.equal(g.items[0].label, "القدرات");
  assert.equal(g.items[0].target, 90);
  assert.equal(g.items[0].gap, 8);
  assert.equal(g.items[0].met, false);
  assert.equal(g.items[0].weeklyNeed, 2);
});

test("الفجوة: هدفٌ بلا درجةٍ بعد ⇒ الفجوةُ كامل الهدف، لا «صفر»", () => {
  const g = gapAnalysis({ tahsili: 95 }, {}, null);
  assert.equal(g.items.length, 1);
  assert.equal(g.items[0].current, null);
  assert.equal(g.items[0].gap, 95);
  assert.equal(g.items[0].weeklyNeed, undefined);
});

test("الفجوة: بلوغُ الهدف يُحسب من الهدف نفسه", () => {
  const g = gapAnalysis({ qudurat: 80, step: 70 }, { qudurat: 84, step: 71 });
  assert.equal(g.allMet, true);
  assert.equal(g.remainingTotal, 0);
});

test("مؤشر الوصول: التخصّص لا يولّد عتبةً — بلا أهدافٍ لا مقارنةَ درجات", () => {
  const noTargets = universityReadiness({ quduratScore: 82, tahsiliScore: 79, majorName: "طب" });
  assert.ok(!noTargets.reasons.some((r) => r.includes("المطلوب")),
    "لا يُذكر «المطلوب» لأن لا مصدرَ له");
  assert.ok(!noTargets.reasons.some((r) => r.includes("هدفك")),
    "ولا يُذكر «هدفك» لأن الطالب لم يحدّده");
  assert.equal(noTargets.hasData, false, "درجاتٌ بلا أهدافٍ لا تكفي وحدَها للحكم");

  const withTargets = universityReadiness({
    targets: { qudurat: 90 }, quduratScore: 82, tahsiliScore: 79,
  });
  assert.ok(withTargets.reasons.some((r) => r.includes("دون هدفك (90)")));
});

test("لا رقمَ يُنسب إلى جهةٍ لم تنشره: كل ترتيبٍ معروضٍ له سنةُ إصدار", () => {
  for (const u of UNIVERSITIES) {
    if (qsRankText(u, String)) assert.ok(u.qsYear, `${u.id}: ترتيبٌ بلا سنة`);
  }
});
