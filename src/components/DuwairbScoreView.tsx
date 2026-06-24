"use client";
/* ─── تقييم دويرب المضغوط ─── للعرض داخل ProgressTool + أي مكان آخر */
import { useMemo } from "react";
import { loadStats } from "@/lib/storage";
import { buildDuwairbProfile } from "@/lib/duwairb";
import { computeDuwairbScore, detectMissedOpportunities, type MissedOpportunity } from "@/lib/coachScore";
import { trackEvent } from "@/lib/events";
import { useEffect, useState } from "react";

const ar = (n: number) => n.toLocaleString("ar");

interface Props {
  /** إن true تُعرض مكوّنات التفصيل؛ false = مضغوط (الرقم فقط مع نقاط القوة/الفجوات) */
  expanded?: boolean;
}

export default function DuwairbScoreView({ expanded = false }: Props) {
  const [show, setShow] = useState(expanded);

  const data = useMemo(() => {
    const stats = loadStats();
    const { profile } = buildDuwairbProfile();
    const readinessPct = profile.readinessPct ?? 0;
    const score = computeDuwairbScore(stats, readinessPct);

    const primaryExam = profile.exams?.[0];
    const weekAgo = Date.now() - 7 * 86_400_000;
    const weeklyStudyMins = Object.entries(stats.dayMins ?? {})
      .filter(([k]) => new Date(k + "T12:00:00").getTime() >= weekAgo)
      .reduce((s, [, v]) => s + v, 0);

    const reviewedCardsCount = (() => {
      try {
        const cards = JSON.parse(localStorage.getItem("darb_cards") ?? "[]") as { repetitions?: number }[];
        return cards.filter((c) => (c.repetitions ?? 0) > 0).length;
      } catch { return 0; }
    })();

    const opps = detectMissedOpportunities(stats, readinessPct, {
      targetScore: primaryExam?.target,
      examName: primaryExam?.name,
      daysRemaining: primaryExam?.days,
      weeklyStudyMins,
      reviewedCardsCount,
    });

    return { score, opps };
  }, []);

  useEffect(() => {
    trackEvent("duwairb_score_viewed");
    if (data.opps.length > 0) trackEvent("missed_opportunity_shown", { count: data.opps.length });
  }, [data.opps.length]);

  const { score, opps } = data;
  const scoreColor =
    score.total >= 75 ? "var(--success)" :
    score.total >= 50 ? "var(--accent-light)" :
    score.total >= 30 ? "var(--gold)" : "var(--danger)";

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

      {/* الرأس: الرقم + زر التفاصيل */}
      <button onClick={() => setShow((v) => !v)}
        className="flex items-center gap-3 w-full text-right"
        aria-expanded={show}>
        <div className="flex-1">
          <p className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>🎯 تقييم دويرب</p>
          <p className="text-[24px] font-black" style={{ color: scoreColor }}>
            {ar(score.total)}<span className="text-[14px] font-semibold" style={{ color: "var(--text-muted)" }}>/100</span>
          </p>
        </div>
        <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
          <circle cx="22" cy="22" r="16" fill="none" stroke="var(--surface2)" strokeWidth="4" />
          <circle cx="22" cy="22" r="16" fill="none" stroke={scoreColor} strokeWidth="4"
            strokeDasharray={`${(score.total / 100) * 100.5} 100.5`}
            strokeLinecap="round" transform="rotate(-90 22 22)" />
        </svg>
        <span className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>{show ? "▲" : "▼"}</span>
      </button>

      {/* تفصيل عند الضغط */}
      {show && (
        <>
          {/* أشرطة التفصيل */}
          <div className="flex flex-col gap-1.5">
            {Object.values(score.components).map((c) => (
              <div key={c.label} className="flex items-center gap-2">
                <p className="text-[11px] font-bold w-20 flex-shrink-0" style={{ color: "var(--text-muted)" }}>{c.label}</p>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(c.score / c.max) * 100}%`, background: "var(--accent)" }} />
                </div>
                <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>{c.score}/{c.max}</p>
              </div>
            ))}
          </div>

          {/* نقاط القوة */}
          {score.strengths.length > 0 && (
            <div className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
              style={{ background: "color-mix(in srgb, var(--success) 7%, transparent)" }}>
              {score.strengths.map((s) => (
                <p key={s} className="text-[12px] font-semibold" style={{ color: "var(--success)" }}>✓ {s}</p>
              ))}
            </div>
          )}

          {/* الفجوات */}
          {score.gaps.length > 0 && (
            <div className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
              style={{ background: "color-mix(in srgb, var(--gold) 7%, transparent)" }}>
              {score.gaps.map((g) => (
                <p key={g} className="text-[12px] font-semibold" style={{ color: "var(--gold)" }}>⚠ {g}</p>
              ))}
            </div>
          )}
        </>
      )}

      {/* فرص ضائعة — تُعرض دائماً (مهمة) */}
      {opps.map((o: MissedOpportunity, i) => (
        <div key={i} className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
          style={{
            background: o.severity === "critical"
              ? "color-mix(in srgb, var(--danger) 7%, transparent)"
              : "color-mix(in srgb, var(--gold) 7%, transparent)",
            border: `1px solid ${o.severity === "critical" ? "color-mix(in srgb, var(--danger) 18%, transparent)" : "color-mix(in srgb, var(--gold) 18%, transparent)"}`,
          }}>
          <p className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{o.message}</p>
          <p className="text-[12px] font-bold" style={{ color: "var(--accent-light)" }}>← {o.solution}</p>
        </div>
      ))}
    </div>
  );
}
