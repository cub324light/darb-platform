"use client";
/* ─── الإنجازات — أربعٌ وعشرون شارة على ثلاث درجات، ولكلٍّ فضّتُها ───
   يعيد استخدام BADGE_DEFS و getBadgeCurrent (لا منطق مكرّر). والفضةُ تُصرف مرّةً
   واحدة عند أول فتحٍ للصفحة بعد استحقاقها — `badgeRewards` وحدها تعرف من صُرف. */
import { memo, useEffect, useState } from "react";
import { BADGE_DEFS, getBadgeCurrent, badgesInTier, TIER_META, type BadgeTier, type BadgeDef } from "@/lib/xp";
import { claimBadgeSilver, labelsOf } from "@/lib/badgeRewards";
import type { DarbStats } from "@/lib/storage";
import { n } from "@/lib/format";

interface Props {
  unlockedIds: Set<string>;
  stats: DarbStats;
  vaultCount: number;
}

const TIERS: BadgeTier[] = ["easy", "mid", "hard"];

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
  const [claimed, setClaimed] = useState<{ ids: string[]; silver: number } | null>(null);

  /* الصرفُ في أثرٍ لا في الرسم: الرسمُ يجب أن يبقى بلا آثارٍ جانبية.
     ومؤجَّلٌ خطوةً بعد الرسم الأول — الحالةُ المضبوطة داخل الأثر مباشرةً تُسلسل
     رسماتٍ متتالية (يرصدها React Compiler). */
  useEffect(() => {
    const t = setTimeout(() => {
      const r = claimBadgeSilver(vaultCount);
      if (r.ids.length) setClaimed(r);
    }, 0);
    return () => clearTimeout(t);
  }, [vaultCount]);

  const total = BADGE_DEFS.length;
  const earned = BADGE_DEFS.filter((b) => unlockedIds.has(b.id)).length;
  const pct = Math.round((earned / total) * 100);
  /* ما بقي من فضّةٍ في الشارات — رقمٌ يدفعه دفعاً حقيقياً */
  const leftSilver = BADGE_DEFS.filter((b) => !unlockedIds.has(b.id)).reduce((s, b) => s + b.silver, 0);

  return (
    <div className="flex flex-col gap-4">
      {claimed && (
        <div className="rounded-2xl p-4 rise flex items-start gap-3"
          style={{ background: "color-mix(in srgb, var(--gold) 12%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--gold) 40%, var(--border))" }}>
          <span className="text-[22px] flex-shrink-0" aria-hidden="true">🎉</span>
          <p className="t-body font-black flex-1 min-w-0 leading-relaxed" style={{ color: "var(--text)" }}>
            {claimed.ids.length === 1 ? "فتحتَ شارة " : "فتحتَ شارات "}
            «{labelsOf(claimed.ids).join("» · «")}» — <span className="font-mono-nums">+{n(claimed.silver)}</span> فضة في محفظتك.
          </p>
          <button onClick={() => setClaimed(null)} className="t-caption font-bold px-2" style={{ color: "var(--text-muted)" }}>✕</button>
        </div>
      )}

      {/* ملخص الإكمال */}
      <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <Ring pct={pct} />
        <div className="flex-1 min-w-0">
          <p className="font-black t-h3" style={{ color: "var(--text)" }}>{n(earned)} من {n(total)} شارة</p>
          <p className="t-small" style={{ color: "var(--text-muted)" }}>
            {earned === total
              ? "أكملت كل الشارات! أسطورة 🏆"
              : <>باقٍ فيها <span className="font-mono-nums font-black" style={{ color: "var(--gold)" }}>{n(leftSilver)}</span> فضة تُصرف في المتجر.</>}
          </p>
        </div>
      </div>

      {/* الشبكة — مقسّمةٌ بالدرجة: يعرف أين يبدأ وأين ينتهي */}
      <p className="t-caption px-1" style={{ color: "var(--text-muted)" }}>اضغط أي شارة لتعرف كيف تكسبها وكم بقي عليك</p>

      {TIERS.map((tier) => {
        const items = badgesInTier(tier);
        const meta = TIER_META[tier];
        const got = items.filter((b) => unlockedIds.has(b.id)).length;
        return (
          <section key={tier} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="flex items-center gap-2 min-w-0">
                <span className="t-small font-black px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: `color-mix(in srgb, ${meta.color} 16%, transparent)`, color: meta.color }}>{meta.label}</span>
                <span className="t-caption truncate" style={{ color: "var(--text-muted)" }}>{meta.desc}</span>
              </span>
              <span className="t-caption font-mono-nums flex-shrink-0" style={{ color: "var(--text-muted)" }}>{n(got)}/{n(items.length)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {items.map((b) => {
                const unlocked = unlockedIds.has(b.id);
                const isOpen = openBadge === b.id;
                return (
                  <button key={b.id} onClick={() => setOpenBadge(isOpen ? null : b.id)} aria-label={b.label} aria-expanded={isOpen}
                    className={`relative rounded-2xl p-3 flex flex-col items-center gap-1 text-center transition active:scale-[0.97]${unlocked ? " badge-glow" : ""}`}
                    style={{
                      background: unlocked ? `color-mix(in srgb, ${meta.color} 8%, var(--surface2))` : "var(--surface2)",
                      border: `1.5px solid ${isOpen ? "var(--accent)" : unlocked ? `color-mix(in srgb, ${meta.color} 45%, transparent)` : "var(--border)"}`,
                      opacity: unlocked ? 1 : 0.48,
                    }}>
                    <span className="text-2xl" aria-hidden="true">{b.icon}</span>
                    <p className="t-caption font-bold leading-tight" style={{ color: unlocked ? "var(--text)" : "var(--text-muted)" }}>{b.label}</p>
                    <p className="t-caption font-mono-nums leading-none" style={{ color: "var(--text-muted)" }}>🥈 {n(b.silver)}</p>
                    {unlocked && <span className="absolute top-1.5 left-1.5 text-[11px] leading-none" aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>

            {openBadge && items.some((b) => b.id === openBadge) && (
              <BadgeDetail badge={items.find((b) => b.id === openBadge)!}
                unlocked={unlockedIds.has(openBadge)}
                current={getBadgeCurrent(openBadge, stats, vaultCount)} />
            )}
          </section>
        );
      })}
    </div>
  );
}

function BadgeDetail({ badge, unlocked, current }: { badge: BadgeDef; unlocked: boolean; current: number }) {
  const p = Math.min(100, Math.round((current / badge.goal) * 100));
  return (
    <div className="rounded-2xl px-4 py-4" style={{ background: "var(--surface2)", border: "1.5px solid var(--accent)" }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl" aria-hidden="true">{badge.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-black t-title" style={{ color: "var(--text)" }}>{badge.label}</p>
          <p className="t-small" style={{ color: "var(--text-muted)" }}>{badge.desc}</p>
        </div>
        <span className="t-caption font-black px-2 py-1 rounded-full flex-shrink-0"
          style={unlocked
            ? { background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent-light)" }
            : { background: "color-mix(in srgb, var(--gold) 14%, transparent)", color: "var(--gold)" }}>
          {unlocked ? "✓ مكتملة" : <>🥈 <span className="font-mono-nums">{n(badge.silver)}</span></>}
        </span>
      </div>
      <div className="w-full rounded-full h-2.5 overflow-hidden mb-1.5" style={{ background: "var(--border)" }}
        role="progressbar" aria-label={`تقدّم شارة ${badge.label}`} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: unlocked ? "var(--gold)" : "var(--accent)" }} />
      </div>
      <p className="font-mono-nums t-small font-bold" style={{ color: "var(--text-muted)" }}>
        {n(Math.min(current, badge.goal))} / {n(badge.goal)} {badge.unit}
        {!unlocked && current < badge.goal && (<span> — بقي {n(badge.goal - current)} {badge.unit}</span>)}
      </p>
    </div>
  );
}

export default memo(ProfileAchievementsBase);
