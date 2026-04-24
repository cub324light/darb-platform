"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Companion from "@/components/Companion";
import type { BirdId } from "@/lib/types";
import { BIRDS } from "@/lib/constants";

const QUICK_ACTIONS = [
  { href: "/orbit", icon: "⏱️", label: "ابدأ Orbit", color: "#2563EB", desc: "50/10" },
  { href: "/vault", icon: "🔒", label: "الخزنة", color: "#F59E0B", desc: "أخطاؤك" },
  { href: "/review", icon: "🧠", label: "المراجعة", color: "#10B981", desc: "SM-2" },
  { href: "/roadmap", icon: "🗺️", label: "الخريطة", color: "#8B5CF6", desc: "تقدمك" },
];

export default function DashboardPage() {
  const [streak, setStreak] = useState(7);
  const [silver, setSilver] = useState(340);
  const [focusHours, setFocusHours] = useState(24);
  const [birdId] = useState<BirdId>("falcon");
  const [greeting, setGreeting] = useState("");
  const [companionMsg, setCompanionMsg] = useState("");
  const [time, setTime] = useState(new Date());

  const bird = BIRDS.find((b) => b.id === birdId)!;

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 5) setGreeting("وقت الذئاب");
    else if (h < 12) setGreeting("صباح التفوق");
    else if (h < 17) setGreeting("وقت التركيز");
    else if (h < 21) setGreeting("مساء الإنجاز");
    else setGreeting("الليل للنخبة");

    setCompanionMsg(bird.messages.firstLogin);

    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, [bird]);

  const todayProgress = 35;

  return (
    <div className="min-h-dvh bg-[var(--bg)] pb-nav">
      {/* Sky gradient header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0D1B3E 0%, #111827 60%, var(--bg) 100%)",
          minHeight: "280px",
        }}
      >
        {/* Stars */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: "2px",
              height: "2px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 70 + "%",
              opacity: 0.4 + Math.random() * 0.4,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: Math.random() * 3 + "s",
            }}
          />
        ))}

        {/* City lights at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16"
          style={{
            background:
              "radial-gradient(ellipse at 20% 100%, rgba(245,158,11,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 100%, rgba(37,99,235,0.1) 0%, transparent 50%)",
          }}
        />

        <div className="relative z-10 px-5 pt-10 pb-6">
          {/* Top row */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs text-[var(--text-muted)]">{greeting}</p>
              <p className="font-black text-lg text-[var(--text)]">أهلاً، درب</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Streak */}
              <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-full">
                <span className="text-base streak-fire">🔥</span>
                <span className="font-mono-nums font-bold text-sm text-[var(--gold)]">{streak}</span>
              </div>
              {/* Silver */}
              <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-full">
                <span className="text-sm">🪙</span>
                <span className="font-mono-nums font-bold text-sm text-[var(--blue-light)]">{silver}</span>
              </div>
            </div>
          </div>

          {/* Companion center */}
          <div className="flex justify-center mb-4">
            <Companion birdId={birdId} state="idle" message={companionMsg} size="lg" showMessage={true} />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-5 -mt-4 relative z-10">
        <div className="grid grid-cols-4 gap-2 mb-5">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="glass rounded-2xl p-3 flex flex-col items-center gap-1 transition hover:scale-105 active:scale-95"
              style={{ borderColor: a.color + "33" }}
            >
              <span className="text-xl">{a.icon}</span>
              <span className="text-[10px] font-bold text-[var(--text)]">{a.label}</span>
              <span className="text-[9px] text-[var(--text-muted)]">{a.desc}</span>
            </Link>
          ))}
        </div>

        {/* Today progress */}
        <div className="glass rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-[var(--text)]">تقدم اليوم</h3>
            <span className="font-mono-nums text-sm font-bold text-[var(--blue-light)]">{todayProgress}%</span>
          </div>
          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: todayProgress + "%",
                background: "linear-gradient(90deg, #1D4ED8, #3B82F6)",
              }}
            />
          </div>
          <div className="grid grid-cols-3 text-center gap-2">
            <div>
              <p className="font-mono-nums text-lg font-black text-[var(--gold)]">{focusHours}</p>
              <p className="text-[10px] text-[var(--text-muted)]">ساعة تركيز</p>
            </div>
            <div>
              <p className="font-mono-nums text-lg font-black text-[var(--success)]">12</p>
              <p className="text-[10px] text-[var(--text-muted)]">جلسة Orbit</p>
            </div>
            <div>
              <p className="font-mono-nums text-lg font-black text-[var(--danger)]">8</p>
              <p className="text-[10px] text-[var(--text-muted)]">في الخزنة</p>
            </div>
          </div>
        </div>

        {/* Digital discipline certificate preview */}
        <div
          className="rounded-2xl p-4 mb-4 flex items-center gap-3"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(37,99,235,0.05))",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <span className="text-2xl">📜</span>
          <div>
            <p className="font-bold text-sm text-[var(--gold)]">شهادة الانضباط الرقمية</p>
            <p className="text-xs text-[var(--text-muted)]">{focusHours} ساعة تركيز مسجلة · سارية لأرامكو</p>
          </div>
          <span className="text-[var(--text-muted)] mr-auto">←</span>
        </div>

        {/* Clock & time */}
        <div className="glass rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)]">الوقت الحالي</p>
            <p className="font-mono-nums text-2xl font-black text-[var(--text)]">
              {time.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true })}
            </p>
          </div>
          <Link
            href="/orbit"
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white transition"
            style={{ background: "#2563EB" }}
          >
            ابدأ الآن
          </Link>
        </div>

        {/* Community links */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Link
            href="/council"
            className="glass rounded-2xl p-4 flex items-center gap-2 hover:border-[var(--blue)]/40 transition"
          >
            <span className="text-xl">💬</span>
            <div>
              <p className="font-bold text-xs text-[var(--text)]">المجلس</p>
              <p className="text-[10px] text-[var(--text-muted)]">نقاشات وتجميعات</p>
            </div>
          </Link>
          <Link
            href="/arena"
            className="glass rounded-2xl p-4 flex items-center gap-2 hover:border-[var(--gold)]/40 transition"
          >
            <span className="text-xl">⚔️</span>
            <div>
              <p className="font-bold text-xs text-[var(--gold)]">الأرينا</p>
              <p className="text-[10px] text-[var(--text-muted)]">تحدي 1v1</p>
            </div>
          </Link>
        </div>

        {/* Upgrade CTA (for free users) */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(37,99,235,0.05))",
            border: "1px solid rgba(37,99,235,0.25)",
          }}
        >
          <span className="text-xl">🦅</span>
          <div className="flex-1">
            <p className="font-bold text-sm text-[var(--text)]">باقة شاهين</p>
            <p className="text-xs text-[var(--text-muted)]">خزنة غير محدودة + SM-2 كاملة</p>
          </div>
          <Link
            href="/pricing"
            className="text-xs font-bold px-3 py-1.5 rounded-xl text-white"
            style={{ background: "#2563EB" }}
          >
            35 ريال
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
