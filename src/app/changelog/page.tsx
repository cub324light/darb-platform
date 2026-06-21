"use client";
import Link from "next/link";
import Dome from "@/components/Dome";
import BottomNav from "@/components/BottomNav";
import { CHANGELOG, CHANGE_META } from "@/lib/changelog";

function fmtDate(d: string): string {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  } catch { return d; }
}

export default function ChangelogPage() {
  return (
    <div className="min-h-dvh pb-nav">
      <Dome compact>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="rounded-full p-1.5 transition active:scale-95"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </Link>
          <h1 className="title-lg grad-title">آخر التحديثات</h1>
        </div>
      </Dome>

      <div className="px-5 py-5 max-w-lg mx-auto flex flex-col gap-5">
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          نطوّر درب باستمرار. هذي أبرز الإضافات والتحسينات والإصلاحات.
        </p>

        {CHANGELOG.map((entry) => (
          <div key={entry.date} className="rounded-2xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-baseline justify-between mb-3">
              <p className="font-black text-[16px]" style={{ color: "var(--text)" }}>{entry.title ?? "تحديث"}</p>
              <span className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>{fmtDate(entry.date)}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {entry.changes.map((c, i) => {
                const m = CHANGE_META[c.type];
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md flex-shrink-0 mt-0.5"
                      style={{ background: `color-mix(in srgb, ${m.color} 14%, transparent)`, color: m.color, border: `1px solid ${m.color}55` }}>
                      {m.icon} {m.label}
                    </span>
                    <span className="text-[14px] leading-relaxed" style={{ color: "var(--text)" }}>{c.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
