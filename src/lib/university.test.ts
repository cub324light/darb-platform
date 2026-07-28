/* ─── اختبارات بيانات الجامعات + حقول الملف ───
   تحمي سلامة UNIVERSITIES/MAJORS ودوال الملف النقية:
   فرادة المعرفات، صحة الروابط والسنوات، تماسك معادلات الموزونة، ورابط الخرائط. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  UNIVERSITIES, MAJORS, universityMapUrl, universityCity, universitiesByRegion,
} from "./university";

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
