"use client";
/* ─── صفحة الملف الشخصي — رحلة الطالب وإنجازاته (لا إعدادات) ───
   كل البطاقات مبنية على بيانات حقيقية من localStorage/السحابة فقط. */
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import BottomNav from "@/components/BottomNav";
import PageFooter from "@/components/PageFooter";
import {
  loadUser, saveUser, loadStats, computeStreak, ensureJoinDate,
  loadResults, saveResults, loadSessionLog,
  type DarbUser, type DarbStats, type ExamResult,
} from "@/lib/storage";
/* syncUser مُستورَد ديناميكياً أسفل */
import { getTrack, TRACKS, scoreRangeForTitle, validateScore, type TrackId } from "@/lib/tracks";
import { getPlan, PLAN_NAMES, PLAN_COLORS } from "@/lib/plan";
import type { PlanId } from "@/lib/types";
import { computeXP, getLevel, getUnlockedBadgeIds, getBadgeCurrent, BADGE_DEFS } from "@/lib/xp";
import { computeWeeklyReport, fmtMins } from "@/lib/weeklyReport";
import { loadSkillProgress, overallStats } from "@/lib/skillProgress";
import { skillsForTracks, SKILL_BY_ID } from "@/lib/globalSkills";
/* onAuth مُستورَد ديناميكياً أسفل */
import { postSocial } from "@/lib/authFetch";
import { getReferral, claimRefReward, referralLink, REFERRAL_REWARD, type ReferralInfo } from "@/lib/referral";

const FriendsPanel = dynamic(() => import("@/components/FriendsPanel"), { ssr: false });

/* ── أدوات تنسيق ── */
function fmtJoin(d: string): string {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("ar-SA", { year: "numeric", month: "long" });
  } catch { return d; }
}
function relDay(ts: number): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(ts); d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff <= 0) return "اليوم";
  if (diff === 1) return "أمس";
  if (diff < 7) return `قبل ${diff} أيام`;
  try { return new Date(ts).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }); } catch { return ""; }
}

interface TimelineItem { ts: number; icon: string; text: string; }

export default function ProfilePage() {
  const [user, setUser] = useState<DarbUser | null>(null);
  const [rawStats, setRawStats] = useState<DarbStats | null>(null);
  const [vaultCount, setVaultCount] = useState(0);
  const [joinDate, setJoinDate] = useState("");
  const [planId, setPlanId] = useState<PlanId>("free");
  const [isPrivate, setIsPrivate] = useState(false);
  const [openBadge, setOpenBadge] = useState<string | null>(null);

  // الاسم
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

  // المهارات
  const [skillData, setSkillData] = useState<{
    pct: number; rated: number;
    strong: { name: string; score: number }[];
    weak: { name: string; score: number }[];
  } | null>(null);

  // التايملاين
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  // الأصدقاء والترتيب
  const [uid, setUid] = useState<string | null>(null);
  const [friendsCount, setFriendsCount] = useState<number | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [showFriends, setShowFriends] = useState(false);

  // الإحالات
  const [ref, setRef] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);

  // نتائجي
  const [results, setResults] = useState<ExamResult[]>([]);
  const [resExam, setResExam]   = useState("");
  const [resScore, setResScore] = useState("");
  const [resDate, setResDate]   = useState("");
  const [resErr, setResErr]     = useState("");
  const resRange = resExam ? scoreRangeForTitle(resExam) : undefined;
  const examHasNoScore = resRange === null;

  /* ── تحميل البيانات المحلية ── */
  useEffect(() => {
    const u = loadUser();
    setUser(u);
    setEditName(u?.name ?? "");
    setIsPrivate((u as (DarbUser & { isPrivate?: boolean }))?.isPrivate ?? false);

    const s = loadStats();
    setRawStats(s);
    setJoinDate(ensureJoinDate());
    setPlanId(getPlan());
    setResults(loadResults());

    let vc = 0;
    try {
      const raw = localStorage.getItem("darb_vault");
      const v = raw ? JSON.parse(raw) : [];
      vc = Array.isArray(v) ? v.length : 0;
    } catch {}
    setVaultCount(vc);

    // المهارات حسب المسارات النشطة
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    const skillIds = skillsForTracks(ids).map((sk) => sk.id);
    const progress = loadSkillProgress();
    const os = overallStats(progress, skillIds);
    const rated = skillIds
      .filter((id) => progress[id])
      .map((id) => ({ name: SKILL_BY_ID.get(id)?.name ?? id, score: progress[id].masteryScore }))
      .sort((a, b) => b.score - a.score);
    setSkillData({
      pct: os.avgScore,
      rated: rated.length,
      strong: rated.slice(0, 2),
      weak: [...rated].reverse().slice(0, 2),
    });

    // التايملاين: جلسات + نتائج (الوحيدة ذات الطابع الزمني)
    const log = loadSessionLog();
    const items: TimelineItem[] = [
      ...log.map((e) => ({ ts: e.ts, icon: "⏱", text: `أكملت جلسة ${e.subject} · ${e.focusMins} دقيقة` })),
      ...loadResults().filter((r) => r.date).map((r) => ({
        ts: new Date(r.date + "T12:00:00").getTime(),
        icon: "📊",
        text: `أضفت نتيجة ${r.exam}${r.score ? ` · ${r.score}` : ""}`,
      })),
    ].sort((a, b) => b.ts - a.ts).slice(0, 8);
    setTimeline(items);
  }, []);

  /* ── معرّف المستخدم → عدد الأصدقاء + الترتيب ── */
  useEffect(() => {
    let unsub: (() => void) | undefined;
    import("@/lib/cloud").then(({ onAuth }) => { unsub = onAuth((u) => setUid(u?.uid ?? null)); });
    return () => { unsub?.(); };
  }, []);
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    postSocial({ mode: "getFriends" })
      .then((r) => r.json())
      .then((d: { friends?: unknown[] }) => { if (alive && Array.isArray(d.friends)) setFriendsCount(d.friends.length); })
      .catch(() => {});
    postSocial({ mode: "leaderboard" })
      .then((r) => r.json())
      .then((d: { topHours?: { uid: string }[] }) => {
        if (!alive) return;
        const idx = (d.topHours ?? []).findIndex((x) => x.uid === uid);
        if (idx >= 0) setRank(idx + 1);
      })
      .catch(() => {});
    getReferral().then((info) => { if (alive) setRef(info); });
    return () => { alive = false; };
  }, [uid]);

  const copyRefLink = () => {
    if (!ref) return;
    const link = referralLink(ref.code);
    try { navigator.clipboard?.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const claimRef = async () => {
    setClaiming(true);
    const got = await claimRefReward();
    if (got > 0) {
      setClaimMsg(`+${got} فضة 🎉`);
      setRef((p) => (p ? { ...p, pendingReward: 0 } : p));
      setTimeout(() => setClaimMsg(null), 2200);
    }
    setClaiming(false);
  };

  /* ── أفعال ── */
  const saveName = () => {
    if (!user || !editName.trim()) return;
    const next = { ...user, name: editName.trim() };
    saveUser(next); setUser(next); setEditing(false);
    import("@/lib/firestore").then(({ syncUser }) => { syncUser({ name: next.name }); });
  };
  const togglePrivacy = () => {
    if (!user) return;
    const next = !isPrivate;
    setIsPrivate(next);
    const updated = { ...user, isPrivate: next } as DarbUser & { isPrivate: boolean };
    saveUser(updated as DarbUser);
    import("@/lib/firestore").then(({ syncUser }) => { syncUser({ isPrivate: next }); });
  };
  const addResult = () => {
    const exam = resExam.trim();
    if (!exam) return;
    const err = validateScore(exam, resScore);
    if (err) { setResErr(err); return; }
    const next: ExamResult[] = [
      { id: `${Date.now()}`, exam, score: examHasNoScore ? undefined : (resScore.trim() || undefined), date: resDate || undefined },
      ...results,
    ];
    setResults(next); saveResults(next);
    setResExam(""); setResScore(""); setResDate(""); setResErr("");
  };
  const deleteResult = (id: string) => {
    const next = results.filter((r) => r.id !== id);
    setResults(next); saveResults(next);
  };

  /* ── قيم مشتقة ── */
  const track = getTrack(user?.track);
  const streak = rawStats ? computeStreak(rawStats) : 0;
  const xp = rawStats ? computeXP(rawStats) : 0;
  const level = getLevel(xp);
  const hours = rawStats ? rawStats.totalFocusMins / 60 : 0;
  const unlockedIds = rawStats ? new Set(getUnlockedBadgeIds(rawStats, vaultCount)) : new Set<string>();
  const lastBadge = BADGE_DEFS.filter((b) => unlockedIds.has(b.id)).slice(-1)[0] ?? null;
  const weekly = rawStats ? computeWeeklyReport(rawStats, loadSessionLog()) : null;

  const cardStyle = { background: "var(--surface)", border: "1px solid var(--border)" };
  const innerStyle = { background: "var(--surface2)", border: "1px solid var(--border)" };

  return (
    <div className="min-h-dvh pb-nav">
      <Dome compact>
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="title-lg grad-title">ملفي</h1>
        </div>
      </Dome>

      <div className="px-5 py-5 max-w-lg mx-auto flex flex-col gap-5">

        {/* ═══ 1) الترويسة ═══ */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}>
              {(user?.name ?? "د").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex gap-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={20} autoFocus
                    className="flex-1 min-w-0 rounded-xl px-3 py-2 text-base text-[var(--text)] outline-none"
                    style={{ background: "var(--surface2)", border: "1.5px solid var(--accent)" }} />
                  <button onClick={saveName} className="px-4 rounded-xl font-bold"
                    style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>✓</button>
                </div>
              ) : (
                <>
                  <p className="font-black text-xl text-[var(--text)] truncate">{user?.name ?? "—"}</p>
                  <button onClick={() => setEditing(true)} className="text-[13px] text-[var(--accent-light)] font-semibold mt-0.5">تعديل الاسم</button>
                </>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[12px]" style={{ color: "var(--text-muted)" }}>
                <span style={{ color: track.color }}>🎯 {track.title}</span>
                {joinDate && <span>📅 انضم {fmtJoin(joinDate)}</span>}
                <span>🔥 {streak} ستريك</span>
              </div>
            </div>
          </div>

          {/* المستوى + XP */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-black text-[14px] flex items-center gap-1.5" style={{ color: level.color }}>
                <span className="text-lg">{level.icon}</span> {level.name}
              </span>
              <span className="font-mono-nums text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>{xp.toLocaleString("ar")} XP</span>
            </div>
            <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${level.progress}%`, background: level.color }} />
            </div>
            {level.next && (
              <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                {level.next.name} — يحتاج {level.next.minXp.toLocaleString("ar")} XP
              </p>
            )}
          </div>
        </div>

        {/* الباقة */}
        <button onClick={() => { window.location.href = "/pricing"; }}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-right transition active:scale-[0.99]"
          style={{ background: `color-mix(in srgb, ${PLAN_COLORS[planId]} 10%, var(--surface))`, border: `1.5px solid color-mix(in srgb, ${PLAN_COLORS[planId]} 45%, transparent)` }}>
          <span className="text-lg">{planId === "free" ? "○" : "✦"}</span>
          <span className="flex-1">
            <span className="block text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>باقتك الحالية</span>
            <span className="block font-black text-[15px]" style={{ color: PLAN_COLORS[planId] }}>{PLAN_NAMES[planId]}</span>
          </span>
          <span className="text-[13px] font-bold" style={{ color: "var(--accent-light)" }}>{planId === "free" ? "ترقية ←" : "تغيير ←"}</span>
        </button>

        {/* ═══ 2) الإحصائيات ═══ */}
        <div>
          <p className="label mb-3">إحصائياتك</p>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: "⏱", val: hours < 1 ? `${rawStats?.totalFocusMins ?? 0}` : hours.toFixed(1).replace(/\.0$/, ""), label: hours < 1 ? "دقيقة" : "ساعة" },
              { icon: "✅", val: `${rawStats?.sessionsCount ?? 0}`, label: "جلسة" },
              { icon: "📅", val: `${rawStats?.sessionDays.length ?? 0}`, label: "يوم نشط" },
              { icon: "🧩", val: `${rawStats?.plansCount ?? 0}`, label: "خطة" },
              { icon: "📂", val: `${rawStats?.analyzedCount ?? 0}`, label: "ملف محلَّل" },
              { icon: "🔍", val: `${vaultCount}`, label: "خطأ" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-3 text-center" style={innerStyle}>
                <p className="text-base leading-none mb-1">{s.icon}</p>
                <p className="font-mono-nums font-black text-lg text-[var(--text)] leading-none">{s.val}</p>
                <p className="text-[12px] text-[var(--text-muted)] font-semibold mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 3) التقدّم ═══ */}
        {skillData && skillData.rated > 0 ? (
          <div className="rounded-2xl p-5" style={cardStyle}>
            <p className="label mb-3">تقدّمك في المهارات</p>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>متوسط الإتقان</span>
              <span className="font-mono-nums font-black text-[15px]" style={{ color: "var(--accent-light)" }}>{skillData.pct}%</span>
            </div>
            <div className="w-full rounded-full h-2.5 overflow-hidden mb-4" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${skillData.pct}%`, background: "var(--accent)" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[12px] font-black mb-1.5" style={{ color: "var(--success)" }}>💪 أقوى مهاراتك</p>
                {skillData.strong.map((s) => (
                  <p key={s.name} className="text-[13px] truncate" style={{ color: "var(--text)" }}>{s.name}</p>
                ))}
              </div>
              <div>
                <p className="text-[12px] font-black mb-1.5" style={{ color: "var(--gold)" }}>⚠️ تحتاج تقوية</p>
                {skillData.weak.map((s) => (
                  <p key={s.name} className="text-[13px] truncate" style={{ color: "var(--text)" }}>{s.name}</p>
                ))}
              </div>
            </div>
            {lastBadge && (
              <div className="mt-4 pt-4 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                <span className="text-xl">{lastBadge.icon}</span>
                <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>آخر إنجاز: <b style={{ color: "var(--text)" }}>{lastBadge.label}</b></span>
              </div>
            )}
          </div>
        ) : lastBadge && (
          <div className="rounded-2xl p-4 flex items-center gap-2" style={cardStyle}>
            <span className="text-xl">{lastBadge.icon}</span>
            <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>آخر إنجاز: <b style={{ color: "var(--text)" }}>{lastBadge.label}</b></span>
          </div>
        )}

        {/* ═══ 4) الإنجازات ═══ */}
        {rawStats && (
          <div>
            <p className="label mb-1">إنجازاتك</p>
            <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>اضغط أي شارة لتعرف كيف تكسبها وكم بقي عليك</p>
            <div className="grid grid-cols-3 gap-2">
              {BADGE_DEFS.map((b) => {
                const unlocked = unlockedIds.has(b.id);
                const isOpen = openBadge === b.id;
                return (
                  <button key={b.id} onClick={() => setOpenBadge(isOpen ? null : b.id)}
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
              const current = getBadgeCurrent(active.id, rawStats, vaultCount);
              const pct = Math.min(100, Math.round((current / active.goal) * 100));
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
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: activeUnlocked ? "var(--gold)" : "var(--accent)" }} />
                  </div>
                  <p className="font-mono-nums text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>
                    {Math.min(current, active.goal).toLocaleString("ar")} / {active.goal.toLocaleString("ar")} {active.unit}
                    {!activeUnlocked && current < active.goal && (<span> — بقي {(active.goal - current).toLocaleString("ar")} {active.unit}</span>)}
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* ═══ 5) الأداء الأسبوعي ═══ */}
        {weekly && weekly.hasData && (
          <div className="rounded-2xl p-5" style={cardStyle}>
            <p className="label mb-3">أداؤك هذا الأسبوع</p>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="num-hero text-[28px] leading-none" style={{ color: "var(--accent-light)" }}>{fmtMins(weekly.mins)}</span>
              {weekly.deltaPct !== null && (
                <span className="text-[13px] font-bold" style={{ color: weekly.deltaPct >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {weekly.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(weekly.deltaPct)}% عن الأسبوع السابق
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {weekly.topSubject && (
                <div className="rounded-xl px-3 py-2.5" style={innerStyle}>
                  <p className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>📈 الأكثر دراسة</p>
                  <p className="text-[14px] font-black truncate" style={{ color: "var(--text)" }}>{weekly.topSubject.name}</p>
                </div>
              )}
              {weekly.lowSubject && (
                <div className="rounded-xl px-3 py-2.5" style={innerStyle}>
                  <p className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>📉 الأقل دراسة</p>
                  <p className="text-[14px] font-black truncate" style={{ color: "var(--text)" }}>{weekly.lowSubject.name}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ 6) الأصدقاء والترتيب ═══ */}
        {uid && (
          <button onClick={() => setShowFriends(true)} className="rounded-2xl p-5 text-right transition active:scale-[0.99]" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div>
                  <p className="font-mono-nums font-black text-2xl" style={{ color: "var(--accent-light)" }}>{friendsCount ?? "—"}</p>
                  <p className="text-[12px] font-semibold" style={{ color: "var(--text-muted)" }}>👥 أصدقاء</p>
                </div>
                <div>
                  <p className="font-mono-nums font-black text-2xl" style={{ color: "var(--gold)" }}>{rank ? `#${rank}` : "—"}</p>
                  <p className="text-[12px] font-semibold" style={{ color: "var(--text-muted)" }}>🏆 ترتيبك</p>
                </div>
              </div>
              <span className="text-[13px] font-bold" style={{ color: "var(--accent-light)" }}>افتح ←</span>
            </div>
            {lastBadge && (
              <p className="text-[12px] mt-3 pt-3" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
                أفضل إنجاز: <b style={{ color: "var(--text)" }}>{lastBadge.label} {lastBadge.icon}</b>
              </p>
            )}
          </button>
        )}

        {/* ═══ الإحالات: ادعُ أصدقاءك ═══ */}
        {uid && ref && (
          <div className="rounded-2xl p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-1">
              <p className="label">ادعُ أصدقاءك</p>
              <span className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>
                {ref.count} انضمّوا عبرك
              </span>
            </div>
            <p className="text-[13px] mb-3" style={{ color: "var(--text-muted)" }}>
              شارك رابطك — تربح أنت وصديقك {REFERRAL_REWARD} فضة لكل من ينضم ويكمل التسجيل.
            </p>
            <button onClick={copyRefLink}
              className="w-full py-3 rounded-2xl font-black text-[14px] transition active:scale-[0.99] mb-2"
              style={{ background: "var(--accent)", color: "#fff" }}>
              {copied ? "✓ تم نسخ الرابط" : "📋 انسخ رابط الدعوة"}
            </button>
            {ref.pendingReward > 0 && (
              <button onClick={claimRef} disabled={claiming}
                className="w-full py-3 rounded-2xl font-black text-[14px] transition active:scale-[0.99] disabled:opacity-50"
                style={{ background: "var(--gold)", color: "#1a1205" }}>
                {claiming ? "…" : `🎁 استلم ${ref.pendingReward} فضة من إحالاتك`}
              </button>
            )}
          </div>
        )}

        {/* ═══ 7) سجل النشاط ═══ */}
        {timeline.length > 0 && (
          <div>
            <p className="label mb-3">آخر نشاطك</p>
            <div className="rounded-2xl p-4" style={cardStyle}>
              <div className="flex flex-col gap-3">
                {timeline.map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}>{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] leading-snug" style={{ color: "var(--text)" }}>{t.text}</p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{relDay(t.ts)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ 8) الخصوصية ═══ */}
        <div className="rounded-2xl px-4 py-4 flex items-center justify-between gap-3" style={cardStyle}>
          <div className="min-w-0">
            <p className="font-bold text-[15px]" style={{ color: "var(--text)" }}>ظهورك في الترتيب</p>
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              {isPrivate ? "خاص — لا تظهر للآخرين ولا في لوحة الشرف" : "عام — تظهر في البحث ولوحة الشرف"}
            </p>
          </div>
          <button onClick={togglePrivacy}
            className="px-4 py-2.5 rounded-xl font-black text-[14px] flex-shrink-0 transition active:scale-95"
            style={isPrivate
              ? { background: "#EF4444", color: "#fff", border: "1.5px solid #EF4444" }
              : { background: "transparent", color: "var(--text-muted)", border: "1.5px solid var(--border)" }}>
            {isPrivate ? "خاص ●" : "عام"}
          </button>
        </div>

        {/* ═══ نتائجي ═══ */}
        <div>
          <p className="label mb-3">نتائجي</p>
          {results.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {results.map((r) => (
                <div key={r.id} className="rounded-2xl px-4 py-3 flex items-center gap-3" style={cardStyle}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] text-[var(--text)] truncate">{r.exam}</p>
                    {r.date && <p className="text-[12px] text-[var(--text-muted)]">{r.date}</p>}
                  </div>
                  {r.score && <span className="font-black text-[16px]" style={{ color: "var(--gold)" }}>{r.score}</span>}
                  <button onClick={() => deleteResult(r.id)} className="text-[var(--text-muted)] text-sm font-bold px-1">✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 mb-2">
            <select value={resExam} onChange={(e) => { setResExam(e.target.value); setResScore(""); setResErr(""); }}
              className="flex-1 min-w-0 rounded-2xl px-4 py-3 text-[15px] text-[var(--text)] outline-none" style={{ ...innerStyle, borderWidth: "1.5px" }}>
              <option value="">اختر الاختبار</option>
              {TRACKS.map((t) => (<option key={t.id} value={t.title}>{t.title}</option>))}
            </select>
            <input value={resScore} inputMode="decimal" onChange={(e) => { setResScore(e.target.value); setResErr(""); }}
              disabled={examHasNoScore} placeholder={examHasNoScore ? "بلا درجة" : "الدرجة"} maxLength={6}
              className="w-24 rounded-2xl px-3 py-3 text-[15px] text-center text-[var(--text)] placeholder-[var(--text-muted)] outline-none disabled:opacity-40"
              style={{ ...innerStyle, borderWidth: "1.5px" }} />
          </div>
          {resExam && resRange && (<p className="text-[12px] mb-2 px-1" style={{ color: "var(--text-muted)" }}>الدرجة: {resRange.hint}</p>)}
          {examHasNoScore && (<p className="text-[12px] mb-2 px-1" style={{ color: "var(--text-muted)" }}>هذا الاختبار برنامج قبول/تدريب — ما له درجة رقمية.</p>)}
          {resErr && (<p className="text-[12px] mb-2 px-1 font-bold" style={{ color: "var(--danger)" }}>{resErr}</p>)}
          <div className="flex gap-2">
            <input type="date" value={resDate} onChange={(e) => setResDate(e.target.value)}
              className="flex-1 rounded-2xl px-4 py-3 text-[15px] text-[var(--text)] outline-none" style={{ ...innerStyle, borderWidth: "1.5px", colorScheme: "dark" }} />
            <button onClick={addResult} disabled={!resExam.trim()} className="px-5 rounded-2xl font-black text-[15px]"
              style={{ background: resExam.trim() ? "var(--accent)" : "var(--surface2)", color: resExam.trim() ? "white" : "var(--text-muted)", border: "none" }}>أضف</button>
          </div>
        </div>
      </div>

      {claimMsg && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl font-black text-[15px]"
          style={{ background: "var(--gold)", color: "#1a1205" }}>{claimMsg}</div>
      )}

      {showFriends && <FriendsPanel onClose={() => setShowFriends(false)} />}

      <PageFooter />
      <BottomNav />
    </div>
  );
}
