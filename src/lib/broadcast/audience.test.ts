/* اختبارات استهداف الجمهور — npx tsx --test src/lib/broadcast/audience.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesAudience, describeAudience, validateAudience, type TargetProfile } from "./audience";
import { AUDIENCE_KINDS, BROADCAST_TYPES, BROADCAST_TEMPLATES } from "./types";

const DAY = 86_400_000;
const NOW = 1_000_000 * DAY;
const P = (p: Partial<TargetProfile>): TargetProfile => ({ ...p });

test("all يطابق الجميع", () => {
  assert.equal(matchesAudience(P({}), { kind: "all" }, NOW), true);
  assert.equal(matchesAudience(P({ stage: "ثانوي" }), { kind: "all" }, NOW), true);
});

test("stage يطابق المرحلة (تطبيع عربي)", () => {
  assert.equal(matchesAudience(P({ stage: "ثانوي" }), { kind: "stage", stage: "ثانوي" }, NOW), true);
  assert.equal(matchesAudience(P({ stage: "جامعي" }), { kind: "stage", stage: "ثانوي" }, NOW), false);
  assert.equal(matchesAudience(P({ stage: null }), { kind: "stage", stage: "ثانوي" }, NOW), false);
});

test("grade يطابق الصف", () => {
  assert.equal(matchesAudience(P({ grade: "ثالث ثانوي" }), { kind: "grade", grade: "ثالث ثانوي" }, NOW), true);
  assert.equal(matchesAudience(P({ grade: "أول ثانوي" }), { kind: "grade", grade: "ثالث ثانوي" }, NOW), false);
});

test("university يطابق جزئياً", () => {
  assert.equal(matchesAudience(P({ university: "جامعة الملك سعود" }), { kind: "university", university: "الملك سعود" }, NOW), true);
  assert.equal(matchesAudience(P({ university: "جامعة البترول" }), { kind: "university", university: "الملك سعود" }, NOW), false);
});

test("rank يحترم حدّي RP", () => {
  assert.equal(matchesAudience(P({ rp: 700 }), { kind: "rank", minRp: 600 }, NOW), true);
  assert.equal(matchesAudience(P({ rp: 500 }), { kind: "rank", minRp: 600 }, NOW), false);
  assert.equal(matchesAudience(P({ rp: 700 }), { kind: "rank", minRp: 600, maxRp: 900 }, NOW), true);
  assert.equal(matchesAudience(P({ rp: 1000 }), { kind: "rank", minRp: 600, maxRp: 900 }, NOW), false);
  assert.equal(matchesAudience(P({ rp: null }), { kind: "rank", minRp: 600 }, NOW), false);
});

test("inactive: غير النشِط منذ ≥ N يوم (وغير المُشاهَد قط)", () => {
  assert.equal(matchesAudience(P({ lastSeen: NOW - 10 * DAY }), { kind: "inactive", inactiveDays: 7 }, NOW), true);
  assert.equal(matchesAudience(P({ lastSeen: NOW - 3 * DAY }), { kind: "inactive", inactiveDays: 7 }, NOW), false);
  assert.equal(matchesAudience(P({ lastSeen: null }), { kind: "inactive", inactiveDays: 7 }, NOW), true);
});

test("score: مقارنة درجات القدرات/التحصيلي", () => {
  assert.equal(matchesAudience(P({ quduratScore: 90 }), { kind: "score", exam: "qudurat", scoreOp: "gte", scoreValue: 85 }, NOW), true);
  assert.equal(matchesAudience(P({ quduratScore: 80 }), { kind: "score", exam: "qudurat", scoreOp: "gte", scoreValue: 85 }, NOW), false);
  assert.equal(matchesAudience(P({ tahsiliScore: 70 }), { kind: "score", exam: "tahsili", scoreOp: "lte", scoreValue: 75 }, NOW), true);
  assert.equal(matchesAudience(P({ quduratScore: null }), { kind: "score", exam: "qudurat", scoreOp: "gte", scoreValue: 85 }, NOW), false);
});

test("describeAudience نصّ مقروء لكل نوع", () => {
  assert.ok(describeAudience({ kind: "all" }).includes("جميع"));
  assert.ok(describeAudience({ kind: "rank", minRp: 600 }).includes("RP"));
  assert.ok(describeAudience({ kind: "inactive", inactiveDays: 14 }).includes("14"));
  assert.ok(describeAudience({ kind: "score", exam: "tahsili", scoreOp: "lte", scoreValue: 70 }).includes("التحصيلي"));
});

test("validateAudience يكشف الفلاتر الناقصة", () => {
  assert.equal(validateAudience({ kind: "all" }), null);
  assert.ok(validateAudience({ kind: "stage" }));
  assert.equal(validateAudience({ kind: "stage", stage: "ثانوي" }), null);
  assert.ok(validateAudience({ kind: "rank" }));
  assert.equal(validateAudience({ kind: "rank", minRp: 100 }), null);
  assert.ok(validateAudience({ kind: "score", exam: "qudurat" }));
});

test("الثوابت: أنواع الإشعارات والجمهور والقوالب متّسقة", () => {
  assert.equal(BROADCAST_TYPES.length, 6);
  assert.equal(AUDIENCE_KINDS.length, 7);
  assert.ok(BROADCAST_TEMPLATES.every((t) => BROADCAST_TYPES.some((b) => b.id === t.type)));
});
