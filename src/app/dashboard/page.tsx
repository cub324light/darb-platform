"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import { getTrack } from "@/lib/tracks";
import { loadUser, loadStats, computeStreak, type DarbUser } from "@/lib/storage";

const DAILY_TARGET = 200;

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
    if (h < 5) setGreeting("وقت الذئاب");
    else if (h < 12) setGreeting("صباح التفوق");
    else if (h < 17) setGreeting("وقت التركيز");
    else if (h < 21) setGreeting("مساء الإنجاز");
    else setGreeting("الليل للنخبة");
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const track = getTrack(user?.track);
  const todayPct = Math.min(100, Math.round((todayMins / DAILY_TARGET) * 100));

  const TOOLS = [
    { href: "/orbit",  label: "Orbit",   desc: "جلسة 50/10" },
    { href: "/vault",  label: "الخزنة",  desc: `${0 + (errorsCount || 0)} خطأ محفوظ` },
    { href: "/review", label: "المراجعة", desc: "نظام SM-2" },
    { href: "/roadmap",label: "الخريطة", desc: "تقدمك بالدروس" },
  ];

  return (
    <div className="page">

      {/* ═══ القبة ═══ */}
      <Dome hideControls>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 min-w-0">
            <p className="eyebrow mb-1" style={{ color: "var(--text-dim)" }}>{greeting}</p>
            <h1 className="title-xl truncate" style={{ color: "var(--text)" }}>
              أهلاً، {user?.name ?? "..."}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="dome-chip">
            <span className={`text-base ${streak > 0 ? "streak-fire" : "opacity-50"}`}>🔥</span>
            <span className="num-hero text-base" style={{ color: "var(--gold-light)" }}>{streak}</span>
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-dim)" }}>ستريك</span>
          </div>
          <div className="dome-chip">
            <span className="num-hero text-base" style={{ color: "var(--text)" }}>{silver}</span>
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-dim)" }}>Silver</span>
          </div>
          <div className="dome-chip">
            <span className="num-hero text-base" style={{ color: "var(--text)" }}>{todayPct}%</span>
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-dim)" }}>اليوم</span>
          </div>
        </div>
      </Dome>

      {/* ═══ المحتوى ═══ */}
      <div className="page-content mt-4">

        {/* المسار */}
        <section className="card rise rise-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: "color-mix(in srgb, var(--accent) 13%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)" }}>
                {track.icon}
              </div>
              <div>
                <p className="eyebrow">مسارك</p>
                <p className="title-md" style={{ color: "var(--text)" }}>{track.title}</p>
              </div>
            </div>
            <Link href="/roadmap" className="text-[13px] font-bold" style={{ color: "var(--accent-light)" }}>
              الخريطة ←
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {track.subjects.map((s, i) => (
              <Link key={s.name} href="/roadmap"
                className="rounded-2xl px-4 py-3.5 flex items-center gap-3 transition active:scale-[0.97] subject-card"
                style={{
                  background: "var(--surface)",
                  border: `1.5px solid ${s.color}55`,
                  boxShadow: `0 0 10px ${s.color}18`,
                  minHeight: "58px",
                  animationDelay: `${i * 80}ms`,
                }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0 subject-dot" style={{ background: s.color, boxShadow: `0 0 5px ${s.color}88` }} />
                <span className="font-bold text-[15px]" style={{ color: "var(--text)" }}>{s.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* اليوم: تقدم + ساعة + CTA في بطاقة واحدة */}
        <section className="card rise rise-2">
          <div className="flex items-center justify-between mb-3">
            <p className="title-md" style={{ color: "var(--text)" }}>يومك</p>
            <p className="num-hero text-[15px]" style={{ color: "var(--text-dim)" }}>
              {time ? time.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true }) : "--:--"}
            </p>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden mb-2.5" style={{ background: "var(--surface2)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${todayPct}%`, background: "linear-gradient(90deg, var(--accent-2), var(--accent-hi))" }} />
          </div>
          <p className="body-sm mb-4">
            {todayMins === 0
              ? "ما بدأت اليوم — جلسة وحدة تكسر الصفر."
              : `${todayMins} دقيقة من هدف ${DAILY_TARGET} دقيقة.`}
          </p>
          <Link href="/orbit" className="btn-primary block text-center" style={{ textDecoration: "none" }}>
            ابدأ جلسة Orbit
          </Link>
        </section>

        {/* الإحصاءات */}
        <section className="rise rise-3">
          <p className="eyebrow mb-2.5 px-1">إحصاءاتك</p>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { val: focusHours,  unit: "ساعة تركيز", color: "var(--accent-light)" },
              { val: sessions,    unit: "جلسة Orbit", color: "var(--success)" },
              { val: errorsCount, unit: "خطأ بالخزنة", color: "var(--danger)" },
            ].map((s) => (
              <div key={s.unit} className="card text-center" style={{ padding: "18px 8px" }}>
                <p className="num-hero text-[32px] leading-none" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[12.5px] font-semibold mt-2" style={{ color: "var(--text-muted)" }}>{s.unit}</p>
              </div>
            ))}
          </div>
        </section>

        {/* الأدوات */}
        <section className="rise rise-4">
          <p className="eyebrow mb-2.5 px-1">الأدوات</p>
          <div className="grid grid-cols-2 gap-2.5">
            {TOOLS.map((a) => (
              <Link key={a.href} href={a.href}
                className="card flex items-center gap-3.5 transition active:scale-[0.96]"
                style={{ padding: "16px", minHeight: "82px", textDecoration: "none" }}>
                <div className="min-w-0">
                  <p className="font-extrabold text-[15.5px] leading-tight" style={{ color: "var(--text)" }}>{a.label}</p>
                  <p className="text-[12.5px] mt-1" style={{ color: "var(--text-muted)" }}>{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* المجتمع */}
        <section className="grid grid-cols-2 gap-2.5 rise rise-5">
          <Link href="/council" className="card flex items-center gap-3 active:scale-[0.97] transition"
            style={{ minHeight: "74px", textDecoration: "none" }}>
            <div>
              <p className="font-extrabold text-[15px]" style={{ color: "var(--text)" }}>المجلس</p>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>نقاشات الطلاب</p>
            </div>
          </Link>
          <Link href="/arena" className="card flex items-center gap-3 active:scale-[0.97] transition"
            style={{ minHeight: "74px", textDecoration: "none", borderColor: "color-mix(in srgb, var(--gold) 25%, transparent)" }}>
            <div>
              <p className="font-extrabold text-[15px]" style={{ color: "var(--gold)" }}>الأرينا</p>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>تحدي 1v1</p>
            </div>
          </Link>
        </section>

        {/* الشهادة + الترقية */}
        <section className="card flex items-center gap-4 rise rise-6"
          style={{ borderColor: "color-mix(in srgb, var(--gold) 22%, transparent)" }}>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[14.5px]" style={{ color: "var(--gold)" }}>شهادة الانضباط الرقمية</p>
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              {focusHours === 0 ? "تبدأ مع أول ساعة تركيز" : `${focusHours} ساعة موثقة حتى الآن`}
            </p>
          </div>
          <Link href="/pricing" className="text-[13px] font-bold flex-shrink-0" style={{ color: "var(--accent-light)" }}>
            شاهين ←
          </Link>
        </section>

      </div>

      <BottomNav />
    </div>
  );
}
