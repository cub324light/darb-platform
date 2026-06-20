"use client";
/* ─── زر دويرب العائم — محور المنصة ───
   يظهر في كل الصفحات ويفتح DuirbHub (الوجهة الموحّدة لكل ذكاء).
   اختصارات سياقية تفتحه على قدرة محددة عبر darb:openDuirb { detail:{ tab } }. */
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import DuirbHub, { type DuirbView } from "@/components/DuirbHub";

const HIDDEN_ON = ["/onboarding", "/admin", "/pricing", "/privacy", "/parent"];

export default function DuirbFloat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<DuirbView>("menu");

  /* فتح دويرب — مع دعم قدرة محددة عبر detail.tab (وإلا القائمة الرئيسية) */
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab as DuirbView | undefined;
      setView(tab ?? "menu");
      setOpen(true);
    };
    window.addEventListener("darb:openDuirb", handler);
    return () => window.removeEventListener("darb:openDuirb", handler);
  }, []);

  /* اختصار قديم: فتح على تبويب تحليل الملف */
  useEffect(() => {
    const handler = () => { setView("file"); setOpen(true); };
    window.addEventListener("darb:openDuirbFile", handler);
    return () => window.removeEventListener("darb:openDuirbFile", handler);
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
        <DuirbHub defaultView={view} />
      </div>
    </div>
  );

  return (
    <>
      {/* الزر العائم — بارز مع حلقة نبض تجذب الانتباه */}
      <button
        onClick={() => { setView("menu"); setOpen(true); }}
        aria-label="افتح دويرب — مساعدك الذكي"
        className="duirb-fab fixed z-[9970] flex items-center gap-2 rounded-full px-5 py-3.5 font-black text-[16px] transition-transform active:scale-95"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)",
          left: "16px",
          background: "linear-gradient(135deg, var(--accent), var(--accent-hi))",
          color: "#fff",
          boxShadow: "0 6px 28px color-mix(in srgb, var(--accent) 55%, transparent)",
        }}>
        <span className="duirb-fab-ping" aria-hidden="true" />
        <span className="text-[20px] relative">🤖</span>
        <span className="relative">اسأل دويرب</span>
      </button>

      {open && createPortal(modal, document.body)}
    </>
  );
}
