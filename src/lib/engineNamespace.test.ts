/* اختبار عزل فضاء الأسماء — يثبت عدم تسرّب ذاكرة طالب لآخر على نفس الجهاز.
   التشغيل: npx tsx --test src/lib/engineNamespace.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { setNamespace, nsKey, engineNamespace } from "./engineNamespace";

/* localStorage وهميّ */
function installMockStorage() {
  const map: Record<string, string> = {};
  const g = globalThis as { window?: unknown; localStorage?: Storage };
  g.window = {};
  g.localStorage = {
    getItem: (k: string) => map[k] ?? null,
    setItem: (k: string, v: string) => { map[k] = v; },
    removeItem: (k: string) => { delete map[k]; },
    clear: () => { for (const k of Object.keys(map)) delete map[k]; },
    key: () => null, length: 0,
  } as Storage;
  return { map, uninstall: () => { delete g.window; delete g.localStorage; } };
}

test("nsKey reflects the current user namespace", () => {
  setNamespace("userA");
  assert.equal(engineNamespace(), "userA");
  assert.equal(nsKey("darb_memory_v1"), "darb_memory_v1__userA");
  setNamespace(null);
  assert.equal(nsKey("darb_memory_v1"), "darb_memory_v1__guest");
});

test("memory store isolates per user — no cross-account bleed", async () => {
  const { map, uninstall } = installMockStorage();
  try {
    const { LocalStore } = await import("./memory/store");
    const sample = (name: string) => ({
      id: "identity.name:self", type: "identity.name", category: "identity", value: { name },
      confidence: 1, importance: 1, source: "onboarding", createdAt: 0, updatedAt: 0,
      expiresAt: null, educationalStage: "general", tags: [], evidence: [], status: "active", version: 1,
    });

    setNamespace("userA");
    const a = new LocalStore();
    a.put(sample("طالب أ") as never);
    assert.ok(map["darb_memory_v1__userA"], "written under userA namespace");

    setNamespace("userB");
    const b = new LocalStore();
    assert.equal(b.getAll().length, 0, "userB sees an empty store — no bleed");
    b.put(sample("طالب ب") as never);

    setNamespace("userA");
    const a2 = new LocalStore();
    assert.equal((a2.get("identity.name:self")!.value as { name: string }).name, "طالب أ", "userA data intact after switching back");

    assert.ok(map["darb_memory_v1__userA"] && map["darb_memory_v1__userB"], "two separate namespaced keys");
  } finally { uninstall(); setNamespace(null); }
});
