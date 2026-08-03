/* اختبارُ ربط سند — الرمزُ بيد الطالب، ولا يُربط أحدٌ من خلف ظهره.
   تشغيل: npx tsx --test src/lib/sanad/link.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CODE_ALPHABET, CODE_LEN, CODE_TTL_MS, MAX_GUARDIANS,
  makeCode, normalizeCode, isWellFormed, isExpired, secondsLeft,
  verifyLink, LINK_FAIL_TEXT, addGuardian, removeGuardian, type Guardian,
} from "./link";

const T0 = 1_800_000_000_000;
const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length]; };
const guard = (id: string, email?: string): Guardian => ({ id, label: "أبي", email, linkedAt: T0 });

test("الرمزُ بالطول المطلوب ومن أبجديّته وحدها", () => {
  for (let k = 0; k < 50; k++) {
    const c = makeCode(Math.random, T0).code;
    assert.equal(c.length, CODE_LEN);
    assert.ok([...c].every((ch) => CODE_ALPHABET.includes(ch)), `حرفٌ غريب في ${c}`);
  }
});

test("الأبجديّة بلا حروفٍ تلتبس بأرقام", () => {
  for (const bad of ["O", "0", "I", "1", "L", "Z", "2", "S", "5", "B", "8"]) {
    assert.ok(!CODE_ALPHABET.includes(bad), `${bad} يلتبس على من يكتبه`);
  }
});

test("العشوائيُّ الشاذّ لا يكسر التوليد", () => {
  for (const r of [seq(0), seq(0.999999), seq(1), seq(-0.3), seq(NaN)]) {
    assert.equal(makeCode(r, T0).code.length, CODE_LEN);
  }
});

test("التطبيع: حروفٌ كبيرة بلا فراغاتٍ ولا شرطات", () => {
  assert.equal(normalizeCode(" a4-c d "), "A4CD");
  assert.equal(normalizeCode("acdefg"), "ACDEFG");
});

test("الشكلُ يُفحص قبل المطابقة", () => {
  assert.ok(isWellFormed("ACDEFG"));
  assert.ok(isWellFormed(" acd-efg ".replace("g", "")) === false, "الطولُ خطأ");
  assert.ok(!isWellFormed("ACDEF0"), "صفرٌ ليس من الأبجدية");
  assert.ok(!isWellFormed("ACDEF"), "أقصرُ من الطول");
});

test("الانتهاء: قبل المدّة يحيا، وعندها يموت", () => {
  assert.ok(!isExpired(T0, T0 + CODE_TTL_MS - 1));
  assert.ok(isExpired(T0, T0 + CODE_TTL_MS));
  assert.equal(secondsLeft(T0, T0), CODE_TTL_MS / 1000);
  assert.equal(secondsLeft(T0, T0 + CODE_TTL_MS + 5000), 0, "لا عدّادَ سالب");
});

test("الربطُ يمرّ بالرمز الصحيح داخل مدّته", () => {
  const issued = makeCode(seq(0, 0, 0, 0, 0, 0), T0);
  const r = verifyLink({ entered: issued.code.toLowerCase(), issued, now: T0 + 1000, guardians: [] });
  assert.ok(r.ok);
  assert.equal(r.code, issued.code);
});

test("ترتيبُ الرفض مقصود: الشكل ثم الانتهاء ثم المطابقة", () => {
  const issued = makeCode(seq(0), T0);
  /* شكلٌ خطأ ورمزٌ منتهٍ معاً ⇒ نقول «الشكل» لا «انتهى» */
  assert.deepEqual(verifyLink({ entered: "12", issued, now: T0 + CODE_TTL_MS * 2, guardians: [] }),
    { ok: false, reason: "bad-format" });
  /* شكلٌ صحيحٌ لكن منتهٍ ⇒ «انتهى» لا «غير مطابق» */
  assert.deepEqual(verifyLink({ entered: issued.code, issued, now: T0 + CODE_TTL_MS, guardians: [] }),
    { ok: false, reason: "expired" });
  /* حيٌّ لكن مختلف */
  const other = "ACDEFG" === issued.code ? "GFEDCA" : "ACDEFG";
  assert.deepEqual(verifyLink({ entered: other, issued, now: T0, guardians: [] }),
    { ok: false, reason: "mismatch" });
});

test("بلا رمزٍ مُصدَرٍ لا ربط — لا يُفتح ملفٌّ بتخمين", () => {
  assert.deepEqual(verifyLink({ entered: "ACDEFG", issued: null, now: T0, guardians: [] }),
    { ok: false, reason: "mismatch" });
});

test("الحدود: لا تكرارٌ لنفس الوالد، ولا تجاوزٌ للعدد", () => {
  const issued = makeCode(seq(0), T0);
  const dup = verifyLink({ entered: issued.code, issued, now: T0, guardians: [guard("a", "ab@x.com")], email: "AB@x.com" });
  assert.deepEqual(dup, { ok: false, reason: "duplicate" }, "البريدُ نفسُه يُربط مرّتين");

  const full = Array.from({ length: MAX_GUARDIANS }, (_, i) => guard(`g${i}`, `g${i}@x.com`));
  assert.deepEqual(verifyLink({ entered: issued.code, issued, now: T0, guardians: full, email: "new@x.com" }),
    { ok: false, reason: "full" });
});

test("لكلّ سببِ رفضٍ نصٌّ يفهمه الوالد", () => {
  for (const k of ["bad-format", "expired", "mismatch", "full", "duplicate"] as const) {
    assert.ok(LINK_FAIL_TEXT[k] && LINK_FAIL_TEXT[k].length > 10, `${k} بلا نصّ`);
  }
});

test("قائمةُ أولياء الأمر: إضافةٌ بلا تكرار، وحذفٌ بالمعرّف", () => {
  let l: Guardian[] = [];
  l = addGuardian(l, guard("a"));
  l = addGuardian(l, guard("a"));
  assert.equal(l.length, 1, "أُضيف مرّتين");
  l = addGuardian(l, guard("b"));
  assert.deepEqual(removeGuardian(l, "a").map((g) => g.id), ["b"]);
  assert.equal(removeGuardian(l, "لا-وجود-له").length, 2);
});

test("المحرّك نقيّ: لا تخزين ولا نافذة ولا وقتٍ ولا عشوائيّ داخليّ", async () => {
  const { readFileSync } = await import("node:fs");
  const code = readFileSync("src/lib/sanad/link.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  for (const bad of ["localStorage", "window.", "new Date(", "Date.now(", "Math.random("]) {
    assert.ok(!code.includes(bad), `المحرّك يلمس ${bad} — يأتيه من الخارج`);
  }
});
