"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import { skillsForTracks, groupedSkills, type GlobalSkill } from "@/lib/globalSkills";
import {
  loadSkillProgress, setSkillSelfAssessment, skillTier, weakestSkillIds,
  overallStats, type SkillProgress, type SkillTier,
} from "@/lib/skillProgress";
import { loadUser, type DarbUser } from "@/lib/storage";
import type { TrackId } from "@/lib/tracks";

const TIER_CONFIG: Record<SkillTier, { label: string; color: string; bg: string }> = {
  strong: { label: "قوي",      color: "#10B981", bg: "color-mix(in srgb, #10B981 14%, transparent)" },
  medium: { label: "متوسط",    color: "#F59E0B", bg: "color-mix(in srgb, #F59E0B 14%, transparent)" },
  weak:   { label: "ضعيف",     color: "#EF4444", bg: "color-mix(in srgb, #EF4444 14%, transparent)" },
  new:    { label: "لم يُقيَّم", color: "var(--text-muted)", bg: "var(--surface)" },
};

const LEVEL_LABELS: Record<string, string> = { none: "لا أعرفها", partial: "أعرفها نسبياً", mastered: "أتقنها" };
const LEVEL_SCORES: Record<string, number> = { none: 15, partial: 50, mastered: 85 };

/* ── بطاقة مهارة واحدة ── */
function SkillCard({
  skill,
  progress,
  onRate,
}: {
  skill: GlobalSkill;
  progress: SkillProgress | undefined;
  onRate: (skillId: string, level: "none" | "partial" | "mastered") => void;
}) {
  const [open, setOpen] = useState(false);
  const score = progress?.masteryScore ?? 0;
  const hasData = !!progress;
  const tier = skillTier(score, hasData);
  const { color, bg, label } = TIER_CONFIG[tier];

  return (
    <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: bg, border: `1.5px solid ${hasData ? color : "var(--border)"}` }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-[13px] font-bold truncate" style={{ color: "var(--text)" }}>{skill.name}</span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{skill.domain}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold" style={{ color }}>{hasData ? `${score}%` : label}</span>
          <button
            onClick={() => setOpen((p) => !p)}
            className="rounded-xl px-2 py-1 text-[11px] font-bold transition active:scale-95"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
            {open ? "إغلاق" : "قيّم"}
          </button>
        </div>
      </div>

      {/* شريط التقدم */}
      {hasData && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${score}%`, background: color }} />
        </div>
      )}

      {/* أزرار التقييم الذاتي */}
      {open && (
        <div className="flex gap-1.5 mt-1">
          {(["none", "partial", "mastered"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => { onRate(skill.id, lvl); setOpen(false); }}
              className="flex-1 rounded-xl py-1.5 text-[11px] font-bold transition active:scale-95 text-center"
              style={{
                background: progress?.masteryScore === LEVEL_SCORES[lvl] ? color : "var(--surface)",
                border: `1px solid ${color}`,
                color: progress?.masteryScore === LEVEL_SCORES[lvl] ? "#fff" : color,
              }}>
              {LEVEL_LABELS[lvl]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SkillsPage() {
  const [user] = useState<DarbUser | null>(() =>
    typeof window !== "undefined" ? loadUser() : null
  );
  const [progress, setProgress] = useState<Record<string, SkillProgress>>(() =>
    typeof window !== "undefined" ? loadSkillProgress() : {}
  );

  const activeIds = useMemo<TrackId[]>(() => {
    if (!user) return ["تحصيلي"] as TrackId[];
    const ids = (user.activeTracks?.length ? user.activeTracks : user.track ? [user.track] : []) as TrackId[];
    return ids.length ? ids : (["تحصيلي"] as TrackId[]);
  }, [user]);

  const skills = useMemo(() => skillsForTracks(activeIds), [activeIds]);
  const grouped = useMemo(() => groupedSkills(skills), [skills]);
  const stats = useMemo(() => overallStats(progress, skills.map((s) => s.id)), [progress, skills]);
  const weakIds = useMemo(() => weakestSkillIds(progress, skills.map((s) => s.id), 3), [progress, skills]);

  const handleRate = (skillId: string, level: "none" | "partial" | "mastered") => {
    setSkillSelfAssessment(skillId, level);
    setProgress(loadSkillProgress());
  };

  const weakSkills = weakIds.map((id) => skills.find((s) => s.id === id)).filter(Boolean) as GlobalSkill[];

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--bg)" }}>
      <Dome compact>
        <div className="flex items-center gap-3">
          <Link href="/roadmap" className="rounded-full p-1.5 transition active:scale-95" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </Link>
          <div>
            <h1 className="text-[20px] font-black text-white">خريطة مهاراتي</h1>
            <p className="text-[12px] text-white/70">{activeIds.join(" · ")}</p>
          </div>
        </div>
      </Dome>

      <div className="px-5 flex flex-col gap-5">
        {/* إحصائيات إجمالية */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "قوي",   value: stats.strong,    color: "#10B981" },
            { label: "متوسط", value: stats.medium,    color: "#F59E0B" },
            { label: "ضعيف",  value: stats.weak,      color: "#EF4444" },
            { label: "جديد",  value: stats.newSkills, color: "var(--text-muted)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl p-3 text-center flex flex-col gap-0.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-[22px] font-black font-mono-nums" style={{ color }}>{value}</span>
              <span className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* شريط التقدم الإجمالي */}
        {stats.avgScore > 0 && (
          <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex justify-between items-center">
              <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>متوسط الإتقان</span>
              <span className="text-[18px] font-black font-mono-nums" style={{ color: stats.avgScore >= 70 ? "#10B981" : stats.avgScore >= 40 ? "#F59E0B" : "#EF4444" }}>
                {stats.avgScore}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${stats.avgScore}%`,
                  background: stats.avgScore >= 70 ? "#10B981" : stats.avgScore >= 40 ? "#F59E0B" : "#EF4444",
                }} />
            </div>
          </div>
        )}

        {/* توصيات الدراسة */}
        {weakSkills.length > 0 && (
          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1.5px solid var(--accent)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[16px]">🎯</span>
              <span className="text-[14px] font-black" style={{ color: "var(--accent-light)" }}>ركّز عليها اليوم</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {weakSkills.map((s) => {
                const p = progress[s.id];
                const tier = skillTier(p?.masteryScore ?? 0, !!p);
                const { color } = TIER_CONFIG[tier];
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: "var(--surface)" }}>
                    <div>
                      <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>{s.name}</span>
                      <span className="text-[11px] mr-2" style={{ color: "var(--text-muted)" }}>{s.category}</span>
                    </div>
                    <span className="text-[12px] font-bold" style={{ color }}>
                      {p ? `${p.masteryScore}%` : "جديدة"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* تعليمات التقييم */}
        <div className="rounded-2xl p-3 flex items-start gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <span className="text-[15px] mt-0.5">💡</span>
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            اضغط «قيّم» على أي مهارة لتحديد مستواك فيها. تُحفَظ التقييمات وتتزامن سحابياً ليراها دويرب ويخصّص توصياتك.
          </p>
        </div>

        {/* المهارات مجمّعة حسب الفئة */}
        {grouped.map(({ category, domains }) => (
          <div key={category} className="flex flex-col gap-3">
            <h2 className="text-[15px] font-black" style={{ color: "var(--text)" }}>{category}</h2>
            {domains.map(({ domain, skills: ds }) => (
              <div key={domain} className="flex flex-col gap-2">
                <p className="text-[12px] font-bold px-1" style={{ color: "var(--accent-light)" }}>{domain}</p>
                <div className="flex flex-col gap-2">
                  {ds.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      progress={progress[skill.id]}
                      onRate={handleRate}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        {skills.length === 0 && (
          <div className="rounded-2xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>لا توجد مهارات لمساراتك الحالية</p>
            <Link href="/roadmap" className="mt-3 inline-block text-[13px] font-bold" style={{ color: "var(--accent)" }}>
              اختر مساراً أولاً
            </Link>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
