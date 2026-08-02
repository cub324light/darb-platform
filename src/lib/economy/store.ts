"use client";
/* ═══════════ محفظةُ الطالب — طبقةُ القراءة والكتابة وحدها ═══════════
   الرصيدُ ليس هنا: مصدرُه `darb_stats.silver` نفسُه الذي يكسبه «تركيز» ويعرضه
   `SilverCounter`. لا نفتح رصيداً ثانياً يتفرّق عن الأول. ما نملكه هنا هو
   الملكيّةُ وحدها في `darb_cosmetics`.

   القراءةُ بـ`useSyncExternalStore` لا في مُهيّئ `useState` — وإلا انكسر الترطيب
   (React #418)، وهو عطلٌ تكرّر في هذا المشروع فلا نعيده. */
import { useSyncExternalStore } from "react";
import { loadStats, addSilver, computeStreak } from "@/lib/storage";
import { CATALOG, type CosmeticSlot } from "./catalog";
import { buy, equip, unequip, reconcile, EMPTY_OWNED, EMPTY_PROGRESS, type BuyResult, type Owned, type Progress } from "./wallet";

const KEY = "darb_cosmetics";
export const WALLET_CHANGED = "darb:walletChanged";

function announce() {
  try { window.dispatchEvent(new Event(WALLET_CHANGED)); } catch { /* تجاهل */ }
}

export function loadOwned(): Owned {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_OWNED;
    const p = JSON.parse(raw) as Partial<Owned>;
    return reconcile(CATALOG, {
      items: Array.isArray(p.items) ? p.items.filter((x) => typeof x === "string") : [],
      equipped: (p.equipped && typeof p.equipped === "object" ? p.equipped : {}) as Owned["equipped"],
    });
  } catch { return EMPTY_OWNED; }
}

function saveOwned(o: Owned): void {
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* تجاهل */ }
  announce();
}

export function readBalance(): number {
  try { return loadStats()?.silver ?? 0; } catch { return 0; }
}

/** إنجازُ الطالب كما تقيسه شروطُ الفتح — من الإحصاءات القائمة لا من عدّادٍ جديد. */
export function readProgress(): Progress {
  try {
    const s = loadStats();
    if (!s) return EMPTY_PROGRESS;
    return { sessions: s.sessionsCount ?? 0, focusMins: s.totalFocusMins ?? 0, streak: computeStreak(s) };
  } catch { return EMPTY_PROGRESS; }
}

/** شراءٌ حقيقيّ: يتحقّق المحرّكُ أوّلاً، ثم يُخصم الرصيد وتُحفَظ الملكيّة. */
export function purchase(id: string): BuyResult {
  const res = buy({ catalog: CATALOG, id, balance: readBalance(), owned: loadOwned(), progress: readProgress() });
  if (!res.ok) return res;
  /* الخصمُ بعد التحقّق: `addSilver` تَحُدّ عند الصفر، وقد ضمنّا الكفاية فوقها. */
  addSilver(-res.spent);
  saveOwned(res.owned);
  return res;
}

export function wear(id: string): Owned {
  const next = equip(CATALOG, loadOwned(), id);
  saveOwned(next);
  return next;
}

export function takeOff(slot: CosmeticSlot): Owned {
  const next = unequip(loadOwned(), slot);
  saveOwned(next);
  return next;
}

const subscribe = (cb: () => void) => {
  window.addEventListener(WALLET_CHANGED, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(WALLET_CHANGED, cb);
    window.removeEventListener("storage", cb);
  };
};

export function useOwned(): Owned {
  return useSyncExternalStore(subscribe, loadOwned, () => EMPTY_OWNED);
}
