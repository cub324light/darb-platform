/* اختبارُ محفظة الفضة — يقفل الأبوابَ قبل أن يُفتح المتجر.
   تشغيل: npx tsx --test src/lib/economy/wallet.test.ts

   الكتالوجُ الحقيقيّ فارغٌ حتى يختار المالكُ الأصناف، فنختبر بأصنافٍ خاصّة
   بالاختبار: هكذا لا ينكسر شيءٌ يوم يُضاف الصنفُ الأول، ولا يتسلّل خطأٌ في
   المحرّك تحت غطاء «لا أصناف بعد». */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buy, equip, unequip, equippedItem, isUnlocked, reconcile, owns, EMPTY_OWNED, type Owned } from "./wallet";
import type { StoreItem } from "./catalog";

const CAT: StoreItem[] = [
  { id: "t-mujtahid", slot: "title", label: "المجتهد", price: 100 },
  { id: "t-sabir",    slot: "title", label: "الصابر",  price: 250, requires: { minStreak: 7 } },
  { id: "b-first",    slot: "badge", label: "أول جلسة", price: 0, requires: { minSessions: 1 } },
];

const withItems = (...ids: string[]): Owned => ({ items: ids, equipped: {} });

test("الشراء يخصم الثمن ويُضيف الصنف — ولا يلبسه", () => {
  const r = buy({ catalog: CAT, id: "t-mujtahid", balance: 300, owned: EMPTY_OWNED });
  assert.ok(r.ok);
  assert.equal(r.spent, 100);
  assert.equal(r.balance, 200);
  assert.deepEqual(r.owned.items, ["t-mujtahid"]);
  assert.deepEqual(r.owned.equipped, {}, "الشراء لا يلبس — اللبسُ قرارٌ ثانٍ");
});

test("رصيدٌ ناقص: يُرفض الشراء ويُقال كم ينقصه", () => {
  const r = buy({ catalog: CAT, id: "t-mujtahid", balance: 40, owned: EMPTY_OWNED });
  assert.ok(!r.ok);
  assert.equal(r.reason, "poor");
  assert.equal(r.short, 60, "ما نقص عن الثمن");
  assert.equal(r.balance, 40, "لم يُمسّ الرصيد");
});

test("رصيدٌ يساوي الثمن بالضبط: يمرّ ويصير صفراً", () => {
  const r = buy({ catalog: CAT, id: "t-mujtahid", balance: 100, owned: EMPTY_OWNED });
  assert.ok(r.ok);
  assert.equal(r.balance, 0);
});

test("لا يُشترى ما يملكه، ولا ما ليس في الكتالوج", () => {
  const a = buy({ catalog: CAT, id: "t-mujtahid", balance: 999, owned: withItems("t-mujtahid") });
  assert.ok(!a.ok); assert.equal(a.reason, "owned");
  const b = buy({ catalog: CAT, id: "لا-وجود-له", balance: 999, owned: EMPTY_OWNED });
  assert.ok(!b.ok); assert.equal(b.reason, "unknown");
});

test("شرطُ الفتح يسبق المال — الغنيُّ لا يشتري ما لم يبلغه", () => {
  const poorStreak = buy({ catalog: CAT, id: "t-sabir", balance: 9999, owned: EMPTY_OWNED, progress: { sessions: 50, focusMins: 900, streak: 3 } });
  assert.ok(!poorStreak.ok);
  assert.equal(poorStreak.reason, "locked");

  const ok = buy({ catalog: CAT, id: "t-sabir", balance: 250, owned: EMPTY_OWNED, progress: { sessions: 0, focusMins: 0, streak: 7 } });
  assert.ok(ok.ok);
});

test("المجّانيّ (ثمنُه صفر) يُملَك بالإنجاز وحده", () => {
  const locked = buy({ catalog: CAT, id: "b-first", balance: 0, owned: EMPTY_OWNED, progress: { sessions: 0, focusMins: 0, streak: 0 } });
  assert.ok(!locked.ok); assert.equal(locked.reason, "locked");

  const r = buy({ catalog: CAT, id: "b-first", balance: 0, owned: EMPTY_OWNED, progress: { sessions: 1, focusMins: 25, streak: 1 } });
  assert.ok(r.ok);
  assert.equal(r.spent, 0);
  assert.equal(r.balance, 0);
});

test("isUnlocked: بلا شرطٍ مفتوح، والشروطُ تُقاس كلُّها", () => {
  assert.ok(isUnlocked(CAT[0]));
  const item: StoreItem = { id: "x", slot: "theme", label: "س", price: 1, requires: { minSessions: 3, minFocusMins: 100 } };
  assert.ok(!isUnlocked(item, { sessions: 3, focusMins: 99, streak: 0 }), "الدقائقُ ناقصة");
  assert.ok(!isUnlocked(item, { sessions: 2, focusMins: 500, streak: 0 }), "الجلساتُ ناقصة");
  assert.ok(isUnlocked(item, { sessions: 3, focusMins: 100, streak: 0 }));
});

test("اللبسُ للمملوك فقط، وصنفٌ واحدٌ في الخانة", () => {
  let o = withItems("t-mujtahid", "t-sabir");
  o = equip(CAT, o, "t-mujtahid");
  assert.equal(o.equipped.title, "t-mujtahid");
  o = equip(CAT, o, "t-sabir");
  assert.equal(o.equipped.title, "t-sabir", "الثاني يزيح الأول — خانةٌ واحدة");

  const notOwned = equip(CAT, withItems(), "t-mujtahid");
  assert.deepEqual(notOwned.equipped, {}, "لا يُلبس ما لا يُملك");
});

test("الخلع يفرّغ الخانة ولا يبيع الصنف", () => {
  const o = unequip(equip(CAT, withItems("t-mujtahid"), "t-mujtahid"), "title");
  assert.deepEqual(o.equipped, {});
  assert.ok(owns(o, "t-mujtahid"), "ما زال يملكه");
});

test("equippedItem يتجاهل ما حُذف من الكتالوج", () => {
  const o: Owned = { items: ["مسحوب"], equipped: { title: "مسحوب" } };
  assert.equal(equippedItem(CAT, o, "title"), null);
});

test("reconcile يُسقط المسحوب من الكتالوج ويُبقي الباقي", () => {
  const o: Owned = { items: ["t-mujtahid", "مسحوب"], equipped: { title: "مسحوب", badge: "b-first" } };
  const r = reconcile(CAT, o);
  assert.deepEqual(r.items, ["t-mujtahid"]);
  assert.equal(r.equipped.title, undefined, "الملبوسُ المسحوب يُخلع");
  assert.equal(r.equipped.badge, undefined, "لا يُلبس ما لا يُملك");
});

test("المحرّك نقيّ: لا تخزين ولا نافذة ولا وقت", async () => {
  const { readFileSync } = await import("node:fs");
  /* التعليقاتُ تذكر `localStorage` لتنهى عنه — فنفحص الكودَ وحده */
  const code = readFileSync("src/lib/economy/wallet.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  for (const bad of ["localStorage", "window.", "new Date(", "Date.now("]) {
    assert.ok(!code.includes(bad), `المحرّك يلمس ${bad} — نقلْه إلى store.ts`);
  }
});

test("الرصيد مصدرُه واحد: الفضةُ في darb_stats لا رصيدٌ ثانٍ", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync("src/lib/economy/store.ts", "utf8");
  assert.ok(src.includes("loadStats()"), "لا يقرأ الرصيد من مصدر الفضة القائم");
  assert.ok(src.includes("addSilver(-res.spent)"), "لا يخصم الثمن فعلاً");
  assert.ok(!/localStorage\.setItem\(\s*["'`]darb_stats/.test(src), "يكتب الإحصاءات مباشرةً — مرّ عبر storage");
});

test("المخزن يُعيد لقطةً ثابتةَ المرجع — وإلا علق useSyncExternalStore", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync("src/lib/economy/store.ts", "utf8");
  assert.ok(/cacheRaw/.test(src), "لا ذاكرةَ للقطة: كائنٌ جديد كلَّ نداء يوقع المكوّن في حلقة");
  assert.ok(/cache = null; cacheRaw = null;/.test(src), "الكتابةُ لا تُبطل الذاكرة، فلا يظهر أثرُ الشراء");
});
