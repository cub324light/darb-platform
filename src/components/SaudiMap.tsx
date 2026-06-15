"use client";
// توزيع الطلاب على مناطق المملكة — مربعات نصية لكل منطقة

export const SAUDI_REGIONS = [
  "الرياض", "مكة المكرمة", "المنطقة الشرقية", "المدينة المنورة",
  "القصيم", "عسير", "تبوك", "حائل",
  "جازان", "نجران", "الباحة", "الجوف", "الحدود الشمالية",
];

interface SaudiMapProps {
  regionCounts?: Record<string, number>; // مثال: { "الرياض": 5, "مكة المكرمة": 2 }
  className?: string;
}

export default function SaudiMap({ regionCounts = {}, className = "" }: SaudiMapProps) {
  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {SAUDI_REGIONS.map((name) => {
        const count = regionCounts[name] ?? 0;
        const active = count > 0;
        return (
          <div
            key={name}
            className="rounded-2xl px-2.5 py-3 flex flex-col items-center justify-center gap-1 text-center"
            style={{
              background: active
                ? "color-mix(in srgb, var(--accent) 12%, var(--surface2))"
                : "var(--surface2)",
              border: `1.5px solid ${
                active
                  ? "color-mix(in srgb, var(--accent) 45%, transparent)"
                  : "var(--border)"
              }`,
            }}
          >
            <p
              className="text-[12px] font-bold leading-tight"
              style={{ color: active ? "var(--text)" : "var(--text-muted)" }}
            >
              {name}
            </p>
            <p
              className="font-mono-nums text-[15px] font-black leading-none"
              style={{ color: active ? "var(--accent-light)" : "var(--text-muted)" }}
            >
              {active ? count : "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
