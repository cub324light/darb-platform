"use client";
/* ─── تقرير أسبوعي — يظهر في الرئيسية والملف الشخصي ─── */
import { useState } from "react";
import { loadStats, loadSessionLog } from "@/lib/storage";
import { computeWeeklyReport, fmtMins, type WeeklyReportData } from "@/lib/weeklyReport";

export default function WeeklyReport({ compact = false }: { compact?: boolean }) {
  const [r] = useState<WeeklyReportData | null>(() => {
    if (typeof window === "undefined") return null;
    return computeWeeklyReport(loadStats(), loadSessionLog());
  });

  if (!r) return null;

  if (!r.hasData) {
    return (
      <div className="rounded-2xl p-5 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-[16px] font-bold" style={{ color: "var(--text-muted)" }}>تقريرك الأسبوعي يبدأ بأول جلسة</p>
        <p className="text-[15px] mt-1" style={{ color: "var(--text-dim)" }}>ابدأ جلسة أوربت ونبني لك ملخّص أسبوعك.</p>
      </div>
    );
  }

  const up = r.deltaPct !== null && r.deltaPct >= 0;
  const deltaColor = r.deltaPct === null ? "var(--text-muted)" : up ? "var(--success)" : "#EF4444";

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <p className="title-md" style={{ color: "var(--text)" }}>📊 تقرير أسبوعك</p>
        {r.deltaPct !== null && (
          <span className="text-[14px] font-black px-2.5 py-1 rounded-lg"
            style={{ background: `color-mix(in srgb, ${deltaColor} 14%, transparent)`, color: deltaColor }}>
            {up ? "▲" : "▼"} {Math.abs(r.deltaPct)}% عن الأسبوع السابق
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          { val: fmtMins(r.mins), label: "مذاكرة", color: "var(--accent-light)" },
          { val: r.sessions,      label: "جلسة",   color: "var(--gold)" },
          { val: r.streak,        label: "ستريك",  color: r.streak > 0 ? "var(--gold-light)" : "var(--text-muted)" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl py-3 text-center" style={{ background: "var(--surface2)" }}>
            <p className="font-mono-nums font-black text-[23px] leading-tight" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[14px] font-bold mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {!compact && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[15px]" style={{ color: "var(--text-muted)" }}>أيام نشطة:</span>
            <div className="flex gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={i} className="w-3.5 h-3.5 rounded-md"
                  style={{ background: i < r.activeDays ? "var(--accent)" : "var(--surface2)", border: "1px solid var(--border)" }} />
              ))}
            </div>
            <span className="text-[15px] font-bold mr-auto" style={{ color: "var(--text)" }}>{r.activeDays}/7</span>
          </div>

          {(r.topSubject || r.lowSubject) && (
            <div className="flex flex-col gap-2">
              {r.topSubject && (
                <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                  <span className="text-[15px] font-bold" style={{ color: "var(--text)" }}>🔝 الأكثر مذاكرة</span>
                  <span className="text-[15px] font-bold" style={{ color: "var(--accent-light)" }}>{r.topSubject.name} · {fmtMins(r.topSubject.mins)}</span>
                </div>
              )}
              {r.lowSubject && (
                <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                  <span className="text-[15px] font-bold" style={{ color: "var(--text)" }}>📉 الأقل مذاكرة</span>
                  <span className="text-[15px] font-bold" style={{ color: "#F59E0B" }}>{r.lowSubject.name} · {fmtMins(r.lowSubject.mins)}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
