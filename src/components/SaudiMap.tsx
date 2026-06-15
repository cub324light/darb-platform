"use client";
// Saudi Arabia regions map with actual outlines

export const SAUDI_REGIONS = [
  "الرياض", "مكة المكرمة", "المدينة المنورة", "القصيم",
  "المنطقة الشرقية", "عسير", "تبوك", "حائل",
  "الحدود الشمالية", "جازان", "نجران", "الباحة", "الجوف",
];

// Approximate centroids for label placement (in viewBox 560x440)
export const REGION_CENTROIDS: Record<string, [number, number]> = {
  "الجوف":              [110,  75],
  "الحدود الشمالية":   [235,  52],
  "تبوك":              [ 65, 115],
  "حائل":              [240, 130],
  "المدينة المنورة":   [100, 175],
  "القصيم":            [250, 165],
  "الرياض":            [305, 235],
  "المنطقة الشرقية":  [405, 195],
  "مكة المكرمة":       [ 95, 260],
  "الباحة":            [125, 310],
  "عسير":              [130, 340],
  "نجران":             [245, 365],
  "جازان":             [105, 375],
};

interface SaudiMapProps {
  regionCounts?: Record<string, number>; // e.g. { "الرياض": 5, "مكة المكرمة": 2 }
  className?: string;
}

export default function SaudiMap({ regionCounts = {}, className = "" }: SaudiMapProps) {
  const maxCount = Math.max(1, ...Object.values(regionCounts));

  return (
    <svg viewBox="0 0 560 440" className={className} style={{ direction: "ltr" }}>
      {/* Base outline of Saudi Arabia */}
      <path
        d="M 145,62 L 195,50 L 258,40 L 310,42 L 365,52 L 425,78 L 460,108 L 475,140 L 478,175 L 468,215 L 458,248 L 452,295 L 445,340 L 430,380 L 390,415 L 345,425 L 295,425 L 240,420 L 190,408 L 158,390 L 138,368 L 115,345 L 100,318 L 88,295 L 78,260 L 68,225 L 62,185 L 65,150 L 72,118 L 85,92 L 110,72 Z"
        fill="var(--surface2)"
        stroke="var(--border)"
        strokeWidth="2"
      />

      {/* Internal borders */}
      {/* Al-Jouf / Northern Borders border */}
      <line x1="195" y1="50" x2="200" y2="110" stroke="var(--border)" strokeWidth="1" opacity="0.7"/>
      {/* Northern Borders / Hail border */}
      <line x1="258" y1="40" x2="250" y2="140" stroke="var(--border)" strokeWidth="1" opacity="0.7"/>
      {/* Tabuk / Medina border */}
      <line x1="72" y1="118" x2="155" y2="175" stroke="var(--border)" strokeWidth="1" opacity="0.7"/>
      {/* Hail / Qassim border */}
      <line x1="250" y1="140" x2="260" y2="190" stroke="var(--border)" strokeWidth="1" opacity="0.7"/>
      {/* Qassim / Riyadh border */}
      <line x1="260" y1="190" x2="280" y2="280" stroke="var(--border)" strokeWidth="1" opacity="0.7"/>
      {/* Eastern Province border (left edge) */}
      <line x1="365" y1="52" x2="360" y2="300" stroke="var(--border)" strokeWidth="1" opacity="0.7"/>
      {/* Mecca / Medina border */}
      <line x1="78" y1="225" x2="155" y2="230" stroke="var(--border)" strokeWidth="1" opacity="0.7"/>
      {/* Aseer / Mecca border */}
      <line x1="100" y1="295" x2="200" y2="310" stroke="var(--border)" strokeWidth="1" opacity="0.7"/>
      {/* Aseer / Baha border */}
      <line x1="115" y1="345" x2="185" y2="340" stroke="var(--border)" strokeWidth="1" opacity="0.7"/>
      {/* Aseer / Najran border */}
      <line x1="200" y1="340" x2="280" y2="370" stroke="var(--border)" strokeWidth="1" opacity="0.7"/>
      {/* Jizan area border */}
      <line x1="115" y1="345" x2="160" y2="395" stroke="var(--border)" strokeWidth="1" opacity="0.7"/>

      {/* Region heatmap circles — for regions with count > 0 */}
      {Object.entries(REGION_CENTROIDS).map(([name, [cx, cy]]) => {
        const count = regionCounts[name] ?? 0;
        const intensity = count > 0 ? 0.2 + 0.8 * (count / maxCount) : 0;

        if (count === 0) return null;

        return (
          <g key={name}>
            <circle cx={cx} cy={cy} r={12 + count * 2}
              fill={`color-mix(in srgb, var(--accent) ${Math.round(intensity * 70)}%, transparent)`}
              opacity={0.5}
            />
            <circle cx={cx} cy={cy} r={8}
              fill="var(--accent)"
              opacity={0.9}
            />
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fontWeight="bold" fill="white">
              {count}
            </text>
          </g>
        );
      })}

      {/* Small dots for all region centroids with 0 count */}
      {Object.entries(REGION_CENTROIDS).map(([name, [cx, cy]]) => {
        const count = regionCounts[name] ?? 0;
        if (count > 0) return null; // already drawn above
        return (
          <circle key={name} cx={cx} cy={cy} r={3}
            fill="var(--border)"
            opacity={0.5}
          />
        );
      })}
    </svg>
  );
}
