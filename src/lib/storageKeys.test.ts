/* ═══ سجلُّ مفاتيح التخزين — قائمةٌ واحدةٌ تُشتقّ منها الأربع ═══
   تشغيل: npx tsx --test src/lib/storageKeys.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  STORAGE_KEYS, BACKUP_KEYS, RESET_KEYS, RESET_PREFIXES, NAMESPACED_KEYS, LEGACY_KEYS, keyDef,
} from "./storageKeys";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if ((p.endsWith(".ts") || p.endsWith(".tsx")) && !p.includes(".test.")) out.push(p);
  }
  return out;
}

/* كلُّ حرفٍ نصّيٍّ يبدأ بـ`darb_` في المشروع — ما عدا المفاتيح المنطَّقة في
   الاختبارات (`__guest`) وسجلَّ المفاتيح نفسَه. */
function usedKeys(): Set<string> {
  const out = new Set<string>();
  for (const f of walk("src")) {
    if (f.endsWith("src/lib/storageKeys.ts")) continue;
    for (const m of readFileSync(f, "utf8").matchAll(/"(darb_[a-zA-Z0-9_]*)"/g)) {
      const k = m[1];
      if (k === "darb_") continue;                 // بادئةٌ مجرّدة
      if (k.includes("__")) continue;              // مفتاحٌ منطَّقٌ في اختبار
      out.add(k);
    }
  }
  return out;
}

/* ─────────── الاكتمال ─────────── */

test("لا مفتاحَ في المشروع بلا مدخلٍ في السجلّ", () => {
  const missing = [...usedKeys()].filter((k) => !keyDef(k)).sort();
  assert.deepEqual(missing, [], `مفاتيحُ بلا تصنيف — أضِف لها سطراً في storageKeys.ts:\n${missing.join("\n")}`);
});

test("لا مدخلَ حيٌّ في السجلّ لمفتاحٍ لا يستعمله أحد", () => {
  /* المدخلُ الذي لا يقرؤه كودٌ اليوم مشروعٌ **إن كان مُعلَّماً قديماً**: على أجهزةِ
     طلابٍ بياناتٌ فيه، فيبقى يُرفع ويُمحى. أمّا مدخلٌ حيٌّ لا يستعمله أحد فهو خطأُ سجلّ. */
  const used = usedKeys();
  const dead = STORAGE_KEYS.filter((d) => !used.has(d.key) && !d.legacy).map((d) => d.key);
  assert.deepEqual(dead, [], `مداخلُ حيّةٌ ميتةُ الاستعمال:\n${dead.join("\n")}`);
});

test("لا مفتاحَ مكرّرٌ في السجلّ", () => {
  const seen = new Set<string>(); const dup: string[] = [];
  for (const d of STORAGE_KEYS) { if (seen.has(d.key)) dup.push(d.key); seen.add(d.key); }
  assert.deepEqual(dup, []);
});

/* ─────────── الاشتقاق ─────────── */

test("النسخُ الاحتياطي = بياناتُ الطالب وحدَها", () => {
  for (const k of BACKUP_KEYS) {
    assert.equal(keyDef(k)?.scope, "student", `${k} ليس من بيانات الطالب ومع ذلك يُرفع`);
  }
  /* ما كان يسقط من القائمة المكتوبة بيد — ومنه ضاعت جلساتُ مساري بتبديل الجهاز. */
  for (const k of ["darb_user", "darb_goals", "darb_results", "darb_sessions", "darb_calendar_events",
                   "darb_homework", "darb_uni_tools", "darb_rp", "darb_badges_claimed", "darb_levels_claimed"]) {
    assert.ok(BACKUP_KEYS.includes(k), `${k} يحمل بياناتِ طالبٍ ولا يُرفع`);
  }
});

test("النسخُ لا يحمل إعدادَ جهازٍ ولا حالةَ عرضٍ ولا مخازنَ المحرّكات", () => {
  for (const k of ["darb_theme", "darb_guest_mode", "darb_owner_uid", "darb_font_scale",
                   "darb_guide_", "darb_layout_", "darb_memory_v1", "darb_event_log_v1"]) {
    assert.ok(!BACKUP_KEYS.includes(k), `${k} لا يخصّ النسخةَ الكتلية`);
  }
});

test("«ابدأ من الصفر» يمسح الطالبَ وعرضَه ومحرّكاته — لا إعدادَ جهازه", () => {
  /* ▓ العطلُ الذي أُغلق: كانت ذاكرةُ المحرّكات وعلمُ بذرتها ينجوان من المسح،
     فيبدأ الطالبُ من الصفر ثم يفتح دويرب فيناديه باسمه القديم. */
  for (const k of ["darb_memory_v1", "darb_event_log_v1", "darb_memory_seeded_v1",
                   "darb_sessions", "darb_user", "darb_goals", "darb_homework", "darb_rp"]) {
    assert.ok(RESET_KEYS.includes(k), `${k} ينجو من «ابدأ من الصفر»`);
  }
  for (const k of ["darb_theme", "darb_guest_mode", "darb_owner_uid", "darb_visitor", "darb_sanad_code"]) {
    assert.ok(!RESET_KEYS.includes(k), `${k} إعدادُ جهازٍ لا يُمحى مع بيانات الطالب`);
  }
});

test("المفاتيحُ المنطَّقةُ هي مخازنُ المحرّكات وحدَها", () => {
  assert.deepEqual([...NAMESPACED_KEYS].sort(),
    ["darb_event_log_v1", "darb_memory_seeded_v1", "darb_memory_v1"]);
  for (const k of NAMESPACED_KEYS) assert.equal(keyDef(k)?.scope, "engine");
});

test("البوادئُ تُمسح بالجملة ولا تُرفع أبداً", () => {
  assert.deepEqual([...RESET_PREFIXES].sort(), ["darb_guide_", "darb_layout_"]);
  for (const p of RESET_PREFIXES) assert.ok(!BACKUP_KEYS.includes(p));
});

test("القديمُ يبقى مرفوعاً حتى يُرحَّل — إسقاطُه قبل ذلك فقدٌ صامت", () => {
  for (const k of LEGACY_KEYS) {
    const d = keyDef(k)!;
    if (d.scope === "student") assert.ok(BACKUP_KEYS.includes(k), `${k} قديمٌ يحمل بياناتٍ ولا يُرفع`);
    assert.ok(RESET_KEYS.includes(k), `${k} قديمٌ ولا يُمحى`);
  }
  /* السجلّان اللذان وُحِّدا: القديمُ مُعلَّمٌ والجديدُ ليس كذلك. */
  assert.ok(keyDef("darb_session_log")?.legacy, "سجلُّ أوربت القديم غيرُ مُعلَّم");
  assert.ok(!keyDef("darb_sessions")?.legacy, "السجلُّ الواحد ليس قديماً");
  assert.ok(keyDef("darb_coach_memory")?.legacy, "ذاكرةُ المدرّب القديمة غيرُ مُعلَّمة");
});

/* ─────────── لا قائمةَ ثانيةٌ مكتوبةٌ بيد ─────────── */

test("لا يكتب أحدٌ قائمةَ مفاتيحَ بيده خارج السجلّ", () => {
  const offenders: string[] = [];
  for (const f of walk("src")) {
    if (f.endsWith("src/lib/storageKeys.ts")) continue;
    const src = readFileSync(f, "utf8");
    /* ثلاثةُ مفاتيحَ نصّيّةٍ أو أكثر داخل مصفوفةٍ واحدة = قائمةٌ موازية. */
    for (const m of src.matchAll(/\[[^\]]*?(?:"darb_[a-zA-Z0-9_]*"[^\]]*?){3,}\]/g)) {
      offenders.push(`${f}: ${m[0].slice(0, 60)}…`);
    }
  }
  assert.deepEqual(offenders, [], `قوائمُ مفاتيحَ موازيةٌ للسجلّ:\n${offenders.join("\n")}`);
});

test("accountScope و resetAll يشتقّان ولا يكتبان", () => {
  const scope = readFileSync("src/lib/accountScope.ts", "utf8");
  assert.ok(/from "\.\/storageKeys"/.test(scope), "accountScope لا يشتقّ من السجلّ");
  const storage = readFileSync("src/lib/storage.ts", "utf8");
  assert.ok(/RESET_KEYS/.test(storage) && /RESET_PREFIXES/.test(storage), "resetAll لا يشتقّ من السجلّ");
});
