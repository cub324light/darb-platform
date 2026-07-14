import { test } from "node:test";
import assert from "node:assert/strict";
import {
  moduleDef, memberDef, isCore, isGroup, parentModuleOf,
  coreModulesForStage, OPTIONAL_MODULES, MODULE_DEFS, MEMBER_DEFS,
} from "./registry";

test("Core لكل مرحلة: المدرسة للثانوي، الجامعة للجامعي، لا شيء للخريج", () => {
  assert.deepEqual(coreModulesForStage("first"), ["school"]);
  assert.deepEqual(coreModulesForStage("third"), ["school"]);
  assert.deepEqual(coreModulesForStage("university"), ["university"]);
  assert.deepEqual(coreModulesForStage("graduate"), []);
});

test("isCore / isGroup: المدرسة Core مفردة، اللغة/البرامج مجموعات", () => {
  assert.equal(isCore("school"), true);
  assert.equal(isCore("qudurat"), false);
  assert.equal(isGroup("english"), true);
  assert.equal(isGroup("programs"), true);
  assert.equal(isGroup("qudurat"), false);
  assert.equal(isGroup("school"), false);
});

test("الوحدات العليا الاختيارية أربع فقط (لا تكبر الصفحة)", () => {
  assert.deepEqual([...OPTIONAL_MODULES].sort(), ["english", "programs", "qudurat", "tahsili"]);
});

test("الأعضاء ينتمون لوحداتهم: اللغة→english، البرامج→programs", () => {
  assert.equal(parentModuleOf("step"), "english");
  assert.equal(parentModuleOf("ielts"), "english");
  assert.equal(parentModuleOf("aramco"), "programs");
  assert.equal(parentModuleOf("niti"), "programs");
  assert.equal(memberDef("step").category, "language");
  assert.equal(memberDef("aramco").category, "program");
});

test("التحصيلي يجسر نافذتَي القياس (مبكر+عادي)", () => {
  assert.deepEqual(moduleDef("tahsili").boardIds, ["tahsiliEarly", "tahsiliRegular"]);
  assert.deepEqual(moduleDef("qudurat").boardIds, ["qudurat"]);
});

test("english/programs تحملان كتالوج أعضائهما", () => {
  assert.deepEqual(moduleDef("english").memberIds, ["step", "ielts", "toefl", "duolingo"]);
  assert.deepEqual(moduleDef("programs").memberIds, ["aramco", "itc", "niti"]);
});

test("لا تكرار في معرّفات الوحدات ولا الأعضاء", () => {
  const mids = MODULE_DEFS.map((d) => d.id);
  const memids = MEMBER_DEFS.map((d) => d.id);
  assert.equal(new Set(mids).size, mids.length);
  assert.equal(new Set(memids).size, memids.length);
});

test("moduleDef/memberDef يرميان على معرّفٍ غير معروف", () => {
  // @ts-expect-error عمداً
  assert.throws(() => moduleDef("nope"));
  // @ts-expect-error عمداً
  assert.throws(() => memberDef("nope"));
});
