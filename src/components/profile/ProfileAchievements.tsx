"use client";
/* ─── الإنجازات — نسبة الإكمال + شبكة الشارات + تفصيل التقدّم ───
   يعيد استخدام BADGE_DEFS و getBadgeCurrent (لا منطق مكرّر). */
import { memo, useState } from "react";
import { BADGE_DEFS, getBadgeCurrent } from "@/lib/xp";
import type { DarbStats } from "@/lib/storage";

interface Props {
  unlockedIds: Set<string>;
  stats: DarbStats;
  vaultCount: number;
}

function Ring({ pct }: { pct: number }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="flex-shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--gold)" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} transform="rotate(-90 32 32)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x="32" y="37" textAnchor="middle" className="font-mono-nums font-black" fontSize="16" fill="var(--text)">{pct}%</text>
    </svg>
  );
}

function ProfileAchievementsBase({ unlockedIds, stats, vaultCount }: Props) {
  const [openBadge, setOpenBadge] = useState<string | null>(null);
  const total = BADGE_DEFS.length;
  const earned = BADGE_DEFS.filter((b) => unlockedIds.has(b.id)).length;
  const pct = Math.round((earned / total) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* ملخص الإكمال */}
      <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <Ring pct={pct} />
        <div className="flex-1 min-w-0">
          <p className="font-black text-[17px]" style={{ color: "var(--text)" }}>{earned.toLocaleString("ar")} من {total.toLocaleString("ar")} شارة</p>
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            {earned === 0 ? "ابدأ رحلتك — أول شارة على بُعد جلسة واحدة." : earned === total ? "أكملت كل الشارات! أسطورة 🏆" : "استمر — كل إنجاز يقرّبك للاكتمال."}
          </p>
        </div>
      </div>

      {/* شبكة الشارات */}
      <div>
        <p className="text-[12px] mb-3 px-1" style={{ color: "var(--text-muted)" }}>اضغط أي شارة لتعرف كيف تكسبها وكم بقي عليك</p>
        <div className="grid grid-cols-3 gap-2">
          {BADGE_DEFS.map((b) => {
            const unlocked = unlockedIds.has(b.id);
            const isOpen = openBadge === b.id;
            return (
              <button key={b.id} onClick={() => setOpenBadge(isOpen ? null : b.id)} aria-label={b.label} aria-expanded={isOpen}
                className="relative rounded-2xl p-3 flex flex-col items-center gap-1 text-center transition active:scale-[0.97]"
                style={{
                  background: unlocked ? "color-mix(in srgb, var(--accent) 10%, var(--surface2))" : "var(--surface2)",
                  border: `1.5px solid ${isOpen ? "var(--accent)" : unlocked ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "var(--border)"}`,
                  opacity: unlocked ? 1 : 0.5,
                }}>
                <span className="text-2xl">{b.icon}</span>
                <p className="text-[12px] font-bold leading-tight" style={{ color: unlocked ? "var(--text)" : "var(--text-muted)" }}>{b.label}</p>
              </button>
            );
          })}
        </div>

        {openBadge && (() => {
          const active = BADGE_DEFS.find((b) => b.id === openBadge)!;
          const activeUnlocked = unlockedIds.has(active.id);
          const current = getBadgeCurrent(active.id, stats, vaultCount);
          const p = Math.min(100, Math.round((current / active.goal) * 100));
          return (
            <div className="rounded-2xl px-4 py-4 mt-3" style={{ background: "var(--surface2)", border: "1.5px solid var(--accent)" }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{active.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[15px]" style={{ color: "var(--text)" }}>{active.label}</p>
                  <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>{active.desc}</p>
                </div>
                {activeUnlocked && (
                  <span className="text-[12px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                    style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent-light)" }}>✓ مكتملة</span>
                )}
              </div>
              <div className="w-full rounded-full h-2.5 overflow-hidden mb-1.5" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: activeUnlocked ? "var(--gold)" : "var(--accent)" }} />
              </div>
              <p className="font-mono-nums text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>
                {Math.min(current, active.goal).toLocaleString("ar")} / {active.goal.toLocaleString("ar")} {active.unit}
                {!activeUnlocked && current < active.goal && (<span> — بقي {(active.goal - current).toLocaleString("ar")} {active.unit}</span>)}
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default memo(ProfileAchievementsBase);
