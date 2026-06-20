"use client";
/* ─── زر دويرب العائم الثابت ───
   يظهر في كل الصفحات (Dashboard / Roadmap / Vault / Review).
   يفتح DuirbHub داخل modal كامل الشاشة.
   لا يظهر في الـ onboarding وصفحة admin. */
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import DuirbHub from "@/components/DuirbHub";

const HIDDEN_ON = ["/onboarding", "/admin", "/pricing", "/privacy", "/parent"];

export default function DuirbFloat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  /* يفتح دويرب عند وصول حدث darb:openDuirb (من أي مكان في التطبيق) */
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("darb:openDuirb", handler);
    return () => window.removeEventListener("darb:openDuirb", handler);
  }, []);

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;
  /* لا يظهر في صفحة الهبوط */
  if (pathname === "/") return null;

  const modal = (
    <div className="fixed inset-0 z-[9980] flex flex-col overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="sticky top-0 z-10 px-5 pt-safe pt-4 pb-3 flex items-center gap-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => setOpen(false)}
          className="dome-chip text-[17px] font-bold flex-shrink-0" style={{ color: "var(--text)" }}>
          ← رجوع
        </button>
        <p className="title-lg flex-1 text-right" style={{ color: "var(--text)" }}>دويرب</p>
      </div>
      <div className="px-4 py-4 pb-28 max-w-lg w-full mx-auto">
        <DuirbHub />
      </div>
    </div>
  );

  return (
    <>
      {/* الزر العائم */}
      <button
        onClick={() => setOpen(true)}
        aria-label="فتح دويرب"
        className="fixed z-[9970] flex items-center gap-2 rounded-full px-4 py-3 font-black text-[15px] shadow-2xl transition-transform active:scale-95"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
          left: "16px",
          background: "var(--accent)",
          color: "#fff",
          boxShadow: "0 4px 24px color-mix(in srgb, var(--accent) 45%, transparent)",
        }}>
        <span className="text-[18px]">🤖</span>
        <span>دويرب</span>
      </button>

      {open && createPortal(modal, document.body)}
    </>
  );
}
