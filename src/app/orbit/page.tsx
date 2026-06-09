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

const SUBJECT_COLORS: Record<string, string> = {
  "فيزياء":  "#3B82F6",
  "رياضيات": "#8B5CF6",
  "كيمياء":  "#06B6D4",
  "أحياء":   "#22C55E",
  "إنجليزي": "#94A3B8",
};

interface OrbitData {
  totalSessions: number; totalSilver: number; totalFocusMins: number;
  streak: number; sessionsToday: number; lastActiveDate: string;
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
  const [phase, setPhase]               = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft]   = useState(FOCUS_SECS);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [silverEarned, setSilverEarned] = useState(0);
  const [totalFocusMins, setTotalFocusMins] = useState(0);
  const [subject, setSubject]           = useState<string>("فيزياء");
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
      const osc  = ctx.createOscillator();
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
    const data    = loadOrbit();
    const today   = todayStr();
    const isToday = data.lastActiveDate === today;
    const newSessions = isToday ? data.sessionsToday + 1 : 1;
    const newStreak   = data.lastActiveDate === yesterdayStr()
      ? data.streak + 1 : isToday ? data.streak : 1;
    const updated: OrbitData = {
      totalSessions:  data.totalSessions + 1,
      totalSilver:    data.totalSilver + 10,
      totalFocusMins: data.totalFocusMins + FOCUS_MINS,
      streak:         newStreak,
      sessionsToday:  newSessions,
      lastActiveDate: today,
    };
    saveOrbit(updated);
    setPhase("break"); setSecondsLeft(BREAK_SECS);
    setSessionsToday(newSessions);
    setSilverEarned(newSessions * 10);
    setTotalFocusMins(newSessions * FOCUS_MINS);
    playBeep();
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

  const R             = 118;
  const circumference = 2 * Math.PI * R;
  const dashOffset    = circumference * (1 - progress);
  const isBreak       = phase === "break";
  const ringColor     = isBreak ? "var(--gold)" : "var(--blue)";
  const glowColor     = isBreak ? "rgba(245,158,11,0.12)" : "rgba(37,99,235,0.14)";

  const timeDisplay = phase === "idle"
    ? "50:00"
    : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#000", paddingBottom: "calc(var(--nav-h) + 8px)" }}>

      {/* Ambient glow */}
      {phase !== "idle" && phase !== "done" && (
        <div className="fixed inset-0 pointer-events-none transition-all duration-1000"
          style={{ background: `radial-gradient(ellipse 60% 40% at 50% 45%, ${glowColor} 0%, transparent 70%)` }} />
      )}

      {/* Header */}
      <div className="anim-1 flex items-center justify-between px-5 pt-12 pb-2 relative z-10">
        <h1 className="font-black text-lg text-white">أوربت</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)" }}>
          <span className="font-mono-nums font-black text-base" style={{ color: "var(--gold)" }}>{silverEarned}</span>
          <span className="text-sm">🪙</span>
        </div>
      </div>

      {/* HERO: Ring — takes all flex-1 space, ring centered within it */}
      <div className="flex-1 flex items-center justify-center px-5 anim-2 relative z-10">
        <div className="relative" style={{ width: "296px", height: "296px" }}>

          {/* Glow ring */}
          {phase !== "idle" && phase !== "done" && (
            <div className="absolute inset-0 rounded-full pointer-events-none ring-pulse"
              style={{ boxShadow: `0 0 100px ${isBreak ? "rgba(245,158,11,0.1)" : "rgba(37,99,235,0.12)"}` }} />
          )}

          <svg width="296" height="296" className="absolute inset-0 -rotate-90">
            <circle cx="148" cy="148" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
            {phase === "idle" && (
              <circle cx="148" cy="148" r={R} fill="none"
                stroke="var(--blue)" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={circumference * 0.72}
                style={{ opacity: 0.42 }} />
            )}
            {(phase === "focus" || phase === "break") && (
              <circle cx="148" cy="148" r={R} fill="none"
                stroke={ringColor} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }} />
            )}
            {phase === "done" && (
              <circle cx="148" cy="148" r={R} fill="none"
                stroke="var(--success)" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={0}
                style={{ opacity: 0.35 }} />
            )}
          </svg>

          {/* Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {phase === "done" ? (
              <div className="text-center scale-in">
                <p className="text-6xl mb-2">✅</p>
                <p className="text-sm font-black" style={{ color: "var(--success)" }}>أحسنت!</p>
              </div>
            ) : (
              <>
                <p className="font-mono-nums font-black leading-none"
                  style={{ fontSize: "54px", color: phase === "idle" ? "white" : ringColor }}>
                  {timeDisplay}
                </p>
                <p className="text-sm font-bold"
                  style={{ color: phase === "idle" ? "var(--text-muted)" : ringColor }}>
                  {phase === "idle" ? subject : isBreak ? "استرح ☕" : "تركيز 🎯"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Controls — anchored below ring, above footer stats */}
      <div className="px-5 pb-5 relative z-10 anim-3">
        <div className="w-full max-w-xs mx-auto flex flex-col gap-3">
          {phase === "idle" && (
            <>
              <div className="flex flex-wrap gap-2 justify-center pb-1">
                {SUBJECTS.map((s) => (
                  <button key={s} onClick={() => setSubject(s)}
                    className="px-5 py-2 rounded-full text-sm font-bold transition-all active:scale-95"
                    style={subject === s
                      ? { background: SUBJECT_COLORS[s] ?? "var(--blue)", color: "white", boxShadow: `0 0 18px ${SUBJECT_COLORS[s] ?? "var(--blue)"}55` }
                      : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={startFocus} className="btn-primary">ابدأ الجلسة</button>
            </>
          )}
          {phase === "focus" && (
            <button onClick={reset}
              className="w-full py-4 rounded-2xl text-sm font-bold active:scale-95 transition-all"
              style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.18)", color: "var(--danger)" }}>
              إيقاف — تخسر الجلسة
            </button>
          )}
          {phase === "break" && (
            <div className="rounded-2xl px-5 py-4 text-center"
              style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.14)" }}>
              <p className="font-bold text-sm" style={{ color: "var(--gold)" }}>راحة مستحقة ☕</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                تبدأ تلقائياً {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </p>
            </div>
          )}
          {phase === "done" && (
            <div className="flex flex-col gap-2">
              <div className="rounded-2xl px-5 py-4 text-center"
                style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.14)" }}>
                <p className="font-mono-nums font-black text-2xl" style={{ color: "var(--gold)" }}>+10 🪙</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>جلسة رقم {sessionsToday} اليوم</p>
              </div>
              <button onClick={startFocus} className="btn-primary">جلسة أخرى</button>
              <button onClick={reset}
                className="w-full pt-1 pb-3 text-sm"
                style={{ color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer" }}>
                توقف اليوم
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="anim-4 px-5 pb-3 relative z-10">
        <div className="flex items-center justify-around py-4"
          style={{ borderTop: "1px solid var(--border)" }}>
          {[
            { val: sessionsToday,  label: "جلسات",  color: "var(--blue-light)" },
            { val: totalFocusMins, label: "دقيقة",  color: "var(--text)"       },
            { val: silverEarned,   label: "نقاط",   color: "var(--gold)"       },
          ].map((s, i) => (
            <div key={s.label} className="flex flex-col items-center"
              style={{ borderRight: i < 2 ? "1px solid var(--border)" : "none", flex: 1 }}>
              <p className="font-mono-nums font-black text-2xl leading-none" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
