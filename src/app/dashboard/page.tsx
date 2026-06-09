"use client";
import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { RAKAN_SCHEDULE } from "@/lib/constants";
import type { VaultError } from "@/lib/types";

const _NOW = Date.now();

interface DarbUser { name: string; exam: string; examDate?: string; onboarded: boolean; }
interface OrbitData {
  totalSessions: number; totalSilver: number; totalFocusMins: number;
  streak: number; sessionsToday: number; lastActiveDate: string;
}

const EXAM_LABEL: Record<string, string> = {
  "تحصيلي":        "التحصيلي",
  "قدرات":         "القدرات",
  "قدرات+تحصيلي":  "قدرات + تحصيلي",
  "أرامكو":        "CPC أرامكو",
  "ابتعاث":        "الابتعاث",
};

export default function DashboardPage() {
  const [user, setUser]             = useState<DarbUser | null>(null);
  const [streak, setStreak]         = useState(0);
  const [silver, setSilver]         = useState(0);
  const [hours, setHours]           = useState(0);
  const [sessions, setSessions]     = useState(0);
  const [vaultCount, setVaultCount] = useState(0);
  const [roadmapPct, setRoadmapPct] = useState(0);
  const [roadmapDone, setRoadmapDone]   = useState(0);
  const [roadmapTotal, setRoadmapTotal] = useState(0);
  const [greeting, setGreeting]     = useState("");

  useEffect(() => {
    startTransition(() => {
      try { const r = localStorage.getItem("darb_user"); if (r) setUser(JSON.parse(r)); } catch {}
      try {
        const o: OrbitData = {
          totalSessions: 0, totalSilver: 0, totalFocusMins: 0,
          streak: 0, sessionsToday: 0, lastActiveDate: "",
          ...JSON.parse(localStorage.getItem("darb_orbit") ?? "{}"),
        };
        setStreak(o.streak); setSilver(o.totalSilver);
        setHours(Math.round(o.totalFocusMins / 60)); setSessions(o.totalSessions);
      } catch {}
      try {
        const v: VaultError[] = JSON.parse(localStorage.getItem("darb_vault") ?? "[]");
        setVaultCount(v.length);
      } catch {}
      try {
        const completed: string[] = JSON.parse(localStorage.getItem("darb_roadmap") ?? "[]");
        const subjects = Object.keys(RAKAN_SCHEDULE) as (keyof typeof RAKAN_SCHEDULE)[];
        const total = subjects.reduce((a, s) => a + RAKAN_SCHEDULE[s].length, 0);
        const done  = completed.length;
        setRoadmapDone(done); setRoadmapTotal(total);
        setRoadmapPct(total > 0 ? Math.round((done / total) * 100) : 0);
      } catch {}
      const h = new Date().getHours();
      setGreeting(
        h < 5  ? "وقت الذئاب"   :
        h < 12 ? "صباح التفوق"  :
        h < 17 ? "وقت التركيز"  :
        h < 21 ? "مساء الإنجاز" : "الليل للنخبة"
      );
    });
  }, []);

  const daysLeft = user?.examDate
    ? Math.max(0, Math.ceil((new Date(user.examDate).getTime() - _NOW) / 86400000))
    : null;

  /* SVG ring constants */
  const R  = 92;
  const C  = 2 * Math.PI * R;

  return (
    <div className="page" style={{ background: "#000" }}>

      {/* Ambient glow top */}
      <div className="fixed top-0 left-0 right-0 pointer-events-none" style={{ height: "280px",
        background: "radial-gradient(ellipse 80% 200px at 50% -40px, rgba(37,99,235,0.07) 0%, transparent 100%)" }} />

      {/* ── Top bar ── */}
      <div className="anim-1 flex items-start justify-between px-5 pt-14 pb-4">
        <div>
          <p className="label mb-2">{greeting}</p>
          <h1 className="font-black leading-tight text-white"
            style={{ fontSize: "30px" }}>
            {user?.name ? `أهلاً، ${user.name}` : "أهلاً بك"}
          </h1>
          {user?.exam && (
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
                {EXAM_LABEL[user.exam] ?? user.exam}
              </span>
              {daysLeft !== null && (
                <span className="text-xs font-black px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "var(--gold)" }}>
                  {daysLeft} يوم
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 pt-1 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.24)" }}>
            <span className="streak-fire">🔥</span>
            <span className="font-mono-nums font-black text-2xl" style={{ color: "var(--gold)" }}>{streak}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
            <span className="text-sm">🪙</span>
            <span className="font-mono-nums font-black text-2xl" style={{ color: "var(--gold-light)" }}>{silver}</span>
          </div>
        </div>
      </div>

      <div className="page-content">

        {/* ── HERO: Orbit ring ── */}
        <div className="anim-2 flex flex-col items-center pt-2 pb-4">
          <Link href="/orbit" className="relative mb-6 flex items-center justify-center active:scale-[0.96] transition-all duration-200"
            style={{ width: "224px", height: "224px" }}>
            {/* Outer glow */}
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: "0 0 60px rgba(37,99,235,0.1)" }} />
            <svg width="224" height="224" className="absolute inset-0 -rotate-90">
              {/* Track */}
              <circle cx="112" cy="112" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
              {/* Decorative arc */}
              <circle cx="112" cy="112" r={R} fill="none"
                stroke="var(--blue)" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * 0.72}
                style={{ opacity: 0.45 }} />
            </svg>
            {/* Center */}
            <div className="flex flex-col items-center justify-center z-10">
              <p className="font-mono-nums font-black leading-none text-white" style={{ fontSize: "46px" }}>
                50:00
              </p>
              <p className="text-xs font-bold mt-2" style={{ color: "var(--blue-light)" }}>ORBIT · أوربت</p>
            </div>
          </Link>

          <Link href="/orbit" className="btn-primary" style={{ maxWidth: "280px" }}>
            ابدأ الجلسة
          </Link>
        </div>

        {/* ── Stats ── */}
        <div className="anim-3">
          <div className="flex items-stretch rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {[
              { val: hours,      unit: "ساعة",  label: "تركيز",   color: "var(--text)"    },
              { val: sessions,   unit: "جلسة",  label: "أوربت",   color: "var(--text)"    },
              { val: vaultCount, unit: "خطأ",   label: "الخزنة",  color: "var(--danger)"  },
            ].map((s, i) => (
              <div key={s.label} className="flex-1 flex flex-col items-center py-5"
                style={{ borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
                <p className="font-mono-nums font-black leading-none" style={{ fontSize: "40px", color: s.color }}>
                  {s.val}
                </p>
                <p className="text-[11px] font-bold mt-2" style={{ color: "var(--text-muted)" }}>
                  {s.unit}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tools ── */}
        <div className="anim-4">
          <p className="label mb-3">أدواتك</p>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {[
              { href: "/orbit",   label: "أوربت",   desc: "جلسات تركيز 50 دقيقة",   dot: "var(--blue)"    },
              { href: "/vault",   label: "الخزنة",  desc: "سجّل أخطاءك ولا تكررها", dot: "var(--gold)"    },
              { href: "/review",  label: "مراجعة",  desc: "بطاقات ذكية · SM-2",      dot: "var(--success)" },
              { href: "/roadmap", label: "الخريطة", desc: "خطتك الدراسية المفصّلة",  dot: "#A78BFA"        },
            ].map((t, i) => (
              <Link key={t.href} href={t.href}
                className="flex items-center gap-4 px-5 py-[18px] active:bg-[var(--surface2)] transition-colors"
                style={{ borderBottom: i < 3 ? "1px solid var(--border)" : "none" }}>
                <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: t.dot }} />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[15px] text-white">{t.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{t.desc}</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  className="w-4 h-4 flex-shrink-0 rotate-180" style={{ color: "rgba(255,255,255,0.12)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Roadmap ── */}
        <div className="anim-5">
          <div className="flex items-center justify-between mb-3">
            <p className="label">الخريطة</p>
            <Link href="/roadmap" className="text-xs font-bold" style={{ color: "var(--blue-light)" }}>
              عرض الكل ←
            </Link>
          </div>
          {roadmapPct === 0 ? (
            <p className="text-sm font-bold py-1" style={{ color: "var(--text-muted)" }}>
              ابدأ رحلتك ← {roadmapTotal} درس تنتظرك 🗺️
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{roadmapDone} من {roadmapTotal} درس</p>
                <p className="font-mono-nums font-black text-sm" style={{ color: "var(--blue-light)" }}>{roadmapPct}%</p>
              </div>
              <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: roadmapPct + "%", background: "var(--blue)" }} />
              </div>
            </>
          )}
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
