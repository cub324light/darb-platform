"use client";
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  className?: string;
  decimalPlaces?: number;
  style?: React.CSSProperties;
}

/* عدّاد خفيف بـ requestAnimationFrame — بلا مكتبة motion، يكتب على textContent
   مباشرةً (لا إعادة رسم React لكل إطار)، ويحترم تقليل الحركة. */
export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  style,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (n: number) =>
      new Intl.NumberFormat("ar-u-nu-latn", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(Number(n.toFixed(decimalPlaces)));

    const from = direction === "down" ? value : 0;
    const to = direction === "down" ? 0 : value;

    const reduce = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { el.textContent = fmt(to); return; }

    el.textContent = fmt(from);
    let raf = 0;
    let startTs = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const DURATION = 900;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = Math.min((ts - startTs) / DURATION, 1);
      el.textContent = fmt(from + (to - from) * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        io.disconnect();
        timer = setTimeout(() => { raf = requestAnimationFrame(step); }, delay * 1000);
      }
    }, { threshold: 0 });
    io.observe(el);

    return () => { io.disconnect(); cancelAnimationFrame(raf); if (timer) clearTimeout(timer); };
  }, [value, direction, delay, decimalPlaces]);

  return <span ref={ref} className={cn("inline-block tabular-nums", className)} style={style} />;
}
