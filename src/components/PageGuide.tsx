"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/* ─── تعليمات أول زيارة — تظهر مرة وحدة لكل صفحة ─── */

export type GuideStep = { title: string; desc: string };

const KEY_PREFIX = "darb_guide_";

export default function PageGuide({ pageKey, steps }: { pageKey: string; steps: GuideStep[] }) {
  const [show, setShow] = useState(false);
  const [idx, setIdx] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (!localStorage.getItem(KEY_PREFIX + pageKey)) setShow(true);
    } catch {}
  }, [pageKey]);

  const dismiss = () => {
    try { localStorage.setItem(KEY_PREFIX + pageKey, "1"); } catch {}
    setShow(false);
  };

  const next = () => {
    if (idx + 1 >= steps.length) dismiss();
    else setIdx((i) => i + 1);
  };

  if (!show || !mounted || steps.length === 0) return null;

  const step = steps[idx];
  const last = idx === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={dismiss}>
      <div className="absolute inset-0 bg-black/60 fade-in" />
      <div
        className="relative w-full max-w-lg rounded-t-3xl p-6 pb-9 slide-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* مؤشر الخطوات */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <span key={i} className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? "22px" : "7px",
                  background: i <= idx ? "var(--accent)" : "var(--border)",
                }} />
            ))}
          </div>
          <button onClick={dismiss} className="text-sm font-bold px-3 py-1.5 rounded-xl"
            style={{ color: "var(--text-muted)" }}>
            تخطي
          </button>
        </div>

        <p className="title-md mb-2" style={{ color: "var(--text)" }}>{step.title}</p>
        <p className="text-base leading-relaxed mb-6" style={{ color: "var(--text-dim)" }}>{step.desc}</p>

        <button onClick={next} className="btn-primary glow-blue w-full">
          {last ? "فهمت، يلا" : "التالي ←"}
        </button>
      </div>
    </div>,
    document.body
  );
}
