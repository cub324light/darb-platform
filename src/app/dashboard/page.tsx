"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Stars from "@/components/Stars";
import { useTheme } from "@/components/ThemeProvider";
import type { ExamId } from "@/lib/types";

interface DarbUser {
  name: string;
  exam: ExamId;
  onboarded: boolean;
  streak: number;
  silver: number;
  focusHours: number;
  sessions: number;
}

const EXAM_ICONS: Record<ExamId, string> = {
  "تحصيلي": "📚",
  "قدرات":  "🧠",
  "CPC":    "🏭",
};

const EXAM_SUBTITLE: Record<ExamId, string> = {
  "تحصيلي": "علوم · رياضيات · كيمياء · أحياء",
  "قدرات":  "اختبار القدرات — كمي ولفظي",
  "CPC":    "مسار أرامكو CPC",
};

type ExamSection = { icon: string; label: string; color: string; href: string };

const EXAM_SECTIONS: Record<ExamId, ExamSection[]> = {
  "تحصيلي": [
    { icon: "⚡", label: "فيزياء",    color: "#2563EB", href: "/orbit" },
    { icon: "➗", label: "رياضيات",   color: "#8B5CF6", href: "/orbit" },
    { icon: "🧪", label: "كيمياء",    color: "#10B981", href: "/orbit" },
    { icon: "🔬", label: "أحياء",     color: "#F59E0B", href: "/orbit" },
  ],
  "قدرات": [
    { icon: "📖", label: "لفظي",      color: "#8B5CF6", href: "/orbit" },
    { icon: "🔢", label: "كمي",       color: "#2563EB", href: "/orbit" },
    { icon: "🧠", label: "مراجعة",    color: "#10B981", href: "/review" },
    { icon: "🔒", label: "الخزنة",    color: "#F59E0B", href: "/vault"  },
  ],
  "CPC": [
    { icon: "📐", label: "رياضيات",   color: "#2563EB", href: "/orbit" },
    { icon: "📝", label: "English",   color: "#10B981", href: "/orbit" },
    { icon: "⚗️", label: "كيمياء",    color: "#8B5CF6", href: "/orbit" },
    { icon: "⚡", label: "فيزياء",    color: "#F59E0B", href: "/orbit" },
  ],
};

const QUICK_ACTIONS = [
  { href: "/orbit",   icon: "⏱️", label: "Orbit",   desc: "50/10"    },
  { href: "/vault",   icon: "🔒", label: "الخزنة",  desc: "أخطاؤك"   },
  { href: "/review",  icon: "🧠", label: "مراجعة",  desc: "SM-2"     },
  { href: "/roadmap", icon: "🗺️", label: "الخريطة", desc: "تقدمك"    },
];

export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser]     = useState<DarbUser | null>(null);
  const [time, setTime]     = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [showProfile, setShowProfile] = useState(false);

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

  const logout = () => {
    localStorage.removeItem("darb_user");
    router.push("/onboarding");
  };

  const exam   = (user?.exam ?? "تحصيلي") as ExamId;
  const streak = user?.streak    ?? 0;
  const silver = user?.silver    ?? 0;
  const focusH = user?.focusHours ?? 0;
  const sess   = user?.sessions   ?? 0;
  const sections = EXAM_SECTIONS[exam];

  return (
    <div className="page" style={{ background: "var(--bg)" }}>
      <Stars />

      {/* ── Header ── */}
      <div className="relative z-10"
        style={{
          background: theme === "dark"
            ? "linear-gradient(180deg, #0B1730 0%, #0F1F3D 60%, var(--bg) 100%)"
            : "linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 60%, var(--bg) 100%)",
          paddingBottom: 28,
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-12 pb-6">
          {/* Profile btn — يسار */}
          <button
            onClick={() => setShowProfile(true)}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black transition-all active:scale-95"
            style={{
              background: "rgba(37,99,235,0.15)",
              border: "1.5px solid rgba(37,99,235,0.35)",
              color: "var(--blue-light)",
            }}
          >
            {user?.name?.[0]?.toUpperCase() ?? "👤"}
          </button>

          {/* Greeting */}
          <div className="text-center">
            <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{greeting}</p>
            <p className="font-black text-lg" style={{ color: "var(--text)" }}>
              أهلاً، {user?.name ?? "درب"}
            </p>
          </div>

          {/* Theme toggle — يمين */}
          <button
            onClick={toggle}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all active:scale-95"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Stats chips */}
        <div className="flex justify-center gap-3 px-5">
          <div className="stat-chip">
            <span className="text-lg streak-fire">🔥</span>
            <span className="font-mono-nums font-bold text-base" style={{ color: "var(--gold)" }}>{streak}</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>يوم</span>
          </div>
          <div className="stat-chip">
            <span className="text-base">🪙</span>
            <span className="font-mono-nums font-bold text-base" style={{ color: "var(--blue-light)" }}>{silver}</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Silver</span>
          </div>
          {/* Exam badge */}
          <div className="stat-chip">
            <span>{EXAM_ICONS[exam]}</span>
            <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{exam}</span>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 page-content mt-2">

        {/* Exam-specific sections */}
        <div>
          <p className="label mb-3">{EXAM_SUBTITLE[exam]}</p>
          <div className="grid grid-cols-2 gap-3">
            {sections.map((s) => (
              <Link
                key={s.label} href={s.href}
                className="rounded-2xl flex items-center gap-3 transition-all active:scale-95"
                style={{
                  background: s.color + "15",
                  border: `1.5px solid ${s.color}35`,
                  padding: "20px 16px",
                }}
              >
                <span className="text-3xl flex-shrink-0">{s.icon}</span>
                <p className="font-bold text-base" style={{ color: "var(--text)" }}>{s.label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Start orbit CTA */}
        <Link
          href="/orbit"
          className="flex items-center gap-4 rounded-2xl transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.2), rgba(37,99,235,0.08))",
            border: "1.5px solid rgba(37,99,235,0.4)",
            padding: "20px",
          }}
        >
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--blue)" }}>
            <span className="text-2xl">⏱️</span>
          </div>
          <div className="flex-1">
            <p className="font-black text-lg" style={{ color: "var(--text)" }}>ابدأ جلسة Orbit</p>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>50 دقيقة تركيز + 10 راحة · تكسب Silver</p>
          </div>
          <span className="text-xl font-black" style={{ color: "var(--blue-light)" }}>←</span>
        </Link>

        {/* Quick actions */}
        <div>
          <p className="label mb-3">الأدوات</p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.href} href={a.href}
                className="rounded-2xl flex items-center gap-3 transition-all active:scale-95"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  padding: "18px 16px",
                }}
              >
                <span className="text-2xl flex-shrink-0">{a.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{a.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div>
          <p className="label mb-3">إحصاءاتك</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: focusH, unit: "ساعة", label: "تركيز",  color: "var(--blue-light)" },
              { val: sess,   unit: "جلسة", label: "Orbit",   color: "var(--success)"   },
              { val: 0,      unit: "خطأ",  label: "الخزنة",  color: "var(--danger)"    },
            ].map((s) => (
              <div key={s.label} className="card text-center" style={{ padding: "16px 8px" }}>
                <p className="font-mono-nums font-black text-2xl" style={{ color: s.color }}>{s.val}</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text)" }}>{s.unit}</p>
                <p className="label mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Clock + start */}
        <div className="card flex items-center justify-between" style={{ padding: "20px" }}>
          <div>
            <p className="label mb-1">الوقت الحالي</p>
            <p className="font-mono-nums font-black text-3xl" style={{ color: "var(--text)" }}>
              {time.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true })}
            </p>
          </div>
          <Link href="/orbit" className="btn-primary" style={{ width: "auto", padding: "14px 28px", fontSize: 15 }}>
            ابدأ الآن
          </Link>
        </div>

        {/* Community */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/council"
            className="card flex items-center gap-3 active:scale-[0.97] transition-all"
            style={{ padding: "18px 16px" }}>
            <span className="text-2xl">💬</span>
            <div>
              <p className="font-bold text-sm" style={{ color: "var(--text)" }}>المجلس</p>
              <p className="label">نقاشات</p>
            </div>
          </Link>
          <Link href="/arena"
            className="card flex items-center gap-3 active:scale-[0.97] transition-all"
            style={{ borderColor: "rgba(245,158,11,0.25)", padding: "18px 16px" }}>
            <span className="text-2xl">⚔️</span>
            <div>
              <p className="font-bold text-sm" style={{ color: "var(--gold)" }}>الأرينا</p>
              <p className="label">1v1</p>
            </div>
          </Link>
        </div>

        {/* Upgrade */}
        <div className="card flex items-center gap-4"
          style={{ borderColor: "rgba(37,99,235,0.25)", background: "rgba(37,99,235,0.06)" }}>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: "var(--text)" }}>باقة شاهين</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>خزنة غير محدودة + SM-2 + الأرينا</p>
          </div>
          <Link href="/pricing" className="btn-primary flex-shrink-0"
            style={{ width: "auto", padding: "12px 20px", fontSize: 14 }}>
            35 ريال
          </Link>
        </div>

      </div>

      <BottomNav />

      {/* ── Profile Modal ── */}
      {showProfile && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowProfile(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl p-6 pb-10 slide-up"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: "var(--border)" }} />

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
                style={{ background: "rgba(37,99,235,0.15)", color: "var(--blue-light)" }}>
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <p className="font-black text-xl" style={{ color: "var(--text)" }}>{user?.name}</p>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {EXAM_ICONS[exam]} {exam}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-2xl p-4"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <span className="font-semibold" style={{ color: "var(--text)" }}>الوضع</span>
                <button
                  onClick={toggle}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-sm transition-all"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  {theme === "dark" ? "🌙 ليلي" : "☀️ نهاري"}
                </button>
              </div>

              <Link href="/pricing"
                className="rounded-2xl p-4 text-center font-bold"
                style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.25)", color: "var(--blue-light)" }}
                onClick={() => setShowProfile(false)}
              >
                ترقية الباقة
              </Link>

              <button
                onClick={logout}
                className="rounded-2xl p-4 text-center font-bold"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)" }}
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
