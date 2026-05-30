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

  const radius        = 108;
  const circumference = 2 * Math.PI * radius;
  const dashOffset    = circumference * (1 - progress);
  const strokeColor   = phase === "break" ? "var(--gold)" : "var(--teal)";

  return (
    <div className="min-h-dvh bg-[var(--bg)] flex flex-col" style={{ paddingBottom: "calc(var(--nav-h) + 16px)" }}>

      {/* Header */}
      <div className="anim-1 flex items-center justify-between px-5 pt-12 pb-4">
        <div>
          <h1 className="font-black text-xl text-[var(--text)]">أوربت</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">50 تركيز · 10 راحة</p>
        </div>
        <div className="stat-chip">
          <span>🪙</span>
          <span className="font-mono-nums font-bold text-[var(--gold)]">{silverEarned}</span>
        </div>
      </div>

      {/* Subject pills — only when idle */}
      {phase === "idle" && (
        <div className="anim-2 px-5 pb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition"
                style={subject === s
                  ? { background: "var(--teal)", color: "#0D0D0D" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timer circle */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 anim-2">
        <div className="relative mb-8">
          <svg width="256" height="256" className="-rotate-90">
            <circle cx="128" cy="128" r={radius} fill="none" stroke="var(--border)" strokeWidth="5" />
            <circle
              cx="128" cy="128" r={radius} fill="none"
              stroke={strokeColor} strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
            />
          </svg>

          {/* Glow ring when active */}
          {phase === "focus" && (
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: "0 0 48px var(--teal-glow)" }} />
          )}
          {phase === "break" && (
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: "0 0 48px var(--gold-glow)" }} />
          )}

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {phase === "idle" && (
              <>
                <p className="font-mono-nums font-black text-[52px] leading-none text-white">50:00</p>
                <p className="text-sm text-[var(--text-muted)] mt-2">{subject}</p>
              </>
            )}
            {(phase === "focus" || phase === "break") && (
              <>
                <p className="font-mono-nums font-black text-[52px] leading-none" style={{ color: strokeColor }}>
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </p>
                <p className="text-sm mt-2" style={{ color: strokeColor }}>
                  {phase === "focus" ? "تركيز" : "راحة"}
                </p>
                {phase === "focus" && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">{subject}</p>
                )}
              </>
            )}
            {phase === "done" && (
              <>
                <p className="text-5xl">✅</p>
                <p className="text-sm font-bold text-[var(--success)] mt-3">أحسنت!</p>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="w-full max-w-xs flex flex-col gap-3 anim-3">
          {phase === "idle" && (
            <button onClick={startFocus} className="btn-teal">
              ابدأ الجلسة
            </button>
          )}
          {phase === "focus" && (
            <button
              onClick={reset}
              className="w-full py-4 rounded-2xl font-bold text-sm transition"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--danger)" }}
            >
              إيقاف — تخسر الجلسة
            </button>
          )}
          {phase === "break" && (
            <div className="rounded-2xl px-4 py-4 text-center"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="font-bold text-[var(--gold)] mb-1">وقت الراحة ☕</p>
              <p className="text-xs text-[var(--text-muted)]">
                تبدأ تلقائياً خلال {String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
              </p>
            </div>
          )}
          {phase === "done" && (
            <div className="flex flex-col gap-2">
              <div className="rounded-2xl p-4 text-center"
                style={{ background: "var(--surface)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <p className="font-black text-xl text-[var(--gold)]">+10 Silver 🪙</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">جلسة {sessionsToday} اليوم</p>
              </div>
              <button onClick={startFocus} className="btn-teal">جلسة أخرى</button>
              <button onClick={reset} className="w-full py-2 text-sm text-[var(--text-muted)]">
                توقف اليوم
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats footer */}
      <div className="px-5 pb-2 anim-4">
        <div
          className="grid grid-cols-3 divide-x divide-x-reverse divide-[var(--border)] overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "18px" }}
        >
          {[
            { val: sessionsToday,   label: "جلسات",  color: "var(--blue-light)" },
            { val: totalFocusMins,  label: "دقيقة",  color: "var(--gold)"       },
            { val: silverEarned,    label: "Silver",  color: "var(--success)"    },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-4">
              <p className="font-mono-nums font-black text-2xl leading-none" style={{ color: s.color }}>{s.val}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
