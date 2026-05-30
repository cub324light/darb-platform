"use client";
import { useState, useEffect, useRef, useCallback, startTransition } from "react";
import BottomNav from "@/components/BottomNav";

type Phase = "idle" | "focus" | "break" | "done";

const FOCUS_MINS = 50;
const BREAK_MINS = 10;
const FOCUS_SECS = FOCUS_MINS * 60;
const BREAK_SECS = BREAK_MINS * 60;
const ORBIT_KEY  = "darb_orbit";

const SUBJECTS = ["فيزياء", "رياضيات", "كيمياء", "أحياء", "إنجليزي"] as const;

interface OrbitData {
  totalSessions: number;
  totalSilver: number;
  totalFocusMins: number;
  streak: number;
  sessionsToday: number;
  lastActiveDate: string;
}

const DEFAULTS: OrbitData = {
  totalSessions: 0, totalSilver: 0, totalFocusMins: 0,
  streak: 0, sessionsToday: 0, lastActiveDate: "",
};

function todayStr() { return new Date().toISOString().split("T")[0]; }
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}
function loadOrbit(): OrbitData {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(ORBIT_KEY) ?? "{}") }; }
  catch { return DEFAULTS; }
}
function saveOrbit(d: OrbitData) {
  try { localStorage.setItem(ORBIT_KEY, JSON.stringify(d)); } catch {}
}

export default function OrbitPage() {
  const [phase, setPhase]                   = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft]       = useState(FOCUS_SECS);
  const [sessionsToday, setSessionsToday]   = useState(0);
  const [silverEarned, setSilverEarned]     = useState(0);
  const [totalFocusMins, setTotalFocusMins] = useState(0);
  const [subject, setSubject]               = useState<string>("فيزياء");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const data = loadOrbit();
    if (data.lastActiveDate === todayStr()) {
      startTransition(() => {
        setSessionsToday(data.sessionsToday);
        setSilverEarned(data.sessionsToday * 10);
        setTotalFocusMins(data.sessionsToday * FOCUS_MINS);
      });
    }
  }, []);

  const totalSecs = phase === "break" ? BREAK_SECS : FOCUS_SECS;
  const progress  = 1 - secondsLeft / totalSecs;
  const mins      = Math.floor(secondsLeft / 60);
  const secs      = secondsLeft % 60;

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }, []);

  const startFocus = useCallback(() => {
    setPhase("focus"); setSecondsLeft(FOCUS_SECS);
  }, []);

  const startBreak = useCallback(() => {
    const data = loadOrbit(); const today = todayStr(); const isToday = data.lastActiveDate === today;
    const newSessionsToday = isToday ? data.sessionsToday + 1 : 1;
    const newStreak = data.lastActiveDate === yesterdayStr() ? data.streak + 1 : isToday ? data.streak : 1;
    const updated: OrbitData = {
      totalSessions: data.totalSessions + 1, totalSilver: data.totalSilver + 10,
      totalFocusMins: data.totalFocusMins + FOCUS_MINS,
      streak: newStreak, sessionsToday: newSessionsToday, lastActiveDate: today,
    };
    saveOrbit(updated);
    setPhase("break"); setSecondsLeft(BREAK_SECS);
    setSessionsToday(newSessionsToday); setSilverEarned(newSessionsToday * 10);
    setTotalFocusMins(newSessionsToday * FOCUS_MINS); playBeep();
  }, [playBeep]);

  const finishBreak = useCallback(() => { setPhase("done"); playBeep(); }, [playBeep]);

  const reset = useCallback(() => {
    setPhase("idle"); setSecondsLeft(FOCUS_SECS);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (phase === "idle" || phase === "done") {
      if (intervalRef.current) clearInterval(intervalRef.current); return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (phase === "focus") { startBreak(); return BREAK_SECS; }
          else { finishBreak(); return 0; }
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, startBreak, finishBreak]);

  const R             = 100;
  const circumference = 2 * Math.PI * R;
  const dashOffset    = circumference * (1 - progress);
  const isBreak       = phase === "break";
  const accentColor   = isBreak ? "var(--gold)" : "var(--blue-light)";

  return (
    <div className="min-h-dvh bg-[var(--bg)] flex flex-col" style={{ paddingBottom: "calc(var(--nav-h) + 8px)" }}>

      {/* Header */}
      <div className="anim-1 flex items-center justify-between px-6 pt-12 pb-2">
        <div>
          <h1 className="font-black text-xl text-white">أوربت</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">50 تركيز · 10 راحة</p>
        </div>
        <div className="text-left">
          <p className="font-mono-nums font-black text-xl text-[var(--gold)]">{silverEarned}</p>
          <p className="text-[10px] text-[var(--text-muted)] text-right">Silver</p>
        </div>
      </div>

      {/* Subject pills — idle only */}
      {phase === "idle" && (
        <div className="anim-2 px-6 py-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {SUBJECTS.map((s) => (
              <button key={s} onClick={() => setSubject(s)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all"
                style={subject === s
                  ? { background: "var(--blue)", color: "white" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* HERO: Timer — fills remaining space */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 anim-2">
        <div className="relative" style={{ width: "256px", height: "256px" }}>

          {/* Outer glow when active */}
          {phase !== "idle" && phase !== "done" && (
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: `0 0 60px ${isBreak ? "rgba(245,158,11,0.2)" : "rgba(37,99,235,0.2)"}` }} />
          )}

          <svg width="256" height="256" className="absolute inset-0 -rotate-90">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1D4ED8" />
                <stop offset="100%" stopColor="#60A5FA" />
              </linearGradient>
            </defs>
            {/* Track */}
            <circle cx="128" cy="128" r={R} fill="none" stroke="var(--border)" strokeWidth="8" />
            {/* Progress */}
            <circle cx="128" cy="128" r={R} fill="none"
              stroke={isBreak ? "var(--gold)" : "url(#ringGrad)"}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.6s ease" }}
            />
          </svg>

          {/* Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {phase === "done" ? (
              <div className="text-center">
                <p className="text-5xl mb-2">✅</p>
                <p className="text-sm font-black text-[var(--success)]">أحسنت!</p>
              </div>
            ) : (
              <>
                <p className="font-mono-nums font-black leading-none"
                  style={{ fontSize: "54px", color: phase === "idle" ? "white" : accentColor }}>
                  {phase === "idle"
                    ? "50:00"
                    : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
                </p>
                <p className="text-xs font-bold mt-2.5"
                  style={{ color: phase === "idle" ? "var(--text-muted)" : accentColor }}>
                  {phase === "idle" ? subject : isBreak ? "استرح" : "تركيز"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="w-full max-w-sm mt-10 flex flex-col gap-3 anim-3">
          {phase === "idle" && (
            <button onClick={startFocus} className="btn-primary">
              ابدأ الجلسة
            </button>
          )}
          {phase === "focus" && (
            <button onClick={reset}
              className="w-full py-4 rounded-2xl text-sm font-bold transition"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)" }}>
              إيقاف — تخسر الجلسة
            </button>
          )}
          {phase === "break" && (
            <div className="rounded-2xl px-5 py-4 text-center"
              style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
              <p className="font-bold text-sm text-[var(--gold)]">راحة مستحقة ☕</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                تبدأ تلقائياً {String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
              </p>
            </div>
          )}
          {phase === "done" && (
            <div className="flex flex-col gap-2">
              <div className="rounded-2xl px-5 py-4 text-center"
                style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <p className="font-mono-nums font-black text-2xl text-[var(--gold)]">+10 🪙</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">جلسة رقم {sessionsToday} اليوم</p>
              </div>
              <button onClick={startFocus} className="btn-primary">جلسة أخرى</button>
              <button onClick={reset} className="w-full pt-1 pb-3 text-sm text-[var(--text-muted)]">
                توقف اليوم
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer stats — plain numbers, no cards */}
      <div className="anim-4 px-6 pb-3">
        <div className="flex items-center justify-around py-4"
          style={{ borderTop: "1px solid var(--border)" }}>
          {[
            { val: sessionsToday,  label: "جلسات",  color: "var(--blue-light)" },
            { val: totalFocusMins, label: "دقيقة",  color: "var(--text)"       },
            { val: silverEarned,   label: "Silver",  color: "var(--gold)"       },
          ].map((s, i) => (
            <div key={s.label} className="flex flex-col items-center"
              style={{ borderRight: i < 2 ? "1px solid var(--border)" : "none", flex: 1 }}>
              <p className="font-mono-nums font-black text-2xl leading-none" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
