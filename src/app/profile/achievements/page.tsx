"use client";
/* ─── صفحةُ الإنجازات — صفحةٌ قائمةٌ بذاتها لا لوحٌ تحت الملف ───
   سبعٌ وعشرون شارةً بثلاث درجات تحتاج شاشةً كاملة: عرضُها داخل تبويبٍ يجعل
   الطالبَ يمرّر طويلاً ويفقد رأسَ الصفحة. */
import { useMemo, useState } from "react";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import NextThread from "@/components/NextThread";
import ProfileAchievements from "@/components/profile/ProfileAchievements";
import { loadStats, type DarbStats } from "@/lib/storage";
import { getUnlockedBadgeIds } from "@/lib/xp";

function readVaultCount(): number {
  if (typeof window === "undefined") return 0;
  try { const v = JSON.parse(localStorage.getItem("darb_vault") ?? "[]"); return Array.isArray(v) ? v.length : 0; }
  catch { return 0; }
}

export default function AchievementsPage() {
  const [stats] = useState<DarbStats | null>(() => (typeof window !== "undefined" ? loadStats() : null));
  const [vaultCount] = useState(() => readVaultCount());
  const unlockedIds = useMemo(
    () => new Set(stats ? getUnlockedBadgeIds(stats, vaultCount) : []),
    [stats, vaultCount],
  );

  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3">
          <BackButton href="/profile" />
          <h1 className="title-lg grad-title">إنجازاتك</h1>
        </div>
      </Dome>
      <div className="h-4" />
      <div className="page-content">
        {stats ? (
          <ProfileAchievements unlockedIds={unlockedIds} stats={stats} vaultCount={vaultCount} />
        ) : (
          <div className="ds-card"><p className="t-body" style={{ color: "var(--text-muted)" }}>جارٍ التحميل…</p></div>
        )}
      </div>
      <div className="h-6" />
      <NextThread page="/profile" />
      <PageFooter />
    </div>
  );
}
