"use client";
/* ═══════════ تفضيلاتٌ منطقية صغيرة (إظهار/إخفاء) ═══════════
   قيمٌ خارجية في `localStorage`، تُقرأ بـ`useSyncExternalStore` لا في مُهيّئ
   `useState` — وإلا انكسر الترطيب (React #418). واللقطةُ الخادميّة هي القيمة
   الافتراضية، فلا يُعاد الرسمُ إلا لمن غيّرها. */
import { useSyncExternalStore } from "react";

export const PREF_CHANGED = "darb:prefChanged";

export function readPref(key: string, def: boolean): boolean {
  try {
    const v = localStorage.getItem(`darb_pref_${key}`);
    return v === null ? def : v === "1";
  } catch { return def; }
}

export function setPref(key: string, value: boolean): void {
  try { localStorage.setItem(`darb_pref_${key}`, value ? "1" : "0"); } catch { /* تجاهل */ }
  window.dispatchEvent(new Event(PREF_CHANGED));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(PREF_CHANGED, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PREF_CHANGED, cb);
    window.removeEventListener("storage", cb);
  };
};

export function usePref(key: string, def: boolean): boolean {
  return useSyncExternalStore(subscribe, () => readPref(key, def), () => def);
}
