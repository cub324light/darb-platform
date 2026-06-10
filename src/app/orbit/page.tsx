"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import { getTrack } from "@/lib/tracks";
import { loadUser, loadStats, recordSession } from "@/lib/storage";

type Phase = "idle" | "focus" | "break" | "done";

const FOCUS_MINS = 50;
const BREAK_MINS = 10;
const FOCUS_SECS = FOCUS_MINS * 60;
const BREAK_SECS = BREAK_MINS * 60;
const SILVER_PER_SESSION = 10;

export default function OrbitPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECS);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [silverTotal, setSilverTotal] = useState(0);
  const [totalFocusMins, setTotalFocusMins] = useState(0);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* تحميل مواد المسار + الإحصاءات الحقيقية */
  useEffect(() => {
    const track = getTrack(loadUser()?.track);
    const names = track.subjects.map((s) => s.name);
    setSubjects(names);
    setSubject(names[0] ?? "");

    const s = loadStats();
    setSilverTotal(s.silver);
    setTotalFocusMins(s.todayFocusMins);
    setSessionsToday(Math.floor(s.todayFocusMins / FOCUS_MINS));
  }, []);

  const totalSecs = phase === "break" ? BREAK_SECS : FOCUS_SECS;
  const progress = 1 - secondsLeft / totalSecs;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

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

  /* انتهاء التركيز = جلسة منجزة — نسجلها فعلياً */
  const startBreak = useCallback(() => {
    setPhase("break");
    setSecondsLeft(BREAK_SECS);
    const s = recordSession(FOCUS_MINS, SILVER_PER_SESSION);
    setSilverTotal(s.silver);
    setTotalFocusMins(s.todayFocusMins);
    setSessionsToday((p) => p + 1);
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
          if (phase === "focus") {
            startBreak();
            return BREAK_SECS;
          } else {
            finishBreak();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, startBreak, finishBreak]);

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const strokeColor = phase === "break" ? "#F59E0B" : "var(--accent)";

  const statusMsg =
    phase === "idle"
      ? "خل الجوال يستنى. درب يستنى نتائجك."
      : phase === "focus"
      ? "50 دقيقة — لا تكسرها."
      : phase === "break"
      ? "10 دقائق راحة — حرك جسمك."
      : `جلسة منجزة! +${SILVER_PER_SESSION} Silver 🪙`;

  return (
    <div className="min-h-dvh flex flex-col pb-nav relative z-[1]">
      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg" style={{ color: "var(--text)" }}>Orbit 50/10</h1>
          <div className="dome-chip">
            <span className="text-base">🪙</span>
            <span className="num-hero text-base" style={{ color: "var(--text)" }}>{silverTotal}</span>
          </div>
        </div>
      </Dome>
      <div className="h-4" />

      {/* اختيار المادة — حسب مسارك */}
      {phase === "idle" && subjects.length > 0 && (
        <div className="px-5 mb-5">
          <p className="text-sm font-bold text-[var(--text-muted)] mb-3">المادة التي تذاكرها:</p>
          <div className="flex gap-2.5 flex-wrap">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`px-6 py-3.5 rounded-2xl text-base font-bold transition min-h-[52px] ${
                  subject === s ? "text-white" : "text-[var(--text-dim)]"
                }`}
                style={subject === s ? { background: "var(--accent)" } : { background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* دائرة المؤقت */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="relative mb-8">
          <svg width="260" height="260" className="-rotate-90">
            <circle cx="130" cy="130" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
            <circle
              cx="130" cy="130" r={radius} fill="none"
              stroke={strokeColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
              className={phase === "focus" ? "orbit-active" : ""}
            />
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
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: `0 0 40px color-mix(in srgb, var(--accent) 20%, transparent)`, borderRadius: "50%" }}
            />
          )}
        </div>

        {/* رسالة الحالة */}
        <div
          className="rounded-2xl px-5 py-3 max-w-[280px] text-center mb-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm text-[var(--text-dim)] leading-relaxed">{statusMsg}</p>
        </div>

        {/* أزرار التحكم */}
        <div className="w-full max-w-xs space-y-3">
          {phase === "idle" && (
            <button
              onClick={startFocus}
              className="w-full py-5 rounded-2xl font-black text-white text-xl transition glow-blue min-h-[60px]"
              style={{ background: "linear-gradient(135deg, var(--accent-2), var(--accent))" }}
            >
              ابدأ الجلسة
            </button>
          )}

          {phase === "focus" && (
            <button
              onClick={reset}
              className="w-full py-4 rounded-2xl font-bold text-base text-[var(--danger)] border border-[var(--danger)]/30 glass transition min-h-[54px]"
            >
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
                <p className="text-xl font-black text-[var(--gold)]">+{SILVER_PER_SESSION} Silver 🪙</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">جلسة {sessionsToday} اليوم</p>
              </div>
              <button
                onClick={startFocus}
                className="w-full py-5 rounded-2xl font-black text-white text-lg transition glow-blue min-h-[60px]"
                style={{ background: "var(--accent)" }}
              >
                جلسة أخرى؟
              </button>
              <button onClick={reset} className="w-full py-3 text-base text-[var(--text-muted)] min-h-[48px]">
                توقف لهذا اليوم
              </button>
            </div>
          )}
        </div>
      </div>

      {/* شريط الإحصاءات — حقيقي */}
      <div className="px-5 pb-4">
        <div className="rounded-2xl p-5 grid grid-cols-3 text-center gap-3"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div>
            <p className="font-mono-nums font-black text-3xl text-[var(--accent-light)]">{sessionsToday}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">جلسات اليوم</p>
          </div>
          <div>
            <p className="font-mono-nums font-black text-3xl text-[var(--gold)]">{totalFocusMins}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">دقيقة اليوم</p>
          </div>
          <div>
            <p className="font-mono-nums font-black text-3xl text-[var(--success)]">{silverTotal}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Silver 🪙</p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
