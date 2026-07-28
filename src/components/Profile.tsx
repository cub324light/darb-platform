"use client";
import { useSyncExternalStore } from "react";
import { loadTheme, applyTheme, THEME_CHANGED, type Theme } from "@/lib/storage";

/* ─── مبدّل الوضع الليلي/النهاري — يُستخدم في القبة (Dome) ───
   البروفايل الكامل صار صفحة مستقلة في /profile. */

/* الثيم قيمةٌ خارجية (localStorage) تختلف بين الخادم والعميل، وكانت تُقرأ في مُهيّئ
   `useState`: الخادم يرسم «نهار» والعميل يرسم «ليل» فينكسر الترطيب (React #418) في كل
   صفحةٍ عامّة مُسبقة التوليد. `useSyncExternalStore` هي أداةُ React لهذا بالضبط —
   لقطةٌ خادميّة ثابتة ثم إعادةُ رسمٍ صامتة بقيمة العميل، بلا خطأ وبلا وميض. */
const subscribeTheme = (cb: () => void) => {
  window.addEventListener(THEME_CHANGED, cb);
  return () => window.removeEventListener(THEME_CHANGED, cb);
};

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore<Theme>(subscribeTheme, loadTheme, () => "dark");

  const toggle = () => applyTheme(theme === "dark" ? "light" : "dark");

  return (
    <button onClick={toggle} className={`btn-icon ${className}`} aria-label="تبديل الوضع">
      {theme === "dark" ? "نهار" : "ليل"}
    </button>
  );
}
