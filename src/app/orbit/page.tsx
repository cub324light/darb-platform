"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import Companion from "@/components/Companion";

type Phase = "idle" | "focus" | "break" | "done";

const FOCUS_MINS = 50;
const BREAK_MINS = 10;
const FOCUS_SECS = FOCUS_MINS * 60;
const BREAK_SECS = BREAK_MINS * 60;
const ORBIT_KEY  = "darb_orbit";

const SUBJECTS = ["فيزياء", "رياضيات", "كيمياء", "أحياء", "لغة إنجليزية"] as const;

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
      setSessionsToday(data.sessionsToday);
      setSilverEarned(data.sessionsToday * 10);
      setTotalFocusMins(data.sessionsToday * FOCUS_MINS);
    }
  }, []);

  const totalSecs  = phase === "break" ? BREAK_SECS : FOCUS_SECS;
  const progress   = 1 - secondsLeft / totalSecs;
  const mins       = Math.floor(secondsLeft / 60);
  const secs       = secondsLeft % 60;

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

  const radius       = 110;
  const circumference = 2 * Math.PI * radius;
  const dashOffset   = circumference * (1 - progress);
  const strokeColor  = phase === "break" ? "#F59E0B" : "#2563EB";

  const companionState = phase === "focus" ? "orbit" : phase === "break" ? "break" : "idle";
  const companionMsg   =
    phase === "idle"  ? "خل الجوال يستنى. أنا أستنى نتائجك."
    : phase === "focus"  ? "50 دقيقة — لا تكسرها."
    : phase === "break"  ? "10 دقائق راحة — حرك جسمك."
    : "جلسة منجزة! +10 Silver 🪙";

  return (
    <div className="min-h-dvh bg-[var(--bg)] flex flex-col pb-nav">
      <div className="page-header">
        <h1 className="font-black text-lg text-[var(--text)]">Orbit 50/10</h1>
        <div className="stat-chip">
          <span className="text-base">🪙</span>
          <span className="font-mono-nums font-bold text-base text-[var(--blue-light)]">{silverEarned}</span>
        </div>
      </div>

      {phase === "idle" && (
        <div className="px-5 mb-5">
          <p className="text-sm font-bold text-[var(--text-muted)] mb-3">المادة التي تذاكرها:</p>
          <div className="flex gap-2 flex-wrap">
            {SUBJECTS.map((s) => (
              <button key={s} onClick={() => setSubject(s)}
                className={`px-5 py-3 rounded-2xl text-sm font-bold transition ${subject === s ? "text-white" : "text-[var(--text-dim)]"}`}
                style={subject === s ? { background: "#2563EB" } : { background: "var(--surface)", border: "1px solid var(--border)" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="relative mb-8">
          <svg width="260" height="260" className="-rotate-90">
            <circle cx="130" cy="130" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
            <circle cx="130" cy="130" r={radius} fill="none" stroke={strokeColor} strokeWidth="6"
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
              className={phase === "focus" ? "orbit-active" : ""} />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {phase === "idle" ? (
              <div className="text-center">
                <p className="text-5xl font-black font-mono-nums text-[var(--text)]">50:00</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">تركيز</p>
              </div>
            ) : phase === "done" ? (
              <div className="text-center">
                <p className="text-4xl">✅</p>
                <p className="text-sm font-bold text-[var(--success)] mt-1">منجز!</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-5xl font-black font-mono-nums" style={{ color: strokeColor }}>
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </p>
                <p className="text-sm mt-1" style={{ color: strokeColor }}>
                  {phase === "focus" ? "تركيز 🎯" : "راحة ☕"}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{subject}</p>
              </div>
            )}
          </div>

          {phase === "focus" && (
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: "0 0 40px rgba(37,99,235,0.2)", borderRadius: "50%" }} />
          )}
        </div>

        <div className="mb-6">
          <Companion birdId="falcon" state={companionState} message={companionMsg} size="md" showMessage={true} />
        </div>

        <div className="w-full max-w-xs space-y-3">
          {phase === "idle" && (
            <button onClick={startFocus}
              className="w-full py-4 rounded-2xl font-black text-white text-lg transition glow-blue"
              style={{ background: "linear-gradient(135deg, #1D4ED8, #2563EB)" }}>
              ابدأ الجلسة
            </button>
          )}
          {phase === "focus" && (
            <button onClick={reset}
              className="w-full py-3 rounded-2xl font-bold text-sm text-[var(--danger)] border border-[var(--danger)]/30 glass transition hover:bg-[var(--danger)]/10">
              إيقاف (تخسر السيلفر)
            </button>
          )}
          {phase === "break" && (
            <div className="text-center text-sm text-[var(--text-dim)] glass rounded-2xl px-4 py-3">
              <p className="font-bold text-[var(--gold)]">وقت الراحة ☕</p>
              <p className="text-xs mt-1">الجلسة القادمة تبدأ تلقائياً بعد {mins}:{String(secs).padStart(2, "0")}</p>
            </div>
          )}
          {phase === "done" && (
            <div className="space-y-2">
              <div className="glass rounded-2xl p-4 text-center">
                <p className="text-xl font-black text-[var(--gold)]">+10 Silver 🪙</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">جلسة {sessionsToday} اليوم</p>
              </div>
              <button onClick={startFocus}
                className="w-full py-4 rounded-2xl font-black text-white transition glow-blue"
                style={{ background: "#2563EB" }}>
                جلسة أخرى؟
              </button>
              <button onClick={reset} className="w-full py-2 text-sm text-[var(--text-muted)]">
                توقف لهذا اليوم
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pb-4">
        <div className="rounded-2xl p-5 grid grid-cols-3 text-center gap-3"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div>
            <p className="font-mono-nums font-black text-3xl text-[var(--blue-light)]">{sessionsToday}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">جلسات</p>
          </div>
          <div>
            <p className="font-mono-nums font-black text-3xl text-[var(--gold)]">{totalFocusMins}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">دقيقة</p>
          </div>
          <div>
            <p className="font-mono-nums font-black text-3xl text-[var(--success)]">{silverEarned}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Silver 🪙</p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
