import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureWorkspace } from "./storage";
import type { DarbUser } from "./storage";
import { hasModule, hasMember, optionalInstances } from "./modules/workspace";

test("ensureWorkspace: يبني Core المرحلة ويرحّل activeTracks القديمة (لغة/برامج أعضاء)", () => {
  const u: DarbUser = {
    name: "x", track: "قدرات", onboarded: true,
    studyLevel: "ثانوي", grade: "ثالث ثانوي",
    activeTracks: ["قدرات", "تحصيلي", "ايلتس", "CPC"],
  };
  const ws = ensureWorkspace(u).workspace!;
  assert.ok(hasModule(ws, "school"), "المدرسة Core الثانوي تُبنى تلقائياً");
  assert.ok(hasModule(ws, "qudurat"));
  assert.ok(hasModule(ws, "tahsili"));
  assert.ok(hasModule(ws, "english"), "اللغة بطاقة مجموعة واحدة");
  assert.ok(hasMember(ws, "ielts"), "آيلتس عضوٌ داخل اللغة");
  assert.ok(hasModule(ws, "programs") && hasMember(ws, "aramco"), "CPC القديم → عضو أرامكو داخل البرامج");
});

test("ensureWorkspace: لا يمسّ workspace موجوداً", () => {
  const existing = { modules: [], updatedAt: 1 };
  const u: DarbUser = { name: "x", track: "قدرات", onboarded: true, workspace: existing };
  assert.equal(ensureWorkspace(u).workspace, existing);
});

test("ensureWorkspace: «مدرسه» القديمة لا تُرحَّل كاختيارية (Core فقط)", () => {
  const u: DarbUser = {
    name: "x", track: "مدرسه", onboarded: true,
    studyLevel: "ثانوي", grade: "أول ثانوي", activeTracks: ["مدرسه"],
  };
  const ws = ensureWorkspace(u).workspace!;
  assert.ok(hasModule(ws, "school"));
  assert.equal(optionalInstances(ws).length, 0);
});

test("ensureWorkspace: الجامعي يحصل على Core الجامعة بلا قياس", () => {
  const u: DarbUser = { name: "x", track: "قدرات", onboarded: true, studyLevel: "جامعي" };
  const ws = ensureWorkspace(u).workspace!;
  assert.ok(hasModule(ws, "university"));
  assert.ok(!hasModule(ws, "school"));
});
