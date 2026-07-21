import { test } from "node:test";
import assert from "node:assert/strict";
import { remainingSteps, arCount } from "./remainingSteps";

test("arCount: مفرد/مثنّى/جمع قلّة/تمييز مفرد", () => {
  assert.equal(arCount(1, "وحدة واحدة", "وحدتين", "وحدات", "وحدة"), "وحدة واحدة");
  assert.equal(arCount(2, "وحدة واحدة", "وحدتين", "وحدات", "وحدة"), "وحدتين");
  assert.equal(arCount(5, "سؤال واحد", "سؤالين", "أسئلة", "سؤالاً"), "٥ أسئلة");
  assert.equal(arCount(40, "سؤال واحد", "سؤالين", "أسئلة", "سؤالاً"), "٤٠ سؤالاً");
});

test("remainingSteps: يحوّل الأرقام إلى خطوات، ويحذف ما رصيده صفر", () => {
  assert.deepEqual(
    remainingSteps({ remainingLessons: 2, remainingDrills: 40, unreviewedErrors: 12 }),
    ["إنهاء وحدتين", "حل ٤٠ سؤالاً", "مراجعة ١٢ خطأً"],
  );
  assert.deepEqual(remainingSteps({ remainingLessons: 0, remainingDrills: 0, unreviewedErrors: 0 }), []);
  assert.deepEqual(remainingSteps({ remainingLessons: 1, remainingDrills: 0, unreviewedErrors: 5 }), ["إنهاء وحدة واحدة", "مراجعة ٥ أخطاء"]);
});
