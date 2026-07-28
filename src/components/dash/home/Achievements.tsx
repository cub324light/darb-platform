"use client";
/* ─── 7) الإنجازات — تحفيزٌ يومي من الإحصاءات الحقيقية (قراءةٌ فقط) ───
   الأيام المتتالية · الجلسات · المهام المنجزة · ساعات التركيز. */
import { useState } from "react";
import { loadStats, computeStreak } from "@/lib/storage";
import { loadHomework } from "@/lib/homework";
import { n } from "@/lib/format";

function build() {
  if (typeof window === "undefined") return null;
  const s = loadStats();
  const doneTasks = loadHomework().filter((h) => h.done).length;
  return {
    streak: computeStreak(s),
    sessions: s.sessionsCount ?? 0,
    doneTasks,
    hours: Math.round((s.totalFocusMins ?? 0) / 60),
  };
}

export default function Achievements() {
  const [d] = useState(build);
  if (!d) return null;
  const cards = [
    { icon: "🔥", val: n(d.streak), label: "يوم متتالٍ", tone: "var(--gold)" },
    { icon: "🎯", val: n(d.sessions), label: "جلسة تركيز", tone: "var(--accent-light)" },
    { icon: "✅", val: n(d.doneTasks), label: "مهمة منجزة", tone: "var(--success)" },
    { icon: "⏱️", val: n(d.hours), label: "ساعة دراسة", tone: "var(--accent-2)" },
  ];
  return (
    <section>
      <p className="t-title font-black mb-2.5 px-0.5" style={{ color: "var(--text)" }}>إنجازاتك</p>
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((c) => (
          <div key={c.label} className="ds-card ds-card-tight flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-[22px] flex-shrink-0"
              style={{ background: `color-mix(in srgb, ${c.tone} 15%, transparent)` }}>{c.icon}</span>
            <div className="min-w-0">
              <div className="t-h3 font-black font-mono-nums leading-none" style={{ color: "var(--text)" }}>{c.val}</div>
              <div className="t-caption mt-1" style={{ color: "var(--text-muted)" }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
