"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import ProfileButton, { ThemeToggle } from "@/components/Profile";
import { getTrack } from "@/lib/tracks";
import { loadUser, loadStats, computeStreak, type DarbUser } from "@/lib/storage";

export default function DashboardPage() {
  const [user, setUser] = useState<DarbUser | null>(null);
  const [streak, setStreak] = useState(0);
  const [silver, setSilver] = useState(0);
  const [focusHours, setFocusHours] = useState(0);
  const [sessions, setSessions] = useState(0);
  const [errorsCount, setErrorsCount] = useState(0);
  const [todayMins, setTodayMins] = useState(0);
  const [time, setTime] = useState<Date | null>(null);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    setUser(loadUser());

    const s = loadStats();
    setStreak(computeStreak(s));
    setSilver(s.silver);
    setFocusHours(Math.floor(s.totalFocusMins / 60));
    setSessions(s.sessionsCount);
    setTodayMins(s.todayFocusMins);

    try {
      const vault = JSON.parse(localStorage.getItem("darb_vault") ?? "[]");
      setErrorsCount(Array.isArray(vault) ? vault.length : 0);
    } catch {}

    const h = new Date().getHours();
    if (h < 5)       setGreeting("وقت الذئاب 🌙");
    else if (h < 12) setGreeting("صباح التفوق ☀️");
    else if (h < 17) setGreeting("وقت التركيز ⚡");
    else if (h < 21) setGreeting("مساء الإنجاز 🌆");
    else             setGreeting("الليل للنخبة 🌟");

    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const track = getTrack(user?.track);

  /* تقدم اليوم — حقيقي: دقائق تركيز اليوم من هدف 200 دقيقة (4 جلسات) */
  const DAILY_TARGET = 200;
  const todayPct = Math.min(100, Math.round((todayMins / DAILY_TARGET) * 100));

  const QUICK_ACTIONS = [
    { href: "/orbit",   icon: "⏱️", label: "Orbit",    desc: "50/10" },
    { href: "/vault",   icon: "🔒", label: "الخزنة",   desc: "أخطاؤك" },
    { href: "/review",  icon: "🧠", label: "مراجعة",   desc: "SM-2" },
    { href: "/roadmap", icon: "🗺️", label: "الخريطة",  desc: "تقدمك" },
  ];

  return (
    <div className="page">
      {/* ── هيدر السماء ── */}
      <div className="relative overflow-hidden" style={{ background: "var(--sky-grad)", paddingBottom: "8px" }}>
        <div className="relative z-10 px-5 pt-12 pb-2">
          {/* الشريط العلوي: البروفايل والثيم يسار — الترحيب يمين */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[var(--text-muted)] text-sm">{greeting}</p>
              <p className="font-black text-2xl text-[var(--text)] mt-0.5">
                أهلاً، {user?.name ?? "..."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <ProfileButton />
            </div>
          </div>

          {/* شرائح الستريك والسيلفر */}
          <div className="flex items-center gap-2.5">
            <div className="stat-chip">
              <span className={`text-lg ${streak > 0 ? "streak-fire" : "opacity-40"}`}>🔥</span>
              <span className="font-mono-nums font-bold text-base text-[var(--gold)]">{streak}</span>
              <span className="body-sm">ستريك</span>
            </div>
            <div className="stat-chip">
              <span className="text-base">🪙</span>
              <span className="font-mono-nums font-bold text-base text-[var(--blue-light)]">{silver}</span>
              <span className="body-sm">Silver</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── المحتوى ── */}
      <div className="page-content mt-4">

        {/* بطاقة المسار — واجهة مختلفة حسب المسار وكلها أزرق */}
        <div
          className="rounded-3xl p-5"
          style={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.16), rgba(37,99,235,0.05))",
            border: "1.5px solid rgba(37,99,235,0.32)",
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.25)" }}
            >
              {track.icon}
            </div>
            <div className="flex-1">
              <p className="label mb-1">مسارك</p>
              <p className="font-black text-xl text-[var(--text)]">{track.title}</p>
            </div>
          </div>

          {/* أقسام المسار: قدرات = لفظي/كمي · تحصيلي = ٤ مواد · CPC = إنجليزي/رياضيات */}
          <div className={`grid gap-2.5 ${track.subjects.length > 2 ? "grid-cols-2" : "grid-cols-2"}`}>
            {track.subjects.map((s) => (
              <Link
                key={s.name}
                href="/roadmap"
                className="rounded-2xl px-4 py-3.5 flex items-center gap-3 transition active:scale-[0.97]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <span className="text-xl">{s.icon}</span>
                <span className="font-bold text-base text-[var(--text)]">{s.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* الإحصاءات — حقيقية، تبدأ من صفر */}
        <div>
          <p className="label mb-3">إحصاءاتك</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: focusHours,  unit: "ساعة", label: "تركيز", color: "var(--blue-light)" },
              { val: sessions,    unit: "جلسة", label: "Orbit",  color: "var(--success)" },
              { val: errorsCount, unit: "خطأ",  label: "الخزنة", color: "var(--danger)" },
            ].map((s) => (
              <div key={s.label} className="card text-center">
                <p className="font-mono-nums font-black text-3xl" style={{ color: s.color }}>{s.val}</p>
                <p className="text-sm font-medium text-[var(--text)] mt-0.5">{s.unit}</p>
                <p className="label mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* تقدم اليوم — محسوب من جلساتك الفعلية */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-base text-[var(--text)]">تقدم اليوم</p>
            <span className="font-mono-nums font-bold text-base text-[var(--blue-light)]">{todayPct}%</span>
          </div>
          <div className="h-3 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: todayPct + "%", background: "linear-gradient(90deg, #1D4ED8, #3B82F6)" }}
            />
          </div>
          <p className="body-sm mt-3">
            {todayMins === 0
              ? "ما بدأت اليوم — جلسة Orbit وحدة تكفي تكسر الصفر."
              : `${todayMins} دقيقة تركيز اليوم من هدف ${DAILY_TARGET} دقيقة.`}
          </p>
        </div>

        {/* الساعة */}
        <div className="card flex items-center justify-between">
          <div>
            <p className="label mb-1">الوقت الحالي</p>
            <p className="font-mono-nums font-black text-3xl text-[var(--text)]">
              {time ? time.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true }) : "--:--"}
            </p>
          </div>
          <Link href="/orbit" className="btn-primary" style={{ width: "auto", padding: "14px 26px", minHeight: "52px" }}>
            ابدأ الآن
          </Link>
        </div>

        {/* المجتمع */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/council" className="card flex items-center gap-3 active:scale-[0.97] transition-all" style={{ minHeight: "76px" }}>
            <span className="text-2xl">💬</span>
            <div>
              <p className="font-bold text-base text-[var(--text)]">المجلس</p>
              <p className="label">نقاشات</p>
            </div>
          </Link>
          <Link href="/arena" className="card flex items-center gap-3 active:scale-[0.97] transition-all"
            style={{ borderColor: "rgba(245,158,11,0.25)", minHeight: "76px" }}>
            <span className="text-2xl">⚔️</span>
            <div>
              <p className="font-bold text-base text-[var(--gold)]">الأرينا</p>
              <p className="label">1v1</p>
            </div>
          </Link>
        </div>

        {/* الشهادة — أرقام حقيقية */}
        <div className="card flex items-center gap-4"
          style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.05)" }}>
          <span className="text-3xl">📜</span>
          <div className="flex-1">
            <p className="font-bold text-sm text-[var(--gold)]">شهادة الانضباط الرقمية</p>
            <p className="body-sm">
              {focusHours === 0 ? "تبدأ تسجيل ساعاتك مع أول جلسة" : `${focusHours} ساعة تركيز مسجلة`}
            </p>
          </div>
        </div>

        {/* ── الأدوات — منزّلة تحت لتكون بمتناول الإبهام ── */}
        <div>
          <p className="label mb-3">الأدوات</p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="rounded-2xl p-5 flex items-center gap-4 transition-all active:scale-95"
                style={{
                  background: "rgba(37,99,235,0.1)",
                  border: "1.5px solid rgba(37,99,235,0.28)",
                  minHeight: "84px",
                }}
              >
                <span className="text-3xl flex-shrink-0">{a.icon}</span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-[var(--text)] leading-tight">{a.label}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA جلسة Orbit — في منطقة الإبهام */}
        <Link
          href="/orbit"
          className="flex items-center gap-4 rounded-2xl p-5 transition-all active:scale-[0.98] glow-blue"
          style={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.22), rgba(37,99,235,0.09))",
            border: "1.5px solid rgba(37,99,235,0.38)",
            minHeight: "84px",
          }}
        >
          <div className="w-14 h-14 rounded-xl bg-[var(--blue)] flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">⏱️</span>
          </div>
          <div className="flex-1">
            <p className="font-black text-lg text-[var(--text)]">ابدأ جلسة Orbit</p>
            <p className="body-sm text-sm">50 دقيقة تركيز + 10 راحة · تكسب Silver</p>
          </div>
          <span className="text-[var(--blue-light)] text-xl">←</span>
        </Link>

        {/* ترقية */}
        <div className="card flex items-center gap-4"
          style={{ borderColor: "rgba(37,99,235,0.25)", background: "rgba(37,99,235,0.06)" }}>
          <div className="flex-1">
            <p className="font-bold text-sm text-[var(--text)]">باقة شاهين</p>
            <p className="body-sm">خزنة غير محدودة + SM-2 كاملة + الأرينا</p>
          </div>
          <Link href="/pricing" className="btn-primary flex-shrink-0"
            style={{ width: "auto", padding: "12px 20px", fontSize: "15px", minHeight: "48px" }}>
            35 ريال
          </Link>
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
