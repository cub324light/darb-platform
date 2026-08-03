/* ═══════════ محرّك المحفظة — شراءٌ ولبسٌ، نقيٌّ ١٠٠٪ ═══════════
   مُدخلاتٌ داخلة ونتيجةٌ خارجة: لا `localStorage` ولا `window` ولا `Date`.
   من يقرأ ويكتب هو `store.ts` وحده.

   لماذا محرّكٌ مستقلّ؟ لأن الشراء قرارٌ يُخطئ بصمت إن أُهمل: `addSilver(-price)`
   في التخزين تَحُدّ الرصيد عند الصفر، فلو نادينا الخصم بلا تحقّقٍ لأخذ الطالبُ
   الصنفَ بلا ثمن. فالتحقّقُ هنا أوّلاً، والخصمُ بعده. */
import { itemById, type CosmeticSlot, type StoreItem } from "./catalog";

/** ما يملكه الطالب: أصنافٌ اشتراها، وما يلبسه في كل خانة. */
export interface Owned {
  items: string[];
  equipped: Partial<Record<CosmeticSlot, string>>;
}

export const EMPTY_OWNED: Owned = { items: [], equipped: {} };

/** إنجازُ الطالب — تُقاس به شروطُ الفتح. */
export interface Progress { sessions: number; focusMins: number; streak: number }

export const EMPTY_PROGRESS: Progress = { sessions: 0, focusMins: 0, streak: 0 };

export type BuyFail =
  | "unknown"   // صنفٌ ليس في الكتالوج
  | "owned"     // يملكه أصلاً
  | "locked"    // لم يبلغ شرطَ الفتح
  | "poor";     // رصيدُه أقلّ من الثمن

export type BuyResult =
  | { ok: true; spent: number; balance: number; owned: Owned }
  | { ok: false; reason: BuyFail; balance: number; short: number };

/** هل بلغ الطالبُ شرطَ فتح الصنف؟ (بلا شرطٍ = مفتوح) */
export function isUnlocked(item: StoreItem, p: Progress = EMPTY_PROGRESS): boolean {
  const r = item.requires;
  if (!r) return true;
  if (r.minSessions != null && p.sessions < r.minSessions) return false;
  if (r.minFocusMins != null && p.focusMins < r.minFocusMins) return false;
  if (r.minStreak != null && p.streak < r.minStreak) return false;
  return true;
}

export const owns = (owned: Owned, id: string): boolean => owned.items.includes(id);

/** شراءُ صنف. لا يلبسه — اللبسُ قرارٌ ثانٍ يملكه الطالب. */
export function buy(i: {
  catalog: StoreItem[];
  id: string;
  balance: number;
  owned: Owned;
  progress?: Progress;
}): BuyResult {
  const { catalog, id, balance, owned } = i;
  const item = itemById(catalog, id);
  /* لقبُ المستوى يُمنَح ولا يُباع — ولو تسرّب معرّفُه إلى نداءِ شراء */
  if (!item || item.levelIndex !== undefined) return { ok: false, reason: "unknown", balance, short: 0 };
  if (owns(owned, id)) return { ok: false, reason: "owned", balance, short: 0 };
  if (!isUnlocked(item, i.progress ?? EMPTY_PROGRESS)) return { ok: false, reason: "locked", balance, short: 0 };
  if (balance < item.price) return { ok: false, reason: "poor", balance, short: item.price - balance };
  return {
    ok: true,
    spent: item.price,
    balance: balance - item.price,
    owned: { items: [...owned.items, id], equipped: { ...owned.equipped } },
  };
}

/** لبسُ صنفٍ مملوك — يزيح ما في خانته. غيرُ المملوك لا يُلبس. */
export function equip(catalog: StoreItem[], owned: Owned, id: string): Owned {
  const item = itemById(catalog, id);
  if (!item || !owns(owned, id)) return owned;
  return { items: [...owned.items], equipped: { ...owned.equipped, [item.slot]: id } };
}

/** خلعُ ما في خانة. */
export function unequip(owned: Owned, slot: CosmeticSlot): Owned {
  const next = { ...owned.equipped };
  delete next[slot];
  return { items: [...owned.items], equipped: next };
}

/** الملبوسُ في خانةٍ ما — يتجاهل ما حُذف من الكتالوج فلا يُعرض اسمٌ لا وجود له. */
export function equippedItem(catalog: StoreItem[], owned: Owned, slot: CosmeticSlot): StoreItem | null {
  const id = owned.equipped[slot];
  return id ? itemById(catalog, id) : null;
}

/** تنظيفُ ملكيّةٍ قديمة: يُسقط ما لم يعد في الكتالوج (مُلبَساً كان أو مملوكاً). */
export function reconcile(catalog: StoreItem[], owned: Owned): Owned {
  const items = owned.items.filter((id) => itemById(catalog, id) !== null);
  const equipped: Partial<Record<CosmeticSlot, string>> = {};
  for (const [slot, id] of Object.entries(owned.equipped) as [CosmeticSlot, string][]) {
    const it = itemById(catalog, id);
    if (it && items.includes(id) && it.slot === slot) equipped[slot] = id;
  }
  return { items, equipped };
}
