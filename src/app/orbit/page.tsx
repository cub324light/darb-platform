"use client";
import { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from "react";
import PageFooter from "@/components/PageFooter";
import NextThread from "@/components/NextThread";
import Dome from "@/components/Dome";
import Sheet from "@/components/Sheet";
import { usePref, setPref } from "@/lib/prefs";
import PageGuide from "@/components/PageGuide";
import Confetti from "@/components/Confetti";
import { subjectsForTracks, getTrack } from "@/lib/tracks";
import type { TrackId, Track } from "@/lib/tracks";
import { useRouter } from "next/navigation";
import { activeTrackIds, loadStats, recordSession, loadSessionLog, type SessionLogEntry } from "@/lib/storage";
import { appendSession } from "@/lib/roadmap/sessionStore";
import { readFocusHandoff, remainingTaskMins, isTaskHandoff, handoffSourceLabel,
  EMPTY_HANDOFF, type FocusHandoff } from "@/lib/roadmap/handoff";
import { BorderBeam } from "@/components/ui/border-beam";
import { trackEvent } from "@/lib/analytics";
import { n as arNum } from "@/lib/format";

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

/* أرقامٌ عربية-هندية (قاعدة الخطوط) */

/* صيغة الدقائق حسب العدد: 3-10 → دقائق، غير ذلك → دقيقة (بأرقامٍ عربية-هندية) */
function arabicMins(n: number): string {
  if (n >= 3 && n <= 10) return `${arNum(n)} دقائق`;
  return `${arNum(n)} دقيقة`;
}

/* ─── متجر الثواني (Timer Store) ───
   الثواني المتبقية تتغيّر كل ثانية. لو حفظناها في حالة الصفحة (useState) فإن
   الصفحة كاملة (700+ سطر: BottomNav, Dome, الأزرار، الإحصاءات...) تُعيد الرسم
   كل ثانية أثناء الجلسة. بدلاً من ذلك نضعها في متجر خارجي خفيف؛ المكوّنات التي
   تعرض العدّاد فقط (الدائرة، عنوان التبويب، عدّاد الراحة) تشترك فيه وتُعيد رسم
   نفسها وحدها — أما صفحة أوربت فلا تُعيد الرسم إطلاقاً مع كل ثانية. */
type TimerStore = {
  get: () => number;
  set: (v: number) => void;
  subscribe: (l: () => void) => () => void;
};

function useTimerStore(initial: number): TimerStore {
  const ref = useRef<{ value: number; listeners: Set<() => void> } | null>(null);
  if (ref.current === null) ref.current = { value: initial, listeners: new Set() };
  return useMemo<TimerStore>(() => ({
    get: () => ref.current!.value,
    set: (v: number) => {
      const s = ref.current!;
      if (s.value === v) return; // لا إشعار إن لم تتغيّر الثانية
      s.value = v;
      s.listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      ref.current!.listeners.add(l);
      return () => { ref.current!.listeners.delete(l); };
    },
  }), []);
}

function useTimerValue(store: TimerStore): number {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/* الدائرة + الرقم المركزي — المكوّن الوحيد الذي يُعيد الرسم كل ثانية أثناء الجلسة */
function OrbitDial({
  store, phase, focusMins, focusSecs, totalSecs, strokeColor, currentColor, subject, radius, circumference,
}: {
  store: TimerStore; phase: Phase; focusMins: number; focusSecs: number; totalSecs: number;
  strokeColor: string; currentColor: string; subject: string; radius: number; circumference: number;
}) {
  const live = useTimerValue(store);
  const displaySecs = phase === "idle" ? focusSecs : live;
  const progress = 1 - displaySecs / totalSecs;
  const mins = Math.floor(displaySecs / 60);
  const secs = displaySecs % 60;
  const dashOffset = circumference * (1 - progress);
  return (
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
  );
}

/* عنوان التبويب يعرض العدّاد — يشترك في المتجر فلا يُعيد رسم الصفحة */
function TimerTitle({ store, phase }: { store: TimerStore; phase: Phase }) {
  const live = useTimerValue(store);
  useEffect(() => {
    const base = "درب | المنصة التي تعاملك كأخ";
    if (phase === "focus" || phase === "break") {
      const m = Math.floor(live / 60);
      const s = live % 60;
      document.title = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} ${phase === "focus" ? "تركيز" : "راحة"} — درب`;
    } else {
      document.title = base;
    }
    return () => { document.title = base; };
  }, [phase, live]);
  return null;
}

/* نص عدّاد الراحة "بعد mm:ss" — يشترك في المتجر وحده */
function LiveCountdown({ store }: { store: TimerStore }) {
  const live = useTimerValue(store);
  const m = Math.floor(live / 60);
  const s = live % 60;
  return <>{m}:{String(s).padStart(2, "0")}</>;
}

/* تفضيل مدّة الجلسة — يُسأل الطالب مرّةً واحدة ثم يُحفظ (المدّة وظيفة هذه الصفحة وحدها). */
const DUR_PREF_KEY = "darb_focus_duration";
interface DurPref { mode: DurMode; custom: number }
function loadDurPref(): DurPref | null {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(DUR_PREF_KEY); const p = raw ? JSON.parse(raw) : null;
    return p && typeof p.mode === "string" ? { mode: p.mode as DurMode, custom: Number(p.custom) || 50 } : null; }
  catch { return null; }
}
function saveDurPref(p: DurPref): void {
  try { localStorage.setItem(DUR_PREF_KEY, JSON.stringify(p)); } catch { /* تجاهل */ }
}

export default function OrbitPage() {
  const router = useRouter();
  /* تسليمٌ من مساري: «ابدأ المذاكرة» يبدأ جلسة تركيزٍ حقيقية (نظام توقيتٍ واحد لا اثنان).
     يُقرأ بعد التركيب (لا في مُهيّئ الحالة) لأن العرض الأوّل يجري على الخادم بلا window. */
  const [handoff, setHandoff] = useState<FocusHandoff>(EMPTY_HANDOFF);
  useEffect(() => {
    const h = readFocusHandoff(window.location.search);
    if (h === EMPTY_HANDOFF) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHandoff(h);
  }, []);
  const fromMasari = handoff.from === "masari";

  const [phase, setPhase]           = useState<Phase>("idle");
  const [durMode, setDurMode]       = useState<DurMode>(() => loadDurPref()?.mode ?? "50");
  const [customMins, setCustomMins] = useState(() => loadDurPref()?.custom ?? 50);
  /* أول دخول: نسأل عن المدّة الافتراضية مرّةً واحدة، ثم لا نسأل بعدها */
  const [askDur, setAskDur] = useState(() => (typeof window === "undefined" ? false : loadDurPref() === null));
  const [customEditing, setCustomEditing] = useState(false);
  const [customInput, setCustomInput]     = useState("50");
  const [showEdit, setShowEdit]           = useState(false);
  const [prevDur, setPrevDur]             = useState<{mode: DurMode; custom: number}>({mode: "50", custom: 50});
  /* الثواني المتبقية في متجر خارجي — لا تُعيد رسم الصفحة (انظر useTimerStore) */
  const timer = useTimerStore(50 * 60);
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
  /* المصدر الواحد: الاختبارات/المواد مشتقّة من Workspace (لا activeTracks) */
  const [subjects] = useState<{ name: string; color: string }[]>(() => subjectsForTracks(activeTrackIds() as TrackId[]));
  const [subject, setSubject] = useState<string>(() => subjectsForTracks(activeTrackIds() as TrackId[])[0]?.name ?? "");
  /* اختيار المادة بخطوتين: الاختبار (المسار) أولاً ثم المادة منه */
  const [activeTracks] = useState<Track[]>(() => (activeTrackIds() as TrackId[]).map((id) => getTrack(id)));
  const [selTrackId, setSelTrackId] = useState<TrackId>(() => (activeTrackIds()[0] ?? "تحصيلي") as TrackId);
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
  /* إبقاء الجلسة شغّالة عند الخروج (مفعّلٌ افتراضاً). التفضيلُ في `prefs`
     المشترَك، فيقرؤه ويكتبه هنا وفي ورقة الإعدادات العامة سواءً — لا نسختان
     تتفرّقان. وقراءتُه بمخزنٍ خارجيّ لا في مُهيّئ `useState` (ترطيب). */
  const keepRunning = usePref("orbitKeep", true);
  /* تنبيهُ النظام وصوتُ النهاية — يُطفئهما من أزعجاه من الإعدادات العامّة */
  const notifyOn = usePref("notifyEnd", true);
  const soundOn = usePref("soundEnd", true);
  const [showSettings, setShowSettings] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [sessionLog, setSessionLog] = useState<SessionLogEntry[]>(() =>
    typeof window !== "undefined" ? loadSessionLog() : []
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /* نهاية الجلسة كطابع زمني حقيقي — العدّ ما يتجمد لو راح التطبيق للخلفية */
  const endAtRef = useRef(0);

  const toggleKeepRunning = () => {
    const next = !keepRunning;
    setPref("orbitKeep", next);
    if (!next) { try { localStorage.removeItem("darb_orbit_session"); } catch {} }
  };

  const focusMins = durMode === "25" ? 25 : durMode === "50" ? 50 : durMode === "90" ? 90 : customMins;
  const breakMins = calcBreak(focusMins);
  const focusSecs = focusMins * 60;
  const breakSecs = breakMins * 60;

  /* المدة الكلية للقوس: راحة في طور الراحة، وإلا مدة التركيز */
  const totalSecs = phase === "break" ? breakSecs : focusSecs;

  const vibrate = useCallback((pattern: number | number[]) => {
    try { navigator.vibrate?.(pattern); } catch {}
  }, []);

  const playBeep = useCallback(() => {
    if (!soundOn) return;
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
  }, [soundOn]);

  /* إشعار نظام لو كان التطبيق بالخلفية وقت انتهاء الجلسة */
  const notify = useCallback((title: string, body: string) => {
    try {
      if (notifyOn && document.hidden && "Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: "/icon.svg" });
      }
    } catch {}
  }, [notifyOn]);

  const startFocus = useCallback(() => {
    try {
      if (notifyOn && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch {}
    endAtRef.current = Date.now() + focusSecs * 1000;
    setPhase("focus"); timer.set(focusSecs);
    /* حدثُ سلوكٍ للذاكرة (لا تحليلات): كان النوعُ مسجَّلاً في `events/registry`
       ولا يُطلق من أيّ مكان، فلا تعرف الذاكرةُ أنّ الطالبَ ذاكر أصلاً. */
    import("@/lib/events").then(({ emit }) => emit({
      eventType: "StudentStartedSession",
      metadata: { sessionKind: "focus", subject: subject || undefined },
      actor: { kind: "student" }, source: "ui",
    })).catch(() => {});
  }, [focusSecs, timer, notifyOn, subject]);

  /* تسليمٌ من مساري: إن كانت المدّة محفوظةً سابقاً نبدأ فوراً بلا سؤال؛
     وإلا يظهر مُنتقي المدّة أوّلاً ثم تبدأ الجلسة بعد اختياره. */
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!handoff.auto || autoStartedRef.current) return;
    if (askDur || phase !== "idle") return;
    autoStartedRef.current = true;
    /* مزامنةٌ مع نيّةٍ خارجية (وسيط العنوان) لا حلقة رسم: تبدأ مرّةً واحدة بحارس ref */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startFocus();
  }, [handoff.auto, askDur, phase, startFocus]);

  const startBreak = useCallback(() => {
    endAtRef.current = Date.now() + breakSecs * 1000;
    setPhase("break"); timer.set(breakSecs);
    const s = recordSession(focusMins, subject);
    setSilverTotal(s.silver);
    setLastEarned(s.earned);
    setTotalFocusMins(s.todayFocusMins);
    setSessionsToday((p) => p + 1);
    setSessionLog(loadSessionLog());
    trackEvent("session_completed", { focusMins, silver: s.earned, source: fromMasari ? "masari" : "orbit" });
    /* سجلّ مساري — يغذّي الإحصائيات والجاهزية (مصدرٌ واحد للجلسات) */
    appendSession({ id: `${Date.now()}`, examId: handoff.from === "masari" ? "masari" : "orbit",
      subject, taskKind: "review", startedAt: Date.now() - focusMins * 60000, durationMins: focusMins });
    import("@/lib/events").then(({ emit }) => emit({
      eventType: "StudentFinishedSession",
      metadata: { minutes: focusMins, subject: subject || undefined },
      actor: { kind: "student" }, source: "ui",
    })).catch(() => {});
    playBeep();
    vibrate([100, 50, 100]);
    notify("انتهت جلسة التركيز", `أحسنت! خذ راحة ${arabicMins(calcBreak(focusMins))}`);
    /* جاء من مساري ⇒ شاشة النجاح ثم الرجوع إلى «الآن» */
    if (fromMasari) router.push(`/roadmap/session?done=${focusMins}`);
  }, [focusMins, breakSecs, subject, timer, playBeep, notify, vibrate, fromMasari, handoff.from, router]);

  const finishBreak = useCallback(() => {
    setPhase("done"); playBeep();
    vibrate(200);
    notify("انتهت الراحة", "جاهز لجولة جديدة؟");
  }, [playBeep, notify, vibrate]);

  const reset = useCallback(() => {
    setPhase("idle"); timer.set(focusSecs); setPaused(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    try { localStorage.removeItem("darb_orbit_session"); } catch {}
  }, [focusSecs, timer]);

  const togglePause = useCallback(() => {
    if (phase !== "focus" && phase !== "break") return;
    setPaused((p) => {
      if (p) endAtRef.current = Date.now() + timer.get() * 1000; // استئناف من القيمة المجمّدة
      return !p;
    });
  }, [phase, timer]);

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
        setPaused(true); timer.set(s.secondsLeft); endAtRef.current = Date.now() + s.secondsLeft * 1000;
      } else {
        const remaining = Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000));
        if (remaining <= 0) return; // انتهت أثناء الغياب — نتركها للبداية النظيفة
        endAtRef.current = s.endAt; timer.set(remaining);
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
          phase, endAt: endAtRef.current, subject, durMode, customMins, paused, secondsLeft: timer.get(),
        }));
      } else {
        localStorage.removeItem("darb_orbit_session");
      }
    } catch {}
    /* لا نُدرج الثواني في التبعيات: المتجر يتغيّر كل ثانية ولا يُشغّل هذا الأثر.
       نحفظ endAt المطلق ونعيد حساب الثواني عند الاسترجاع؛ وعند الإيقاف المؤقّت
       يلتقط هذا الحفظ قيمة الثواني المجمّدة الصحيحة من المتجر (timer.get). */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, subject, durMode, customMins, paused, keepRunning]);

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
      /* نُحدّث المتجر فقط — يُعيد رسم العدّاد وحده دون الصفحة. المتجر يتجاهل
         التحديث إن لم تتغيّر الثانية (set يقارن قبل الإشعار). */
      timer.set(remaining);
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
  }, [phase, paused, timer, startBreak, finishBreak]);

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

  /* تقييس المدة المخصصة: مضاعف 5 بين 5 و 360 */
  const applyCustom = (val: number) => {
    const clamped = Math.max(5, Math.min(360, Math.round(val / 5) * 5));
    setCustomMins(clamped);
    setCustomInput(String(clamped));
    saveDurPref({ mode: "custom", custom: clamped });
  };

  /* أول دخول: يختار مدّته الافتراضية مرّةً واحدة ثم تُحفظ */
  const pickDefaultDur = (mode: DurMode) => {
    setDurMode(mode);
    saveDurPref({ mode, custom: customMins });
    setAskDur(false);
    if (mode === "custom") setShowEdit(true);
  };

  const currentColor = subjects.find(s => s.name === subject)?.color ?? "var(--accent)";
  const radius       = 95;
  const circumference = 2 * Math.PI * radius;
  const strokeColor   = phase === "break" ? "#F59E0B" : currentColor;

  const statusMsg =
    phase === "idle"  ? "خل الجوال يستنى. درب يستنى نتائجك."
    : phase === "focus" ? `${arabicMins(focusMins)} — لا تكسرها.`
    : phase === "break" ? `${arabicMins(breakMins)} راحة — حرك جسمك.`
    : `جلسة منجزة! +${lastEarned} فضة`;

  return (
    <div className="min-h-dvh flex flex-col pb-nav relative z-[1] page-enter">

      {/* عنوان التبويب الحيّ — يشترك في متجر العدّاد ولا يُعيد رسم الصفحة */}
      <TimerTitle store={timer} phase={phase} />

      {phase === "done" && <Confetti />}

      <PageGuide pageKey="orbit" steps={[
        { title: "تركيز — مؤقّت الجلسات", desc: "اختر المادة اللي بتذاكرها، واضغط ابدأ الجلسة. النظام الافتراضي: 50 دقيقة تركيز + 10 راحة." },
        { title: "الراحة تجي تلقائياً", desc: "أول ما تخلص جلسة التركيز يبدأ وقت الراحة بنفسه، ويوصلك تنبيه حتى لو كنت بتطبيق ثاني." },
        { title: "كل دقيقة تحسب لك", desc: "تكسب فضة لكل دقيقة تركيز، وأول جلسة في اليوم تعطيك 10 فضة مكافأة. لو وقفت الجلسة بالنص تخسر الفضة — لا تكسرها." },
      ]} />

      <div className="fixed inset-0 pointer-events-none transition-all duration-1000"
        style={{ background: (phase === "idle" || phase === "done")
          ? `radial-gradient(ellipse 90% 55% at 50% 5%, ${SUBJECT_GLOWS[subject] ?? "rgba(37,99,235,0.08)"} 0%, transparent 65%)`
          : `radial-gradient(ellipse 65% 45% at 50% 45%, ${strokeColor === "var(--accent)" ? "rgba(37,99,235,0.14)" : "rgba(245,158,11,0.12)"} 0%, transparent 70%)` }} />

      <Dome compact>
        <div className="flex items-center justify-between gap-2">
          <h1 className="title-lg grad-title">تركيز</h1>
          {/* السجلّ والإعدادات في الرأس جنب اسم الصفحة — كانا شريطاً في أسفلها
              يمرّ عليه الطالبُ بعد كل شيء. يظهران قبل الجلسة فقط: أثناء التركيز
              لا شيء يزاحم العدّاد. */}
          {phase === "idle" && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowLog(true)} aria-label="سجل الجلسات"
                className="dome-chip tap-44 t-small font-black" style={{ color: "var(--text)" }}>📋 السجل</button>
              <button onClick={() => setShowSettings(true)} aria-label="إعدادات تركيز"
                className="dome-chip tap-44 t-small font-black" style={{ color: "var(--text)" }}>⚙️ إعدادات</button>
            </div>
          )}
        </div>
      </Dome>
      <div className="h-4" />

      {/* اختيار المادة بخطوتين: الاختبار ثم المادة منه */}
      {phase === "idle" && activeTracks.length > 0 && (() => {
        const selTrack = activeTracks.find((t) => t.id === selTrackId) ?? activeTracks[0];
        const trackSubjects = selTrack?.subjects ?? [];
        return (
          <div className="px-5 mb-4 rise rise-1">
            {/* خطوة 1: الاختبار — تظهر فقط لو عنده أكثر من اختبار */}
            {activeTracks.length > 1 && (
              <>
                <p className="text-sm font-bold text-[var(--text-muted)] mb-2">اختبارك:</p>
                <div className="flex gap-2 flex-wrap mb-4">
                  {activeTracks.map((t) => {
                    const active = selTrack?.id === t.id;
                    return (
                      <button key={t.id}
                        onClick={() => { setSelTrackId(t.id); setSubject(t.subjects[0]?.name ?? ""); }}
                        className="px-4 py-2.5 rounded-xl text-[16px] font-bold transition flex items-center gap-2 min-h-[44px]"
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
            {/* خطوة 2: المادة من هذا الاختبار */}
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

        {/* خيطُ المهمّة: الطالب داخل التركيز يجب أن يعرف أين هو من مهمّة اليوم.
            يظهر عند تسليمٍ من مساري **أو من خطتي** بمهمّةٍ لها وزنٌ زمنيّ — وإلا
            لا نخترع رقماً. (كانت «خطتي» تفتح التركيز فارغاً فيضيع ما جدوَلَه.) */}
        {isTaskHandoff(handoff) && (
          <div className="mb-3 max-w-full px-4 py-2 rounded-2xl text-center"
            style={{ background: "color-mix(in srgb, var(--accent) 10%, var(--surface))",
                     border: "1.5px solid color-mix(in srgb, var(--accent) 26%, var(--border))" }}>
            {handoff.taskLabel && (
              <p className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>{handoffSourceLabel(handoff)}: {handoff.taskLabel}</p>
            )}
            <p className="t-body font-black leading-snug" style={{ color: "var(--text)" }}>
              {remainingTaskMins(handoff.taskMins, focusMins) > 0
                ? <>يبقى بعد هذه الجلسة <span className="font-mono-nums">{arNum(remainingTaskMins(handoff.taskMins, focusMins))}</span> دقيقة</>
                : "هذه الجلسة تُنهي المهمّة ✓"}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 w-full mb-6">

          {/* الدائرة — مكوّن يشترك في المتجر ويُعيد رسم نفسه فقط كل ثانية */}
          <OrbitDial
            store={timer}
            phase={phase}
            focusMins={focusMins}
            focusSecs={focusSecs}
            totalSecs={totalSecs}
            strokeColor={strokeColor}
            currentColor={currentColor}
            subject={subject}
            radius={radius}
            circumference={circumference}
          />

        </div>

        {/* رسالة الحالة مع الرفيق — فقط أثناء التشغيل */}
        {phase !== "idle" && (
          <div className="rounded-2xl px-5 py-3 max-w-[300px] mb-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm text-[var(--text-dim)] leading-relaxed text-center">{statusMsg}</p>
          </div>
        )}

        {/* أوّل دخول: اختيار مدّة الجلسة الافتراضية — يُسأل مرّةً واحدة ثم تُحفظ */}
        {phase === "idle" && askDur && (
          <div className="w-full max-w-xs mb-5 rounded-2xl p-4 flex flex-col gap-3 rise"
            style={{ background: "var(--surface)", border: "1.5px solid color-mix(in srgb, var(--accent) 30%, var(--border))" }}>
            <div>
              <p className="t-title font-black" style={{ color: "var(--text)" }}>اختر مدة الجلسة الافتراضية</p>
              <p className="t-caption mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>نحفظها لك، ونستخدمها في كل جلسة — تقدر تغيّرها متى شئت.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["25", "50", "90"] as DurMode[]).map((v) => (
                <button key={v} onClick={() => pickDefaultDur(v)}
                  className="py-3 rounded-xl t-body font-black transition active:scale-[0.97]"
                  style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
                  {arNum(Number(v))} دقيقة
                </button>
              ))}
              <button onClick={() => pickDefaultDur("custom")}
                className="py-3 rounded-xl t-body font-black transition active:scale-[0.97]"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
                مدة مخصصة
              </button>
            </div>
          </div>
        )}

        {/* لوحة التعديل — idle فقط */}
        {phase === "idle" && !askDur && (
          <div className="w-full max-w-xs mb-5">
            <button
              onClick={() => { if (!showEdit) setPrevDur({mode: durMode, custom: customMins}); setShowEdit((v) => !v); }}
              className="w-full py-3 rounded-2xl text-sm font-bold transition"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              {showEdit ? "إخفاء ↑" : "✏️ تعديل المدة"}
            </button>

            {showEdit && (
              <div className="mt-2 rounded-2xl p-4 flex flex-col gap-3"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                {/* الخيارات */}
                <div className="flex gap-2">
                  {(["25", "50", "90"] as DurMode[]).map((v) => (
                    <button key={v} onClick={() => { setDurMode(v); saveDurPref({ mode: v, custom: customMins }); }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition"
                      style={durMode === v
                        ? { background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }
                        : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      {v} د
                    </button>
                  ))}
                  <button onClick={() => { setDurMode("custom"); saveDurPref({ mode: "custom", custom: customMins }); }}
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
                  className="text-[19px] font-semibold text-center w-full"
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
                    className="absolute top-0 left-0 w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    ✕
                  </button>
                  <p className="text-sm text-[var(--text-dim)] leading-relaxed px-6">{breakTip}</p>
                </div>
              )}
              <p className="text-xs text-[var(--text-muted)]">الجلسة القادمة تبدأ تلقائياً بعد <LiveCountdown store={timer} /></p>
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-2">
              <div className="relative glass rounded-2xl p-4 text-center overflow-hidden">
                <BorderBeam size={180} duration={8} colorFrom="var(--gold)" colorTo="var(--accent-hi)" />
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

      {/* شريط الإحصاءات — بعد الجلسة فقط (لحظة المكافأة والتأمّل)؛ لا يزاحم قرار البدء ولا التركيز */}
      {phase === "done" && (
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
      )}

      {/* إعدادات تركيز — ورقةٌ من رأس الصفحة */}
      {showSettings && (
        <Sheet onClose={() => setShowSettings(false)} title="إعدادات تركيز">
          <button onClick={toggleKeepRunning}
            className="w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-right transition active:scale-[0.99]"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <div className="flex-1 min-w-0">
              <p className="font-bold t-body" style={{ color: "var(--text)" }}>إبقاء الجلسة شغّالة عند الخروج</p>
              <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>لو طلعت للخريطة أو صفحة ثانية تكمل الجلسة من حيث وقفت</p>
            </div>
            <span className="w-12 h-7 rounded-full flex items-center transition flex-shrink-0 px-0.5"
              style={{ background: keepRunning ? "var(--accent)" : "var(--border)", justifyContent: keepRunning ? "flex-start" : "flex-end" }}>
              <span className="w-6 h-6 rounded-full bg-white" />
            </span>
          </button>
        </Sheet>
      )}

      {/* سجل الجلسات — ورقةٌ من رأس الصفحة */}
      {showLog && (
        <Sheet onClose={() => setShowLog(false)} title={`سجل الجلسات (${arNum(sessionLog.length)})`}>
          {sessionLog.length === 0 ? (
            <p className="t-body py-6 text-center" style={{ color: "var(--text-muted)" }}>ما فيه جلسات بعد — أنجز جلستك الأولى</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sessionLog.map((e) => {
                const d = new Date(e.ts);
                const when = d.toLocaleString("ar-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
                return (
                  <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <span className="font-bold t-small truncate" style={{ color: "var(--text)" }}>{e.subject}</span>
                    <span className="t-caption flex-shrink-0" style={{ color: "var(--text-muted)" }}>{when}</span>
                    <span className="font-mono-nums font-bold t-small flex-shrink-0" style={{ color: "var(--accent-light)" }}>{e.focusMins}د</span>
                  </div>
                );
              })}
            </div>
          )}
        </Sheet>
      )}

      <NextThread page="/orbit" />
      <PageFooter />
    </div>
  );
}
