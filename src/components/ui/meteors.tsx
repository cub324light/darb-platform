"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Meteor {
  id: number;
  top: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
}

interface MeteorsProps {
  number?: number;
  className?: string;
}

export function Meteors({ number = 12, className }: MeteorsProps) {
  const [meteors, setMeteors] = useState<Meteor[]>([]);

  useEffect(() => {
    setMeteors(
      Array.from({ length: number }, (_, i) => ({
        id: i,
        top: Math.floor(Math.random() * 100),
        left: Math.floor(Math.random() * 100),
        delay: Math.random() * 8,
        duration: 3 + Math.random() * 4,
        size: 0.5 + Math.random() * 1,
      })),
    );
  }, [number]);

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {meteors.map((m) => (
        <span
          key={m.id}
          className="absolute animate-meteor"
          style={{
            top: `${m.top}%`,
            left: `${m.left}%`,
            width: `${120 + m.size * 60}px`,
            height: `${m.size}px`,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.duration}s`,
            background: `linear-gradient(90deg, var(--accent-hi), transparent)`,
            borderRadius: "9999px",
            opacity: 0.25,
            transform: "rotate(-35deg)",
          }}
        />
      ))}
    </div>
  );
}
