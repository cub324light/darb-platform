"use client";
/* ─── الملف الشخصي — بسيطٌ عمداً: الهوية + الإنجازات + الإعدادات (والحساب) ───
   ليس Dashboard: الإحصائيات/التقدم مكانها الرئيسية، والأهداف/النتائج/مؤشّر الرضا
   مكانها «خطتي» /plan. هنا فقط: مَن أنت (الترويسة)، إنجازاتك، وإعداداتك وحسابك. */
import { useEffect, useMemo, useState } from "react";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import {
  loadUser, saveUser, loadStats, ensureJoinDate, loadPrefs, savePrefs,
  type DarbUser, type DarbStats, type DarbPrefs,
} from "@/lib/storage";
import { getTrack } from "@/lib/tracks";
import { getPlan } from "@/lib/plan";
import type { PlanId } from "@/lib/types";
import { computeXP, getLevel, getUnlockedBadgeIds } from "@/lib/xp";

import ProfileTabs, { type ProfileTab } from "@/components/profile/ProfileTabs";
import ProfileSkeleton from "@/components/profile/ProfileSkeleton";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfilePreferences from "@/components/profile/ProfilePreferences";
import ProfileAchievements from "@/components/profile/ProfileAchievements";
import ProfileExtra from "@/components/profile/ProfileExtra";
import ProfileLearnPrefs from "@/components/profile/ProfileLearnPrefs";
import ProfileAccount from "@/components/profile/ProfileAccount";
import dynamic from "next/dynamic";
const CalendarSettings = dynamic(() => import("@/components/CalendarSettings"), { ssr: false });

function fmtJoin(d: string): string {
  try { return "انضم " + new Date(d + "T12:00:00").toLocaleDateString("ar-SA", { year: "numeric", month: "long" }); }
  catch { return d; }
}

function readVaultCount(): number {
  if (typeof window === "undefined") return 0;
  try { const v = JSON.parse(localStorage.getItem("darb_vault") ?? "[]"); return Array.isArray(v) ? v.length : 0; }
  catch { return 0; }
}

export default function ProfilePage() {
  const [tab, setTab] = useState<ProfileTab>("achievements");

  /* تهيئة كسولة SSR-safe (لا setState متزامن في effect — يوافق React Compiler) */
  const [user, setUser] = useState<DarbUser | null>(() => (typeof window !== "undefined" ? loadUser() : null));
  const [stats] = useState<DarbStats | null>(() => (typeof window !== "undefined" ? loadStats() : null));
  const [vaultCount] = useState(() => readVaultCount());
  const [joinDate] = useState(() => (typeof window !== "undefined" ? ensureJoinDate() : ""));
  const [planId] = useState<PlanId>(() => (typeof window !== "undefined" ? getPlan() : "free"));
  const [isPrivate, setIsPrivate] = useState(() =>
    typeof window !== "undefined" ? ((loadUser() as (DarbUser & { isPrivate?: boolean }))?.isPrivate ?? false) : false);
  const [prefs, setPrefs] = useState<DarbPrefs>(() => (typeof window !== "undefined" ? loadPrefs() : {}));
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  /* صورة Google (إن وُجدت) */
  useEffect(() => {
    let unsub: (() => void) | undefined;
    import("@/lib/cloud").then(({ onAuth }) => { unsub = onAuth((u) => setPhotoURL(u?.photoURL ?? null)); });
    return () => { unsub?.(); };
  }, []);

  /* ── مشتقّات مذكَّرة ── */
  const xp = useMemo(() => (stats ? computeXP(stats) : 0), [stats]);
  const level = useMemo(() => getLevel(xp), [xp]);
  const unlockedIds = useMemo(() => new Set(stats ? getUnlockedBadgeIds(stats, vaultCount) : []), [stats, vaultCount]);

  /* ── أفعال التحرير ── */
  const updateUser = (partial: Partial<DarbUser>) => {
    setUser((prev) => {
      const next = { ...(prev as DarbUser), ...partial };
      saveUser(next);
      if (partial.name !== undefined) import("@/lib/firestore").then(({ syncUser }) => { syncUser({ name: next.name }); });
      return next;
    });
  };
  const updatePrefs = (partial: Partial<DarbPrefs>) => {
    setPrefs((prev) => { const next = { ...prev, ...partial }; savePrefs(next); return next; });
  };
  const togglePrivacy = () => {
    setIsPrivate((prev) => {
      const next = !prev;
      if (user) { const u = { ...user, isPrivate: next } as DarbUser; saveUser(u); }
      import("@/lib/firestore").then(({ syncUser }) => { syncUser({ isPrivate: next }); });
      return next;
    });
  };

  const header = (
    <Dome compact>
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="title-lg grad-title">ملفي</h1>
      </div>
    </Dome>
  );

  if (!user || !stats) {
    return <div className="min-h-dvh pb-nav">{header}<ProfileSkeleton /></div>;
  }

  return (
    <div className="min-h-dvh pb-nav desk-wide">
      {header}
      <div className="profile-shell px-5 py-5 max-w-lg mx-auto flex flex-col gap-5">
        <ProfileHeader
          user={user} track={getTrack(user.track)} level={level} xp={xp}
          joinLabel={joinDate ? fmtJoin(joinDate) : ""} planId={planId} photoURL={photoURL}
          onUserChange={updateUser}
        />

        <ProfileTabs active={tab} onChange={setTab} />

        {tab === "achievements" && (
          <div id="profile-panel-achievements" role="tabpanel" aria-labelledby="profile-tab-achievements" className="profile-tab-panel">
            <ProfileAchievements unlockedIds={unlockedIds} stats={stats} vaultCount={vaultCount} />
          </div>
        )}

        {tab === "info" && (
          <div id="profile-panel-info" role="tabpanel" aria-labelledby="profile-tab-info" className="profile-tab-panel flex flex-col gap-5">
            <ProfileExtra />
            <ProfileLearnPrefs prefs={prefs} onPrefsChange={updatePrefs} />
          </div>
        )}

        {tab === "prefs" && (
          <div id="profile-panel-prefs" role="tabpanel" aria-labelledby="profile-tab-prefs" className="profile-tab-panel flex flex-col gap-5">
            <ProfilePreferences isPrivate={isPrivate} onTogglePrivacy={togglePrivacy} />
            <CalendarSettings />
            <ProfileAccount />
          </div>
        )}
      </div>

      <PageFooter />
    </div>
  );
}
