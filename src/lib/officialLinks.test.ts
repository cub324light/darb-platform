import { test } from "node:test";
import assert from "node:assert/strict";
import { OFFICIAL_LINKS, searchLinks, LINK_CATEGORY_ORDER } from "./officialLinks";

test("OFFICIAL_LINKS: روابطٌ رسميةٌ سليمة (https + نطاقٌ لكلٍّ)", () => {
  assert.ok(OFFICIAL_LINKS.length >= 10);
  for (const l of OFFICIAL_LINKS) {
    assert.ok(l.url.startsWith("https://"), `رابطٌ غير آمن: ${l.id}`);
    assert.ok(l.name && l.desc, `بياناتٌ ناقصة: ${l.id}`);
    assert.ok(LINK_CATEGORY_ORDER.includes(l.category), `تصنيفٌ غير معروف: ${l.id}`);
  }
  // لا تكرار في المعرّفات
  assert.equal(new Set(OFFICIAL_LINKS.map((l) => l.id)).size, OFFICIAL_LINKS.length);
});

test("searchLinks: بحثٌ نقيّ بتطبيعٍ عربيّ", () => {
  assert.equal(searchLinks(OFFICIAL_LINKS, "").length, OFFICIAL_LINKS.length); // فارغ ⇒ الكل
  assert.ok(searchLinks(OFFICIAL_LINKS, "الملك فيصل").some((l) => l.id === "kfu"));
  assert.ok(searchLinks(OFFICIAL_LINKS, "أرامكو").some((l) => l.id === "aramco"));
  assert.ok(searchLinks(OFFICIAL_LINKS, "قياس").some((l) => l.id === "etec"));
  assert.equal(searchLinks(OFFICIAL_LINKS, "ززثقلا غير موجود").length, 0);
});

test("كل uniId يطابق جامعةً حقيقية (وإلا 404: dynamicParams=false)", async () => {
  const { UNIVERSITIES } = await import("./university");
  const ids = new Set(UNIVERSITIES.map((u) => u.id));
  for (const l of OFFICIAL_LINKS) {
    if (l.uniId) assert.ok(ids.has(l.uniId), `uniId لا يطابق جامعة: ${l.id} → ${l.uniId}`);
  }
});

test("كل رابطٍ في تصنيف الجامعات له uniId", () => {
  for (const l of OFFICIAL_LINKS.filter((x) => x.category === "universities")) {
    assert.ok(l.uniId, `جامعةٌ بلا uniId فلا تفتح تعريفها: ${l.id}`);
  }
});
