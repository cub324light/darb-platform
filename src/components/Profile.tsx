"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TRACKS, scoreRangeForTitle, validateScore } from "@/lib/tracks";
import {
  loadUser, saveUser, loadStats, computeStreak,
  loadTheme, applyTheme,
  loadResults, saveResults,
  type DarbUser, type Theme, type ExamResult, type DarbStats,
} from "@/lib/storage";
import { syncUser } from "@/lib/firestore";
import { getPlan, PLAN_NAMES, PLAN_COLORS } from "@/lib/plan";
import type { PlanId } from "@/lib/types";
import { computeXP, getLevel, getUnlockedBadgeIds, getBadgeCurrent, BADGE_DEFS } from "@/lib/xp";

/* ─── زر البروفايل (يسار) + اللوحة المنزلقة ─── */

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window !== "undefined" ? loadTheme() : "dark"
  );

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button onClick={toggle} className={`btn-icon ${className}`} aria-label="تبديل الوضع">
      {theme === "dark" ? "نهار" : "ليل"}
    </button>
  );
}

export default function ProfileButton({ asTrigger = true }: { asTrigger?: boolean }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<DarbUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({ streak: 0, silver: 0, hours: 0, sessions: 0 });
  const [rawStats, setRawStats] = useState<DarbStats | null>(null);
  const [vaultCount, setVaultCount] = useState(0);
  const [planId, setPlanId] = useState<PlanId>("free");
  const [openBadge, setOpenBadge] = useState<string | null>(null);

  // نتائجي
  const [results, setResults] = useState<ExamResult[]>([]);
  const [resExam, setResExam]   = useState("");
  const [resScore, setResScore] = useState("");
  const [resDate, setResDate]   = useState("");
  const [resErr, setResErr]     = useState("");
  // نطاق درجة الاختبار المختار: undefined=غير معروف · null=بلا درجة · كائن=نطاق
  const resRange = resExam ? scoreRangeForTitle(resExam) : undefined;
  const examHasNoScore = resRange === null;

  /* فتح البروفايل عن بُعد — يستخدمه اسم الترحيب في الرئيسية */
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("darb:openProfile", handler);
    return () => window.removeEventListener("darb:openProfile", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      const u = loadUser();
      setUser(u);
      setEditName(u?.name ?? "");
      const s = loadStats();
      setRawStats(s);
      setStats({
        streak: computeStreak(s),
        silver: s.silver,
        hours: Math.floor(s.totalFocusMins / 60),
        sessions: s.sessionsCount,
      });
      setPlanId(getPlan());
      setResults(loadResults());
      // عدد عناصر الخزنة
      try {
        const vaultRaw = localStorage.getItem("darb_vault");
        const vault = vaultRaw ? JSON.parse(vaultRaw) : [];
        setVaultCount(Array.isArray(vault) ? vault.length : 0);
      } catch {
        setVaultCount(0);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [open]);

  const addResult = () => {
    const exam = resExam.trim();
    if (!exam) return;
    // تحقق من الدرجة حسب سُلّم الاختبار (CPC/ITC بلا درجة، آيلتس ١-٩، إلخ)
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

  const saveName = () => {
    if (!user || !editName.trim()) return;
    const next = { ...user, name: editName.trim() };
    saveUser(next);
    setUser(next);
    setEditing(false);
    syncUser({ name: next.name });
  };

  const modal = open && typeof document !== "undefined" && createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/55 fade-in" />
          <div
            className="relative w-full max-w-lg rounded-t-3xl p-6 pb-10 slide-up"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none", maxHeight: "82vh", overflowY: "auto", overscrollBehavior: "contain" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* رأس اللوحة: زر رجوع + مقبض */}
            <div className="flex items-center justify-between mb-5">
              <div className="w-10 h-1.5 rounded-full bg-[var(--border)]" />
              <button
                onClick={() => setOpen(false)}
                className="text-[17px] font-bold px-3 py-1.5 rounded-xl"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-dim)" }}
              >
                رجوع ←
              </button>
            </div>

            {/* الاسم */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}
              >
                {(user?.name ?? "د").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                {editing ? (
                  <div className="flex gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={20}
                      autoFocus
                      className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-base text-[var(--text)] outline-none"
                      style={{ background: "var(--surface2)", border: "1.5px solid var(--accent)" }}
                    />
                    <button onClick={saveName} className="px-4 rounded-xl font-bold" style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>✓</button>
                  </div>
                ) : (
                  <>
                    <p className="font-black text-xl text-[var(--text)] truncate">{user?.name ?? "—"}</p>
                    <button onClick={() => setEditing(true)} className="text-sm text-[var(--accent-light)] font-semibold mt-0.5">
                      تعديل الاسم
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* الباقة الحالية */}
            <button
              onClick={() => { setOpen(false); window.location.href = "/pricing"; }}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 mb-6 text-right transition active:scale-[0.99]"
              style={{
                background: `color-mix(in srgb, ${PLAN_COLORS[planId]} 10%, var(--surface2))`,
                border: `1.5px solid color-mix(in srgb, ${PLAN_COLORS[planId]} 45%, transparent)`,
              }}
            >
              <span className="text-lg">{planId === "free" ? "○" : "✦"}</span>
              <span className="flex-1">
                <span className="block text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>باقتك الحالية</span>
                <span className="block font-black text-[15px]" style={{ color: PLAN_COLORS[planId] }}>{PLAN_NAMES[planId]}</span>
              </span>
              <span className="text-[13px] font-bold" style={{ color: "var(--accent-light)" }}>
                {planId === "free" ? "ترقية ←" : "تغيير ←"}
              </span>
            </button>

            {/* XP + المستوى */}
            {rawStats && (() => {
              const xp = computeXP(rawStats);
              const level = getLevel(xp);
              return (
                <div className="rounded-2xl px-4 py-4 mb-6" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" style={{ color: level.color }}>{level.icon}</span>
                      <span className="font-black text-[15px]" style={{ color: level.color }}>{level.name}</span>
                    </div>
                    <span className="font-mono-nums text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>{xp.toLocaleString("ar")} XP</span>
                  </div>
                  <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${level.progress}%`, background: level.color }} />
                  </div>
                  {level.next && (
                    <p className="text-[12px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                      {level.next.name} — يحتاج {level.next.minXp.toLocaleString("ar")} XP
                    </p>
                  )}
                </div>
              );
            })()}

            {/* الشارات */}
            {rawStats && (() => {
              const unlockedIds = new Set(getUnlockedBadgeIds(rawStats, vaultCount));
              const active = openBadge ? BADGE_DEFS.find((b) => b.id === openBadge) : null;
              const activeUnlocked = active ? unlockedIds.has(active.id) : false;
              const current = active ? getBadgeCurrent(active.id, rawStats, vaultCount) : 0;
              const pct = active ? Math.min(100, Math.round((current / active.goal) * 100)) : 0;
              return (
                <div className="mb-6">
                  <p className="label mb-1">شاراتك</p>
                  <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>اضغط أي شارة لتعرف كيف تكسبها وكم بقي عليك</p>
                  <div className="grid grid-cols-3 gap-2">
                    {BADGE_DEFS.map((b) => {
                      const unlocked = unlockedIds.has(b.id);
                      const isOpen = openBadge === b.id;
                      return (
                        <button key={b.id}
                          onClick={() => setOpenBadge(isOpen ? null : b.id)}
                          className="relative rounded-2xl p-3 flex flex-col items-center gap-1 text-center transition active:scale-[0.97]"
                          style={{
                            background: unlocked ? "color-mix(in srgb, var(--accent) 10%, var(--surface2))" : "var(--surface2)",
                            border: `1.5px solid ${isOpen ? "var(--accent)" : unlocked ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "var(--border)"}`,
                            opacity: unlocked ? 1 : 0.5,
                          }}>
                          {/* علامة الاستفسار */}
                          <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black"
                            style={{ background: "var(--border)", color: "var(--text-muted)" }}>؟</span>
                          <span className="text-2xl">{b.icon}</span>
                          <p className="text-[12px] font-bold leading-tight" style={{ color: unlocked ? "var(--text)" : "var(--text-muted)" }}>{b.label}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* تفاصيل الشارة المختارة: كيف تكسبها + التقدّم */}
                  {active && (
                    <div className="rounded-2xl px-4 py-4 mt-3"
                      style={{ background: "var(--surface2)", border: "1.5px solid var(--accent)" }}>
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
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: activeUnlocked ? "var(--gold)" : "var(--accent)" }} />
                      </div>
                      <p className="font-mono-nums text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>
                        {Math.min(current, active.goal).toLocaleString("ar")} / {active.goal.toLocaleString("ar")} {active.unit}
                        {!activeUnlocked && current < active.goal && (
                          <span> — بقي {(active.goal - current).toLocaleString("ar")} {active.unit}</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* الإحصاءات الحقيقية */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[
                { val: stats.streak,   label: "ستريك",  icon: "🔥" },
                { val: stats.silver,   label: "فضة",  icon: "" },
                (rawStats?.totalFocusMins ?? 0) < 60
                  ? { val: String(rawStats?.totalFocusMins ?? 0), label: "دقيقة", icon: "" }
                  : { val: ((rawStats?.totalFocusMins ?? 0) / 60).toFixed(1).replace(/\.0$/, ""), label: "ساعة", icon: "" },
                { val: stats.sessions, label: "جلسة",    icon: "" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {s.icon && <p className="text-base">{s.icon}</p>}
                  <p className="font-mono-nums font-black text-lg text-[var(--text)]">{s.val}</p>
                  <p className="text-[17px] text-[var(--text-muted)] font-semibold">{s.label}</p>
                </div>
              ))}
            </div>

            {/* نتائجي — سجل نتائج الاختبارات */}
            <p className="label mb-3">نتائجي</p>
            <div className="mb-6">
              {results.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  {results.map((r) => (
                    <div key={r.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
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
                  className="flex-1 min-w-0 rounded-2xl px-4 py-3 text-[15px] text-[var(--text)] outline-none"
                  style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }}>
                  <option value="">اختر الاختبار</option>
                  {TRACKS.map((t) => (
                    <option key={t.id} value={t.title}>{t.title}</option>
                  ))}
                </select>
                <input value={resScore} inputMode="decimal"
                  onChange={(e) => { setResScore(e.target.value); setResErr(""); }}
                  disabled={examHasNoScore}
                  placeholder={examHasNoScore ? "بلا درجة" : "الدرجة"} maxLength={6}
                  className="w-24 rounded-2xl px-3 py-3 text-[15px] text-center text-[var(--text)] placeholder-[var(--text-muted)] outline-none disabled:opacity-40"
                  style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }} />
              </div>
              {resExam && resRange && (
                <p className="text-[12px] mb-2 px-1" style={{ color: "var(--text-muted)" }}>الدرجة: {resRange.hint}</p>
              )}
              {examHasNoScore && (
                <p className="text-[12px] mb-2 px-1" style={{ color: "var(--text-muted)" }}>هذا الاختبار برنامج قبول/تدريب — ما له درجة رقمية.</p>
              )}
              {resErr && (
                <p className="text-[12px] mb-2 px-1 font-bold" style={{ color: "var(--danger)" }}>{resErr}</p>
              )}
              <div className="flex gap-2">
                <input type="date" value={resDate} onChange={(e) => setResDate(e.target.value)}
                  className="flex-1 rounded-2xl px-4 py-3 text-[15px] text-[var(--text)] outline-none"
                  style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", colorScheme: "dark" }} />
                <button onClick={addResult} disabled={!resExam.trim()}
                  className="px-5 rounded-2xl font-black text-[15px]"
                  style={{ background: resExam.trim() ? "var(--accent)" : "var(--surface2)", color: resExam.trim() ? "white" : "var(--text-muted)", border: "none" }}>
                  أضف
                </button>
              </div>
            </div>
          </div>
    </div>,
    document.body
  );

  /* وضع بلا زر — اللوحة فقط (تُفتح عبر darb:openProfile من اسم الترحيب) */
  if (!asTrigger) return <>{modal}</>;

  return (
    <>
      {/* الزر — في يسار الهيدر، لونه أزرق ليلي أو ذهبي نهاري */}
      <button onClick={() => setOpen(true)} aria-label="البروفايل"
        className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition active:scale-95"
        style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--accent-2), var(--accent-light))" }}>
          {(user?.name ?? "د").charAt(0)}
        </div>
        <span className="text-[12px] font-bold max-w-[60px] truncate">{user?.name ?? "بروفايل"}</span>
      </button>

      {modal}
    </>
  );
}
