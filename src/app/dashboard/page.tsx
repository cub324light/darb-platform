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
        setStreak(o.streak);
        setSilver(o.totalSilver);
        setHours(Math.round(o.totalFocusMins / 60));
        setSessions(o.totalSessions);
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
        setRoadmapDone(done);
        setRoadmapTotal(total);
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

  return (
    <div className="page">

      {/* ── Identity ── */}
      <div className="anim-1 flex items-start justify-between px-5 pt-14 pb-7">
        <div>
          <p className="label mb-2">{greeting}</p>
          <h1 className="font-black text-[28px] leading-tight text-white">
            {user?.name ? `أهلاً، ${user.name}` : "أهلاً بك"}
          </h1>
          {user?.exam && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
                {EXAM_LABEL[user.exam] ?? user.exam}
              </span>
              {daysLeft !== null && (
                <span className="text-xs font-black px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)", color: "var(--gold)" }}>
                  {daysLeft} يوم
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 pt-1 flex-shrink-0">
          <span className="flex items-center gap-1.5 font-black text-sm" style={{ color: "var(--gold)" }}>
            <span className="streak-fire">🔥</span>
            <span className="font-mono-nums text-lg">{streak}</span>
          </span>
          <span className="flex items-center gap-1.5 font-black text-sm" style={{ color: "var(--text-dim)" }}>
            🪙 <span className="font-mono-nums text-lg">{silver}</span>
          </span>
        </div>
      </div>

      <div className="page-content">

        {/* ── HERO: Orbit CTA ── */}
        <Link href="/orbit" className="anim-2 block rounded-2xl overflow-hidden"
          style={{ background: "var(--blue)", boxShadow: "0 4px 28px rgba(37,99,235,0.2)" }}>
          <div className="px-6 pt-6 pb-5">
            <p className="label mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>ORBIT · أوربت</p>
            <p className="font-mono-nums font-black text-[58px] leading-none text-white">50:00</p>
            <p className="text-sm font-semibold mt-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              50 دقيقة تركيز · 10 دقائق راحة
            </p>
          </div>
          <div className="flex items-center justify-between px-6 py-3.5"
            style={{ background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="font-black text-sm text-white">ابدأ الدراسة الآن</span>
            <span className="text-white text-lg" style={{ opacity: 0.65 }}>←</span>
          </div>
        </Link>

        {/* ── Stats ── */}
        <div className="anim-3 flex items-stretch rounded-2xl overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {[
            { val: hours,      unit: "ساعة",  color: "var(--text)"   },
            { val: sessions,   unit: "جلسة",  color: "var(--text)"   },
            { val: vaultCount, unit: "خطأ",   color: "var(--danger)" },
          ].map((s, i) => (
            <div key={s.unit} className="flex-1 flex flex-col items-center py-5"
              style={{ borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
              <p className="font-mono-nums font-black text-[32px] leading-none" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[11px] font-semibold mt-1.5" style={{ color: "var(--text-muted)" }}>{s.unit}</p>
            </div>
          ))}
        </div>

        {/* ── Tools ── */}
        <div className="anim-4">
          <p className="label mb-3">أدواتك</p>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {[
              { href: "/orbit",   label: "أوربت",   desc: "50 دقيقة تركيز",    dot: "var(--blue)"    },
              { href: "/vault",   label: "الخزنة",  desc: "سجّل أخطاءك",       dot: "var(--gold)"    },
              { href: "/review",  label: "مراجعة",  desc: "بطاقات ذكية · SM-2", dot: "var(--success)" },
              { href: "/roadmap", label: "الخريطة", desc: "خطتك الدراسية",      dot: "#8B5CF6"        },
            ].map((t, i) => (
              <Link key={t.href} href={t.href}
                className="flex items-center gap-4 px-5 py-[17px] active:bg-[var(--surface2)] transition-colors"
                style={{ borderBottom: i < 3 ? "1px solid var(--border)" : "none" }}>
                <div className="w-2 h-7 rounded-full flex-shrink-0" style={{ background: t.dot }} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] text-white">{t.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{t.desc}</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  className="w-4 h-4 flex-shrink-0 rotate-180" style={{ color: "rgba(255,255,255,0.15)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Roadmap progress ── */}
        <div className="anim-5">
          <div className="flex items-center justify-between mb-3">
            <p className="label">الخريطة</p>
            <Link href="/roadmap" className="text-xs font-bold" style={{ color: "var(--blue-light)" }}>
              عرض الكل ←
            </Link>
          </div>
          <div className="h-[3px] rounded-full overflow-hidden mb-2" style={{ background: "var(--surface2)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: roadmapPct + "%", background: "var(--blue)" }} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{roadmapDone} من {roadmapTotal} درس</p>
            <p className="font-mono-nums font-black text-sm" style={{ color: "var(--blue-light)" }}>{roadmapPct}%</p>
          </div>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
