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
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }, []);

  const startFocus = useCallback(() => {
    setPhase("focus");
    setSecondsLeft(FOCUS_SECS);
  }, []);

  const startBreak = useCallback(() => {
    const data    = loadOrbit();
    const today   = todayStr();
    const isToday = data.lastActiveDate === today;

    const newSessionsToday = isToday ? data.sessionsToday + 1 : 1;
    const newStreak        = data.lastActiveDate === yesterdayStr() ? data.streak + 1
                           : isToday ? data.streak : 1;

    const updated: OrbitData = {
      totalSessions:  data.totalSessions + 1,
      totalSilver:    data.totalSilver + 10,
      totalFocusMins: data.totalFocusMins + FOCUS_MINS,
      streak:         newStreak,
      sessionsToday:  newSessionsToday,
      lastActiveDate: today,
    };
    saveOrbit(updated);

    setPhase("break");
    setSecondsLeft(BREAK_SECS);
    setSessionsToday(newSessionsToday);
    setSilverEarned(newSessionsToday * 10);
    setTotalFocusMins(newSessionsToday * FOCUS_MINS);
    playBeep();
  }, [playBeep]);

  const finishBreak = useCallback(() => {
    setPhase("done");
    playBeep();
  }, [playBeep]);

  const reset = useCallback(() => {
    setPhase("idle");
    setSecondsLeft(FOCUS_SECS);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (phase === "idle" || phase === "done") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (phase === "focus") { startBreak(); return BREAK_SECS; }
          else                   { finishBreak(); return 0; }
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, startBreak, finishBreak]);

  const R           = 96;
  const circumference = 2 * Math.PI * R;
  const dashOffset    = circumference * (1 - progress);
  const isBreak       = phase === "break";
  const ringColor     = isBreak ? "var(--gold)" : "url(#orbitGrad)";
  const ringGlow      = isBreak ? "rgba(245,158,11,0.4)" : "rgba(37,99,235,0.4)";

  return (
    <div className="min-h-dvh bg-[var(--bg)] flex flex-col" style={{ paddingBottom: "calc(var(--nav-h) + 16px)" }}>

      {/* Header */}
      <div className="anim-1 flex items-center justify-between px-6 pt-12 pb-4">
        <div>
          <h1 className="font-black text-2xl text-white">أوربت</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 tracking-wide">50 دقيقة تركيز · 10 راحة</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <span className="text-sm">🪙</span>
          <span className="font-mono-nums font-black text-xl text-[var(--gold)]">{silverEarned}</span>
        </div>
      </div>

      {/* Subject pills */}
      {phase === "idle" && (
        <div className="anim-2 px-6 pb-5">
          <p className="label mb-3">المادة</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {SUBJECTS.map((s) => (
              <button key={s} onClick={() => setSubject(s)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition"
                style={subject === s
                  ? { background: "linear-gradient(135deg, #1D4ED8, #3B82F6)", color: "white", boxShadow: "0 2px 12px rgba(37,99,235,0.35)" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 anim-2">
        <div className="relative mb-8 flex items-center justify-center"
          style={{ width: "240px", height: "240px" }}>

          {/* Background glow */}
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${ringGlow.replace("0.4","0.07")} 0%, transparent 70%)` }} />

          <svg width="240" height="240" className="absolute inset-0 -rotate-90">
            <defs>
              <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1D4ED8" />
                <stop offset="100%" stopColor="#60A5FA" />
              </linearGradient>
            </defs>
            {/* Outer decorative ring */}
            <circle cx="120" cy="120" r="114" fill="none" stroke="rgba(255,255,255,0.04)"
              strokeWidth="1" strokeDasharray="2 8" />
            {/* Track */}
            <circle cx="120" cy="120" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            {/* Progress */}
            <circle cx="120" cy="120" r={R} fill="none"
              stroke={ringColor} strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
            />
          </svg>

          {/* Ring glow when active */}
          {(phase === "focus" || phase === "break") && (
            <div className="absolute rounded-full pointer-events-none orbit-active"
              style={{ inset: "14px", borderRadius: "50%" }} />
          )}

          {/* Center content */}
          <div className="relative flex flex-col items-center z-10">
            {phase === "idle" && (
              <>
                <p className="font-mono-nums font-black text-[52px] leading-none text-white">50:00</p>
                <p className="text-xs text-[var(--text-muted)] mt-2 tracking-widest">{subject}</p>
              </>
            )}
            {(phase === "focus" || phase === "break") && (
              <>
                <p className="font-mono-nums font-black text-[52px] leading-none"
                  style={{ color: isBreak ? "var(--gold)" : "white" }}>
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </p>
                <p className="text-sm font-bold mt-2"
                  style={{ color: isBreak ? "var(--gold)" : "var(--blue-light)" }}>
                  {isBreak ? "راحة" : "تركيز"}
                </p>
                {phase === "focus" && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">{subject}</p>
                )}
              </>
            )}
            {phase === "done" && (
              <>
                <p className="text-5xl">✅</p>
                <p className="text-sm font-black text-[var(--success)] mt-2">أحسنت!</p>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="w-full max-w-sm flex flex-col gap-3 anim-3">
          {phase === "idle" && (
            <button onClick={startFocus} className="btn-primary">
              ابدأ الجلسة
            </button>
          )}
          {phase === "focus" && (
            <button onClick={reset}
              className="w-full py-4 rounded-2xl font-bold text-sm transition"
              style={{
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.22)",
                color: "var(--danger)",
              }}>
              إيقاف — تخسر الجلسة
            </button>
          )}
          {phase === "break" && (
            <div className="rounded-2xl px-5 py-4 text-center"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <p className="font-bold text-[var(--gold)] mb-1">وقت الراحة ☕</p>
              <p className="text-xs text-[var(--text-muted)]">
                تبدأ تلقائياً خلال {String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
              </p>
            </div>
          )}
          {phase === "done" && (
            <div className="flex flex-col gap-2">
              <div className="rounded-2xl p-4 text-center"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
                <p className="font-black text-2xl text-[var(--gold)]">+10 Silver 🪙</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">جلسة رقم {sessionsToday} اليوم</p>
              </div>
              <button onClick={startFocus} className="btn-primary">جلسة أخرى</button>
              <button onClick={reset}
                className="w-full py-2.5 text-sm text-[var(--text-muted)] font-medium">
                توقف اليوم
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats footer */}
      <div className="px-6 pb-2 anim-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { val: sessionsToday,  label: "جلسات اليوم", color: "#3B82F6", bg: "rgba(37,99,235,0.08)",  bd: "rgba(37,99,235,0.15)"  },
            { val: totalFocusMins, label: "دقيقة",        color: "#F59E0B", bg: "rgba(245,158,11,0.08)", bd: "rgba(245,158,11,0.15)" },
            { val: silverEarned,   label: "Silver 🪙",    color: "#10B981", bg: "rgba(16,185,129,0.08)", bd: "rgba(16,185,129,0.15)" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-4 rounded-2xl"
              style={{ background: s.bg, border: `1px solid ${s.bd}` }}>
              <p className="font-mono-nums font-black text-2xl leading-none" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1.5 text-center leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
