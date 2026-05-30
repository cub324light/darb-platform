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

const EXAM_LABELS: Record<string, string> = {
  "تحصيلي": "التحصيلي",
  "قدرات": "القدرات",
  "قدرات+تحصيلي": "قدرات + تحصيلي",
  "أرامكو": "أرامكو CPC",
  "ابتعاث": "الابتعاث",
};

const TOOLS = [
  {
    href: "/orbit",
    label: "أوربت",
    desc: "50 دقيقة تركيز · 10 راحة",
    color: "var(--blue-light)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    href: "/vault",
    label: "الخزنة",
    desc: "سجّل أخطاءك لا تكررها",
    color: "var(--gold)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
        <circle cx="12" cy="16" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/review",
    label: "مراجعة",
    desc: "بطاقات ذكية · SM-2",
    color: "#10B981",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/roadmap",
    label: "الخريطة",
    desc: "خطتك الدراسية المفصّلة",
    color: "#8B5CF6",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
];

export default function DashboardPage() {
  const [user, setUser]               = useState<DarbUser | null>(null);
  const [streak, setStreak]           = useState(0);
  const [silver, setSilver]           = useState(0);
  const [focusHours, setFocusHours]   = useState(0);
  const [sessions, setSessions]       = useState(0);
  const [vaultCount, setVaultCount]   = useState(0);
  const [roadmapPct, setRoadmapPct]   = useState(0);
  const [roadmapDone, setRoadmapDone] = useState(0);
  const [roadmapTotal, setRoadmapTotal] = useState(0);
  const [greeting, setGreeting]       = useState("");

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

      {/* ── Identity ── */}
      <div className="anim-1 px-6 pt-14 pb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="label mb-2">{greeting}</p>
            <h1 className="font-black text-[30px] text-white leading-tight">
              {user?.name ? `أهلاً، ${user.name}` : "أهلاً بك"}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-1">
            <span className="flex items-center gap-1.5 font-black text-sm text-[var(--gold)]">
              <span className="streak-fire">🔥</span>
              <span className="font-mono-nums text-lg">{streak}</span>
            </span>
            <span className="flex items-center gap-1.5 font-black text-sm text-[var(--blue-light)]">
              <span className="text-sm">🪙</span>
              <span className="font-mono-nums text-lg">{silver}</span>
            </span>
          </div>
        </div>

        {user?.exam && (
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs font-semibold text-[var(--text-muted)]">هدفك:</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
              {EXAM_LABELS[user.exam] ?? user.exam}
            </span>
            {daysLeft !== null && (
              <span className="text-xs font-black px-2.5 py-1 rounded-full"
                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.18)", color: "var(--gold)" }}>
                {daysLeft} يوم
              </span>
            )}
          </div>
        )}
      </div>

      <div className="page-content">

        {/* ── HERO: Orbit CTA ── */}
        <div className="anim-2 rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(140deg, #1a3a8f 0%, #1D4ED8 45%, #2563EB 100%)",
            boxShadow: "0 8px 40px rgba(37,99,235,0.3), 0 2px 8px rgba(0,0,0,0.5)",
          }}>
          <div className="p-6">
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="text-[11px] text-blue-300 font-bold tracking-widest uppercase mb-1">
                  Orbit · أوربت
                </p>
                <p className="font-mono-nums font-black text-[52px] text-white leading-none">
                  50:00
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} className="w-7 h-7">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" d="M12 7v5l3 3" />
                </svg>
              </div>
            </div>
            <Link href="/orbit"
              className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-base transition active:scale-97"
              style={{
                background: "white",
                color: "#1D4ED8",
                boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
              }}>
              ابدأ الدراسة الآن
              <span className="text-lg">←</span>
            </Link>
          </div>
          {sessions > 0 && (
            <div className="px-6 py-3 flex items-center gap-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.15)" }}>
              <p className="text-xs text-blue-200">
                <span className="font-mono-nums font-black text-white text-sm">{sessions}</span> جلسة
                <span className="mx-2 opacity-40">·</span>
                <span className="font-mono-nums font-black text-white text-sm">{focusHours}</span> ساعة تركيز
              </p>
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="anim-3">
          <p className="label mb-5">إحصاءاتك</p>
          <div className="flex items-stretch">
            {[
              { val: focusHours, unit: "ساعة", sub: "تركيز",  color: "var(--blue-light)" },
              { val: sessions,   unit: "جلسة", sub: "أوربت",  color: "var(--text)"       },
              { val: vaultCount, unit: "خطأ",  sub: "الخزنة", color: "var(--danger)"     },
            ].map((s, i) => (
              <div key={s.sub}
                className="flex-1 flex flex-col items-center py-2"
                style={{ borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
                <p className="font-mono-nums font-black text-[40px] leading-none" style={{ color: s.color }}>
                  {s.val}
                </p>
                <p className="text-xs font-bold text-[var(--text-dim)] mt-2">{s.unit}</p>
                <p className="label mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tools list ── */}
        <div className="anim-4">
          <p className="label mb-3">أدواتك</p>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {TOOLS.map((t, i) => (
              <Link key={t.href} href={t.href}
                className="flex items-center gap-4 px-5 py-[18px] transition-colors active:bg-[var(--surface2)]"
                style={{ borderBottom: i < TOOLS.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: t.color + "15", color: t.color }}>
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white">{t.label}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.desc}</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  className="w-4 h-4 text-[var(--border)] flex-shrink-0 rotate-180">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Roadmap progress ── */}
        <div className="anim-5">
          <div className="flex items-center justify-between mb-3">
            <p className="label">الخريطة الدراسية</p>
            <Link href="/roadmap"
              className="text-[11px] font-bold"
              style={{ color: "var(--blue-light)" }}>
              عرض الكل →
            </Link>
          </div>
          <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: roadmapPct + "%", background: "linear-gradient(90deg, #1D4ED8, #60A5FA)" }} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">{roadmapDone} من {roadmapTotal} درس</p>
            <p className="font-mono-nums font-black text-sm text-[var(--blue-light)]">{roadmapPct}%</p>
          </div>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
