import { test } from "node:test";
import assert from "node:assert/strict";
import { moduleDef, isCore, coreModulesForStage, OPTIONAL_MODULES, MODULE_DEFS } from "./registry";

test("Core لكل مرحلة: المدرسة للثانوي، الجامعة للجامعي، لا شيء للخريج", () => {
  assert.deepEqual(coreModulesForStage("first"), ["school"]);
  assert.deepEqual(coreModulesForStage("second"), ["school"]);
  assert.deepEqual(coreModulesForStage("third"), ["school"]);
  assert.deepEqual(coreModulesForStage("university"), ["university"]);
  assert.deepEqual(coreModulesForStage("graduate"), []);
});

test("isCore: المدرسة/الجامعة Core، والقياس/اللغة/البرامج اختيارية", () => {
  assert.equal(isCore("school"), true);
  assert.equal(isCore("university"), true);
  assert.equal(isCore("qudurat"), false);
  assert.equal(isCore("ielts"), false);
  assert.equal(isCore("aramco"), false);
});

test("OPTIONAL_MODULES يستبعد Core ويضمّ كل الاختيارية", () => {
  assert.ok(!OPTIONAL_MODULES.includes("school"));
  assert.ok(!OPTIONAL_MODULES.includes("university"));
  for (const id of ["qudurat", "tahsili", "step", "ielts", "toefl", "duolingo", "aramco", "itc", "niti"] as const) {
    assert.ok(OPTIONAL_MODULES.includes(id), `${id} يجب أن تكون في الكتالوج الاختياري`);
  }
});

test("moduleDef يرمي على معرّفٍ غير معروف", () => {
  // @ts-expect-error معرّف غير صالح عمداً
  assert.throws(() => moduleDef("nope"));
});

test("التحصيلي يجسر نافذتَي القياس (مبكر+عادي)", () => {
  assert.deepEqual(moduleDef("tahsili").boardIds, ["tahsiliEarly", "tahsiliRegular"]);
  assert.deepEqual(moduleDef("qudurat").boardIds, ["qudurat"]);
});

test("لا تكرار في معرّفات السجل", () => {
  const ids = MODULE_DEFS.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
});
