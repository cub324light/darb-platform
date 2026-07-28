"use client";
/* ─── خلاصة الأرقام — صف مضغوط يتصدّر «نظرة عامة» ───
   عرض فقط (props): الأرقام مشتقّة من statsData في الصفحة الأم — لا حسابات جديدة.
   يعيد استخدام hoursLabel من ProfileStats (لا منطق تنسيق مكرّر). */
import { memo } from "react";
import { hoursLabel, type StatsData } from "./ProfileStats";
import { n } from "@/lib/format";

/* يكفيه جزء من StatsData — نفس المصدر بلا اشتقاق إضافي */
export type QuickStatsData = Pick<StatsData, "currentStreak" | "focusMins" | "sessions" | "skillAvg">;

function ProfileQuickStatsBase({ data, onOpenStats }: { data: QuickStatsData; onOpenStats: () => void }) {
  const hrs = hoursLabel(data.focusMins);
  const tiles = [
    { icon: "🔥", val: n(data.currentStreak), label: "ستريك اليوم" },
    { icon: "⏱", val: hrs.val, label: hrs.unit === "ساعة" ? "ساعة تركيز" : "دقيقة تركيز" },
    { icon: "✅", val: n(data.sessions), label: "جلسة" },
    ...(data.skillAvg !== null ? [{ icon: "🧠", val: `${data.skillAvg}%`, label: "متوسط الإتقان" }] : []),
  ];

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="label">أرقامك الآن</p>
        <button onClick={onOpenStats} className="text-[14px] font-bold transition active:scale-95"
          style={{ color: "var(--accent-light)" }}>
          كل الإحصائيات ←
        </button>
      </div>
      <ul className={`grid ${tiles.length === 4 ? "grid-cols-4" : "grid-cols-3"} gap-2 list-none m-0 p-0`}
        aria-label="خلاصة أرقامك">
        {tiles.map((t) => (
          <li key={t.label} className="rounded-xl px-1.5 py-2.5 text-center min-w-0"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <p className="text-[17px] leading-none mb-1" aria-hidden="true">{t.icon}</p>
            <p className="font-mono-nums font-black text-[17px] leading-none" style={{ color: "var(--text)" }}>{t.val}</p>
            <p className="text-[12px] font-semibold mt-1" style={{ color: "var(--text-muted)" }}>{t.label}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default memo(ProfileQuickStatsBase);
