"use client";
import { useState, useEffect } from "react";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import BottomNav from "@/components/BottomNav";
import PageFooter from "@/components/PageFooter";
import { postSocial } from "@/lib/authFetch";
import { getTrack } from "@/lib/tracks";

type Row = { uid: string; name: string; track: string; value: number };
type Metric = "hours" | "streak";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<Metric>("hours");
  const [hours, setHours] = useState<Row[]>([]);
  const [streak, setStreak] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await postSocial({ mode: "leaderboard" });
        const data = await res.json();
        if (!alive) return;
        if (res.ok) { setHours(data.topHours ?? []); setStreak(data.topStreak ?? []); }
        else setErr(data.error ?? "تعذّر التحميل");
      } catch { if (alive) setErr("تعذّر الاتصال"); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const rows = metric === "hours" ? hours : streak;
  const fmt = (v: number) => metric === "hours" ? `${(v / 60).toFixed(1).replace(/\.0$/, "")} س` : `${v} يوم`;

  return (
    <div className="min-h-dvh pb-nav">
      <Dome compact>
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="title-lg grad-title">لوحة الشرف</h1>
        </div>
      </Dome>

      <div className="px-5 py-5 max-w-lg mx-auto flex flex-col gap-4">
        {/* مبدّل المقياس */}
        <div className="flex gap-2 p-1 rounded-2xl" style={{ background: "var(--surface)" }}>
          {([["hours", "⏱️ أكثر ساعات"], ["streak", "🔥 أعلى ستريك"]] as const).map(([m, label]) => (
            <button key={m} onClick={() => setMetric(m)}
              className="flex-1 py-2.5 rounded-xl text-[14px] font-bold text-center transition"
              style={metric === m ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-muted)" }}>
              {label}
            </button>
          ))}
        </div>

        <p className="text-[12px] text-center" style={{ color: "var(--text-muted)" }}>
          تُعرض حسابات الطلاب غير الخاصة فقط. فعّل «بروفايل خاص» من الإعدادات لإخفاء اسمك.
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="inline-block w-7 h-7 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          </div>
        ) : err ? (
          <p className="text-center py-12 text-[14px]" style={{ color: "var(--text-muted)" }}>{err}</p>
        ) : rows.length === 0 ? (
          <p className="text-center py-12 text-[14px]" style={{ color: "var(--text-muted)" }}>لا توجد بيانات بعد — كن أول المتصدّرين!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r, i) => {
              const color = r.track ? getTrack(r.track).color : "var(--accent-light)";
              const top3 = i < 3;
              return (
                <div key={r.uid} className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: top3 ? `color-mix(in srgb, var(--gold) ${9 - i * 2}%, var(--surface))` : "var(--surface)", border: top3 ? "1.5px solid color-mix(in srgb, var(--gold) 35%, transparent)" : "1px solid var(--border)" }}>
                  <span className="w-8 text-center text-[18px] font-black flex-shrink-0" style={{ color: top3 ? "var(--gold)" : "var(--text-muted)" }}>
                    {top3 ? MEDALS[i] : i + 1}
                  </span>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[15px] font-black text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 60%, #fff))` }}>
                    {r.name.charAt(0) || "؟"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] truncate" style={{ color: "var(--text)" }}>{r.name}</p>
                    {r.track && <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{r.track}</p>}
                  </div>
                  <span className="font-mono-nums font-black text-[16px] flex-shrink-0" style={{ color: top3 ? "var(--gold)" : "var(--accent-light)" }}>
                    {fmt(r.value)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PageFooter />
      <BottomNav />
    </div>
  );
}
