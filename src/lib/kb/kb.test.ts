/* اختبارات قاعدة المعرفة — تشغيل: npx tsx --test src/lib/kb/kb.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSnapshot, searchKB, mergeById, SEED_SOURCES, SEED_ENTRIES, SEED_VERIFIED_AT,
  searchEntries, rankSources, bestDirectAnswer, normalizeAr,
  sourceFreshness, scanStaleSources, suggestedStatus,
  diffSource, diffEntry, nextVersion, buildVersionRecords,
  type Source, type KBEntry,
} from "./index";
import { SOURCE_CATEGORIES } from "./types";

const DAY = 86_400_000;
const NOW = SEED_VERIFIED_AT + 10 * DAY; // بعد 10 أيام من البذرة

test("البذرة تغطّي الأقسام الأحد عشر كلها", () => {
  const cats = new Set(SEED_SOURCES.map((s) => s.category));
  for (const c of SOURCE_CATEGORIES) {
    assert.ok(cats.has(c.id), `قسم ${c.id} له مصدر واحد على الأقل`);
  }
  assert.equal(SOURCE_CATEGORIES.length, 11);
});

test("كل مصدر بذرة له درجة ثقة صالحة وطريقة جلب ووضع تحديث", () => {
  for (const s of SEED_SOURCES) {
    assert.ok(s.trust >= 0 && s.trust <= 100, `ثقة ${s.id}`);
    assert.ok(["api", "rss", "scrape", "pdf", "manual"].includes(s.fetchMethod));
    assert.ok(["auto", "manual"].includes(s.updateMode));
    assert.ok(s.reviewCadenceDays > 0);
  }
});

test("التطبيع العربي يوحّد الألف/الياء/التاء ويزيل التشكيل", () => {
  assert.equal(normalizeAr("القُدُرات"), normalizeAr("القدرات"));
  assert.equal(normalizeAr("إختبار"), normalizeAr("اختبار"));
  assert.equal(normalizeAr("موزونة"), normalizeAr("موزونه"));
});

test("البحث يجد مدخل القدرات من استعلام طبيعي", () => {
  const snap = buildSnapshot();
  const r = searchKB("ايش هي اقسام القدرات العامة؟", snap, { now: NOW });
  assert.ok(r.matches.length > 0);
  assert.equal(r.matches[0].entry.category, "qudurat");
  assert.ok(r.grounding.includes("قاعدة معرفة درب"));
});

test("البحث يحترم القسم المطلوب", () => {
  const snap = buildSnapshot();
  const r = searchEntries("التحصيلي والمواد العلمية", snap.entries, { category: "tahsili", now: NOW });
  assert.ok(r.length > 0);
  assert.ok(r.every((m) => m.entry.category === "tahsili"));
});

test("استعلام بلا تطابق يُعيد لا شيء (لا اختلاق)", () => {
  const snap = buildSnapshot();
  const r = searchKB("وصفة كبسة دجاج", snap, { now: NOW });
  assert.equal(r.matches.length, 0);
  assert.equal(r.grounding, "");
  assert.equal(r.direct, null);
});

test("إجابة مباشرة عالية الثقة تتطلب تطابقاً قوياً", () => {
  const snap = buildSnapshot();
  const strong = searchKB("أقسام القدرات لفظي كمي قياس", snap, { now: NOW });
  assert.ok(bestDirectAnswer(strong.matches), "تطابق قوي ⇒ إجابة مباشرة");
});

test("ترتيب المصادر: الرسمي أولاً ثم الأعلى ثقة", () => {
  const ranked = rankSources(SEED_SOURCES, NOW);
  // أول مصدر رسمي
  assert.equal(ranked[0].official, true);
  // الثقة غير متصاعدة بين الرسميين المتتاليين
  for (let i = 1; i < ranked.length; i++) {
    if (ranked[i].official === ranked[i - 1].official) {
      assert.ok(ranked[i].trust <= ranked[i - 1].trust);
    }
  }
});

test("overlay يضيف/يتجاوز المصدر بلا تعديل كود", () => {
  const custom: Source = {
    id: "moe-main", category: "secondary", name: "وزارة التعليم (مُعدّل)", org: "MOE",
    url: "https://moe.gov.sa", official: true, trust: 80, fetchMethod: "api", updateMode: "auto",
    reviewCadenceDays: 10, lastVerified: NOW, expiresAt: null, status: "active", version: 2,
    updatedAt: NOW, origin: "custom",
  };
  const brandNew: Source = { ...custom, id: "new-portal", name: "بوابة جديدة", origin: "custom" };
  const merged = mergeById(SEED_SOURCES, [custom, brandNew]);
  assert.equal(merged.find((s) => s.id === "moe-main")!.name, "وزارة التعليم (مُعدّل)");
  assert.ok(merged.find((s) => s.id === "new-portal"), "مصدر جديد أُضيف");
  assert.equal(merged.length, SEED_SOURCES.length + 1);
});

test("المصدر المعطّل/المنتهي لا يدخل ترتيب المصادر النشطة", () => {
  const disabled: Source = { ...SEED_SOURCES[0], status: "disabled" };
  const ranked = rankSources([disabled], NOW);
  assert.equal(ranked.length, 0);
});

test("كشف التقادم: due بعد الدورية، stale بعد ضعفها، expired بعد الانتهاء", () => {
  const s = SEED_SOURCES.find((x) => x.id === "qiyas-qudurat")!; // cadence 14
  assert.equal(sourceFreshness(s, s.lastVerified + 5 * DAY).state, "fresh");
  assert.equal(sourceFreshness(s, s.lastVerified + 16 * DAY).state, "due");
  assert.equal(sourceFreshness(s, s.lastVerified + 30 * DAY).state, "stale");
  const exp: Source = { ...s, expiresAt: s.lastVerified + 7 * DAY };
  assert.equal(sourceFreshness(exp, s.lastVerified + 8 * DAY).state, "expired");
});

test("scanStaleSources يرتّب الأسوأ أولاً ويستبعد الطازج", () => {
  const far = SEED_VERIFIED_AT + 400 * DAY;
  const reports = scanStaleSources(SEED_SOURCES, far);
  assert.ok(reports.length > 0);
  assert.ok(reports.every((r) => r.info.state !== "fresh"));
  // مرتّبة تنازلياً بالخطورة
  const sev = { expired: 3, stale: 2, due: 1, fresh: 0 } as const;
  for (let i = 1; i < reports.length; i++) {
    assert.ok(sev[reports[i].info.state] <= sev[reports[i - 1].info.state]);
  }
});

test("suggestedStatus يعطّل المنتهي تلقائياً ويحترم المعطّل يدوياً", () => {
  const s = SEED_SOURCES[0];
  const expired: Source = { ...s, expiresAt: NOW - DAY };
  assert.equal(suggestedStatus(expired, NOW), "expired");
  const off: Source = { ...s, status: "disabled" };
  assert.equal(suggestedStatus(off, NOW), "disabled");
  assert.equal(suggestedStatus(s, NOW), "active");
});

test("النسخ: diff يكشف الحقول المتغيّرة فقط ويزيد الإصدار عند التغيير", () => {
  const before = SEED_SOURCES.find((s) => s.id === "qiyas-qudurat")!;
  const after: Source = { ...before, trust: 90, notes: "تحديث" };
  const changes = diffSource(before, after);
  const fields = changes.map((c) => c.field).sort();
  assert.deepEqual(fields, ["notes", "trust"]);
  assert.equal(nextVersion(before.version, changes.length > 0), before.version + 1);
  assert.equal(nextVersion(before.version, false), before.version); // بلا تغيير ⇒ ثابت
});

test("النسخ: مدخل جديد بلا before يَعدّ كل الحقول تغييرات", () => {
  const e = SEED_ENTRIES[0];
  const changes = diffEntry(null, e);
  assert.ok(changes.length > 0);
  const recs = buildVersionRecords("entry", e.id, 1, changes, "admin@darb", NOW);
  assert.equal(recs.length, changes.length);
  assert.ok(recs.every((r) => r.targetId === e.id && r.changedBy === "admin@darb"));
});

test("المدخل المنتهي/المعطّل لا يظهر في البحث", () => {
  const expired: KBEntry = { ...SEED_ENTRIES[0], id: "exp", expiresAt: NOW - DAY };
  const disabled: KBEntry = { ...SEED_ENTRIES[0], id: "off", status: "disabled" };
  const snap = buildSnapshot({ entries: [expired, disabled] });
  const r = searchEntries("القدرات العامة لفظي كمي", snap.entries, { now: NOW });
  assert.ok(r.every((m) => m.entry.id !== "exp" && m.entry.id !== "off"));
});
