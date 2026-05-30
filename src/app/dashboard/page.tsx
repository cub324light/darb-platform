"use client";
import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { RAKAN_SCHEDULE } from "@/lib/constants";
import type { VaultError } from "@/lib/types";

interface DarbUser {
  name: string;
  exam: string;
  examDate?: string;
  onboarded: boolean;
}

interface OrbitData {
  totalSessions: number;
  totalSilver: number;
  totalFocusMins: number;
  streak: number;
  sessionsToday: number;
  lastActiveDate: string;
}

const _NOW = Date.now();

const EXAM_ICONS: Record<string, string> = {
  "تحصيلي":       "📚",
  "قدرات":         "🧠",
  "قدرات+تحصيلي": "⚡",
  "أرامكو":        "🏭",
  "ابتعاث":        "✈️",
};

const QUICK_ACTIONS = [
  {
    href: "/orbit",
    label: "أوربت",
    desc: "50 دقيقة تركيز",
    color: "#2563EB",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    href: "/vault",
    label: "الخزنة",
    desc: "سجّل أخطاءك",
    color: "#F59E0B",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
        <circle cx="12" cy="16" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/review",
    label: "مراجعة",
    desc: "SM-2 ذكية",
    color: "#10B981",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/roadmap",
    label: "الخريطة",
    desc: "خطة يومية مفصّلة",
    color: "#8B5CF6",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
];

export default function DashboardPage() {
  const [user, setUser]             = useState<DarbUser | null>(null);
  const [streak, setStreak]         = useState(0);
  const [silver, setSilver]         = useState(0);
  const [focusHours, setFocusHours] = useState(0);
  const [sessions, setSessions]     = useState(0);
  const [vaultCount, setVaultCount] = useState(0);
  const [roadmapPct, setRoadmapPct] = useState(0);
  const [roadmapDone, setRoadmapDone] = useState(0);
  const [roadmapTotal, setRoadmapTotal] = useState(0);
  const [greeting, setGreeting]     = useState("");

  useEffect(() => {
    startTransition(() => {
      try {
        const raw = localStorage.getItem("darb_user");
        if (raw) setUser(JSON.parse(raw));
      } catch {}

      try {
        const orbit: OrbitData = {
          totalSessions: 0, totalSilver: 0, totalFocusMins: 0,
          streak: 0, sessionsToday: 0, lastActiveDate: "",
          ...JSON.parse(localStorage.getItem("darb_orbit") ?? "{}"),
        };
        setStreak(orbit.streak);
        setSilver(orbit.totalSilver);
        setFocusHours(Math.round(orbit.totalFocusMins / 60));
        setSessions(orbit.totalSessions);
      } catch {}

      try {
        const vault: VaultError[] = JSON.parse(localStorage.getItem("darb_vault") ?? "[]");
        setVaultCount(vault.length);
      } catch {}

      try {
        const completed: string[] = JSON.parse(localStorage.getItem("darb_roadmap") ?? "[]");
        const subjects = Object.keys(RAKAN_SCHEDULE) as (keyof typeof RAKAN_SCHEDULE)[];
        const total = subjects.reduce((a, s) => a + RAKAN_SCHEDULE[s].length, 0);
        const done  = completed.length;
        setRoadmapDone(done);
        setRoadmapTotal(total);
        setRoadmapPct(total > 0 ? Math.round((done / total) * 100) : 0);
      } catch {}

      const h = new Date().getHours();
      if (h < 5)       setGreeting("وقت الذئاب");
      else if (h < 12) setGreeting("صباح التفوق");
      else if (h < 17) setGreeting("وقت التركيز");
      else if (h < 21) setGreeting("مساء الإنجاز");
      else             setGreeting("الليل للنخبة");
    });
  }, []);

  const daysLeft = user?.examDate
    ? Math.max(0, Math.ceil((new Date(user.examDate).getTime() - _NOW) / 86400000))
    : null;

  return (
    <div className="page">

      {/* ── Section 1: Header ── */}
      <div className="anim-1 relative overflow-hidden px-6 pt-14 pb-8">
        {/* Decorative blue radial */}
        <div className="absolute top-0 left-0 w-72 h-72 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 20% 0%, rgba(37,99,235,0.14) 0%, transparent 65%)" }} />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="label mb-2">{greeting}</p>
            <h1 className="font-black text-[28px] text-white leading-tight mb-3">
              {user?.name ? `أهلاً، ${user.name}` : "أهلاً بك"}
            </h1>
            {user?.exam && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ background: "rgba(255,255,255,0.07)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
                  {EXAM_ICONS[user.exam]} {user.exam}
                </span>
                {daysLeft !== null && (
                  <span className="text-xs px-3 py-1 rounded-full font-black"
                    style={{ background: "rgba(245,158,11,0.12)", color: "var(--gold)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    {daysLeft} يوم متبقي
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Chips column */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <span className="streak-fire text-sm">🔥</span>
              <span className="font-mono-nums font-black text-xl text-[var(--gold)]">{streak}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl"
              style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)" }}>
              <span className="text-sm">🪙</span>
              <span className="font-mono-nums font-black text-xl text-[var(--blue-light)]">{silver}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Timer hero ── */}
      <div className="anim-2 flex flex-col items-center px-6 pb-8 gap-5">
        <Link href="/orbit" className="relative flex items-center justify-center transition-all active:scale-95"
          style={{ width: "220px", height: "220px" }}>

          {/* Background glow */}
          <div className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)" }} />

          {/* SVG double-ring */}
          <svg width="220" height="220" className="absolute inset-0 -rotate-90">
            {/* Outer decorative dashed ring */}
            <circle cx="110" cy="110" r="104" fill="none" stroke="rgba(37,99,235,0.18)"
              strokeWidth="1" strokeDasharray="3 9" />
            {/* Track */}
            <circle cx="110" cy="110" r="90" fill="none" stroke="rgba(37,99,235,0.12)" strokeWidth="10" />
            {/* Progress ring — full circle when idle */}
            <circle cx="110" cy="110" r="90" fill="none" strokeWidth="10"
              stroke="url(#timerGrad)" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 90} strokeDashoffset={0} />
            <defs>
              <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1D4ED8" />
                <stop offset="100%" stopColor="#60A5FA" />
              </linearGradient>
            </defs>
          </svg>

          {/* Inner glow ring */}
          <div className="absolute rounded-full pointer-events-none"
            style={{ inset: "16px", boxShadow: "0 0 40px rgba(37,99,235,0.3), inset 0 0 32px rgba(37,99,235,0.06)" }} />

          {/* Time display */}
          <div className="relative flex flex-col items-center">
            <p className="font-mono-nums font-black text-[52px] leading-none text-white">50:00</p>
            <p className="text-xs tracking-widest text-[var(--blue-light)] mt-2 font-bold uppercase">Orbit</p>
          </div>
        </Link>

        <Link href="/orbit" className="btn-primary" style={{ maxWidth: "280px" }}>
          ابدأ الدراسة الآن
        </Link>
      </div>

      <div className="page-content">

        {/* ── Section 3: Stats ── */}
        <div className="anim-3 grid grid-cols-3 gap-3">
          {[
            { val: focusHours, unit: "ساعة", label: "تركيز", color: "#3B82F6", bg: "rgba(37,99,235,0.09)", bd: "rgba(37,99,235,0.18)" },
            { val: sessions,   unit: "جلسة", label: "أوربت", color: "#F59E0B", bg: "rgba(245,158,11,0.09)", bd: "rgba(245,158,11,0.18)" },
            { val: vaultCount, unit: "خطأ",  label: "الخزنة", color: "#EF4444", bg: "rgba(239,68,68,0.09)", bd: "rgba(239,68,68,0.18)" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center pt-5 pb-4 rounded-2xl"
              style={{ background: s.bg, border: `1px solid ${s.bd}` }}>
              <p className="font-mono-nums font-black text-[32px] leading-none" style={{ color: s.color }}>{s.val}</p>
              <p className="text-xs font-bold text-[var(--text)] mt-2">{s.unit}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 tracking-wide uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Section 4: Quick tools ── */}
        <div className="anim-4">
          <p className="label mb-3">الأدوات</p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.href} href={a.href}
                className="rounded-2xl p-5 flex flex-col gap-3 active:scale-95 transition-all"
                style={{
                  background: `linear-gradient(145deg, ${a.color}18 0%, ${a.color}06 100%)`,
                  border: `1px solid ${a.color}28`,
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: a.color + "22", color: a.color }}>
                  {a.icon}
                </div>
                <div>
                  <p className="font-black text-sm text-white leading-tight">{a.label}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-snug">{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Section 5: Roadmap progress ── */}
        <div className="anim-5 rounded-2xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="font-black text-sm text-white">الخريطة الدراسية</p>
            <span className="font-mono-nums font-black text-2xl text-[var(--blue-light)]">{roadmapPct}%</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            {roadmapDone} درس منجز من أصل {roadmapTotal}
          </p>
          <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden mb-4">
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: roadmapPct + "%",
                background: "linear-gradient(90deg, #1D4ED8, #3B82F6, #60A5FA)",
                boxShadow: "0 0 8px rgba(37,99,235,0.5)",
              }} />
          </div>
          <Link href="/roadmap"
            className="flex items-center justify-between text-xs font-bold"
            style={{ color: "var(--blue-light)" }}>
            <span>عرض الخريطة التفصيلية</span>
            <span>←</span>
          </Link>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
