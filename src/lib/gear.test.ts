/* اختبارات دليل عُدّة تخصصك (أجهزة + برامج + أدوات AI) — تشغيل: npx tsx --test src/lib/gear.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { GearCategory } from "./gear";
import {
  GEAR_ITEMS, GEAR_CATEGORIES, BUDGET_TIERS, GEAR_MAJORS,
  filterGear, formatPriceRange,
} from "./gear";

/* فئات الأجهزة الفيزيائية (مدفوعة دائماً) مقابل البرامج/AI (قد تكون مجانية) */
const DEVICE_CATS = new Set<GearCategory>(["laptop", "tablet", "printer", "accessory"]);

test("المعرفات فريدة والحقول النصية غير فارغة والمدى السعري سليم (0 ≤ min ≤ max — يسمح المجاني)", () => {
  const ids = new Set(GEAR_ITEMS.map((i) => i.id));
  assert.equal(ids.size, GEAR_ITEMS.length, "معرف مكرر");
  for (const it of GEAR_ITEMS) {
    assert.ok(it.title.trim() !== "" && it.reason.trim() !== "", it.id);
    assert.ok(it.specs.length > 0, `${it.id}: بلا مواصفات`);
    assert.ok(it.priceRangeSAR.min >= 0, `${it.id}: min < 0`);
    assert.ok(it.priceRangeSAR.min <= it.priceRangeSAR.max, `${it.id}: min > max`);
  }
});

test("الأجهزة الفيزيائية سعرها موجب دائماً (لا مجاني) — حفظ الضمان القديم", () => {
  for (const it of GEAR_ITEMS) {
    if (DEVICE_CATS.has(it.category)) assert.ok(it.priceRangeSAR.min > 0, `${it.id}: جهاز بسعر ≤ 0`);
  }
});

test("fitsMajors غير فارغة، بلا تكرار، وقيمها من الفئات الست المعرّفة", () => {
  const valid = new Set(GEAR_MAJORS.map((m) => m.id));
  for (const it of GEAR_ITEMS) {
    assert.ok(it.fitsMajors.length > 0, `${it.id}: fitsMajors فارغة`);
    assert.equal(new Set(it.fitsMajors).size, it.fitsMajors.length, `${it.id}: تكرار في fitsMajors`);
    for (const m of it.fitsMajors) assert.ok(valid.has(m), `${it.id}: فئة غير معروفة ${m}`);
  }
});

test("كل فئة جهاز فيزيائية × شريحة ميزانية فيها توصيتان على الأقل", () => {
  for (const c of GEAR_CATEGORIES) {
    if (!DEVICE_CATS.has(c.id)) continue; // البرامج/AI توزيعها الطبيعي مائل للمجاني/الاقتصادي
    for (const b of BUDGET_TIERS) {
      const n = GEAR_ITEMS.filter((i) => i.category === c.id && i.budget === b.id).length;
      assert.ok(n >= 2, `${c.id}×${b.id}: ${n} فقط`);
    }
  }
});

test("كل تخصص يلقى توصية في كل فئة جهاز (لا تركيبة تخصص×فئة صفرية)", () => {
  for (const m of GEAR_MAJORS) {
    for (const c of GEAR_CATEGORIES) {
      const res = filterGear(GEAR_ITEMS, { major: m.id, category: c.id });
      assert.ok(res.length > 0, `${m.id}×${c.id} فارغة`);
    }
  }
});

test("بلا فلاتر: يُعاد كل شيء مرتباً فئةً فشريحة (تجميع ثابت للعرض)", () => {
  const res = filterGear(GEAR_ITEMS, {});
  assert.equal(res.length, GEAR_ITEMS.length);
  const catOrder = GEAR_CATEGORIES.map((c) => c.id);
  const budOrder = BUDGET_TIERS.map((b) => b.id);
  for (let i = 1; i < res.length; i++) {
    const dc = catOrder.indexOf(res[i].category) - catOrder.indexOf(res[i - 1].category);
    assert.ok(dc >= 0, `ترتيب الفئات انكسر عند ${res[i].id}`);
    if (dc === 0) {
      assert.ok(
        budOrder.indexOf(res[i].budget) >= budOrder.indexOf(res[i - 1].budget),
        `ترتيب الشرائح انكسر عند ${res[i].id}`,
      );
    }
  }
});

test("الفلترة المركّبة تحترم كل شرط معاً", () => {
  const res = filterGear(GEAR_ITEMS, { category: "laptop", budget: "premium", major: "هندسي" });
  assert.ok(res.length > 0);
  for (const it of res) {
    assert.equal(it.category, "laptop");
    assert.equal(it.budget, "premium");
    assert.ok(it.fitsMajors.includes("هندسي"), it.id);
  }
  /* المحطة الهندسية المخصصة (fitsMajors أخص) تتقدم على جهاز التطوير المشترك */
  assert.equal(res[0].id, "lap-pre-ws");
});

test("مع تخصص محدد: الأخص أولاً داخل نفس الفئة والشريحة", () => {
  const res = filterGear(GEAR_ITEMS, { major: "صحي", category: "tablet", budget: "premium" });
  assert.ok(res.length >= 2);
  assert.equal(res[0].id, "tab-pre-health"); // مخصص للصحي فقط يتقدم على الرائد العام
  for (let i = 1; i < res.length; i++) {
    assert.ok(res[i - 1].fitsMajors.length <= res[i].fitsMajors.length);
  }
});

test("فلتر أحادي: الفئة وحدها والشريحة وحدها", () => {
  const laptops = filterGear(GEAR_ITEMS, { category: "laptop" });
  assert.ok(laptops.length > 0);
  assert.ok(laptops.every((i) => i.category === "laptop"));

  const eco = filterGear(GEAR_ITEMS, { budget: "economy" });
  assert.ok(eco.length > 0);
  assert.ok(eco.every((i) => i.budget === "economy"));
});

test("filterGear لا يعدّل المصفوفة الأصلية", () => {
  const before = GEAR_ITEMS.map((i) => i.id).join(",");
  filterGear(GEAR_ITEMS, { major: "هندسي" });
  filterGear(GEAR_ITEMS, {});
  assert.equal(GEAR_ITEMS.map((i) => i.id).join(","), before);
});

test("formatPriceRange يفصل الآلاف ويدمج المدى بشرطة", () => {
  assert.equal(formatPriceRange({ min: 1500, max: 2500 }), "1,500–2,500");
  assert.equal(formatPriceRange({ min: 80, max: 250 }), "80–250");
  assert.equal(formatPriceRange({ min: 12000, max: 12000 }), "12,000");
  assert.equal(formatPriceRange({ min: 1000000, max: 1000000 }), "1,000,000");
});

/* ════════ الفئتان الجديدتان: برامج (software) وأدوات AI (ai) ════════ */

test("الفئتان الجديدتان (برامج/أدوات AI) معرّفتان في GEAR_CATEGORIES", () => {
  const ids = new Set(GEAR_CATEGORIES.map((c) => c.id));
  assert.ok(ids.has("software"), "فئة البرامج ناقصة");
  assert.ok(ids.has("ai"), "فئة أدوات AI ناقصة");
});

test("كل عنصر برامج/AI له fitsMajors غير فارغة ومدى سعري سليم (يسمح المجاني)", () => {
  const items = GEAR_ITEMS.filter((i) => i.category === "software" || i.category === "ai");
  assert.ok(items.length > 0, "لا توجد عناصر برامج/AI");
  for (const it of items) {
    assert.ok(it.fitsMajors.length > 0, `${it.id}: fitsMajors فارغة`);
    assert.ok(it.priceRangeSAR.min >= 0, `${it.id}: min < 0`);
    assert.ok(it.priceRangeSAR.min <= it.priceRangeSAR.max, `${it.id}: min > max`);
  }
});

test("filterGear يشمل البرامج وأدوات AI فئةً وتخصصاً", () => {
  const sw = filterGear(GEAR_ITEMS, { category: "software" });
  assert.ok(sw.length > 0 && sw.every((i) => i.category === "software"), "فلترة البرامج");
  const ai = filterGear(GEAR_ITEMS, { category: "ai" });
  assert.ok(ai.length > 0 && ai.every((i) => i.category === "ai"), "فلترة أدوات AI");
  /* كل تخصص يلقى برامج وأدوات AI (لا تركيبة صفرية) */
  for (const m of GEAR_MAJORS) {
    assert.ok(filterGear(GEAR_ITEMS, { category: "software", major: m.id }).length > 0, `${m.id}: بلا برامج`);
    assert.ok(filterGear(GEAR_ITEMS, { category: "ai", major: m.id }).length > 0, `${m.id}: بلا أدوات AI`);
  }
});

test("يوجد برامج/AI مجانية ({0,0}) وأخرى باشتراك (>0) — لتغطية عرض السعر والـ«/شهر»", () => {
  const softAi = GEAR_ITEMS.filter((i) => i.category === "software" || i.category === "ai");
  const free = softAi.filter((i) => i.priceRangeSAR.max === 0);
  const paid = softAi.filter((i) => i.priceRangeSAR.min > 0);
  assert.ok(free.length > 0, "لا يوجد عنصر مجاني");
  assert.ok(paid.length > 0, "لا يوجد عنصر باشتراك");
});
