"use client";
import { useState, useEffect } from "react";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import { postSocial } from "@/lib/authFetch";
import { fetchLeaderboard, type LeaderRow } from "@/lib/arena/client";
import RankBadge from "@/components/RankBadge";
import ProfileSocial from "@/components/profile/ProfileSocial";
import { getTrack } from "@/lib/tracks";

type Row = { uid: string; name: string; track: string; value: number };
type Metric = "rp" | "hours" | "streak";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<Metric>("rp");
  const [hours, setHours] = useState<Row[]>([]);
  const [streak, setStreak] = useState<Row[]>([]);
  const [ranked, setRanked] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [social, arena] = await Promise.allSettled([
          postSocial({ mode: "leaderboard" }).then((r) => r.json()),
          fetchLeaderboard(),
        ]);
        if (!alive) return;
        if (social.status === "fulfilled") {
          setHours(social.value.topHours ?? []);
          setStreak(social.value.topStreak ?? []);
        }
        if (arena.status === "fulfilled") setRanked(arena.value.leaderboard ?? []);
        if (social.status === "rejected" && arena.status === "rejected") setErr("تعذّر التحميل");
      } catch { if (alive) setErr("تعذّر الاتصال"); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const rows: Row[] = metric === "rp"
    ? ranked.map((r) => ({ uid: r.uid, name: r.name, track: r.track, value: r.rp }))
    : metric === "hours" ? hours : streak;
  const fmt = (v: number) => metric === "rp" ? `${v} RP` : metric === "hours" ? `${(v / 60).toFixed(1).replace(/\.0$/, "")} س` : `${v} يوم`;

  return (
    <div className="min-h-dvh pb-nav">
      <Dome compact>
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="title-lg grad-title">لوحة الشرف</h1>
        </div>
      </Dome>

      {/* حاوية أوسع على سطح المكتب — الصفوف تبقى صفوفاً */}
      <div className="px-5 py-5 max-w-lg min-[1100px]:max-w-3xl mx-auto flex flex-col gap-4">
        {/* وضعك الاجتماعي — أصدقاؤك وترتيبك ودعوة الأصدقاء (نُقل من البروفايل — موطنه الاجتماعي هنا) */}
        <ProfileSocial />

        {/* مبدّل المقياس */}
        <div className="flex gap-2 p-1 rounded-2xl" style={{ background: "var(--surface)" }}>
          {([["rp", "⚔️ الرتبة"], ["hours", "⏱️ ساعات"], ["streak", "🔥 ستريك"]] as const).map(([m, label]) => (
            <button key={m} onClick={() => setMetric(m)}
              className="flex-1 py-2.5 rounded-xl text-[16px] font-bold text-center transition"
              style={metric === m ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-muted)" }}>
              {label}
            </button>
          ))}
        </div>

        <p className="text-[14px] text-center" style={{ color: "var(--text-muted)" }}>
          تُعرض حسابات الطلاب غير الخاصة فقط. فعّل «بروفايل خاص» من الإعدادات لإخفاء اسمك.
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="inline-block w-7 h-7 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          </div>
        ) : err ? (
          <p className="text-center py-12 text-[16px]" style={{ color: "var(--text-muted)" }}>{err}</p>
        ) : rows.length === 0 ? (
          <p className="text-center py-12 text-[16px]" style={{ color: "var(--text-muted)" }}>لا توجد بيانات بعد — كن أول المتصدّرين!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r, i) => {
              const color = r.track ? getTrack(r.track).color : "var(--accent-light)";
              const top3 = i < 3;
              return (
                <div key={r.uid} className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: top3 ? `color-mix(in srgb, var(--gold) ${9 - i * 2}%, var(--surface))` : "var(--surface)", border: top3 ? "1.5px solid color-mix(in srgb, var(--gold) 35%, transparent)" : "1px solid var(--border)" }}>
                  <span className="w-8 text-center text-[20px] font-black flex-shrink-0" style={{ color: top3 ? "var(--gold)" : "var(--text-muted)" }}>
                    {top3 ? MEDALS[i] : i + 1}
                  </span>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[17px] font-black text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 60%, #fff))` }}>
                    {r.name.charAt(0) || "؟"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[17px] truncate" style={{ color: "var(--text)" }}>{r.name}</p>
                    {metric === "rp"
                      ? <div className="mt-0.5"><RankBadge rp={r.value} size="xs" /></div>
                      : r.track && <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>{r.track}</p>}
                  </div>
                  <span className="font-mono-nums font-black text-[18px] flex-shrink-0" style={{ color: top3 ? "var(--gold)" : "var(--accent-light)" }}>
                    {fmt(r.value)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PageFooter />
    </div>
  );
}
