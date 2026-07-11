/* اختبار مستودع المحتوى — طبقة Repository (تخزينٌ بذاكرةٍ بدل Firestore/localStorage).
   يثبت: البذرة منشورة، وCRUD ودورة الحالة والفلاتر تعمل عبر الواجهة نفسها.
   تشغيل: npx tsx --test src/lib/kb/repo/repo.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalContentRepository, type KV } from "./localRepository";
import type { KBEntity } from "../entities/schema";
import { KB } from "../entities";

const memKV = (): KV => { let s: string | null = null; return { read: () => s, write: (v) => { s = v; } }; };
const concept = (id: string, name: string): KBEntity => ({ kind: "concept", id, name, summary: "ملخّص اختبار", meta: { version: 1, lastUpdated: "2026-07-11" } });

test("البذرة (الكود) تظهر كمحتوى منشور", async () => {
  const repo = new LocalContentRepository(memKV());
  const all = await repo.list();
  assert.equal(all.length, KB.all().length);
  assert.ok(all.every((r) => r.status === "published"));
});

test("CRUD + دورة الحالة: save→مسوّدة، setStatus→مراجعة→منشور، remove→يختفي", async () => {
  const repo = new LocalContentRepository(memKV());
  const saved = await repo.save(concept("concept:test-x", "مفهوم اختبار"));
  assert.equal(saved.status, "draft");
  assert.equal(saved.version, 1);
  assert.equal((await repo.get("concept:test-x"))?.status, "draft");

  const review = await repo.setStatus("concept:test-x", "review");
  assert.equal(review.status, "review");
  const pub = await repo.setStatus("concept:test-x", "published");
  assert.equal(pub.status, "published");
  assert.equal(pub.entity.meta?.status, "published");

  await repo.remove("concept:test-x");
  assert.equal(await repo.get("concept:test-x"), null);
});

test("التعديل يرفع النسخة ويحافظ على الحالة", async () => {
  const repo = new LocalContentRepository(memKV());
  await repo.save(concept("concept:test-y", "س١"), { status: "published" });
  const v2 = await repo.save(concept("concept:test-y", "س٢ محدّث"));
  assert.equal(v2.version, 2);
  assert.equal(v2.status, "published");      // حافظ على الحالة الحالية
  assert.equal(v2.entity.name, "س٢ محدّث");
});

test("الفلاتر: بالنوع والحالة والبحث", async () => {
  const repo = new LocalContentRepository(memKV());
  await repo.save(concept("concept:test-z", "مفهومٌ فريد للبحث"), { status: "draft" });

  const concepts = await repo.list({ kind: "concept" });
  assert.ok(concepts.length > 0 && concepts.every((r) => r.entity.kind === "concept"));

  const drafts = await repo.list({ status: "draft" });
  assert.ok(drafts.some((r) => r.entity.id === "concept:test-z"));
  assert.ok(drafts.every((r) => r.status === "draft"));

  const hit = await repo.list({ search: "فريد للبحث" });
  assert.ok(hit.some((r) => r.entity.id === "concept:test-z"));
});
