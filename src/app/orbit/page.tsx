"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import { getTrack } from "@/lib/tracks";
import { loadUser, loadStats, recordSession } from "@/lib/storage";

type Phase = "idle" | "focus" | "break" | "done";
type DurMode = "25" | "50" | "90" | "custom";

const SUBJECT_GLOWS: Record<string, string> = {
  "فيزياء":  "rgba(139,92,246,0.10)",
  "رياضيات": "rgba(16,185,129,0.09)",
  "كيمياء":  "rgba(239,68,68,0.09)",
  "أحياء":   "rgba(245,158,11,0.10)",
  "إنجليزي": "rgba(148,163,184,0.07)",
  "لفظي":    "rgba(139,92,246,0.09)",
  "كمي":     "rgba(37,99,235,0.10)",
};

const SILVER_PER_SESSION = 10;

/* كل 5 دقائق تركيز = دقيقة راحة */
function calcBreak(focus: number) { return Math.max(1, Math.floor(focus / 5)); }

/* تسمية المدة (للعرض جنب العداد فقط إذا > 60) */
function durationLabel(mins: number): string {
  if (mins < 60) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hText = h === 1 ? "ساعة" : h === 2 ? "ساعتان" : `${h} ساعات`;
  if (m === 0) return hText;
  return `${hText}\nو${m} د`;
}

export default function OrbitPage() {
  const [phase, setPhase]           = useState<Phase>("idle");
  const [durMode, setDurMode]       = useState<DurMode>("50");
  const [customMins, setCustomMins] = useState(50);
  const [customEditing, setCustomEditing] = useState(false);
  const [customInput, setCustomInput]     = useState("50");
  const [showEdit, setShowEdit]           = useState(false);
  const [secondsLeft, setSecondsLeft]     = useState(50 * 60);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [silverTotal, setSilverTotal]     = useState(0);
  const [totalFocusMins, setTotalFocusMins] = useState(0);
  const [subjects, setSubjects] = useState<{ name: string; color: string }[]>([]);
  const [subject, setSubject]   = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const focusMins = durMode === "25" ? 25 : durMode === "50" ? 50 : durMode === "90" ? 90 : customMins;
  const breakMins = calcBreak(focusMins);
  const focusSecs = focusMins * 60;
  const breakSecs = breakMins * 60;

  useEffect(() => {
    const track = getTrack(loadUser()?.track);
    setSubjects(track.subjects.map((s) => ({ name: s.name, color: s.color })));
    setSubject(track.subjects[0]?.name ?? "");
    const s = loadStats();
    setSilverTotal(s.silver);
    setTotalFocusMins(s.todayFocusMins);
    setSessionsToday(s.sessionsCount);
  }, []);

  /* تحديث العداد عند تغيير المدة في وضع الانتظار */
  useEffect(() => {
    if (phase === "idle") setSecondsLeft(focusSecs);
  }, [focusMins, phase, focusSecs]);

  const totalSecs = phase === "break" ? breakSecs : focusSecs;
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
    setPhase("focus"); setSecondsLeft(focusSecs);
  }, [focusSecs]);

  const startBreak = useCallback(() => {
    setPhase("break"); setSecondsLeft(breakSecs);
    const s = recordSession(focusMins, SILVER_PER_SESSION);
    setSilverTotal(s.silver);
    setTotalFocusMins(s.todayFocusMins);
    setSessionsToday((p) => p + 1);
    playBeep();
  }, [focusMins, breakSecs, playBeep]);

  const finishBreak = useCallback(() => { setPhase("done"); playBeep(); }, [playBeep]);

  const reset = useCallback(() => {
    setPhase("idle"); setSecondsLeft(focusSecs);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [focusSecs]);

  useEffect(() => {
    if (phase === "idle" || phase === "done") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (phase === "focus") { startBreak(); return breakSecs; }
          else { finishBreak(); return 0; }
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, startBreak, finishBreak, breakSecs]);

  /* تقييس المدة المخصصة: مضاعف 5 بين 5 و 360 */
  const applyCustom = (val: number) => {
    const clamped = Math.max(5, Math.min(360, Math.round(val / 5) * 5));
    setCustomMins(clamped);
    setCustomInput(String(clamped));
  };

  const currentColor = subjects.find(s => s.name === subject)?.color ?? "var(--accent)";
  const radius       = 95;
  const circumference = 2 * Math.PI * radius;
  const dashOffset    = circumference * (1 - progress);
  const strokeColor   = phase === "break" ? "#F59E0B" : currentColor;
  const durLabel      = durationLabel(phase === "break" ? focusMins : focusMins);

  const statusMsg =
    phase === "idle"  ? "خل الجوال يستنى. درب يستنى نتائجك."
    : phase === "focus" ? `${focusMins} دقيقة — لا تكسرها.`
    : phase === "break" ? `${breakMins} دقيقة راحة — حرك جسمك.`
    : `جلسة منجزة! +${SILVER_PER_SESSION} Silver`;

  return (
    <div className="min-h-dvh flex flex-col pb-nav relative z-[1]">

      <div className="fixed inset-0 pointer-events-none transition-all duration-1000"
        style={{ background: (phase === "idle" || phase === "done")
          ? `radial-gradient(ellipse 90% 55% at 50% 5%, ${SUBJECT_GLOWS[subject] ?? "rgba(37,99,235,0.08)"} 0%, transparent 65%)`
          : `radial-gradient(ellipse 65% 45% at 50% 45%, ${strokeColor === "var(--accent)" ? "rgba(37,99,235,0.14)" : "rgba(245,158,11,0.12)"} 0%, transparent 70%)` }} />

      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg" style={{ color: "var(--text)" }}>Orbit {focusMins}/{breakMins}</h1>
          <div className="dome-chip">
            <span className="num-hero text-base" style={{ color: "var(--text)" }}>{silverTotal}</span>
          </div>
        </div>
      </Dome>
      <div className="h-4" />

      {/* اختيار المادة */}
      {phase === "idle" && subjects.length > 0 && (
        <div className="px-5 mb-4 rise rise-1">
          <p className="text-sm font-bold text-[var(--text-muted)] mb-3">المادة التي تذاكرها:</p>
          <div className="flex gap-2.5 flex-wrap">
            {subjects.map((s) => {
              const active = subject === s.name;
              return (
                <button key={s.name} onClick={() => setSubject(s.name)}
                  className="px-5 py-3 rounded-2xl text-base font-bold transition min-h-[48px]"
                  style={active
                    ? { background: "var(--surface)", border: `2px solid ${s.color}`, boxShadow: `0 0 12px ${s.color}40`, color: s.color }
                    : { background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text-dim)" }}>
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* دائرة المؤقت + الملصقات الجانبية */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 rise rise-3">
        <div className="flex items-center justify-center gap-3 w-full mb-6">

          {/* الدائرة */}
          <div className="relative flex-shrink-0"
            style={phase === "focus" ? { filter: `drop-shadow(0 0 14px ${currentColor}40)` } : undefined}>
            <svg width="220" height="220" className="-rotate-90">
              <circle cx="110" cy="110" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
              <circle
                cx="110" cy="110" r={radius} fill="none"
                stroke={strokeColor} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
                className={phase === "focus" ? "orbit-active" : ""}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {phase === "idle" ? (
                <div className="text-center">
                  <p className="text-5xl font-black font-mono-nums text-[var(--text)]">
                    {String(focusMins).padStart(2, "0")}:00
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">تركيز</p>
                </div>
              ) : phase === "done" ? (
                <p className="text-sm font-bold text-[var(--success)]">منجز!</p>
              ) : (
                <div className="text-center">
                  <p className="text-5xl font-black font-mono-nums" style={{ color: strokeColor }}>
                    {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                  </p>
                  <p className="text-sm mt-1" style={{ color: strokeColor }}>
                    {phase === "focus" ? "تركيز" : "راحة"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{subject}</p>
                </div>
              )}
            </div>

            {phase === "focus" && (
              <div className="absolute inset-0 rounded-full pointer-events-none"
                style={{ boxShadow: `0 0 40px color-mix(in srgb, var(--accent) 20%, transparent)`, borderRadius: "50%" }} />
            )}
          </div>

        </div>

        {/* رسالة الحالة — فقط أثناء التشغيل */}
        {phase !== "idle" && (
          <div className="rounded-2xl px-5 py-3 max-w-[280px] text-center mb-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm text-[var(--text-dim)] leading-relaxed">{statusMsg}</p>
          </div>
        )}

        {/* لوحة التعديل — idle فقط */}
        {phase === "idle" && (
          <div className="w-full max-w-xs mb-5">
            <button
              onClick={() => setShowEdit((v) => !v)}
              className="w-full py-3 rounded-2xl text-sm font-bold transition"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              {showEdit ? "إخفاء ↑" : "تعديل المدة ↓"}
            </button>

            {showEdit && (
              <div className="mt-2 rounded-2xl p-4 flex flex-col gap-3"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                {/* الخيارات */}
                <div className="flex gap-2">
                  {(["25", "50", "90"] as DurMode[]).map((v) => (
                    <button key={v} onClick={() => setDurMode(v)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition"
                      style={durMode === v
                        ? { background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }
                        : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      {v} د
                    </button>
                  ))}
                  <button onClick={() => setDurMode("custom")}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition"
                    style={durMode === "custom"
                      ? { background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }
                      : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    مخصص
                  </button>
                </div>

                {/* منتقي المخصص */}
                {durMode === "custom" && (
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => applyCustom(customMins - 5)}
                      className="w-11 h-11 rounded-xl font-black text-xl flex items-center justify-center transition active:scale-90"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                      −
                    </button>
                    {customEditing ? (
                      <input
                        type="number"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onBlur={() => { const n = parseInt(customInput); if (!isNaN(n)) applyCustom(n); setCustomEditing(false); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { const n = parseInt(customInput); if (!isNaN(n)) applyCustom(n); setCustomEditing(false); } }}
                        autoFocus
                        className="w-24 text-center rounded-xl px-2 py-2 text-lg font-black outline-none"
                        style={{ background: "var(--surface2)", border: "1.5px solid var(--accent)", color: "var(--text)" }}
                      />
                    ) : (
                      <button onClick={() => { setCustomInput(String(customMins)); setCustomEditing(true); }}
                        className="min-w-[90px] text-center rounded-xl px-3 py-2.5 transition"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                        <span className="font-mono-nums font-black text-xl" style={{ color: "var(--text)" }}>{customMins}</span>
                        <span className="text-sm text-[var(--text-muted)] mr-1">د</span>
                      </button>
                    )}
                    <button onClick={() => applyCustom(customMins + 5)}
                      className="w-11 h-11 rounded-xl font-black text-xl flex items-center justify-center transition active:scale-90"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                      +
                    </button>
                  </div>
                )}

                {/* ملخص: ساعات + راحة */}
                <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                  <span className="text-sm font-bold" style={{ color: currentColor }}>
                    {focusMins >= 60 ? durationLabel(focusMins) : `${focusMins} دقيقة`}
                  </span>
                  <span className="text-sm font-bold text-[var(--gold)]">
                    راحة {breakMins} دقيقة
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* أزرار التحكم */}
        <div className="w-full max-w-xs space-y-3">
          {phase === "idle" && (
            <button onClick={() => { setShowEdit(false); startFocus(); }}
              className="w-full py-5 rounded-2xl font-black text-xl transition glow-blue min-h-[60px]"
              style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
              ابدأ الجلسة
            </button>
          )}

          {phase === "focus" && (
            <button onClick={reset}
              className="w-full py-4 rounded-2xl font-bold text-base text-[var(--danger)] border border-[var(--danger)]/30 glass transition min-h-[54px]">
              إيقاف (تخسر السيلفر)
            </button>
          )}

          {phase === "break" && (
            <div className="text-center text-sm text-[var(--text-dim)] glass rounded-2xl px-4 py-3">
              <p className="font-bold text-[var(--gold)]">وقت الراحة</p>
              <p className="text-xs mt-1">الجلسة القادمة تبدأ تلقائياً بعد {mins}:{String(secs).padStart(2, "0")}</p>
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-2">
              <div className="glass rounded-2xl p-4 text-center">
                <p className="text-xl font-black text-[var(--gold)]">+{SILVER_PER_SESSION} Silver</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">جلسة {sessionsToday} اليوم</p>
              </div>
              <button onClick={startFocus}
                className="w-full py-5 rounded-2xl font-black text-lg transition glow-blue min-h-[60px]"
                style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
                جلسة أخرى؟
              </button>
              <button onClick={reset} className="w-full py-3 text-base text-[var(--text-muted)] min-h-[48px]">
                توقف لهذا اليوم
              </button>
            </div>
          )}
        </div>
      </div>

      {/* شريط الإحصاءات */}
      <div className="px-5 pb-4 rise rise-4">
        <div className="rounded-2xl p-5 grid grid-cols-3 text-center gap-3"
          style={{
            background: "rgba(18,18,27,0.65)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
          }}>
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
            <p className="text-sm text-[var(--text-muted)] mt-1">Silver</p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
