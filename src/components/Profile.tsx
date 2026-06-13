"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TRACKS, TRACK_GROUPS, getTrack, type TrackId } from "@/lib/tracks";
import {
  loadUser, saveUser, loadStats, computeStreak,
  loadTheme, applyTheme, resetAll,
  loadExamDate, saveExamDate,
  loadDashConfig, saveDashConfig,
  type DarbUser, type Theme, type DashConfig,
} from "@/lib/storage";
import { syncUser } from "@/lib/firestore";
import {
  onAuth, signIn, signUp, signOutUser, authErrorMsg,
  pushBackup, pullBackup,
} from "@/lib/cloud";
import type { User } from "firebase/auth";
import type { FirebaseError } from "firebase/app";

/* ─── زر البروفايل (يسار) + اللوحة المنزلقة ─── */

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => { setTheme(loadTheme()); }, []);

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

export default function ProfileButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<DarbUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({ streak: 0, silver: 0, hours: 0, sessions: 0 });
  const [examDate, setExamDate] = useState("");
  const [theme, setThemeState]      = useState<Theme>("dark");
  const [activeTracksState, setActiveTracksState] = useState<TrackId[]>([]);
  const [dashConfig, setDashConfig] = useState<DashConfig | null>(null);

  // الحساب السحابي
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [syncMsg, setSyncMsg] = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => onAuth(setAuthUser), []);

  const submitAuth = async () => {
    setAuthErr("");
    if (!authEmail.trim() || authPass.length < 6) {
      setAuthErr("اكتب الإيميل وكلمة مرور ٦ أحرف على الأقل");
      return;
    }
    setAuthBusy(true);
    try {
      if (authMode === "signup") {
        await signUp(authEmail, authPass);
        await pushBackup(); // ارفع بياناتك الحالية للسحابة
        setSyncMsg("تم إنشاء الحساب وحفظ بياناتك ☁️");
        setAuthOpen(false);
      } else {
        await signIn(authEmail, authPass);
        const restored = await pullBackup();
        if (restored) {
          window.location.reload(); // حمّل بياناتك المسترجعة
          return;
        }
        await pushBackup();
        setSyncMsg("تم تسجيل الدخول ☁️");
        setAuthOpen(false);
      }
      setAuthPass("");
    } catch (e) {
      setAuthErr(authErrorMsg((e as FirebaseError)?.code ?? ""));
    } finally {
      setAuthBusy(false);
    }
  };

  const manualSync = async () => {
    setSyncMsg("جارٍ الحفظ…");
    const ok = await pushBackup();
    setSyncMsg(ok ? "تم الحفظ في السحابة ✓" : "تعذّر الحفظ — تأكد من الاتصال");
  };

  const doSignOut = async () => {
    await pushBackup();
    await signOutUser();
    setSyncMsg("");
  };

  useEffect(() => {
    if (!open) return;
    const u = loadUser();
    setUser(u);
    setEditName(u?.name ?? "");
    const s = loadStats();
    setStats({
      streak: computeStreak(s),
      silver: s.silver,
      hours: Math.floor(s.totalFocusMins / 60),
      sessions: s.sessionsCount,
    });
    setExamDate(loadExamDate() ?? "");
    setThemeState(loadTheme());
    setActiveTracksState(u?.activeTracks ?? (u?.track ? [u.track] : []));
    setDashConfig(loadDashConfig());
  }, [open]);

  const switchTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
  };

  const toggleActiveTrack = (id: TrackId) => {
    setActiveTracksState((prev) => {
      const next = prev.includes(id)
        ? prev.filter((t) => t !== id)
        : prev.length >= 3 ? prev : [...prev, id];
      if (!user) return next;
      const primaryTrack = next[0] ?? user.track;
      const updated = { ...user, track: primaryTrack, activeTracks: next };
      saveUser(updated);
      setUser(updated);
      syncUser({ track: primaryTrack });
      return next;
    });
  };

  const toggleDash = (key: keyof DashConfig) => {
    setDashConfig((prev) => {
      const next = prev ? { ...prev, [key]: !prev[key] } : loadDashConfig();
      next[key] = !next[key];
      saveDashConfig(next);
      return next;
    });
  };

  const track = getTrack(user?.track);

  const saveName = () => {
    if (!user || !editName.trim()) return;
    const next = { ...user, name: editName.trim() };
    saveUser(next);
    setUser(next);
    setEditing(false);
    syncUser({ name: next.name });
  };

  const reset = () => {
    if (!confirm("متأكد؟ راح ينمسح كل شيء وتبدأ من الصفر.")) return;
    resetAll();
    window.location.href = "/onboarding";
  };

  const modal = open && mounted && createPortal(
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

            {/* الإحصاءات الحقيقية */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[
                { val: stats.streak,   label: "ستريك",  icon: "🔥" },
                { val: stats.silver,   label: "Silver",  icon: "" },
                { val: stats.hours,    label: "ساعة",    icon: "" },
                { val: stats.sessions, label: "جلسة",    icon: "" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {s.icon && <p className="text-base">{s.icon}</p>}
                  <p className="font-mono-nums font-black text-lg text-[var(--text)]">{s.val}</p>
                  <p className="text-[17px] text-[var(--text-muted)] font-semibold">{s.label}</p>
                </div>
              ))}
            </div>

            {/* المظهر — ليلي/نهاري: يبدّل الموقع كامل ولون شعار درب معاً */}
            <p className="label mb-3">المظهر</p>
            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {([
                { mode: "dark" as Theme,  title: "ليلي",  emoji: "🌙", logo: "#3B82F6" },
                { mode: "light" as Theme, title: "نهاري", emoji: "☀️", logo: "#F5B40A" },
              ]).map((o) => {
                const active = theme === o.mode;
                return (
                  <button
                    key={o.mode}
                    onClick={() => switchTheme(o.mode)}
                    className="rounded-2xl py-4 flex flex-col items-center gap-1.5 transition active:scale-[0.98]"
                    style={{
                      background: active ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--surface2)",
                      border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    <span className="font-black text-3xl" style={{ color: o.logo, textShadow: `0 0 18px color-mix(in srgb, ${o.logo} 45%, transparent)` }}>درب</span>
                    <span className="text-[13px] font-bold text-[var(--text-muted)]">{o.emoji} {o.title}</span>
                    {active && <span className="text-[11px] font-black" style={{ color: "var(--accent-light)" }}>✓ الحالي</span>}
                  </button>
                );
              })}
            </div>


            {/* الحساب السحابي */}
            <p className="label mb-3">حسابك السحابي</p>
            <div className="mb-6">
              {authUser ? (
                <div className="rounded-2xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">☁️</span>
                    <p className="font-bold text-[15px] text-[var(--text)] truncate flex-1">{authUser.email}</p>
                  </div>
                  <p className="text-[13px] text-[var(--text-muted)] mb-3">بياناتك محفوظة وتتزامن تلقائياً</p>
                  <div className="flex gap-2">
                    <button onClick={manualSync} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
                      احفظ الآن
                    </button>
                    <button onClick={doSignOut} className="px-4 py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      خروج
                    </button>
                  </div>
                  {syncMsg && <p className="text-[13px] mt-2 font-semibold" style={{ color: "var(--accent-light)" }}>{syncMsg}</p>}
                </div>
              ) : authOpen ? (
                <div className="rounded-2xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => { setAuthMode("signup"); setAuthErr(""); }}
                      className="flex-1 py-2 rounded-xl text-sm font-bold transition"
                      style={authMode === "signup"
                        ? { background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }
                        : { background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      حساب جديد
                    </button>
                    <button onClick={() => { setAuthMode("signin"); setAuthErr(""); }}
                      className="flex-1 py-2 rounded-xl text-sm font-bold transition"
                      style={authMode === "signin"
                        ? { background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }
                        : { background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      تسجيل دخول
                    </button>
                  </div>
                  <input
                    type="email" inputMode="email" dir="ltr" placeholder="الإيميل"
                    value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-base text-[var(--text)] outline-none mb-2 text-left"
                    style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
                  />
                  <input
                    type="password" dir="ltr" placeholder="كلمة المرور (٦ أحرف+)"
                    value={authPass} onChange={(e) => setAuthPass(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitAuth(); }}
                    className="w-full rounded-xl px-4 py-3 text-base text-[var(--text)] outline-none mb-2 text-left"
                    style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
                  />
                  {authErr && <p className="text-[13px] mb-2 font-semibold" style={{ color: "var(--danger)" }}>{authErr}</p>}
                  <div className="flex gap-2">
                    <button onClick={submitAuth} disabled={authBusy}
                      className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}>
                      {authBusy ? "…" : authMode === "signup" ? "أنشئ الحساب" : "دخول"}
                    </button>
                    <button onClick={() => { setAuthOpen(false); setAuthErr(""); }}
                      className="px-4 rounded-xl text-sm font-bold" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAuthOpen(true); setAuthMode("signup"); }}
                  className="w-full rounded-2xl p-4 text-right flex items-center gap-3"
                  style={{ background: "var(--surface2)", border: "1.5px dashed var(--accent)" }}>
                  <span className="text-2xl">☁️</span>
                  <span className="flex-1">
                    <span className="block font-bold text-[15px] text-[var(--text)]">سجّل دخولك واحفظ بياناتك</span>
                    <span className="block text-[13px] text-[var(--text-muted)]">عشان ما تروح لو غيّرت الجهاز</span>
                  </span>
                  <span className="text-[var(--accent-light)]">←</span>
                </button>
              )}
            </div>

            {/* تاريخ الاختبار */}
            <p className="label mb-3">تاريخ الاختبار</p>
            <div className="mb-6">
              <input
                type="date"
                value={examDate}
                onChange={(e) => { setExamDate(e.target.value); saveExamDate(e.target.value || null); }}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-2xl px-4 py-3.5 text-base text-[var(--text)] outline-none min-h-[52px]"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", colorScheme: "dark" }}
              />
              {examDate && (
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-bold" style={{ color: "var(--gold)" }}>
                    {Math.max(0, Math.round((new Date(examDate + "T00:00:00").getTime() - new Date(new Date().toISOString().slice(0,10) + "T00:00:00").getTime()) / 86400000))} يوم على الاختبار
                  </p>
                  <button
                    onClick={() => { setExamDate(""); saveExamDate(null); }}
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-muted)" }}
                  >إزالة</button>
                </div>
              )}
            </div>

            {/* المسارات — متعددة (حد أقصى 3) */}
            <div className="flex items-center gap-2 mb-3">
              <p className="label">مساراتك</p>
              <span className="text-xs px-2 py-0.5 rounded-full font-black"
                style={{
                  background: activeTracksState.length >= 3 ? "color-mix(in srgb, var(--gold) 15%, transparent)" : "color-mix(in srgb, var(--accent) 12%, transparent)",
                  color: activeTracksState.length >= 3 ? "var(--gold)" : "var(--accent-light)",
                }}>
                {activeTracksState.length}/3
              </span>
            </div>
            <div className="flex flex-col gap-3.5 mb-6">
              {TRACK_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-black tracking-widest mb-2 px-0.5"
                    style={{ color: "var(--text-muted)" }}>
                    ── {group.label} ──
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.ids.map((id) => {
                      const t = TRACKS.find((tr) => tr.id === id)!;
                      const selected = activeTracksState.includes(id);
                      const disabled = !selected && activeTracksState.length >= 3;
                      return (
                        <button key={t.id} onClick={() => !disabled && toggleActiveTrack(t.id)}
                          className="rounded-xl p-3 text-right transition active:scale-[0.98] relative"
                          style={{
                            background: selected ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--surface2)",
                            border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                            opacity: disabled ? 0.38 : 1,
                          }}>
                          {selected && <span className="absolute top-2 left-2.5 text-[var(--accent-light)] text-sm font-black">✓</span>}
                          <p className="font-bold text-[14px] text-[var(--text)]">{t.title}</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-snug">{t.sub}</p>
                          {t.subjects.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {t.subjects.map((s) => (
                                <span key={s.name} className="w-1.5 h-1.5 rounded-full inline-block"
                                  style={{ background: s.color }} />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* تخصيص الصفحة الرئيسية */}
            {dashConfig && (
              <>
                <p className="label mb-3">تخصيص الصفحة الرئيسية</p>
                <div className="rounded-2xl overflow-hidden mb-6"
                  style={{ border: "1px solid var(--border)" }}>
                  {([
                    { key: "showStats"    as keyof DashConfig, label: "الإحصاءات" },
                    { key: "showWeekly"   as keyof DashConfig, label: "رسم الأسبوع" },
                    { key: "showSchedule" as keyof DashConfig, label: "جدول اليوم" },
                    { key: "showTools"    as keyof DashConfig, label: "الأدوات" },
                    { key: "showAI"       as keyof DashConfig, label: "دربي الذكي" },
                  ]).map(({ key, label }, i, arr) => (
                    <button key={key} onClick={() => toggleDash(key)}
                      className="w-full flex items-center justify-between px-4 py-3.5 transition"
                      style={{
                        background: "var(--surface2)",
                        borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                      }}>
                      <span className="font-bold text-[15px]" style={{ color: "var(--text)" }}>{label}</span>
                      <div className="w-10 h-5.5 rounded-full flex items-center px-0.5 transition-colors"
                        style={{ background: dashConfig[key] ? "var(--accent)" : "var(--border)", height: "22px" }}>
                        <div className="w-4 h-4 rounded-full bg-white transition-transform"
                          style={{ transform: dashConfig[key] ? "translateX(18px)" : "translateX(0)" }} />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            <button onClick={reset} className="w-full py-3.5 rounded-2xl text-sm font-bold transition"
              style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "var(--danger)" }}>
              إعادة الضبط من الصفر
            </button>
          </div>
    </div>,
    document.body
  );

  return (
    <>
      {/* الزر — في يسار الهيدر */}
      <button onClick={() => setOpen(true)} className="btn-icon" aria-label="البروفايل">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="w-6 h-6">
          <circle cx="12" cy="8" r="3.6" />
          <path strokeLinecap="round" d="M4.5 20c1.6-3.4 4.4-5 7.5-5s5.9 1.6 7.5 5" />
        </svg>
      </button>

      {modal}
    </>
  );
}
