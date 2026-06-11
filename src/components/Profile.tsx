"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TRACKS, getTrack, type TrackId } from "@/lib/tracks";
import {
  loadUser, saveUser, loadStats, computeStreak,
  loadTheme, applyTheme, resetAll,
  type DarbUser, type Theme,
} from "@/lib/storage";

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
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

export default function ProfileButton() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<DarbUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({ streak: 0, silver: 0, hours: 0, sessions: 0 });

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
  }, [open]);

  const track = getTrack(user?.track);

  const saveName = () => {
    if (!user || !editName.trim()) return;
    const next = { ...user, name: editName.trim() };
    saveUser(next);
    setUser(next);
    setEditing(false);
  };

  const switchTrack = (id: TrackId) => {
    if (!user) return;
    const next = { ...user, track: id };
    saveUser(next);
    setUser(next);
  };

  const reset = () => {
    if (!confirm("متأكد؟ راح ينمسح كل شيء وتبدأ من الصفر.")) return;
    resetAll();
    window.location.href = "/onboarding";
  };

  const modal = open && typeof document !== "undefined" && createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/55 fade-in" />
          <div
            className="relative w-full max-w-lg rounded-t-3xl p-6 pb-10 slide-up"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* مقبض */}
            <div className="w-12 h-1.5 rounded-full bg-[var(--border)] mx-auto mb-6" />

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
                    <button onClick={saveName} className="px-4 rounded-xl font-bold text-white" style={{ background: "var(--accent)" }}>✓</button>
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
                { val: stats.silver,   label: "Silver",  icon: "🪙" },
                { val: stats.hours,    label: "ساعة",    icon: "⏱" },
                { val: stats.sessions, label: "جلسة",    icon: "🎯" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <p className="text-base">{s.icon}</p>
                  <p className="font-mono-nums font-black text-lg text-[var(--text)]">{s.val}</p>
                  <p className="text-[11px] text-[var(--text-muted)] font-semibold">{s.label}</p>
                </div>
              ))}
            </div>

            {/* المسار */}
            <p className="label mb-3">مسارك</p>
            <div className="flex flex-col gap-2.5 mb-6">
              {TRACKS.map((t) => {
                const active = t.id === track.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => switchTrack(t.id)}
                    className="w-full rounded-2xl p-4 flex items-center gap-3 text-right transition active:scale-[0.98]"
                    style={{
                      background: active ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--surface2)",
                      border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-base text-[var(--text)]">{t.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{t.sub}</p>
                    </div>
                    {active && <span className="text-[var(--accent-light)] text-lg font-black">✓</span>}
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
