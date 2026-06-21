"use client";
import { useState } from "react";
import { loadTheme, applyTheme, type Theme } from "@/lib/storage";

/* ─── مبدّل الوضع الليلي/النهاري — يُستخدم في القبة (Dome) ───
   البروفايل الكامل صار صفحة مستقلة في /profile. */

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window !== "undefined" ? loadTheme() : "dark"
  );

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button onClick={toggle} className={`btn-icon ${className}`} aria-label="تبديل الوضع">
      {theme === "dark" ? "نهار" : "ليل"}
    </button>
  );
}
