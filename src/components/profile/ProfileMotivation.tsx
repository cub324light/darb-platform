"use client";
/* ─── بطاقة التحفيز — اقتباس اليوم + هدف الأسبوع + التقدّم لأقرب شارة/مستوى ─── */
import { memo } from "react";
import type { Level } from "@/lib/xp";
import type { WeeklyReportData } from "@/lib/weeklyReport";

export interface NextBadgeInfo { label: string; icon: string; current: number; goal: number; pct: number; unit: string; }

interface Props {
  quote: string;
  weekly: WeeklyReportData | null;
  level: Level & { next?: Level; progress: number };
  nextBadge: NextBadgeInfo | null;
}

const WEEKLY_GOAL_DAYS = 5;

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "var(--border)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

function ProfileMotivationBase({ quote, weekly, level, nextBadge }: Props) {
  const activeDays = weekly?.activeDays ?? 0;
  const weekPct = Math.min(100, Math.round((activeDays / WEEKLY_GOAL_DAYS) * 100));

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* اقتباس اليوم */}
      <div className="rounded-2xl px-4 py-3.5" style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)" }}>
        <p className="text-[11px] font-bold mb-1" style={{ color: "var(--accent-light)" }}>✨ اقتباس اليوم</p>
        <p className="text-[14px] leading-relaxed font-semibold" style={{ color: "var(--text)" }}>“{quote}”</p>
      </div>

      {/* هدف الأسبوع */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>🎯 هدف الأسبوع</span>
          <span className="font-mono-nums text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>
            {activeDays.toLocaleString("ar")} / {WEEKLY_GOAL_DAYS.toLocaleString("ar")} أيام
          </span>
        </div>
        <MiniBar pct={weekPct} color="var(--success)" />
        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
          {activeDays >= WEEKLY_GOAL_DAYS ? "أنجزت هدف الأسبوع! 🎉" : `بقي ${(WEEKLY_GOAL_DAYS - activeDays).toLocaleString("ar")} يوم نشط لإكمال هدفك`}
        </p>
      </div>

      {/* التقدّم لأقرب شارة */}
      {nextBadge && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-bold flex items-center gap-1.5" style={{ color: "var(--text)" }}>
              <span>{nextBadge.icon}</span> أقرب شارة: {nextBadge.label}
            </span>
            <span className="font-mono-nums text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>{nextBadge.pct}%</span>
          </div>
          <MiniBar pct={nextBadge.pct} color="var(--gold)" />
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            بقي {(nextBadge.goal - nextBadge.current).toLocaleString("ar")} {nextBadge.unit}
          </p>
        </div>
      )}

      {/* التقدّم للمستوى التالي */}
      {level.next && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-bold flex items-center gap-1.5" style={{ color: "var(--text)" }}>
              <span>{level.next.icon}</span> المستوى التالي: {level.next.name}
            </span>
            <span className="font-mono-nums text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>{level.progress}%</span>
          </div>
          <MiniBar pct={level.progress} color={level.color} />
        </div>
      )}
    </div>
  );
}

export default memo(ProfileMotivationBase);
