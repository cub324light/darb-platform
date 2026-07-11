/* اختبار إحصاءات/جودة الأدمن — دوال نقيّة على السجلّات والرسم.
   تشغيل: npx tsx --test src/lib/kb/repo/adminStats.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { contentStats, contentQuality } from "./adminStats";
import type { ContentRecord } from "./repository";
import type { KBEntity } from "../entities/schema";

const rec = (id: string, kind: KBEntity["kind"], status: ContentRecord["status"], importance = 50, at = "2026-07-01T00:00:00Z"): ContentRecord => ({
  entity: { kind, id, name: id, summary: "س", meta: { version: 1, lastUpdated: "2026-07-01", importance } } as KBEntity,
  status, version: 1, updatedAt: at,
});

test("contentStats: عدّادات الحالة والأنواع وأعلى المفاهيم وأحدث المنشور", () => {
  const s = contentStats([
    rec("concept:a", "concept", "published", 90, "2026-07-05T00:00:00Z"),
    rec("concept:b", "concept", "draft", 40),
    rec("concept:c", "concept", "review", 70),
    rec("lesson:l", "lesson", "published", 0, "2026-07-06T00:00:00Z"),
    rec("book:k", "book", "archived"),
  ]);
  assert.equal(s.total, 5);
  assert.deepEqual(s.byStatus, { draft: 1, review: 1, published: 2, archived: 1 });
  assert.equal(s.byKind.find((k) => k.kind === "concept")?.count, 3);
  /* أحدث المنشور أولاً */
  assert.equal(s.recentPublished[0].id, "lesson:l");
  /* أعلى المفاهيم أهميةً */
  assert.equal(s.topConcepts[0].id, "concept:a");
});

test("contentQuality: مشاكلٌ من الرسم + الرسم سليم (لا روابط مكسورة)", () => {
  const { issues, brokenLinks } = contentQuality();
  /* الرسم المعتمد سليمٌ بنيوياً */
  assert.deepEqual(brokenLinks, []);
  /* لأن الطبقة الثانية لم تكتمل، توجد مفاهيم بلا أسئلة/مصادر */
  assert.ok(issues.some((i) => i.key === "no-questions" && i.items.length > 0));
  /* كل مشكلةٍ لها عناصر (لا تُدرَج فارغة) */
  assert.ok(issues.every((i) => i.items.length > 0));
});
