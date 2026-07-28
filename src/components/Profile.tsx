"use client";
import { applyTheme } from "@/lib/storage";
import { useTheme } from "@/lib/useTheme";

/* ─── مبدّل الوضع الليلي/النهاري — يُستخدم في القبة (Dome) ───
   البروفايل الكامل صار صفحة مستقلة في /profile.
   القراءة من `useTheme` (المصدر الواحد) والكتابة بـ`applyTheme`. */

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme();

  const toggle = () => applyTheme(theme === "dark" ? "light" : "dark");

  return (
    <button onClick={toggle} className={`btn-icon ${className}`} aria-label="تبديل الوضع">
      {theme === "dark" ? "نهار" : "ليل"}
    </button>
  );
}
