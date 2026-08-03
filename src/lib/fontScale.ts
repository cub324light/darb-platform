"use client";
/* ═══════════ حجمُ الخطّ — مضاعِفٌ عامّ ═══════════
   سلّمُ الخطوط مغلقٌ بـTokens نسبية (rem)، فتغييرُ `font-size` على الجذر يكبّر
   المنتجَ كلَّه بنسبةٍ واحدة بلا كسرِ تناسبٍ ولا زحفِ صفحة — وهذا سببُ اختيار
   السلّم النسبيّ من البداية.

   ثلاثُ درجاتٍ لا شريطٌ متّصل: الطالبُ يريد «أكبر» لا رقماً يعايره.

   قيمةٌ خارجية في `localStorage` تُقرأ بـ`useSyncExternalStore` لا في مُهيّئ
   `useState` — قراءتُها في المُهيّئ تكسر الترطيب (React #418). */
import { useSyncExternalStore } from "react";

export type FontScale = "small" | "normal" | "large";

/** حجمُ الجذر بالبكسل لكلّ درجة — الأساسُ ١٧ كما في `globals.css`. */
export const SCALE_PX: Record<FontScale, number> = { small: 15, normal: 17, large: 19 };
export const SCALE_LABEL: Record<FontScale, string> = { small: "أصغر", normal: "عاديّ", large: "أكبر" };

const KEY = "darb_font_scale";
export const FONT_SCALE_CHANGED = "darb:fontScaleChanged";

export function loadFontScale(): FontScale {
  try {
    const v = localStorage.getItem(KEY);
    return v === "small" || v === "large" ? v : "normal";
  } catch { return "normal"; }
}

export function applyFontScale(v: FontScale): void {
  try {
    localStorage.setItem(KEY, v);
    document.documentElement.style.fontSize = `${SCALE_PX[v]}px`;
  } catch { /* تجاهل */ }
  try { window.dispatchEvent(new Event(FONT_SCALE_CHANGED)); } catch { /* تجاهل */ }
}

const subscribe = (cb: () => void) => {
  window.addEventListener(FONT_SCALE_CHANGED, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(FONT_SCALE_CHANGED, cb);
    window.removeEventListener("storage", cb);
  };
};

export function useFontScale(): FontScale {
  return useSyncExternalStore<FontScale>(subscribe, loadFontScale, () => "normal");
}
