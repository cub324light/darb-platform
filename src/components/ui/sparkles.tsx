"use client";
import React, { useId, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

interface SparklesProps {
  className?: string;
  color?: string;
  count?: number;
  minSize?: number;
  maxSize?: number;
}

const FIELDS = new Map<string, Particle[]>();
const fieldFor = (count: number, minSize: number, maxSize: number): Particle[] => {
  const key = `${count}|${minSize}|${maxSize}`;
  let f = FIELDS.get(key);
  if (!f) {
    f = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: minSize + Math.random() * (maxSize - minSize),
      opacity: 0.3 + Math.random() * 0.7,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 4,
    }));
    FIELDS.set(key, f);
  }
  return f;
};

const EMPTY: Particle[] = [];
const noop = () => () => {};

/* جسيمات متلألئة — CSS خالص (بلا motion) لتقليل الحزمة وتكلفة المعالج */
export function Sparkles({
  className,
  color = "var(--accent-hi)",
  count = 20,
  minSize = 1,
  maxSize = 3,
}: SparklesProps) {
  const id = useId();
  /* كالشُّهب: حقلٌ يُولَّد مرّةً ويُحفظ، فلا يُعاد رصفُه كلّما رُكِّب المكوّن */
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const particles = mounted ? fieldFor(count, minSize, maxSize) : EMPTY;

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {particles.map((p) => (
        <span
          key={`${id}-${p.id}`}
          className="sparkle-dot absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: color,
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            ["--sparkle-op" as string]: p.opacity,
          }}
        />
      ))}
    </div>
  );
}
