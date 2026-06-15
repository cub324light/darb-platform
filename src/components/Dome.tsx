"use client";
import { useEffect, useState, useRef, type ReactNode } from "react";
import ProfileButton, { ThemeToggle } from "@/components/Profile";
import SettingsButton from "@/components/SettingsPanel";
import NotificationBell from "@/components/NotificationBell";
import { loadUser, loadEvents, type ScheduleEvent } from "@/lib/storage";

/* ── ساعة صغيرة مع إعدادات 12/24 + لغة ع/EN ── */
type Lang = "ar" | "en";
function ClockWidget() {
  const [time, setTime] = useState("");
  const [fmt, setFmt] = useState<"12" | "24">(() =>
    typeof window !== "undefined" ? (localStorage.getItem("darb_clock_fmt") as "12" | "24" ?? "12") : "12"
  );
  const [lang, setLang] = useState<Lang>(() =>
    typeof window !== "undefined" ? (localStorage.getItem("darb_lang") as Lang ?? "ar") : "ar"
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const locale = lang === "ar" ? "ar-SA" : "en-US";
      setTime(d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: fmt === "12" }));
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, [fmt, lang]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const setFormat = (f: "12" | "24") => { setFmt(f); localStorage.setItem("darb_clock_fmt", f); };
  const setLanguage = (l: Lang) => { setLang(l); localStorage.setItem("darb_lang", l); };

  const labels = lang === "ar"
    ? { fmt: "الصيغة", lang: "اللغة", h12: "12 ساعة", h24: "24 ساعة" }
    : { fmt: "Format", lang: "Language", h12: "12-hour", h24: "24-hour" };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 rounded-xl text-[13px] font-bold tabular-nums"
        style={{ background: "color-mix(in srgb, var(--text-muted) 10%, transparent)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
        {time}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-[99] rounded-xl shadow-xl flex flex-col overflow-hidden"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)", minWidth: "150px" }} dir={lang === "ar" ? "rtl" : "ltr"}>
          <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold" style={{ color: "var(--text-muted)", textAlign: lang === "ar" ? "right" : "left" }}>{labels.fmt}</p>
          {(["12", "24"] as const).map((f) => (
            <button key={f} onClick={() => setFormat(f)}
              className="px-4 py-2 text-[13px] font-bold transition hover:brightness-110"
              style={{ textAlign: lang === "ar" ? "right" : "left",
                       background: fmt === f ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
                       color: fmt === f ? "var(--accent-light)" : "var(--text-dim)" }}>
              {f === "12" ? labels.h12 : labels.h24}
            </button>
          ))}
          <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold border-t" style={{ color: "var(--text-muted)", borderColor: "var(--border)", textAlign: lang === "ar" ? "right" : "left" }}>{labels.lang}</p>
          {(["ar", "en"] as const).map((l) => (
            <button key={l} onClick={() => setLanguage(l)}
              className="px-4 py-2 text-[13px] font-bold transition hover:brightness-110"
              style={{ textAlign: lang === "ar" ? "right" : "left",
                       background: lang === l ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
                       color: lang === l ? "var(--accent-light)" : "var(--text-dim)" }}>
              {l === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── حساب أقرب جلسة مذاكرة قادمة من أحداث الجدول ── */
function nextStudySession(): { label: string; whenMs: number; durationH: number } | null {
  const events = loadEvents().filter((e) => e.type === "study");
  if (!events.length) return null;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const occursOn = (e: ScheduleEvent, date: Date, dateStr: string): boolean => {
    const r = e.recurrence;
    switch (r.kind) {
      case "once": return r.date === dateStr;
      case "weekly": return date.getDay() === r.dayOfWeek;
      case "daily": return dateStr >= r.fromDate;
      case "multiweekly": return r.days.includes(date.getDay());
    }
  };

  let best: { label: string; whenMs: number; durationH: number } | null = null;
  for (let i = 0; i < 8; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const dateStr = i === 0 ? todayStr : date.toISOString().slice(0, 10);
    for (const e of events) {
      if (!occursOn(e, date, dateStr)) continue;
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), e.fromHour, 0, 0);
      const whenMs = start.getTime();
      if (whenMs <= now.getTime()) continue;
      if (!best || whenMs < best.whenMs) {
        best = { label: e.subject || e.label || "مذاكرة", whenMs, durationH: Math.max(1, e.toHour - e.fromHour) };
      }
    }
    if (best) break; // أقرب يوم فيه جلسة يكفي
  }
  return best;
}

/* ── ترحيب «أهلا فلان» + الجلسة القادمة ── */
function GreetingWidget() {
  const [name] = useState<string>(() =>
    typeof window !== "undefined" ? (loadUser()?.name ?? "") : ""
  );
  const [next, setNext] = useState<{ label: string; whenMs: number; durationH: number } | null>(null);

  useEffect(() => {
    const refresh = () => setNext(nextStudySession());
    refresh();
    const t = setInterval(refresh, 60000);
    return () => clearInterval(t);
  }, []);

  if (!name) return <div className="flex-1" />;

  const whenText = (ms: number) => {
    const d = new Date(ms);
    const fmt = localStorage.getItem("darb_clock_fmt") !== "24";
    const time = d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: fmt });
    const today = new Date();
    const dayDiff = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
    if (dayDiff === 0) return `اليوم ${time}`;
    if (dayDiff === 1) return `غداً ${time}`;
    return `${d.toLocaleDateString("ar-SA", { weekday: "long" })} ${time}`;
  };

  return (
    <div className="flex-1 min-w-0" dir="rtl">
      <p className="font-black text-[15px] truncate" style={{ color: "var(--text)" }}>
        أهلاً {name} 👋
      </p>
      {next ? (
        <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
          📚 {next.label} · {whenText(next.whenMs)} · {next.durationH} ساعة
        </p>
      ) : (
        <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
          لا توجد جلسة مذاكرة قادمة
        </p>
      )}
    </div>
  );
}

/* ─── القبة: سماء محتواة داخل الهيدر — توقيع درب البصري ───
   المحتوى فوقها دائماً (z-2) والزينة خلفه (z-1) داخل حدود القبة فقط،
   فلا تتصادم مع أي عنصر في الصفحة. */

interface Star { left: string; top: string; size: string; opacity: number; duration: string; delay: string; }

export default function Dome({
  children,
  compact = false,
  hideControls = false,
}: {
  children: ReactNode;
  compact?: boolean;
  hideControls?: boolean;
}) {
  const [stars] = useState<Star[]>(() =>
    Array.from({ length: compact ? 16 : 30 }).map(() => ({
      left: Math.random() * 100 + "%",
      top: Math.random() * 85 + "%",
      size: Math.random() * 1.8 + 1 + "px",
      opacity: Math.random() * 0.5 + 0.2,
      duration: 2 + Math.random() * 4 + "s",
      delay: Math.random() * 4 + "s",
    }))
  );
  const [shootKey, setShootKey] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setShootKey((k) => k + 1), 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="dome">
      {/* ── الزينة (خلف المحتوى، داخل القبة فقط) ── */}
      <div className="dome-decor" aria-hidden="true">
        {/* الليلي */}
        <div className="dome-night">
          {stars.map((s, i) => (
            <span key={i} className="dome-star"
              style={{ left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.opacity, animationDuration: s.duration, animationDelay: s.delay }} />
          ))}
          <svg className="dome-moon" viewBox="0 0 64 64" fill="none">
            <defs>
              <radialGradient id="dmGlow" cx="50%" cy="50%" r="50%">
                <stop offset="55%" stopColor="#FCD34D" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#FCD34D" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="32" cy="32" r="30" fill="url(#dmGlow)" />
            <path d="M40 12a20 20 0 1 0 10 36 16 16 0 1 1-10-36z" fill="#FCD34D" opacity="0.9" />
          </svg>
          <span key={shootKey} className="dome-shooting" />
        </div>

        {/* النهاري */}
        <div className="dome-day">
          <svg className="dome-sun" viewBox="0 0 80 80" fill="none">
            <defs>
              <radialGradient id="dsGlow" cx="50%" cy="50%" r="50%">
                <stop offset="38%" stopColor="#F59E0B" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="40" cy="40" r="38" fill="url(#dsGlow)" />
            <circle cx="40" cy="40" r="14" fill="#F59E0B" opacity="0.95" />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * Math.PI) / 4;
              return (
                <line key={i}
                  x1={40 + Math.cos(a) * 19} y1={40 + Math.sin(a) * 19}
                  x2={40 + Math.cos(a) * 26} y2={40 + Math.sin(a) * 26}
                  stroke="#F59E0B" strokeWidth="3.4" strokeLinecap="round" opacity="0.8" />
              );
            })}
          </svg>
          <span className="dome-cloud dome-cloud-1" />
          {!compact && <span className="dome-cloud dome-cloud-2" />}
          <svg className="dome-flock" viewBox="0 0 120 30" fill="none">
            {[[14, 12],[36, 19],[58, 9],[80, 16],[102, 11]].map(([x, y], i) => (
              <path key={i}
                d={`M${x - 5},${y} Q${x - 1.5},${y - 4.5} ${x},${y} Q${x + 1.5},${y - 4.5} ${x + 5},${y}`}
                stroke="#7A5A1E" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            ))}
          </svg>
        </div>
      </div>

      {/* ── المحتوى ── */}
      <div className="dome-content" style={{ padding: compact ? "calc(18px + env(safe-area-inset-top)) 18px 16px" : "calc(26px + env(safe-area-inset-top)) 18px 22px" }}>
        {!hideControls && (
          <div className="flex justify-between items-center gap-2 mb-3" dir="ltr">
            <GreetingWidget />
            <div className="flex items-center gap-2 flex-shrink-0">
              <SettingsButton />
              <ProfileButton />
              <NotificationBell />
              <ThemeToggle className="" />
              <ClockWidget />
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
