"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import PageGuide from "@/components/PageGuide";
import Confetti from "@/components/Confetti";
import { subjectsForTracks, getTrack } from "@/lib/tracks";
import type { TrackId, Track } from "@/lib/tracks";
import { loadUser, loadStats, recordSession, loadSessionLog, type SessionLogEntry } from "@/lib/storage";
import { Sparkles } from "@/components/ui/sparkles";
import { BorderBeam } from "@/components/ui/border-beam";
import { trackEvent } from "@/lib/events";

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
  "استماع":  "rgba(139,92,246,0.10)",
  "قراءة":   "rgba(16,185,129,0.09)",
  "كتابة":   "rgba(245,158,11,0.10)",
  "محادثة":  "rgba(239,68,68,0.09)",
  "قواعد":   "rgba(59,130,246,0.10)",
};

/* النقاط: فضة لكل دقيقة تركيز + 10 مكافأة لأول جلسة في اليوم */

const BREAK_TIPS = [
  "قم امش — ولو دقيقتين، جسمك يشكرك",
  "حضّر كوب ماء — التركيز يحتاج ترطيب",
  "انظر بعيد عن الشاشة لثلاثين ثانية — يرتاح عينك",
  "خذ ثلاثة أنفاس عميقة — يصفي الذهن",
  "تمدد وحرك رقبتك — كل ساعة تركيز تستحق دقيقة راحة",
  "احمد الله على صحتك — وواصل",
];

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

/* صيغة الدقائق حسب العدد: 3-10 → دقائق، غير ذلك → دقيقة */
function arabicMins(n: number): string {
  if (n >= 3 && n <= 10) return `${n} دقائق`;
  return `${n} دقيقة`;
}

export default function OrbitPage() {
  const [phase, setPhase]           = useState<Phase>("idle");
  const [durMode, setDurMode]       = useState<DurMode>("50");
  const [customMins, setCustomMins] = useState(50);
  const [customEditing, setCustomEditing] = useState(false);
  const [customInput, setCustomInput]     = useState("50");
  const [showEdit, setShowEdit]           = useState(false);
  const [prevDur, setPrevDur]             = useState<{mode: DurMode; custom: number}>({mode: "50", custom: 50});
  const [secondsLeft, setSecondsLeft]     = useState(50 * 60);
  const [sessionsToday, setSessionsToday] = useState(() => {
    const s = typeof window !== "undefined" ? loadStats() : null;
    return s?.sessionsCount ?? 0;
  });
  const [silverTotal, setSilverTotal] = useState(() => {
    const s = typeof window !== "undefined" ? loadStats() : null;
    return s?.silver ?? 0;
  });
  const [totalFocusMins, setTotalFocusMins] = useState(() => {
    const s = typeof window !== "undefined" ? loadStats() : null;
    return s?.todayFocusMins ?? 0;
  });
  const [subjects] = useState<{ name: string; color: string }[]>(() => {
    if (typeof window === "undefined") return [];
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    const finalIds = ids.length ? ids : (["تحصيلي"] as TrackId[]);
    return subjectsForTracks(finalIds);
  });
  const [subject, setSubject] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    const finalIds = ids.length ? ids : (["تحصيلي"] as TrackId[]);
    return subjectsForTracks(finalIds)[0]?.name ?? "";
  });
  /* اختيار المادة بخطوتين: الاختبار (المسار) أولاً ثم المادة منه */
  const [activeTracks] = useState<Track[]>(() => {
    if (typeof window === "undefined") return [];
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    const finalIds = ids.length ? ids : (["تحصيلي"] as TrackId[]);
    return finalIds.map((id) => getTrack(id));
  });
  const [selTrackId, setSelTrackId] = useState<TrackId>(() => {
    if (typeof window === "undefined") return "تحصيلي" as TrackId;
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    return (ids[0] ?? "تحصيلي") as TrackId;
  });
  /* مادة محدّدة مسبقاً عبر ?subject= (من بانر «جدول اليوم» في الخريطة) */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = new URLSearchParams(window.location.search).get("subject");
    if (s && subjects.some((x) => x.name === s)) setSubject(s);
  }, [subjects]);

  const [breakTip] = useState(() => BREAK_TIPS[Math.floor(Math.random() * BREAK_TIPS.length)]);
  const [hideTip, setHideTip] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("darb_hide_tips") === "1"
  );
  const dismissTip = () => {
    try { localStorage.setItem("darb_hide_tips", "1"); } catch {}
    setHideTip(true);
  };
  const [paused, setPaused] = useState(false);
  const [lastEarned, setLastEarned] = useState(0);
  /* إبقاء الجلسة شغّالة عند الخروج من الصفحة (إعداد افتراضي مفعّل) */
  const [keepRunning, setKeepRunning] = useState(() =>
    typeof window === "undefined" ? true : localStorage.getItem("darb_orbit_keep") !== "0"
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [sessionLog, setSessionLog] = useState<SessionLogEntry[]>(() =>
    typeof window !== "undefined" ? loadSessionLog() : []
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /* نهاية الجلسة كطابع زمني حقيقي — العدّ ما يتجمد لو راح التطبيق للخلفية */
  const endAtRef = useRef(0);

  const toggleKeepRunning = () => {
    setKeepRunning((v) => {
      const next = !v;
      try { localStorage.setItem("darb_orbit_keep", next ? "1" : "0"); } catch {}
      if (!next) { try { localStorage.removeItem("darb_orbit_session"); } catch {} }
      return next;
    });
  };

  const focusMins = durMode === "25" ? 25 : durMode === "50" ? 50 : durMode === "90" ? 90 : customMins;
  const breakMins = calcBreak(focusMins);
  const focusSecs = focusMins * 60;
  const breakSecs = breakMins * 60;

  /* في وضع الانتظار نعرض مدة الجلسة مباشرة — بدون state وسيط */
  const displaySecs = phase === "idle" ? focusSecs : secondsLeft;
  const totalSecs   = phase === "break" ? breakSecs : focusSecs;
  const progress    = 1 - displaySecs / totalSecs;
  const mins        = Math.floor(displaySecs / 60);
  const secs        = displaySecs % 60;

  const vibrate = useCallback((pattern: number | number[]) => {
    try { navigator.vibrate?.(pattern); } catch {}
  }, []);

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

  /* إشعار نظام لو كان التطبيق بالخلفية وقت انتهاء الجلسة */
  const notify = useCallback((title: string, body: string) => {
    try {
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: "/icon.svg" });
      }
    } catch {}
  }, []);

  const startFocus = useCallback(() => {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch {}
    endAtRef.current = Date.now() + focusSecs * 1000;
    setPhase("focus"); setSecondsLeft(focusSecs);
  }, [focusSecs]);

  const startBreak = useCallback(() => {
    endAtRef.current = Date.now() + breakSecs * 1000;
    setPhase("break"); setSecondsLeft(breakSecs);
    const s = recordSession(focusMins, subject);
    setSilverTotal(s.silver);
    setLastEarned(s.earned);
    setTotalFocusMins(s.todayFocusMins);
    setSessionsToday((p) => p + 1);
    setSessionLog(loadSessionLog());
    trackEvent("session_completed", { focusMins, silver: s.earned });
    playBeep();
    vibrate([100, 50, 100]);
    notify("انتهت جلسة التركيز", `أحسنت! خذ راحة ${arabicMins(calcBreak(focusMins))}`);
  }, [focusMins, breakSecs, playBeep, notify, vibrate]);

  const finishBreak = useCallback(() => {
    setPhase("done"); playBeep();
    vibrate(200);
    notify("انتهت الراحة", "جاهز لجولة جديدة؟");
  }, [playBeep, notify, vibrate]);

  const reset = useCallback(() => {
    setPhase("idle"); setSecondsLeft(focusSecs); setPaused(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    try { localStorage.removeItem("darb_orbit_session"); } catch {}
  }, [focusSecs]);

  const togglePause = useCallback(() => {
    if (phase !== "focus" && phase !== "break") return;
    setPaused((p) => {
      if (p) endAtRef.current = Date.now() + secondsLeft * 1000; // استئناف
      return !p;
    });
  }, [phase, secondsLeft]);

  /* استرجاع جلسة جارية عند العودة للصفحة (لو الإعداد مفعّل) */
  useEffect(() => {
    if (!keepRunning) return;
    try {
      const raw = localStorage.getItem("darb_orbit_session");
      if (!raw) return;
      const s = JSON.parse(raw) as { phase: Phase; endAt: number; subject: string; durMode: DurMode; customMins: number; paused: boolean; secondsLeft: number };
      if (s.phase !== "focus" && s.phase !== "break") return;
      setDurMode(s.durMode); setCustomMins(s.customMins); setCustomInput(String(s.customMins));
      if (s.subject) setSubject(s.subject);
      if (s.paused) {
        setPaused(true); setSecondsLeft(s.secondsLeft); endAtRef.current = Date.now() + s.secondsLeft * 1000;
      } else {
        const remaining = Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000));
        if (remaining <= 0) return; // انتهت أثناء الغياب — نتركها للبداية النظيفة
        endAtRef.current = s.endAt; setSecondsLeft(remaining);
      }
      setPhase(s.phase);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* حفظ الجلسة الجارية باستمرار (للاستمرار عبر التنقل) */
  useEffect(() => {
    if (!keepRunning) return;
    try {
      if (phase === "focus" || phase === "break") {
        localStorage.setItem("darb_orbit_session", JSON.stringify({
          phase, endAt: endAtRef.current, subject, durMode, customMins, paused, secondsLeft,
        }));
      } else {
        localStorage.removeItem("darb_orbit_session");
      }
    } catch {}
  }, [phase, subject, durMode, customMins, paused, secondsLeft, keepRunning]);

  useEffect(() => {
    if (phase !== "focus" && phase !== "break") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    let fired = false;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0 && !fired) {
        fired = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (phase === "focus") startBreak();
        else finishBreak();
      }
    };
    intervalRef.current = setInterval(tick, 500);
    /* تصحيح فوري عند الرجوع للتبويب */
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [phase, paused, startBreak, finishBreak]);

  /* اختصارات لوحة المفاتيح: مسافة = بدء/إيقاف | Escape = إعادة تعيين */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (phase === "idle") { setShowEdit(false); startFocus(); }
        else if (phase === "focus") reset();
        else if (phase === "done") startFocus();
      } else if (e.key === "Escape") {
        if (phase !== "idle") reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, startFocus, reset]);

  /* عنوان التبويب يعرض العدّاد أثناء الجلسة */
  useEffect(() => {
    const base = "درب | المنصة التي تعاملك كأخ";
    if (phase === "focus" || phase === "break") {
      document.title = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")} ${phase === "focus" ? "تركيز" : "راحة"} — درب`;
    } else {
      document.title = base;
    }
    return () => { document.title = base; };
  }, [phase, mins, secs]);

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

  const statusMsg =
    phase === "idle"  ? "خل الجوال يستنى. درب يستنى نتائجك."
    : phase === "focus" ? `${arabicMins(focusMins)} — لا تكسرها.`
    : phase === "break" ? `${arabicMins(breakMins)} راحة — حرك جسمك.`
    : `جلسة منجزة! +${lastEarned} فضة`;

  return (
    <div className="min-h-dvh flex flex-col pb-nav relative z-[1] page-enter">

      {phase === "done" && <Confetti />}

      <PageGuide pageKey="orbit" steps={[
        { title: "أوربت — تايمر التركيز", desc: "اختر المادة اللي بتذاكرها، واضغط ابدأ الجلسة. النظام الافتراضي: 50 دقيقة تركيز + 10 راحة." },
        { title: "الراحة تجي تلقائياً", desc: "أول ما تخلص جلسة التركيز يبدأ وقت الراحة بنفسه، ويوصلك تنبيه حتى لو كنت بتطبيق ثاني." },
        { title: "كل دقيقة تحسب لك", desc: "تكسب فضة لكل دقيقة تركيز، وأول جلسة في اليوم تعطيك 10 فضة مكافأة. لو وقفت الجلسة بالنص تخسر الفضة — لا تكسرها." },
      ]} />

      <div className="fixed inset-0 pointer-events-none transition-all duration-1000"
        style={{ background: (phase === "idle" || phase === "done")
          ? `radial-gradient(ellipse 90% 55% at 50% 5%, ${SUBJECT_GLOWS[subject] ?? "rgba(37,99,235,0.08)"} 0%, transparent 65%)`
          : `radial-gradient(ellipse 65% 45% at 50% 45%, ${strokeColor === "var(--accent)" ? "rgba(37,99,235,0.14)" : "rgba(245,158,11,0.12)"} 0%, transparent 70%)` }} />

      <Dome compact>
        <h1 className="title-lg grad-title">أوربت {focusMins}/{breakMins}</h1>
      </Dome>
      <div className="h-4" />

      {/* اختيار المادة بخطوتين: الاختبار ثم المادة منه */}
      {phase === "idle" && activeTracks.length > 0 && (() => {
        const selTrack = activeTracks.find((t) => t.id === selTrackId) ?? activeTracks[0];
        const trackSubjects = selTrack?.subjects ?? [];
        return (
          <div className="px-5 mb-4 rise rise-1">
            {/* خطوة ١: الاختبار — تظهر فقط لو عنده أكثر من اختبار */}
            {activeTracks.length > 1 && (
              <>
                <p className="text-sm font-bold text-[var(--text-muted)] mb-2">اختبارك:</p>
                <div className="flex gap-2 flex-wrap mb-4">
                  {activeTracks.map((t) => {
                    const active = selTrack?.id === t.id;
                    return (
                      <button key={t.id}
                        onClick={() => { setSelTrackId(t.id); setSubject(t.subjects[0]?.name ?? ""); }}
                        className="px-4 py-2.5 rounded-xl text-[14px] font-bold transition flex items-center gap-2 min-h-[44px]"
                        style={active
                          ? { background: t.color, color: "#fff", border: `1.5px solid ${t.color}` }
                          : { background: "var(--surface)", border: `1.5px solid ${t.color}55`, color: t.color }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: active ? "#fff" : t.color }} />
                        {t.title}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {/* خطوة ٢: المادة من هذا الاختبار */}
            <p className="text-sm font-bold text-[var(--text-muted)] mb-2">المادة التي تذاكرها:</p>
            <div className="flex gap-2.5 flex-wrap">
              {trackSubjects.map((s) => {
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
        );
      })()}

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

        {/* رسالة الحالة مع الرفيق — فقط أثناء التشغيل */}
        {phase !== "idle" && (
          <div className="rounded-2xl px-5 py-3 max-w-[300px] mb-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm text-[var(--text-dim)] leading-relaxed text-center">{statusMsg}</p>
          </div>
        )}

        {/* لوحة التعديل — idle فقط */}
        {phase === "idle" && (
          <div className="w-full max-w-xs mb-5">
            <button
              onClick={() => { if (!showEdit) setPrevDur({mode: durMode, custom: customMins}); setShowEdit((v) => !v); }}
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
                    {focusMins >= 60 ? durationLabel(focusMins) : arabicMins(focusMins)}
                  </span>
                  <span className="text-sm font-bold text-[var(--gold)]">
                    راحة {arabicMins(breakMins)}
                  </span>
                </div>

                {/* تراجع */}
                <button
                  onClick={() => { setDurMode(prevDur.mode); setCustomMins(prevDur.custom); setCustomInput(String(prevDur.custom)); }}
                  className="text-[17px] font-semibold text-center w-full"
                  style={{ color: "var(--text-muted)" }}>
                  ↩ تراجع
                </button>
              </div>
            )}
          </div>
        )}

        {/* أزرار التحكم */}
        <div className="w-full max-w-xs space-y-3">
          {phase === "idle" && (
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => { setShowEdit(false); startFocus(); }}
                className="btn-shimmer w-full py-5 rounded-2xl font-black text-xl min-h-[60px]"
                style={{ fontSize: "20px" }}>
                ابدأ الجلسة ←
              </button>
              <p className="text-xs text-[var(--text-muted)]">أو اضغط المسافة</p>
            </div>
          )}

          {phase === "focus" && (
            <div className="flex flex-col gap-2">
              <button onClick={togglePause}
                className="w-full py-4 rounded-2xl font-black text-base transition min-h-[54px]"
                style={{ background: "color-mix(in srgb, var(--gold) 10%, transparent)", border: "1.5px solid var(--gold)", color: "var(--gold)" }}>
                {paused ? "▶ استئناف" : "⏸ إيقاف مؤقت"}
              </button>
              {paused && (
                <p className="text-xs text-center text-[var(--text-muted)]">الجلسة موقوفة مؤقتاً — لا تُحتسب الفضة حتى تكملها</p>
              )}
              <button onClick={reset}
                className="w-full py-4 rounded-2xl font-bold text-base text-[var(--danger)] border border-[var(--danger)]/30 glass transition min-h-[54px]">
                إنهاء (تخسر الفضة)
              </button>
            </div>
          )}

          {phase === "break" && (
            <div className="text-center glass rounded-2xl px-5 py-4 relative">
              <p className="text-sm font-bold text-[var(--gold)] mb-1.5">وقت الراحة</p>
              {!hideTip && (
                <div className="relative mb-2">
                  <button onClick={dismissTip} aria-label="حذف النصيحة"
                    className="absolute top-0 left-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    ✕
                  </button>
                  <p className="text-sm text-[var(--text-dim)] leading-relaxed px-6">{breakTip}</p>
                </div>
              )}
              <p className="text-xs text-[var(--text-muted)]">الجلسة القادمة تبدأ تلقائياً بعد {mins}:{String(secs).padStart(2, "0")}</p>
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-2">
              <div className="relative glass rounded-2xl p-4 text-center overflow-hidden">
                <BorderBeam size={180} duration={8} colorFrom="var(--gold)" colorTo="var(--accent-hi)" />
                <Sparkles count={14} color="var(--gold)" />
                <p className="text-xl font-black relative z-10" style={{ color: "var(--gold)", textShadow: "0 0 20px rgba(245,158,11,0.4)" }}>+{lastEarned} فضة</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 relative z-10">
                  {focusMins} دقيقة{lastEarned > focusMins ? " + 10 مكافأة أول جلسة" : ""} · جلسة {sessionsToday} اليوم
                </p>
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
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {[
            { val: sessionsToday, label: "جلسات اليوم", color: "var(--accent-light)", glow: "#2563EB" },
            { val: totalFocusMins, label: "دقيقة اليوم", color: "var(--gold)", glow: "#F5B40A" },
            { val: silverTotal, label: "فضة", color: "var(--success)", glow: "#10B981" },
          ].map((s) => (
            <div key={s.label} className="relative rounded-xl py-2 overflow-hidden"
              style={{ background: `color-mix(in srgb, ${s.glow} 5%, transparent)` }}>
              <p className="font-mono-nums font-black text-3xl" style={{ color: s.color }}>{s.val}</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* السجل والإعدادات — أسفل الصفحة بعيداً عن إعدادات التطبيق فوق */}
      <div className="px-5 pb-4">
        <div className="flex gap-2">
          <button onClick={() => { setShowLog((v) => !v); setShowSettings(false); }}
            className="flex-1 py-3 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition active:scale-[0.98]"
            style={showLog
              ? { background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }
              : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            📋 سجل الجلسات
          </button>
          <button onClick={() => { setShowSettings((v) => !v); setShowLog(false); }}
            className="flex-1 py-3 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition active:scale-[0.98]"
            style={showSettings
              ? { background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }
              : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            ⚙️ إعدادات أوربت
          </button>
        </div>

        {/* إعدادات أوربت */}
        {showSettings && (
          <div className="mt-3 rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <button onClick={toggleKeepRunning}
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-right transition active:scale-[0.99]"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px] text-[var(--text)]">إبقاء الجلسة شغّالة عند الخروج</p>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">لو طلعت للخريطة أو صفحة ثانية تكمل الجلسة من حيث وقفت</p>
              </div>
              <span className="w-12 h-7 rounded-full flex items-center transition flex-shrink-0 px-0.5"
                style={{ background: keepRunning ? "var(--accent)" : "var(--border)", justifyContent: keepRunning ? "flex-start" : "flex-end" }}>
                <span className="w-6 h-6 rounded-full bg-white" />
              </span>
            </button>
          </div>
        )}

        {/* سجل الجلسات */}
        {showLog && (
          <div className="mt-3 rounded-2xl p-4 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="font-black text-base text-[var(--text)] mb-1">سجل الجلسات ({sessionLog.length})</p>
            {sessionLog.length === 0 ? (
              <p className="text-[13px] text-[var(--text-muted)] py-4 text-center">ما فيه جلسات بعد — أنجز جلستك الأولى</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto">
                {sessionLog.map((e) => {
                  const d = new Date(e.ts);
                  const when = d.toLocaleString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
                  return (
                    <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                      <span className="font-bold text-[13px] text-[var(--text)] truncate">{e.subject}</span>
                      <span className="text-[12px] text-[var(--text-muted)] flex-shrink-0">{when}</span>
                      <span className="font-mono-nums font-bold text-[13px] flex-shrink-0" style={{ color: "var(--accent-light)" }}>{e.focusMins}د</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
