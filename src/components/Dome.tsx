"use client";
import { useEffect, useState, type ReactNode } from "react";

/* ─── القبة: سماء محتواة داخل الهيدر — توقيع درب البصري ───
   المحتوى فوقها دائماً (z-2) والزينة خلفه (z-1) داخل حدود القبة فقط،
   فلا تتصادم مع أي عنصر في الصفحة. */

interface Star { left: string; top: string; size: string; opacity: number; duration: string; delay: string; }

export default function Dome({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  const [stars, setStars] = useState<Star[]>([]);
  const [shootKey, setShootKey] = useState(0);

  useEffect(() => {
    setStars(
      Array.from({ length: compact ? 16 : 30 }).map(() => ({
        left: Math.random() * 100 + "%",
        top: Math.random() * 85 + "%",
        size: Math.random() * 1.8 + 1 + "px",
        opacity: Math.random() * 0.5 + 0.2,
        duration: 2 + Math.random() * 4 + "s",
        delay: Math.random() * 4 + "s",
      }))
    );
    const t = setInterval(() => setShootKey((k) => k + 1), 8000);
    return () => clearInterval(t);
  }, [compact]);

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
        {children}
      </div>
    </div>
  );
}
