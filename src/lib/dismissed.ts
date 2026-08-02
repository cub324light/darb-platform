"use client";
/* ═══════════ البطاقاتُ التعريفية المُغلَقة — مصدرٌ واحد ═══════════
   البطاقةُ التي تشرح الصفحة نافعةٌ أول مرّة، ثم تصير سطراً يُمرَّر عليه كل يوم.
   فليُغلقها الطالبُ متى فهمها، وتبقى مغلقةً.

   قيمةٌ خارجية في `localStorage` تُقرأ بـ`useSyncExternalStore` لا في مُهيّئ
   `useState` — وإلا انكسر الترطيب (React #418): الخادمُ يرسم البطاقة والعميلُ
   يحذفها في اللحظة نفسها. اللقطةُ الخادميّة «غيرُ مُغلَقة» فتُرسم دائماً، ثم
   تختفي فوراً عند مَن أغلقها. */
import { useSyncExternalStore } from "react";

const KEY = "darb_dismissed";
export const DISMISSED_CHANGED = "darb:dismissedChanged";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export const isDismissed = (id: string): boolean => read().includes(id);

export function dismiss(id: string): void {
  try {
    const all = read();
    if (!all.includes(id)) localStorage.setItem(KEY, JSON.stringify([...all, id]));
  } catch { /* تجاهل */ }
  window.dispatchEvent(new Event(DISMISSED_CHANGED));
}

/** يُعيد إظهار كل ما أُغلق — للإعدادات، فلا يندم الطالبُ على إغلاقٍ عابر. */
export function restoreAllDismissed(): void {
  try { localStorage.removeItem(KEY); } catch { /* تجاهل */ }
  window.dispatchEvent(new Event(DISMISSED_CHANGED));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(DISMISSED_CHANGED, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(DISMISSED_CHANGED, cb);
    window.removeEventListener("storage", cb);
  };
};

export function useDismissed(id: string): boolean {
  return useSyncExternalStore(subscribe, () => isDismissed(id), () => false);
}
