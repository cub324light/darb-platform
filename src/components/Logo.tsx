"use client";
import { useEffect, useState } from "react";
import { loadLogoMode, type LogoMode } from "@/lib/storage";

/* شعار "درب" بنسختين: ليلي (أزرق متوهّج) ونهاري (ذهبي).
   يتحدّث فوراً عند تبديل النمط من البروفايل. */
export default function Logo({
  className = "",
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const [mode, setMode] = useState<LogoMode>("night");

  useEffect(() => {
    setMode(loadLogoMode());
    const onChange = (e: Event) => setMode((e as CustomEvent).detail as LogoMode);
    window.addEventListener("darb-logo", onChange);
    return () => window.removeEventListener("darb-logo", onChange);
  }, []);

  const day = mode === "day";
  const color = day ? "var(--gold)" : "var(--accent-light)";
  const glow = day
    ? "0 0 22px color-mix(in srgb, var(--gold) 45%, transparent)"
    : "0 0 22px color-mix(in srgb, var(--accent-light) 40%, transparent)";

  return (
    <span className={className} style={{ color, textShadow: glow, transition: "color .3s, text-shadow .3s", ...style }}>
      درب
    </span>
  );
}
