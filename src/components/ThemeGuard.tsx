"use client";
import { useLayoutEffect } from "react";

/* ─── حارس الثيم — يمنع وميض الوضع الخاطئ (No Flash Of Wrong Theme) ───
   سكربت الرأس يضبط data-theme قبل أوّل رسم، لكن هيدرشن React كان يُزيل السمة
   (غير موجودة في HTML الخادم) فيرتدّ للوضع الافتراضي الداكن للحظة. هنا نعيد
   تثبيتها في useLayoutEffect (يعمل بعد الالتزام وقبل الرسم) فلا يظهر أي وميض. */
export default function ThemeGuard() {
  useLayoutEffect(() => {
    try {
      const t = localStorage.getItem("darb_theme") || "dark";
      const el = document.documentElement;
      if (el.getAttribute("data-theme") !== t) el.setAttribute("data-theme", t);
    } catch { /* تجاهل */ }
  });
  return null;
}
