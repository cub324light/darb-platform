"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TRACKS, getTrack, type TrackId } from "@/lib/tracks";
import {
  loadUser, saveUser, loadStats, computeStreak,
  loadTheme, applyTheme, resetAll,
  loadExamDate, saveExamDate,
  type DarbUser, type Theme,
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
  }, [open]);

  const track = getTrack(user?.track);

  const saveName = () => {
    if (!user || !editName.trim()) return;
    const next = { ...user, name: editName.trim() };
    saveUser(next);
    setUser(next);
    setEditing(false);
    syncUser({ name: next.name });
  };

  const switchTrack = (id: TrackId) => {
    if (!user) return;
    const next = { ...user, track: id };
    saveUser(next);
    setUser(next);
    syncUser({ track: id });
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
              <ThemeToggle />
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

            {/* المسار */}
            <p className="label mb-3">مسارك</p>
            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {TRACKS.map((t) => {
                const active = t.id === track.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => switchTrack(t.id)}
                    className="rounded-2xl p-3.5 text-right transition active:scale-[0.98] relative"
                    style={{
                      background: active ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--surface2)",
                      border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    {active && <span className="absolute top-2 left-2.5 text-[var(--accent-light)] text-base font-black">✓</span>}
                    <p className="font-bold text-[15px] text-[var(--text)]">{t.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{t.sub}</p>
                  </button>
                );
              })}
            </div>

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
