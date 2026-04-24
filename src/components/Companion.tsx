"use client";
import { useState, useEffect } from "react";
import type { BirdId } from "@/lib/types";
import { BIRDS } from "@/lib/constants";

interface CompanionProps {
  birdId?: BirdId;
  state?: "idle" | "orbit" | "break" | "streak" | "miss" | "levelup" | "victory";
  message?: string;
  size?: "sm" | "md" | "lg";
  showMessage?: boolean;
}

const BIRD_SVG: Record<BirdId, (color: string) => React.ReactNode> = {
  falcon: (color) => (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="60,10 85,45 75,50 60,30 45,50 35,45" fill={color} opacity="0.9" />
      <polygon points="60,30 75,50 80,75 60,65 40,75 45,50" fill={color} />
      <polygon points="60,65 80,75 70,100 60,90 50,100 40,75" fill={color} opacity="0.8" />
      <circle cx="52" cy="38" r="5" fill="#F1F5F9" />
      <circle cx="53" cy="38" r="2.5" fill="#0A0A0F" />
      <polygon points="60,42 65,45 60,50 55,45" fill={color} opacity="0.7" />
      <polygon points="30,55 15,70 35,65 40,75" fill={color} opacity="0.6" />
      <polygon points="90,55 105,70 85,65 80,75" fill={color} opacity="0.6" />
    </svg>
  ),
  hoopoe: (color) => (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="60,15 70,25 65,20 75,35 60,28 45,35 55,20 50,25" fill={color} />
      <polygon points="60,28 80,50 70,55 60,42 50,55 40,50" fill={color} opacity="0.9" />
      <polygon points="60,42 70,55 75,80 60,70 45,80 50,55" fill={color} />
      <polygon points="60,70 75,80 65,105 60,92 55,105 45,80" fill={color} opacity="0.8" />
      <circle cx="52" cy="40" r="5" fill="#F1F5F9" />
      <circle cx="53" cy="40" r="2.5" fill="#0A0A0F" />
      <polygon points="35,55 20,65 38,63 42,72" fill={color} opacity="0.6" />
      <polygon points="85,55 100,65 82,63 78,72" fill={color} opacity="0.6" />
    </svg>
  ),
  swan: (color) => (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="50" rx="25" ry="35" fill={color} opacity="0.85" />
      <polygon points="60,15 75,35 60,30 45,35" fill={color} />
      <ellipse cx="60" cy="75" rx="30" ry="30" fill={color} opacity="0.7" />
      <circle cx="52" cy="42" r="5" fill="#F1F5F9" />
      <circle cx="53" cy="42" r="2.5" fill="#0A0A0F" />
      <polygon points="25,55 5,60 28,65 30,75" fill={color} opacity="0.5" />
      <polygon points="95,55 115,60 92,65 90,75" fill={color} opacity="0.5" />
      <polygon points="55,45 65,45 60,52" fill={color} opacity="0.6" />
    </svg>
  ),
  raven: (color) => (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="60,12 80,40 70,45 60,28 50,45 40,40" fill={color} />
      <polygon points="60,28 70,45 78,72 60,60 42,72 50,45" fill={color} opacity="0.95" />
      <polygon points="60,60 78,72 68,102 60,88 52,102 42,72" fill={color} opacity="0.85" />
      <circle cx="51" cy="36" r="5.5" fill="#F1F5F9" />
      <circle cx="52" cy="36" r="3" fill="#0A0A0F" />
      <circle cx="52.5" cy="35" r="1" fill="#F1F5F9" />
      <polygon points="28,52 10,68 32,62 36,74" fill={color} opacity="0.7" />
      <polygon points="92,52 110,68 88,62 84,74" fill={color} opacity="0.7" />
      <polygon points="56,44 64,44 60,50" fill="#1A1A2E" />
    </svg>
  ),
  peacock: (color) => (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="60,12 72,35 65,32 78,50 60,42 42,50 55,32 48,35" fill={color} />
      <polygon points="60,42 78,50 80,75 60,65 40,75 42,50" fill={color} opacity="0.9" />
      <polygon points="60,65 80,75 72,100 60,88 48,100 40,75" fill={color} opacity="0.8" />
      <circle cx="51" cy="38" r="5" fill="#F1F5F9" />
      <circle cx="52" cy="38" r="2.5" fill="#0A0A0F" />
      <polygon points="25,55 8,68 30,63 34,74" fill={color} opacity="0.6" />
      <polygon points="95,55 112,68 90,63 86,74" fill={color} opacity="0.6" />
      <circle cx="25" cy="48" r="6" fill={color} opacity="0.4" />
      <circle cx="95" cy="48" r="6" fill={color} opacity="0.4" />
      <circle cx="25" cy="48" r="3" fill={color} opacity="0.7" />
      <circle cx="95" cy="48" r="3" fill={color} opacity="0.7" />
    </svg>
  ),
  phoenix: (color) => (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="60,8 78,30 72,25 85,42 72,38 80,58 60,48 40,58 48,38 35,42 48,25 42,30" fill={color} />
      <polygon points="60,48 80,58 78,82 60,72 42,82 40,58" fill={color} opacity="0.9" />
      <polygon points="60,72 78,82 70,105 60,95 50,105 42,82" fill={color} opacity="0.8" />
      <circle cx="51" cy="35" r="5" fill="#FCD34D" />
      <circle cx="52" cy="35" r="2.5" fill="#0A0A0F" />
      <polygon points="22,50 5,58 25,60 28,70" fill={color} opacity="0.7" />
      <polygon points="98,50 115,58 95,60 92,70" fill={color} opacity="0.7" />
      <line x1="60" y1="8" x2="60" y2="2" stroke="#FCD34D" strokeWidth="2" />
      <line x1="60" y1="8" x2="56" y2="3" stroke="#FCD34D" strokeWidth="1.5" />
      <line x1="60" y1="8" x2="64" y2="3" stroke="#FCD34D" strokeWidth="1.5" />
    </svg>
  ),
};

const STATE_ANIMATION: Record<string, string> = {
  idle: "",
  orbit: "orbit-active",
  break: "animate-bounce",
  streak: "streak-fire",
  miss: "opacity-50 grayscale",
  levelup: "animate-spin",
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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, [message]);

  const sizeMap = { sm: "w-16 h-16", md: "w-24 h-24", lg: "w-36 h-36" };

  const svgEl = BIRD_SVG[birdId]?.(bird.color) ?? BIRD_SVG.falcon(BIRDS[0].color);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizeMap[size]} ${STATE_ANIMATION[state]} transition-all duration-300`}
        style={{ filter: state === "streak" ? `drop-shadow(0 0 12px ${bird.color})` : undefined }}
      >
        {svgEl}
      </div>

      {showMessage && message && (
        <div
          className={`glass rounded-2xl px-4 py-3 max-w-xs text-center text-sm leading-relaxed transition-opacity duration-300 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          style={{ borderColor: bird.color + "44" }}
        >
          <span className="text-[var(--text-dim)]">{message}</span>
        </div>
      )}

      <span className="text-xs text-[var(--text-muted)]">{bird.name}</span>
    </div>
  );
}
