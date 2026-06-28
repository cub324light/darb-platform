/* اختبارات تصفية سجلّ التدقيق — npx tsx --test src/lib/admin/auditFilter.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { filterAudit, matchesAudit, countByArea, type AuditRow } from "./auditFilter";

const row = (p: Partial<AuditRow>): AuditRow => ({
  id: "x", area: "users", action: "block_user", actorUid: "u1", actorEmail: "admin@darb.sa",
  actorRole: "admin", at: 1000, targetId: "stu1", summary: "حظر طالب", ip: "1.2.3.4", ...p,
});

test("التصفية بالقسم والعملية", () => {
  const rows = [row({ id: "a", area: "users" }), row({ id: "b", area: "kb", action: "upsert_source" })];
  assert.deepEqual(filterAudit(rows, { area: "kb" }).map((r) => r.id), ["b"]);
  assert.deepEqual(filterAudit(rows, { action: "block_user" }).map((r) => r.id), ["a"]);
});

test("التصفية بالمشرف (إيميل أو uid، جزئي)", () => {
  const rows = [row({ id: "a", actorEmail: "owner@darb.sa" }), row({ id: "b", actorEmail: "mod@darb.sa", actorUid: "zzz" })];
  assert.deepEqual(filterAudit(rows, { actor: "owner" }).map((r) => r.id), ["a"]);
  assert.deepEqual(filterAudit(rows, { actor: "zzz" }).map((r) => r.id), ["b"]);
});

test("التصفية بالنطاق الزمني", () => {
  const rows = [row({ id: "a", at: 500 }), row({ id: "b", at: 1500 }), row({ id: "c", at: 2500 })];
  assert.deepEqual(filterAudit(rows, { from: 1000, to: 2000 }).map((r) => r.id), ["b"]);
});

test("البحث النصّي الحر يشمل الملخّص والهدف والمشرف والـ IP", () => {
  const rows = [
    row({ id: "a", summary: "حظر طالب مزعج" }),
    row({ id: "b", summary: "تعديل مصدر", ip: "9.9.9.9" }),
  ];
  assert.deepEqual(filterAudit(rows, { q: "مزعج" }).map((r) => r.id), ["a"]);
  assert.deepEqual(filterAudit(rows, { q: "9.9.9.9" }).map((r) => r.id), ["b"]);
  assert.equal(filterAudit(rows, { q: "لا يوجد" }).length, 0);
});

test("الترتيب تنازلي بالوقت", () => {
  const rows = [row({ id: "old", at: 100 }), row({ id: "new", at: 900 }), row({ id: "mid", at: 500 })];
  assert.deepEqual(filterAudit(rows, {}).map((r) => r.id), ["new", "mid", "old"]);
});

test("الجمع بين أكثر من مرشّح (AND)", () => {
  const rows = [
    row({ id: "a", area: "users", actorEmail: "x@d.sa", at: 1200 }),
    row({ id: "b", area: "users", actorEmail: "y@d.sa", at: 1200 }),
  ];
  const r = filterAudit(rows, { area: "users", actor: "x@d.sa", from: 1000 });
  assert.deepEqual(r.map((x) => x.id), ["a"]);
});

test("matchesAudit مطابقة مفردة", () => {
  assert.equal(matchesAudit(row({ area: "kb" }), { area: "users" }), false);
  assert.equal(matchesAudit(row({ area: "users" }), { area: "users" }), true);
});

test("countByArea يجمّع لكل قسم", () => {
  const rows = [row({ area: "users" }), row({ area: "users" }), row({ area: "kb" })];
  assert.deepEqual(countByArea(rows), { users: 2, kb: 1 });
});
