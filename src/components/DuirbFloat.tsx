"use client";
/* ─── زر دويرب العائم — محور المنصة ───
   يظهر في كل الصفحات ويفتح DuirbHub (الوجهة الموحّدة لكل ذكاء).
   اختصارات سياقية تفتحه على قدرة محددة عبر darb:openDuirb { detail:{ tab } }. */
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { type DuirbView } from "@/components/DuirbHub";
import { suggestedTabForPath, contextHintForPath } from "@/lib/duwairb";
import { trackEvent } from "@/lib/events";

/* تحميل دويرب عند فتحه فقط — يبعد قدراته الخمس (وStorage) عن حزمة كل صفحة */
const DuirbHub = dynamic(() => import("@/components/DuirbHub"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16">
      <span className="inline-block w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
    </div>
  ),
});

const HIDDEN_ON = ["/onboarding", "/admin", "/pricing", "/privacy", "/parent"];

export default function DuirbFloat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<DuirbView>("menu");

  /* فتح دويرب — مع دعم قدرة محددة عبر detail.tab (وإلا حسب سياق الصفحة) */
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab as DuirbView | undefined;
      const next = tab ?? suggestedTabForPath(pathname);
      setView(next);
      setOpen(true);
      trackEvent("duwairb_opened", { source: tab ? "shortcut" : "event", tab: next, path: pathname });
    };
    window.addEventListener("darb:openDuirb", handler);
    return () => window.removeEventListener("darb:openDuirb", handler);
  }, [pathname]);

  /* اختصار قديم: فتح على تبويب تحليل الملف */
  useEffect(() => {
    const handler = () => { setView("file"); setOpen(true); };
    window.addEventListener("darb:openDuirbFile", handler);
    return () => window.removeEventListener("darb:openDuirbFile", handler);
  }, []);

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;
  /* لا يظهر في صفحة الهبوط */
  if (pathname === "/") return null;

  const hint = contextHintForPath(pathname);
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
        {hint && (
          <p className="text-[12.5px] font-semibold mb-3 px-1" style={{ color: "var(--text-muted)" }}>💡 {hint}</p>
        )}
        <DuirbHub defaultView={view} />
      </div>
    </div>
  );

  return (
    <>
      {/* الزر العائم — دائري صغير وشفاف بلون الصفحة، لا يحجب المحتوى */}
      <button
        onClick={() => {
          const next = suggestedTabForPath(pathname);
          setView(next);
          setOpen(true);
          trackEvent("duwairb_opened", { source: "fab", tab: next, path: pathname });
        }}
        aria-label="افتح دويرب — مساعدك الذكي"
        className="duirb-fab fixed z-[9970] flex items-center justify-center rounded-full transition-transform active:scale-95"
        style={{
          width: "52px",
          height: "52px",
          background: "color-mix(in srgb, var(--accent) 28%, transparent)",
          color: "var(--accent-light)",
          border: "1.5px solid color-mix(in srgb, var(--accent) 45%, transparent)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: "0 4px 16px color-mix(in srgb, var(--accent) 28%, transparent)",
        }}>
        <span className="text-[24px] relative leading-none">🤖</span>
      </button>

      {open && createPortal(modal, document.body)}
    </>
  );
}
