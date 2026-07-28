"use client";
/* ─── الإنجازات — نسبة الإكمال + شبكة الشارات + تفصيل التقدّم ───
   يعيد استخدام BADGE_DEFS و getBadgeCurrent (لا منطق مكرّر). */
import { memo, useState } from "react";
import { BADGE_DEFS, getBadgeCurrent } from "@/lib/xp";
import type { DarbStats } from "@/lib/storage";
import { n } from "@/lib/format";

interface Props {
  unlockedIds: Set<string>;
  stats: DarbStats;
  vaultCount: number;
}

function Ring({ pct }: { pct: number }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="flex-shrink-0"
      role="img" aria-label={`اكتملت ${pct}٪ من الشارات`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--gold)" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} transform="rotate(-90 32 32)"
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x="32" y="37" textAnchor="middle" className="font-mono-nums font-black" fontSize="16" fill="var(--text)" aria-hidden="true">{pct}%</text>
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
          <p className="font-black text-[19px]" style={{ color: "var(--text)" }}>{n(earned)} من {n(total)} شارة</p>
          <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>
            {earned === 0 ? "ابدأ رحلتك — أول شارة على بُعد جلسة واحدة." : earned === total ? "أكملت كل الشارات! أسطورة 🏆" : "استمر — كل إنجاز يقرّبك للاكتمال."}
          </p>
        </div>
      </div>

      {/* شبكة الشارات */}
      <div>
        <p className="text-[14px] mb-3 px-1" style={{ color: "var(--text-muted)" }}>اضغط أي شارة لتعرف كيف تكسبها وكم بقي عليك</p>
        <div className="grid grid-cols-3 gap-2">
          {BADGE_DEFS.map((b) => {
            const unlocked = unlockedIds.has(b.id);
            const isOpen = openBadge === b.id;
            return (
              <button key={b.id} onClick={() => setOpenBadge(isOpen ? null : b.id)} aria-label={b.label} aria-expanded={isOpen}
                className={`relative rounded-2xl p-3 flex flex-col items-center gap-1 text-center transition active:scale-[0.97]${unlocked ? " badge-glow" : ""}`}
                style={{
                  background: unlocked ? "color-mix(in srgb, var(--gold) 8%, var(--surface2))" : "var(--surface2)",
                  border: `1.5px solid ${isOpen ? "var(--accent)" : unlocked ? "color-mix(in srgb, var(--gold) 45%, transparent)" : "var(--border)"}`,
                  opacity: unlocked ? 1 : 0.48,
                }}>
                <span className="text-2xl" aria-hidden="true">{b.icon}</span>
                <p className="text-[14px] font-bold leading-tight" style={{ color: unlocked ? "var(--text)" : "var(--text-muted)" }}>{b.label}</p>
                {unlocked && <span className="absolute top-1.5 left-1.5 text-[11px] leading-none" aria-hidden="true">✓</span>}
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
                  <p className="font-black text-[17px]" style={{ color: "var(--text)" }}>{active.label}</p>
                  <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>{active.desc}</p>
                </div>
                {activeUnlocked && (
                  <span className="text-[14px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                    style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent-light)" }}>✓ مكتملة</span>
                )}
              </div>
              <div className="w-full rounded-full h-2.5 overflow-hidden mb-1.5" style={{ background: "var(--border)" }}
                role="progressbar" aria-label={`تقدّم شارة ${active.label}`} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: activeUnlocked ? "var(--gold)" : "var(--accent)" }} />
              </div>
              <p className="font-mono-nums text-[15px] font-bold" style={{ color: "var(--text-muted)" }}>
                {n(Math.min(current, active.goal))} / {n(active.goal)} {active.unit}
                {!activeUnlocked && current < active.goal && (<span> — بقي {n(active.goal - current)} {active.unit}</span>)}
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default memo(ProfileAchievementsBase);
