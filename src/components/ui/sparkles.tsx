"use client";
import React, { useEffect, useId, useState } from "react";
import { motion } from "motion/react";
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

export function Sparkles({
  className,
  color = "var(--accent-hi)",
  count = 20,
  minSize = 1,
  maxSize = 3,
}: SparklesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const id = useId();

  useEffect(() => {
    const generated: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: minSize + Math.random() * (maxSize - minSize),
      opacity: 0.3 + Math.random() * 0.7,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 4,
    }));
    setParticles(generated);
  }, [count, minSize, maxSize]);

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {particles.map((p) => (
        <motion.span
          key={`${id}-${p.id}`}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: color,
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
          }}
          animate={{ opacity: [0, p.opacity, 0], scale: [0, 1, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
