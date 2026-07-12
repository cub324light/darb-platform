"use client";
/* ─── شارة الرتبة التنافسية — مكوّن عرض موحّد ───
   تُشتق الرتبة من RP عبر محرّك الرتب النقي (مصدر واحد). تُستعمل في الملف
   الشخصي، لوحة الصدارة، المجلس/الدردشة، وقبل/أثناء/بعد مباراة 1v1. */
import { rankFromRP } from "@/lib/rank";

interface Props {
  rp: number;
  size?: "xs" | "sm" | "md" | "lg";
  showRp?: boolean;   // إظهار قيمة RP بجانب الاسم
  showLabel?: boolean; // إظهار اسم الرتبة
}

const SIZES = {
  xs: { pad: "px-1.5 py-0.5", text: "text-[11px]", emoji: "text-[12px]" },
  sm: { pad: "px-2 py-0.5",   text: "text-[14px]", emoji: "text-[15px]" },
  md: { pad: "px-2.5 py-1",   text: "text-[15px]", emoji: "text-[17px]" },
  lg: { pad: "px-3 py-1.5",   text: "text-[17px]", emoji: "text-[20px]" },
};

export default function RankBadge({ rp, size = "sm", showRp = false, showLabel = true }: Props) {
  const r = rankFromRP(rp);
  const s = SIZES[size];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold whitespace-nowrap ${s.pad} ${s.text}`}
      style={{
        background: `color-mix(in srgb, ${r.color} 16%, transparent)`,
        border: `1px solid color-mix(in srgb, ${r.color} 45%, transparent)`,
        color: r.color,
      }}
      title={`${r.label} · ${r.rp} RP`}
    >
      <span className={s.emoji} aria-hidden>{r.emoji}</span>
      {showLabel && <span>{r.label}</span>}
      {showRp && <span className="font-mono-nums opacity-90">{r.rp}</span>}
    </span>
  );
}
