"use client";
/* ─── الملف الشخصي — مركز قيادة الطالب (لا صفحة إعدادات) ───
   صفحة منسّقة رفيعة: تحمّل البيانات مرة، وتحسب المشتقّات بـ useMemo،
   وتوزّعها على مكوّنات مستقلة تحت components/profile. */
import { useEffect, useMemo, useState } from "react";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import {
  loadUser, saveUser, loadStats, computeStreak, ensureJoinDate,
  loadResults, saveResults, loadSessionLog, loadPrefs, savePrefs, loadGoals, saveGoals,
  showsUniversityUI,
  type DarbUser, type DarbStats, type ExamResult, type DarbPrefs, type DarbGoals,
} from "@/lib/storage";
import { getTrack, type TrackId } from "@/lib/tracks";
import { getPlan } from "@/lib/plan";
import type { PlanId } from "@/lib/types";
import { computeXP, getLevel, getUnlockedBadgeIds, getBadgeCurrent, BADGE_DEFS } from "@/lib/xp";
import { computeWeeklyReport } from "@/lib/weeklyReport";
import { loadSkillProgress, overallStats } from "@/lib/skillProgress";
import { skillsForTracks, SKILL_BY_ID } from "@/lib/globalSkills";
import { quoteOfToday } from "@/lib/quotes";
import {
  mostActiveTime, mostStudiedSubject, longestStreak, monthlyDelta, estimateReadiness, daysUntil,
} from "@/lib/insights";

import ProfileTabs, { type ProfileTab } from "@/components/profile/ProfileTabs";
import ProfileSkeleton from "@/components/profile/ProfileSkeleton";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileMotivation, { type NextBadgeInfo } from "@/components/profile/ProfileMotivation";
import ProfileInsights from "@/components/profile/ProfileInsights";
import ProfileTimeline, { type JourneyItem } from "@/components/profile/ProfileTimeline";
import ProfileSocial from "@/components/profile/ProfileSocial";
import ProfileStats from "@/components/profile/ProfileStats";
import ProfileGoals from "@/components/profile/ProfileGoals";
import GoldenPathCard from "@/components/GoldenPathCard";
import ProfilePreferences from "@/components/profile/ProfilePreferences";
import ProfileAchievements from "@/components/profile/ProfileAchievements";
/* استيراد مباشر لتفادي انزياح التخطيط عند ظهور التنبيه */
import ExamRegistrationAlert from "@/components/ExamRegistrationAlert";
import dynamic from "next/dynamic";
const CoachReportView = dynamic(() => import("@/components/CoachReportView"), { ssr: false });
const CalendarSettings = dynamic(() => import("@/components/CalendarSettings"), { ssr: false });
const GoalRealityCard = dynamic(() => import("@/components/GoalRealityCard"), { ssr: false });
const UniversityFuture = dynamic(() => import("@/components/UniversityFuture"), { ssr: false });
const UniversityFutureCard = dynamic(() => import("@/components/UniversityFutureCard"), { ssr: false });

function fmtJoin(d: string): string {
  try { return "انضم " + new Date(d + "T12:00:00").toLocaleDateString("ar-SA", { year: "numeric", month: "long" }); }
  catch { return d; }
}

interface SkillData { avg: number | null; strong: { name: string; score: number }[]; weak: { name: string; score: number }[]; }

export default function ProfilePage() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("overview");

  const [user, setUser] = useState<DarbUser | null>(null);
  const [stats, setStats] = useState<DarbStats | null>(null);
  const [vaultCount, setVaultCount] = useState(0);
  const [flashcards, setFlashcards] = useState(0);
  const [joinDate, setJoinDate] = useState("");
  const [planId, setPlanId] = useState<PlanId>("free");
  const [isPrivate, setIsPrivate] = useState(false);
  const [prefs, setPrefs] = useState<DarbPrefs>({});
  const [goals, setGoals] = useState<DarbGoals>({});
  const [results, setResults] = useState<ExamResult[]>([]);
  const [log, setLog] = useState<ReturnType<typeof loadSessionLog>>([]);
  const [skill, setSkill] = useState<SkillData>({ avg: null, strong: [], weak: [] });
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  /* ── تحميل لمرة واحدة ── */
  useEffect(() => {
    const u = loadUser();
    const s = loadStats();
    setUser(u);
    setStats(s);
    setJoinDate(ensureJoinDate());
    setPlanId(getPlan());
    setIsPrivate((u as (DarbUser & { isPrivate?: boolean }))?.isPrivate ?? false);
    setPrefs(loadPrefs());
    setGoals(loadGoals());
    setResults(loadResults());
    setLog(loadSessionLog());

    try {
      const v = JSON.parse(localStorage.getItem("darb_vault") ?? "[]");
      setVaultCount(Array.isArray(v) ? v.length : 0);
      const c = JSON.parse(localStorage.getItem("darb_cards") ?? "[]");
      setFlashcards(Array.isArray(c) ? c.length : 0);
    } catch {}

    // المهارات حسب المسارات النشطة
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    const skillIds = skillsForTracks(ids).map((sk) => sk.id);
    const progress = loadSkillProgress();
    const os = overallStats(progress, skillIds);
    const rated = skillIds.filter((id) => progress[id])
      .map((id) => ({ name: SKILL_BY_ID.get(id)?.name ?? id, score: progress[id].masteryScore }))
      .sort((a, b) => b.score - a.score);
    setSkill({ avg: rated.length ? os.avgScore : null, strong: rated.slice(0, 2), weak: [...rated].reverse().slice(0, 2) });

    setReady(true);
  }, []);

  /* صورة Google (إن وُجدت) */
  useEffect(() => {
    let unsub: (() => void) | undefined;
    import("@/lib/cloud").then(({ onAuth }) => { unsub = onAuth((u) => setPhotoURL(u?.photoURL ?? null)); });
    return () => { unsub?.(); };
  }, []);

  /* ── مشتقّات مذكَّرة (memoized) ── */
  const showUni = useMemo(() => showsUniversityUI(user), [user]);
  const xp = useMemo(() => (stats ? computeXP(stats) : 0), [stats]);
  const level = useMemo(() => getLevel(xp), [xp]);
  const streak = useMemo(() => (stats ? computeStreak(stats) : 0), [stats]);
  const weekly = useMemo(() => (stats ? computeWeeklyReport(stats, log) : null), [stats, log]);
  const unlockedIds = useMemo(() => new Set(stats ? getUnlockedBadgeIds(stats, vaultCount) : []), [stats, vaultCount]);

  const insights = useMemo(() => {
    if (!stats) return null;
    const examDate = (user?.examDate ?? null);
    return {
      mostActiveTime: mostActiveTime(log),
      mostStudied: mostStudiedSubject(log),
      strong: skill.strong,
      weak: skill.weak,
      weeklyDeltaPct: weekly?.deltaPct ?? null,
      monthlyDeltaPct: monthlyDelta(stats).deltaPct,
      readiness: estimateReadiness(stats, skill.avg ?? 0),
      daysLeft: daysUntil(examDate),
    };
  }, [stats, log, skill, weekly, user]);

  const nextBadge = useMemo<NextBadgeInfo | null>(() => {
    if (!stats) return null;
    let best: NextBadgeInfo | null = null;
    for (const b of BADGE_DEFS) {
      if (unlockedIds.has(b.id)) continue;
      const current = getBadgeCurrent(b.id, stats, vaultCount);
      const pct = Math.min(100, Math.round((current / b.goal) * 100));
      if (!best || pct > best.pct) best = { label: b.label, icon: b.icon, current: Math.min(current, b.goal), goal: b.goal, pct, unit: b.unit };
    }
    return best;
  }, [stats, unlockedIds, vaultCount]);

  const statsData = useMemo(() => {
    if (!stats) return null;
    return {
      focusMins: stats.totalFocusMins, sessions: stats.sessionsCount,
      currentStreak: streak, longestStreak: longestStreak(stats),
      plans: stats.plansCount ?? 0, mistakes: vaultCount, flashcards,
      aiChats: stats.aiChats ?? 0, filesAnalyzed: stats.analyzedCount ?? 0, quizzes: stats.quizCount ?? 0,
      skillAvg: skill.avg, weekly, monthlyDeltaPct: monthlyDelta(stats).deltaPct,
    };
  }, [stats, streak, vaultCount, flashcards, skill.avg, weekly]);

  const journey = useMemo<JourneyItem[]>(() => {
    // المعالم دائمة — لا تُحذف بالتقطيع
    const milestones: JourneyItem[] = [];
    if (joinDate) milestones.push({ ts: new Date(joinDate + "T12:00:00").getTime(), icon: "🌟", text: "انضممت إلى درب", milestone: true });
    if (log.length) milestones.push({ ts: Math.min(...log.map((e) => e.ts)), icon: "🔥", text: "أول جلسة تركيز", milestone: true });

    const regular: JourneyItem[] = [
      ...log.map((e) => ({ ts: e.ts, icon: "⏱", text: `أكملت جلسة ${e.subject} · ${e.focusMins.toLocaleString("ar")} دقيقة` })),
      ...results.filter((r) => r.date).map((r) => ({
        ts: new Date(r.date + "T12:00:00").getTime(), icon: "📊",
        text: `أضفت نتيجة ${r.exam}${r.score ? ` · ${r.score}` : ""}`,
      })),
    ].sort((a, b) => b.ts - a.ts).slice(0, 7);

    // دمج: المعالم أولاً (بلا تكرار)، ثم النشاط الأخير
    const milestoneTs = new Set(milestones.map((m) => m.ts));
    const merged = [...milestones, ...regular.filter((r) => !milestoneTs.has(r.ts))];
    return merged.sort((a, b) => b.ts - a.ts);
  }, [log, results, joinDate]);

  /* ── أفعال التحرير ── */
  const updateUser = (partial: Partial<DarbUser>) => {
    setUser((prev) => {
      const next = { ...(prev as DarbUser), ...partial };
      saveUser(next);
      if (partial.name !== undefined) import("@/lib/firestore").then(({ syncUser }) => { syncUser({ name: next.name }); });
      return next;
    });
  };
  const updateGoals = (partial: Partial<DarbGoals>) => {
    setGoals((prev) => { const next = { ...prev, ...partial }; saveGoals(next); return next; });
  };
  const updatePrefs = (partial: Partial<DarbPrefs>) => {
    setPrefs((prev) => { const next = { ...prev, ...partial }; savePrefs(next); return next; });
  };
  const addResult = (r: ExamResult) => setResults((prev) => { const next = [r, ...prev]; saveResults(next); return next; });
  const deleteResult = (id: string) => setResults((prev) => { const next = prev.filter((x) => x.id !== id); saveResults(next); return next; });
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

  if (!ready || !user || !stats || !statsData || !insights) {
    return <div className="min-h-dvh pb-nav">{header}<ProfileSkeleton /></div>;
  }

  return (
    <div className="min-h-dvh pb-nav desk-wide">
      {header}
      <div className="profile-shell px-5 py-5 max-w-lg mx-auto flex flex-col gap-5">
        <ProfileHeader
          user={user} track={getTrack(user.track)} level={level} xp={xp} streak={streak}
          joinLabel={joinDate ? fmtJoin(joinDate) : ""} planId={planId} photoURL={photoURL}
          onUserChange={updateUser}
        />

        <ProfileTabs active={tab} onChange={setTab} showUniversity={showUni} />

        {tab === "overview" && (
          <div id="profile-panel-overview" role="tabpanel" aria-labelledby="profile-tab-overview"
            className="flex flex-col gap-5 profile-tab-panel profile-overview-grid">
            <GoldenPathCard />
            <ProfileMotivation quote={quoteOfToday()} weekly={weekly} level={level} nextBadge={nextBadge} />
            {showUni && <UniversityFutureCard onOpenTab={() => setTab("future")} />}
            <ProfileInsights data={insights} />
            <ProfileSocial />
            <ProfileTimeline items={journey} />
          </div>
        )}

        {tab === "stats" && (
          <div id="profile-panel-stats" role="tabpanel" aria-labelledby="profile-tab-stats" className="profile-tab-panel">
            <ProfileStats data={statsData} />
          </div>
        )}

        {tab === "goals" && (
          <div id="profile-panel-goals" role="tabpanel" aria-labelledby="profile-tab-goals" className="profile-tab-panel flex flex-col gap-4">
            <ExamRegistrationAlert />
            <GoalRealityCard />
            <ProfileGoals goals={goals} onGoalsChange={updateGoals}
              results={results} onAddResult={addResult} onDeleteResult={deleteResult} />
          </div>
        )}

        {tab === "future" && showUni && (
          <div id="profile-panel-future" role="tabpanel" aria-labelledby="profile-tab-future" className="profile-tab-panel">
            <UniversityFuture />
          </div>
        )}

        {tab === "prefs" && (
          <div id="profile-panel-prefs" role="tabpanel" aria-labelledby="profile-tab-prefs" className="profile-tab-panel flex flex-col gap-5">
            <ProfilePreferences prefs={prefs} onPrefsChange={updatePrefs} isPrivate={isPrivate} onTogglePrivacy={togglePrivacy} />
            <CalendarSettings />
          </div>
        )}

        {tab === "coach" && (
          <div id="profile-panel-coach" role="tabpanel" aria-labelledby="profile-tab-coach" className="profile-tab-panel">
            <CoachReportView />
          </div>
        )}

        {tab === "achievements" && (
          <div id="profile-panel-achievements" role="tabpanel" aria-labelledby="profile-tab-achievements" className="profile-tab-panel">
            <ProfileAchievements unlockedIds={unlockedIds} stats={stats} vaultCount={vaultCount} />
          </div>
        )}
      </div>

      <PageFooter />
    </div>
  );
}
