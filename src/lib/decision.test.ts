/* اختبارات «شبكة القرارات» — تشغيل: npx tsx --test src/lib/decision.test.ts
   حتمية بلا IO. نتحقق أن الأولوية تتغيّر بحال الطالب (متعثّر→المعدّل، متميّز→البحث)،
   وأن طبقة التاريخ تُنزِل الأكثر مشاهدةً بثبات. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { academicPriority, rankBySeen, isFamiliar, type StudentSignals } from "./decision";

const S = (o: Partial<StudentSignals> = {}): StudentSignals => ({
  stage: "mid", gpa: null, coopDone: false, gradInterest: false, ...o,
});

/* ════════ الأولوية تتحوّل بحال الطالب ════════ */
test("متعثّر (معدّل منخفض) → الأولوية رفع المعدّل لا الشهادات — ولو كان senior", () => {
  const p = academicPriority(S({ stage: "senior", gpa: 2.3 }));
  assert.equal(p.key, "gpa");
  assert.match(p.title, /معدّل/);
});

test("متميّز في المنتصف/قرب التخرّج → البحث والدراسات العليا لا رفع المعدّل", () => {
  assert.equal(academicPriority(S({ stage: "mid", gpa: 4.8 })).key, "research");
  assert.equal(academicPriority(S({ stage: "senior", gpa: 4.9 })).key, "research");
});

test("قرب التخرّج بمعدّل متوسط → السوق (سيرة وتقديم)", () => {
  const p = academicPriority(S({ stage: "senior", gpa: 3.6 }));
  assert.equal(p.key, "market");
  assert.match(p.title, /سيرت|تقديم/);
});

test("المنتصف: بلا تدريب → التدريب · مع تدريب → الشهادة", () => {
  assert.equal(academicPriority(S({ stage: "mid", gpa: 3.5, coopDone: false })).key, "training");
  assert.equal(academicPriority(S({ stage: "mid", gpa: 3.5, coopDone: true })).key, "certs");
});

test("البداية → الأساس (المعدّل والتنظيم)", () => {
  assert.equal(academicPriority(S({ stage: "start", gpa: 3.2 })).key, "foundation");
});

test("متعثّر يتقدّم على البداية أيضاً", () => {
  assert.equal(academicPriority(S({ stage: "start", gpa: 2.0 })).key, "gpa");
});

test("بلا معدّل مُدخَل: لا تُلفَّق أولوية معدّل — تُشتقّ من المرحلة", () => {
  assert.equal(academicPriority(S({ stage: "senior", gpa: null })).key, "market");
  assert.equal(academicPriority(S({ stage: "start", gpa: null })).key, "foundation");
});

test("كل أولوية لها عنوان وسبب غير فارغين", () => {
  for (const s of [
    S({ stage: "start", gpa: 2.0 }), S({ stage: "mid", gpa: 4.8 }),
    S({ stage: "senior", gpa: 3.5 }), S({ stage: "mid", gpa: 3.2, coopDone: true }),
    S({ stage: "start", gpa: 3.0 }),
  ]) {
    const p = academicPriority(s);
    assert.ok(p.title.trim() !== "" && p.why.trim() !== "");
  }
});

/* ════════ طبقة التاريخ ════════ */
test("rankBySeen: الأكثر مشاهدةً يهبط، والمتساوون يحفظون ترتيبهم", () => {
  const items = [{ label: "أ" }, { label: "ب" }, { label: "ج" }, { label: "د" }];
  const visits = { "أ": 5, "ج": 2 }; // ب،د = 0
  const ordered = rankBySeen(items, visits).map((x) => x.label);
  assert.deepEqual(ordered, ["ب", "د", "ج", "أ"]); // 0،0 (بترتيبهما) ثم 2 ثم 5
});

test("rankBySeen: بلا تاريخ يحفظ الترتيب الأصلي (مستقرّ)", () => {
  const items = [{ label: "x" }, { label: "y" }, { label: "z" }];
  assert.deepEqual(rankBySeen(items, {}).map((i) => i.label), ["x", "y", "z"]);
});

test("isFamiliar: عتبة المشاهدة المتكرّرة", () => {
  assert.equal(isFamiliar("ETAP", { ETAP: 3 }), true);
  assert.equal(isFamiliar("ETAP", { ETAP: 2 }), false);
  assert.equal(isFamiliar("ETAP", {}), false);
});
