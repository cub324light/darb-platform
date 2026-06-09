"use client";
import { useState, useEffect, startTransition } from "react";
import type { BirdId } from "@/lib/types";
import { BIRDS } from "@/lib/constants";

interface CompanionProps {
  birdId?: BirdId;
  state?: "idle" | "orbit" | "break" | "streak" | "miss" | "levelup" | "victory";
  message?: string;
  size?: "sm" | "md" | "lg";
  showMessage?: boolean;
}

/* ─── Geometric low-poly birds ─── */
function FalconSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <polygon points="50,20 68,38 62,62 50,68 38,62 32,38" fill={color} opacity="0.95"/>
      {/* Head */}
      <polygon points="50,14 62,24 50,32 38,24" fill={color}/>
      {/* Wing L */}
      <polygon points="32,38 14,52 20,65 38,56 38,62" fill={color} opacity="0.85"/>
      {/* Wing R */}
      <polygon points="68,38 86,52 80,65 62,56 62,62" fill={color} opacity="0.85"/>
      {/* Tail */}
      <polygon points="44,68 50,85 56,68" fill={color} opacity="0.7"/>
      <polygon points="40,70 44,88 50,75" fill={color} opacity="0.5"/>
      <polygon points="60,70 56,88 50,75" fill={color} opacity="0.5"/>
      {/* Eye white */}
      <circle cx="45" cy="26" r="5.5" fill="white"/>
      {/* Eye pupil */}
      <circle cx="44" cy="26" r="3" fill="#0A0A12"/>
      {/* Eye shine */}
      <circle cx="43" cy="24.5" r="1.2" fill="white"/>
      {/* Beak */}
      <polygon points="50,30 44,34 50,38 53,33" fill="#D97706"/>
      {/* Chest highlight */}
      <polygon points="50,32 58,44 50,54 42,44" fill="white" opacity="0.08"/>
      {/* Claw hints */}
      <line x1="44" y1="84" x2="40" y2="90" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      <line x1="50" y1="85" x2="50" y2="92" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      <line x1="56" y1="84" x2="60" y2="90" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}

function HoopoeSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Crest feathers */}
      <polygon points="42,16 44,6 48,14" fill={color} opacity="0.9"/>
      <polygon points="48,14 50,4 52,14" fill={color}/>
      <polygon points="52,14 56,7 58,16" fill={color} opacity="0.9"/>
      {/* Orange crest tips */}
      <circle cx="44" cy="6" r="2" fill="#F59E0B"/>
      <circle cx="50" cy="4" r="2.5" fill="#F59E0B"/>
      <circle cx="56" cy="7" r="2" fill="#F59E0B"/>
      {/* Head */}
      <polygon points="50,14 63,22 58,34 50,36 42,34 37,22" fill={color}/>
      {/* Body */}
      <polygon points="50,36 65,46 62,65 50,70 38,65 35,46" fill={color} opacity="0.9"/>
      {/* Wing L */}
      <polygon points="35,46 16,55 22,68 38,60 38,65" fill={color} opacity="0.8"/>
      {/* Wing R */}
      <polygon points="65,46 84,55 78,68 62,60 62,65" fill={color} opacity="0.8"/>
      {/* Tail */}
      <polygon points="44,70 48,86 52,70" fill={color} opacity="0.7"/>
      {/* Eye white */}
      <circle cx="44" cy="25" r="5" fill="white"/>
      <circle cx="43.5" cy="25" r="2.8" fill="#0A0A12"/>
      <circle cx="42.5" cy="23.5" r="1.1" fill="white"/>
      {/* Beak — long & curved */}
      <path d="M50,32 Q54,36 56,42" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Chest pattern */}
      <polygon points="50,38 58,50 50,58 42,50" fill="white" opacity="0.1"/>
      <polygon points="50,46 55,52 50,58 45,52" fill="#F59E0B" opacity="0.2"/>
    </svg>
  );
}

function SwanSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Long neck */}
      <path d="M50,55 Q44,42 46,28 Q48,18 52,16" stroke={color} strokeWidth="10" strokeLinecap="round" fill="none"/>
      {/* Head */}
      <ellipse cx="54" cy="14" rx="10" ry="8" fill={color}/>
      {/* Body large */}
      <ellipse cx="52" cy="70" rx="26" ry="20" fill={color} opacity="0.9"/>
      {/* Wing layer */}
      <ellipse cx="52" cy="68" rx="22" ry="15" fill="white" opacity="0.12"/>
      {/* Wing feathers */}
      <polygon points="28,62 12,58 18,75 32,72" fill={color} opacity="0.75"/>
      <polygon points="76,62 88,58 82,75 68,72" fill={color} opacity="0.75"/>
      {/* Tail */}
      <polygon points="46,88 52,96 58,88 52,84" fill={color} opacity="0.7"/>
      {/* Eye */}
      <circle cx="58" cy="13" r="4.5" fill="white"/>
      <circle cx="57.5" cy="13" r="2.5" fill="#0A0A12"/>
      <circle cx="56.5" cy="11.8" r="1" fill="white"/>
      {/* Beak — orange flat */}
      <polygon points="64,12 72,14 64,17" fill="#F97316"/>
      <line x1="64" y1="14.5" x2="71" y2="14.5" stroke="#C2410C" strokeWidth="0.8"/>
    </svg>
  );
}

function RavenSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <polygon points="50,22 70,40 66,65 50,72 34,65 30,40" fill={color}/>
      {/* Head */}
      <polygon points="50,16 64,24 58,36 50,38 42,36 36,24" fill={color}/>
      {/* Large wings spread */}
      <polygon points="30,40 8,30 6,55 24,62 34,58" fill={color} opacity="0.88"/>
      <polygon points="70,40 92,30 94,55 76,62 66,58" fill={color} opacity="0.88"/>
      {/* Wing fold */}
      <polygon points="8,30 6,55 24,62 20,45" fill="white" opacity="0.05"/>
      {/* Tail forked */}
      <polygon points="44,72 46,90 52,78" fill={color} opacity="0.8"/>
      <polygon points="56,72 54,90 48,78" fill={color} opacity="0.8"/>
      {/* Eye — larger mysterious */}
      <circle cx="44" cy="27" r="6" fill="#1E1030"/>
      <circle cx="44" cy="27" r="3.5" fill="white" opacity="0.15"/>
      <circle cx="44" cy="27" r="5" fill={color} opacity="0.3"/>
      <circle cx="44.5" cy="27" r="2" fill="white" opacity="0.8"/>
      {/* Beak — sharp hooked */}
      <polygon points="50,34 43,39 50,43 54,38" fill="#94A3B8"/>
      {/* Shine on body */}
      <polygon points="50,38 60,50 54,64 50,66" fill="white" opacity="0.06"/>
    </svg>
  );
}

function PeacockSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tail fan decorative circles */}
      <circle cx="50" cy="80" r="22" fill={color} opacity="0.08"/>
      <circle cx="50" cy="80" r="16" fill={color} opacity="0.1"/>
      {/* Tail feather lines */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => (
        <line key={i}
          x1="50" y1="65"
          x2={50 + 22 * Math.cos((deg * Math.PI) / 180)}
          y2={65 + 22 * Math.sin((deg * Math.PI) / 180)}
          stroke={color} strokeWidth="1.2" opacity="0.4"
        />
      ))}
      {/* Tail eye spots */}
      {[0, 72, 144, 216, 288].map((deg, i) => (
        <circle key={i}
          cx={50 + 18 * Math.cos(((deg - 90) * Math.PI) / 180)}
          cy={65 + 18 * Math.sin(((deg - 90) * Math.PI) / 180)}
          r="3" fill="#F59E0B" opacity="0.6"
        />
      ))}
      {/* Body */}
      <polygon points="50,22 65,38 60,60 50,65 40,60 35,38" fill={color} opacity="0.95"/>
      {/* Head */}
      <polygon points="50,14 62,22 56,32 50,34 44,32 38,22" fill={color}/>
      {/* Crown */}
      <polygon points="46,14 48,6 50,12" fill="#F59E0B" opacity="0.9"/>
      <polygon points="50,12 52,4 54,14" fill="#F59E0B"/>
      <circle cx="48" cy="6" r="1.5" fill="#FCD34D"/>
      <circle cx="52" cy="4" r="1.5" fill="#FCD34D"/>
      {/* Eye */}
      <circle cx="44" cy="23" r="5.5" fill="white"/>
      <circle cx="43.5" cy="23" r="3" fill="#0A0A12"/>
      <circle cx="42.5" cy="21.5" r="1.2" fill="white"/>
      {/* Beak */}
      <polygon points="50,30 43,34 50,37 53,33" fill="#D97706"/>
      {/* Chest gem */}
      <polygon points="50,36 56,44 50,50 44,44" fill="#F59E0B" opacity="0.3"/>
    </svg>
  );
}

function PhoenixSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Flame aura */}
      <ellipse cx="50" cy="75" rx="30" ry="18" fill="#F59E0B" opacity="0.12"/>
      <ellipse cx="50" cy="78" rx="22" ry="12" fill="#EF4444" opacity="0.1"/>
      {/* Flame tail feathers */}
      <path d="M42,65 Q35,78 30,90" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
      <path d="M47,67 Q44,82 42,94" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
      <path d="M53,67 Q56,82 58,94" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
      <path d="M58,65 Q65,78 70,90" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
      {/* Wings spread large */}
      <polygon points="30,38 6,20 10,50 28,56 38,48" fill={color} opacity="0.9"/>
      <polygon points="70,38 94,20 90,50 72,56 62,48" fill={color} opacity="0.9"/>
      {/* Wing flame tips */}
      <polygon points="6,20 4,10 12,20" fill="#F59E0B" opacity="0.7"/>
      <polygon points="94,20 96,10 88,20" fill="#F59E0B" opacity="0.7"/>
      {/* Body */}
      <polygon points="50,18 66,34 62,58 50,65 38,58 34,34" fill={color}/>
      {/* Chest glow */}
      <polygon points="50,36 60,48 50,58 40,48" fill="#F59E0B" opacity="0.25"/>
      {/* Head */}
      <polygon points="50,10 64,18 58,30 50,32 42,30 36,18" fill={color}/>
      {/* Crown flames */}
      <polygon points="44,10 42,2 47,8" fill="#F59E0B"/>
      <polygon points="50,8 50,0 54,8" fill="#FCD34D"/>
      <polygon points="56,10 58,2 53,8" fill="#F59E0B"/>
      {/* Eye — golden */}
      <circle cx="44" cy="20" r="6" fill="#FCD34D"/>
      <circle cx="44" cy="20" r="3.5" fill="#92400E"/>
      <circle cx="42.5" cy="18.5" r="1.4" fill="white"/>
      {/* Beak sharp */}
      <polygon points="50,28 42,33 50,38 55,32" fill="#D97706"/>
    </svg>
  );
}

const BIRD_SVG: Record<BirdId, (color: string) => React.ReactNode> = {
  falcon:  (c) => <FalconSVG  color={c} />,
  hoopoe:  (c) => <HoopoeSVG  color={c} />,
  swan:    (c) => <SwanSVG    color={c} />,
  raven:   (c) => <RavenSVG   color={c} />,
  peacock: (c) => <PeacockSVG color={c} />,
  phoenix: (c) => <PhoenixSVG color={c} />,
};

const STATE_WRAPPER: Record<string, React.CSSProperties> = {
  idle:    {},
  orbit:   { filter: "drop-shadow(0 0 12px var(--blue))" },
  break:   {},
  streak:  { filter: "drop-shadow(0 0 16px #F59E0B)" },
  miss:    { opacity: 0.45, filter: "grayscale(0.8)" },
  levelup: {},
  victory: { filter: "drop-shadow(0 0 20px #F59E0B)" },
};

const STATE_ANIM: Record<string, string> = {
  idle:    "",
  orbit:   "orbit-active",
  break:   "animate-bounce",
  streak:  "streak-fire",
  miss:    "",
  levelup: "scale-in",
  victory: "animate-pulse",
};

export default function Companion({
  birdId = "falcon",
  state = "idle",
  message,
  size = "md",
  showMessage = true,
}: CompanionProps) {
  const bird = BIRDS.find((b) => b.id === birdId) ?? BIRDS[0];
  const [msgVisible, setMsgVisible] = useState(false);

  useEffect(() => {
    startTransition(() => setMsgVisible(false));
    const t = setTimeout(() => startTransition(() => setMsgVisible(true)), 120);
    return () => clearTimeout(t);
  }, [message]);

  const sizePx = { sm: 64, md: 96, lg: 140 }[size];
  const svgEl = BIRD_SVG[birdId]?.(bird.color) ?? BIRD_SVG.falcon(BIRDS[0].color);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Bird container */}
      <div
        className={`transition-all duration-300 ${STATE_ANIM[state]}`}
        style={{ width: sizePx, height: sizePx, ...STATE_WRAPPER[state] }}
      >
        {svgEl}
      </div>

      {/* Message bubble */}
      {showMessage && message && (
        <div
          className="rounded-2xl px-5 py-3 max-w-[260px] text-center transition-all duration-300"
          style={{
            background: "var(--surface)",
            border: `1px solid ${bird.color}40`,
            opacity: msgVisible ? 1 : 0,
            transform: msgVisible ? "translateY(0)" : "translateY(6px)",
          }}
        >
          <p className="text-sm text-[var(--text-dim)] leading-relaxed">{message}</p>
        </div>
      )}

      <p className="text-xs font-semibold text-[var(--text-muted)]">{bird.name}</p>
    </div>
  );
}
