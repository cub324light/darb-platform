"use client";
import { useState } from "react";
import Link from "next/link";
import Dome from "@/components/Dome";
import BottomNav from "@/components/BottomNav";
import PageFooter from "@/components/PageFooter";
import { getChallengeStates, claimChallenge, type ChallengeState } from "@/lib/challenges";

export default function ChallengesPage() {
  const [states, setStates] = useState<ChallengeState[]>(() => getChallengeStates());
  const [toast, setToast] = useState<string | null>(null);

  const refresh = () => setStates(getChallengeStates());

  const claim = (s: ChallengeState) => {
    if (claimChallenge(s.def)) {
      setToast(`+${s.def.reward} فضة 🎉`);
      setTimeout(() => setToast(null), 2200);
      refresh();
    }
  };

  const weekly = states.filter((s) => s.def.period === "weekly");
  const once = states.filter((s) => s.def.period === "once");

  const card = (s: ChallengeState) => {
    const pct = Math.round((s.current / s.def.goal) * 100);
    const ready = s.done && !s.claimed;
    return (
      <div key={s.def.id} className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: "var(--surface)", border: ready ? "1.5px solid var(--gold)" : "1px solid var(--border)", boxShadow: ready ? "0 0 18px color-mix(in srgb, var(--gold) 22%, transparent)" : "none" }}>
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-[22px] flex-shrink-0"
            style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}>{s.def.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[15px]" style={{ color: "var(--text)" }}>{s.def.title}</p>
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{s.def.desc}</p>
          </div>
          <span className="text-[12px] font-black px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: "color-mix(in srgb, var(--gold) 14%, transparent)", color: "var(--gold)" }}>
            +{s.def.reward} 🪙
          </span>
        </div>
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>{s.current} / {s.def.goal} {s.def.unit}</span>
            {s.claimed && <span className="text-[12px] font-bold" style={{ color: "var(--success)" }}>✓ تم الاستلام</span>}
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: s.done ? "var(--gold)" : "var(--accent)" }} />
          </div>
        </div>
        {ready && (
          <button onClick={() => claim(s)}
            className="w-full py-2.5 rounded-xl font-black text-[14px] transition active:scale-[0.98]"
            style={{ background: "var(--gold)", color: "#1a1205" }}>
            🎁 استلم {s.def.reward} فضة
          </button>
        )}
      </div>
    );
  };

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
          <h1 className="title-lg grad-title">التحديات</h1>
        </div>
      </Dome>

      <div className="px-5 py-5 max-w-lg mx-auto flex flex-col gap-5">
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          أكمل التحديات واكسب فضة. الأسبوعية تتجدّد كل أسبوع.
        </p>

        {weekly.length > 0 && (
          <div>
            <p className="text-[13px] font-black mb-3" style={{ color: "var(--accent-light)" }}>🔄 تحديات أسبوعية</p>
            <div className="flex flex-col gap-3">{weekly.map(card)}</div>
          </div>
        )}

        <div>
          <p className="text-[13px] font-black mb-3" style={{ color: "var(--gold)" }}>🏅 تحديات دائمة</p>
          <div className="flex flex-col gap-3">{once.map(card)}</div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl font-black text-[15px]"
          style={{ background: "var(--gold)", color: "#1a1205" }}>{toast}</div>
      )}

      <PageFooter />
      <BottomNav />
    </div>
  );
}
