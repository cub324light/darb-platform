"use client";
import { useEffect, useState } from "react";

/* شعار "درب" — يتبع مظهر الموقع تلقائياً:
   ليلي (مظهر داكن) → أزرق متوهّج · نهاري (مظهر فاتح) → ذهبي.
   يقرأ data-theme مباشرةً عبر MutationObserver فلا يمكن أن ينفصل عن الثيم. */
export default function Logo({
  className = "",
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const [day, setDay] = useState(false);

  useEffect(() => {
    const read = () => setDay(document.documentElement.getAttribute("data-theme") === "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const color = day ? "var(--gold)" : "var(--accent-light)";
  const glow = day
    ? "0 0 22px color-mix(in srgb, var(--gold) 48%, transparent)"
    : "0 0 22px color-mix(in srgb, var(--accent-light) 40%, transparent)";

  return (
    <span className={className} style={{ color, textShadow: glow, transition: "color .3s, text-shadow .3s", ...style }}>
      درب
    </span>
  );
}
