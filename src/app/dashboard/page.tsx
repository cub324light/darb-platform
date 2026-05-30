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
    desc: "50/10 دقيقة",
    color: "var(--blue)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    href: "/vault",
    label: "الخزنة",
    desc: "أخطاؤك",
    color: "var(--gold)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
        <circle cx="12" cy="16" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/review",
    label: "مراجعة",
    desc: "SM-2",
    color: "var(--success)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/roadmap",
    label: "الخريطة",
    desc: "تقدمك",
    color: "#8B5CF6",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
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
        setRoadmapPct(total > 0 ? Math.round((completed.length / total) * 100) : 0);
      } catch {}

      const h = new Date().getHours();
      if (h < 5)       setGreeting("وقت الذئاب 🌙");
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

      {/* ── Section 1: Top bar ── */}
      <div className="anim-1 px-5 pt-14 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[var(--text-muted)] text-sm mb-1">{greeting}</p>
            <p className="font-black text-2xl text-[var(--text)] leading-tight">
              {user?.name ? `أهلاً، ${user.name}` : "أهلاً بك"}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="stat-chip">
              <span className="streak-fire text-base">🔥</span>
              <span className="font-mono-nums font-bold text-[var(--gold)]">{streak}</span>
            </div>
            <div className="stat-chip">
              <span className="text-base">🪙</span>
              <span className="font-mono-nums font-bold text-[var(--blue-light)]">{silver}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Timer hero ── */}
      <div className="anim-2 px-5 pb-8 flex flex-col items-center gap-5">
        <Link
          href="/orbit"
          className="w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all active:scale-95"
          style={{
            border: "3px solid var(--teal)",
            boxShadow: "0 0 40px var(--teal-glow), 0 0 80px rgba(0,200,150,0.08)",
            background: "radial-gradient(circle at center, rgba(0,200,150,0.06) 0%, transparent 70%)",
          }}
        >
          <p className="font-mono-nums font-black text-[52px] leading-none text-white">25:00</p>
          <p className="text-xs text-[var(--text-muted)] mt-2 tracking-wide">أوربت · ابدأ</p>
        </Link>
        <Link href="/orbit" className="btn-teal" style={{ maxWidth: "280px" }}>
          ابدأ الدراسة
        </Link>
      </div>

      <div className="page-content">

        {/* ── Section 3: Stats row ── */}
        <div className="anim-3 grid grid-cols-3 gap-0 divide-x divide-x-reverse divide-[var(--border)]"
          style={{ border: "1px solid var(--border)", borderRadius: "20px", overflow: "hidden", background: "var(--surface)" }}>
          {[
            { val: focusHours, unit: "ساعة", label: "تركيز",  color: "var(--blue-light)" },
            { val: sessions,   unit: "جلسة", label: "أوربت",  color: "var(--gold)"       },
            { val: vaultCount, unit: "خطأ",  label: "الخزنة", color: "var(--danger)"     },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-5 px-2">
              <p className="font-mono-nums font-black text-3xl leading-none" style={{ color: s.color }}>{s.val}</p>
              <p className="text-xs font-semibold text-[var(--text)] mt-1">{s.unit}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Section 4: Exam goal ── */}
        {user?.exam && (
          <div className="anim-4 card flex items-center gap-4" style={{ padding: "16px 20px" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.2)" }}>
              {EXAM_ICONS[user.exam] ?? "🎯"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="label mb-0.5">هدفك</p>
              <p className="font-black text-base text-[var(--text)] truncate">{user.exam}</p>
            </div>
            {daysLeft !== null && (
              <div className="text-center flex-shrink-0">
                <p className="font-mono-nums font-black text-2xl text-[var(--gold)] leading-none">{daysLeft}</p>
                <p className="label mt-0.5">يوم</p>
              </div>
            )}
          </div>
        )}

        {/* ── Section 5: Quick tools ── */}
        <div className="anim-4">
          <p className="label mb-3">الأدوات</p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-all"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRight: `3px solid ${a.color}`,
                }}
              >
                <span style={{ color: a.color }}>{a.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--text)] leading-tight">{a.label}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Section 6: Roadmap progress ── */}
        <div className="anim-5 card" style={{ padding: "16px 20px" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm text-[var(--text)]">تقدم الخريطة</p>
            <span className="font-mono-nums font-black text-lg text-[var(--blue-light)]">{roadmapPct}%</span>
          </div>
          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: roadmapPct + "%", background: "linear-gradient(90deg, #1D4ED8, #3B82F6)" }}
            />
          </div>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
