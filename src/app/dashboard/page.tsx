"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Companion from "@/components/Companion";
import type { BirdId } from "@/lib/types";

interface DarbUser {
  name: string;
  exam: string;
  bird: BirdId;
  examDate?: string;
  onboarded: boolean;
}

const EXAM_ICONS: Record<string, string> = {
  "تحصيلي":        "📚",
  "قدرات":          "🧠",
  "قدرات+تحصيلي":  "⚡",
  "أرامكو":         "🏭",
  "ابتعاث":         "✈️",
};

export default function DashboardPage() {
  const [user, setUser] = useState<DarbUser | null>(null);
  const [streak] = useState(7);
  const [silver] = useState(340);
  const [focusHours] = useState(24);
  const [time, setTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("darb_user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}

    const h = new Date().getHours();
    if (h < 5)       setGreeting("وقت الذئاب 🌙");
    else if (h < 12) setGreeting("صباح التفوق ☀️");
    else if (h < 17) setGreeting("وقت التركيز ⚡");
    else if (h < 21) setGreeting("مساء الإنجاز 🌆");
    else             setGreeting("الليل للنخبة 🌟");

    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const daysLeft = user?.examDate
    ? Math.max(0, Math.ceil((new Date(user.examDate).getTime() - Date.now()) / 86400000))
    : null;

  const birdId: BirdId = user?.bird ?? "falcon";

  const QUICK_ACTIONS = [
    { href: "/orbit",   icon: "⏱️", label: "Orbit",    desc: "50/10",  color: "#2563EB" },
    { href: "/vault",   icon: "🔒", label: "الخزنة",   desc: "أخطاؤك", color: "#F59E0B" },
    { href: "/review",  icon: "🧠", label: "مراجعة",   desc: "SM-2",   color: "#10B981" },
    { href: "/roadmap", icon: "🗺️", label: "الخريطة",  desc: "تقدمك",  color: "#8B5CF6" },
  ];

  return (
    <div className="page">
      {/* ── Sky header ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0B1730 0%, #0F1F3D 50%, var(--bg) 100%)",
          paddingBottom: "24px",
        }}
      >
        {/* Stars */}
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white" style={{
            width: "2px", height: "2px",
            left: Math.random() * 100 + "%", top: Math.random() * 60 + "%",
            opacity: 0.3 + Math.random() * 0.4,
            animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
            animationDelay: Math.random() * 3 + "s",
          }} />
        ))}
        {/* City glow */}
        <div className="absolute bottom-0 left-0 right-0 h-20" style={{
          background: "radial-gradient(ellipse at 50% 100%, rgba(37,99,235,0.12) 0%, transparent 70%)",
        }} />

        <div className="relative z-10 px-5 pt-12 pb-2">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[var(--text-muted)] text-sm">{greeting}</p>
              <p className="font-black text-xl text-[var(--text)] mt-0.5">
                أهلاً، {user?.name ?? "درب"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="stat-chip">
                <span className="text-lg streak-fire">🔥</span>
                <span className="font-mono-nums font-bold text-base text-[var(--gold)]">{streak}</span>
              </div>
              <div className="stat-chip">
                <span className="text-base">🪙</span>
                <span className="font-mono-nums font-bold text-base text-[var(--blue-light)]">{silver}</span>
              </div>
            </div>
          </div>

          {/* Companion */}
          <div className="flex justify-center">
            <Companion birdId={birdId} state="idle" size="lg" showMessage={false} />
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="page-content mt-4">

        {/* Exam target + days left */}
        {user?.exam && (
          <div className="card flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.2)" }}>
              {EXAM_ICONS[user.exam] ?? "🎯"}
            </div>
            <div className="flex-1">
              <p className="label mb-1">هدفك</p>
              <p className="font-black text-lg text-[var(--text)]">{user.exam}</p>
            </div>
            {daysLeft !== null && (
              <div className="text-center">
                <p className="font-mono-nums font-black text-2xl text-[var(--gold)]">{daysLeft}</p>
                <p className="label">يوم</p>
              </div>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div>
          <p className="label mb-3">الأدوات</p>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.href} href={a.href}
                className="rounded-2xl p-3 flex flex-col items-center gap-1.5 transition-all active:scale-95"
                style={{ background: a.color + "15", border: `1px solid ${a.color}30` }}>
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-bold text-[var(--text)] text-center leading-tight">{a.label}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{a.desc}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Start orbit CTA */}
        <Link href="/orbit"
          className="flex items-center gap-4 rounded-2xl p-5 transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.2), rgba(37,99,235,0.08))",
            border: "1.5px solid rgba(37,99,235,0.35)",
          }}>
          <div className="w-12 h-12 rounded-xl bg-[var(--blue)] flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">⏱️</span>
          </div>
          <div className="flex-1">
            <p className="font-black text-base text-[var(--text)]">ابدأ جلسة Orbit</p>
            <p className="body-sm text-sm">50 دقيقة تركيز + 10 راحة · تكسب Silver</p>
          </div>
          <span className="text-[var(--blue-light)] text-lg">←</span>
        </Link>

        {/* Stats */}
        <div>
          <p className="label mb-3">إحصاءاتك</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: focusHours, unit: "ساعة", label: "تركيز", color: "var(--blue-light)" },
              { val: 12,         unit: "جلسة", label: "Orbit",  color: "var(--success)"    },
              { val: 8,          unit: "خطأ",  label: "الخزنة", color: "var(--danger)"     },
            ].map((s) => (
              <div key={s.label} className="card text-center">
                <p className="font-mono-nums font-black text-2xl" style={{ color: s.color }}>{s.val}</p>
                <p className="text-xs font-medium text-[var(--text)] mt-0.5">{s.unit}</p>
                <p className="label mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Today progress */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-base text-[var(--text)]">تقدم اليوم</p>
            <span className="font-mono-nums font-bold text-base text-[var(--blue-light)]">35%</span>
          </div>
          <div className="h-3 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: "35%", background: "linear-gradient(90deg, #1D4ED8, #3B82F6)" }} />
          </div>
          <div className="flex justify-between mt-3">
            {["التأسيس", "البناء", "التعزيز", "الختام"].map((s, i) => (
              <span key={s} className={`text-[11px] font-medium ${i === 0 ? "text-[var(--blue-light)]" : "text-[var(--text-muted)]"}`}>{s}</span>
            ))}
          </div>
        </div>

        {/* Clock + time */}
        <div className="card flex items-center justify-between">
          <div>
            <p className="label mb-1">الوقت الحالي</p>
            <p className="font-mono-nums font-black text-3xl text-[var(--text)]">
              {time.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true })}
            </p>
          </div>
          <Link href="/orbit" className="btn-primary" style={{ width: "auto", padding: "12px 24px" }}>
            ابدأ الآن
          </Link>
        </div>

        {/* Community */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/council" className="card flex items-center gap-3 active:scale-[0.97] transition-all">
            <span className="text-2xl">💬</span>
            <div>
              <p className="font-bold text-sm text-[var(--text)]">المجلس</p>
              <p className="label">نقاشات</p>
            </div>
          </Link>
          <Link href="/arena" className="card flex items-center gap-3 active:scale-[0.97] transition-all"
            style={{ borderColor: "rgba(245,158,11,0.25)" }}>
            <span className="text-2xl">⚔️</span>
            <div>
              <p className="font-bold text-sm text-[var(--gold)]">الأرينا</p>
              <p className="label">1v1</p>
            </div>
          </Link>
        </div>

        {/* Certificate */}
        <div className="card flex items-center gap-4"
          style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.05)" }}>
          <span className="text-3xl">📜</span>
          <div className="flex-1">
            <p className="font-bold text-sm text-[var(--gold)]">شهادة الانضباط الرقمية</p>
            <p className="body-sm">{focusHours} ساعة تركيز مسجلة · سارية لأرامكو</p>
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="card flex items-center gap-4"
          style={{ borderColor: "rgba(37,99,235,0.25)", background: "rgba(37,99,235,0.06)" }}>
          <div className="flex-1">
            <p className="font-bold text-sm text-[var(--text)]">باقة شاهين 🦅</p>
            <p className="body-sm">خزنة غير محدودة + SM-2 كاملة + الأرينا</p>
          </div>
          <Link href="/pricing" className="btn-primary flex-shrink-0"
            style={{ width: "auto", padding: "10px 18px", fontSize: "14px" }}>
            35 ريال
          </Link>
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
