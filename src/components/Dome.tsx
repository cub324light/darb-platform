"use client";
import { useEffect, useState, useRef, type ReactNode } from "react";
import ProfileButton, { ThemeToggle } from "@/components/Profile";
import SettingsButton from "@/components/SettingsPanel";

/* ── ساعة صغيرة مع إعدادات 12/24 ── */
function ClockWidget() {
  const [time, setTime] = useState("");
  const [fmt, setFmt] = useState<"12" | "24">(() =>
    typeof window !== "undefined" ? (localStorage.getItem("darb_clock_fmt") as "12" | "24" ?? "12") : "12"
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: fmt === "12" }));
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, [fmt]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const setFormat = (f: "12" | "24") => { setFmt(f); localStorage.setItem("darb_clock_fmt", f); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 rounded-xl text-[13px] font-bold tabular-nums"
        style={{ background: "color-mix(in srgb, var(--text-muted) 10%, transparent)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
        {time}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-[99] rounded-xl shadow-xl flex flex-col overflow-hidden"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)", minWidth: "120px" }}>
          {(["12", "24"] as const).map((f) => (
            <button key={f} onClick={() => setFormat(f)}
              className="px-4 py-2.5 text-[13px] font-bold text-right transition hover:brightness-110"
              style={{ background: fmt === f ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
                       color: fmt === f ? "var(--accent-light)" : "var(--text-dim)" }}>
              {f === "12" ? "12 ساعة (ص/م)" : "24 ساعة"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── القبة: سماء محتواة داخل الهيدر — توقيع درب البصري ───
   المحتوى فوقها دائماً (z-2) والزينة خلفه (z-1) داخل حدود القبة فقط،
   فلا تتصادم مع أي عنصر في الصفحة. */

interface Star { left: string; top: string; size: string; opacity: number; duration: string; delay: string; }

export default function Dome({
  children,
  compact = false,
  hideControls = false,
}: {
  children: ReactNode;
  compact?: boolean;
  hideControls?: boolean;
}) {
  const [stars] = useState<Star[]>(() =>
    Array.from({ length: compact ? 16 : 30 }).map(() => ({
      left: Math.random() * 100 + "%",
      top: Math.random() * 85 + "%",
      size: Math.random() * 1.8 + 1 + "px",
      opacity: Math.random() * 0.5 + 0.2,
      duration: 2 + Math.random() * 4 + "s",
      delay: Math.random() * 4 + "s",
    }))
  );
  const [shootKey, setShootKey] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setShootKey((k) => k + 1), 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="dome">
      {/* ── الزينة (خلف المحتوى، داخل القبة فقط) ── */}
      <div className="dome-decor" aria-hidden="true">
        {/* الليلي */}
        <div className="dome-night">
          {stars.map((s, i) => (
            <span key={i} className="dome-star"
              style={{ left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.opacity, animationDuration: s.duration, animationDelay: s.delay }} />
          ))}
          <svg className="dome-moon" viewBox="0 0 64 64" fill="none">
            <defs>
              <radialGradient id="dmGlow" cx="50%" cy="50%" r="50%">
                <stop offset="55%" stopColor="#FCD34D" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#FCD34D" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="32" cy="32" r="30" fill="url(#dmGlow)" />
            <path d="M40 12a20 20 0 1 0 10 36 16 16 0 1 1-10-36z" fill="#FCD34D" opacity="0.9" />
          </svg>
          <span key={shootKey} className="dome-shooting" />
        </div>

        {/* النهاري */}
        <div className="dome-day">
          <svg className="dome-sun" viewBox="0 0 80 80" fill="none">
            <defs>
              <radialGradient id="dsGlow" cx="50%" cy="50%" r="50%">
                <stop offset="38%" stopColor="#F59E0B" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="40" cy="40" r="38" fill="url(#dsGlow)" />
            <circle cx="40" cy="40" r="14" fill="#F59E0B" opacity="0.95" />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * Math.PI) / 4;
              return (
                <line key={i}
                  x1={40 + Math.cos(a) * 19} y1={40 + Math.sin(a) * 19}
                  x2={40 + Math.cos(a) * 26} y2={40 + Math.sin(a) * 26}
                  stroke="#F59E0B" strokeWidth="3.4" strokeLinecap="round" opacity="0.8" />
              );
            })}
          </svg>
          <span className="dome-cloud dome-cloud-1" />
          {!compact && <span className="dome-cloud dome-cloud-2" />}
          <svg className="dome-flock" viewBox="0 0 120 30" fill="none">
            {[[14, 12],[36, 19],[58, 9],[80, 16],[102, 11]].map(([x, y], i) => (
              <path key={i}
                d={`M${x - 5},${y} Q${x - 1.5},${y - 4.5} ${x},${y} Q${x + 1.5},${y - 4.5} ${x + 5},${y}`}
                stroke="#7A5A1E" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            ))}
          </svg>
        </div>
      </div>

      {/* ── المحتوى ── */}
      <div className="dome-content" style={{ padding: compact ? "calc(18px + env(safe-area-inset-top)) 18px 16px" : "calc(26px + env(safe-area-inset-top)) 18px 22px" }}>
        {!hideControls && (
          <div className="flex justify-end items-center gap-2 mb-3">
            <ClockWidget />
            <ThemeToggle className="" />
            <ProfileButton />
            <SettingsButton />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
