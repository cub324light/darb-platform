"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import { getTrack } from "@/lib/tracks";
import { loadUser, loadStats, computeStreak, loadSchedule, saveSchedule, type DarbUser, type ScheduleEntry, type WeeklySchedule } from "@/lib/storage";

const WEEK_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

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
  const [schedule, setSchedule] = useState<WeeklySchedule>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addSubject, setAddSubject] = useState("");
  const [addHours, setAddHours] = useState(1);

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
    const saved = loadSchedule();
    setSchedule(saved ?? { "0":[],"1":[],"2":[],"3":[],"4":[],"5":[],"6":[] });
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
  const todayDow = new Date().getDay().toString();
  const todayEntries: ScheduleEntry[] = schedule[todayDow] ?? [];

  const addEntry = () => {
    if (!addSubject) return;
    const key = todayDow;
    const updated: WeeklySchedule = { ...schedule, [key]: [...(schedule[key] ?? []), { subject: addSubject, hours: addHours }] };
    setSchedule(updated);
    saveSchedule(updated);
    setShowAdd(false);
    setAddSubject("");
    setAddHours(1);
  };

  const removeEntry = (idx: number) => {
    const key = todayDow;
    const updated: WeeklySchedule = { ...schedule, [key]: (schedule[key] ?? []).filter((_, i) => i !== idx) };
    setSchedule(updated);
    saveSchedule(updated);
  };

  const TOOLS = [
    { href: "/orbit",  label: "أوربت",   desc: "جلسة 50/10" },
    { href: "/vault",  label: "الخزنة",  desc: `${0 + (errorsCount || 0)} خطأ محفوظ` },
    { href: "/review", label: "المراجعة", desc: "نظام SM-2" },
    { href: "/roadmap",label: "الخريطة", desc: "تقدمك بالدروس" },
  ];

  return (
    <div className="page">

      {/* ═══ القبة ═══ */}
      <Dome compact>
        {/* أهلاً بخط كبير */}
        <p className="title-lg text-right mb-1" style={{ color: "var(--text)" }}>
          أهلاً، {user?.name ?? "..."}
        </p>
        <p className="text-[13px] font-semibold text-right mb-2" style={{ color: "var(--text-muted)" }}>
          {greeting}
        </p>

        {/* Silver + streak في صف واحد */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-nums font-black text-3xl leading-none" style={{ color: "var(--gold-light)" }}>{silver}</span>
            <span className="text-sm font-bold" style={{ color: "var(--gold)" }}>Silver</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="dome-chip">
              <span className={`text-sm ${streak > 0 ? "streak-fire" : "opacity-40"}`}>🔥</span>
              <span className="font-mono-nums font-bold text-sm" style={{ color: "var(--gold-light)" }}>{streak}</span>
            </div>
            <div className="dome-chip">
              <span className="text-[12px] font-semibold" style={{ color: "var(--text-dim)" }}>اليوم</span>
              <span className="font-mono-nums font-bold text-sm" style={{ color: "var(--text)" }}>{todayPct}%</span>
            </div>
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
            ابدأ جلسة أوربت
          </Link>
        </section>

        {/* الإحصاءات */}
        <section className="rise rise-3">
          <p className="eyebrow mb-2.5 px-1">إحصاءاتك</p>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { val: focusHours,  unit: "ساعة تركيز", color: "var(--accent-light)" },
              { val: sessions,    unit: "جلسة أوربت", color: "var(--success)" },
              { val: errorsCount, unit: "خطأ بالخزنة", color: "var(--danger)" },
            ].map((s) => (
              <div key={s.unit} className="card text-center" style={{ padding: "18px 8px" }}>
                <p className="num-hero text-[32px] leading-none" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[11px] font-semibold mt-2 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{s.unit}</p>
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

        {/* جدول اليوم */}
        <section className="card rise rise-5">
          <div className="flex items-center justify-between mb-3">
            <p className="title-md" style={{ color: "var(--text)" }}>
              جدول {WEEK_DAYS[Number(todayDow)]}
            </p>
            <Link href="/roadmap" className="text-[13px] font-bold" style={{ color: "var(--accent-light)", textDecoration: "none" }}>
              الجدول الكامل ←
            </Link>
          </div>

          {todayEntries.length === 0 && !showAdd && (
            <p className="text-[13px] mb-3" style={{ color: "var(--text-muted)" }}>ما فيه شيء مجدول اليوم.</p>
          )}

          {todayEntries.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {todayEntries.map((e, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--accent-light)" }} />
                  <span className="text-[13px] font-semibold flex-1" style={{ color: "var(--text)" }}>{e.subject}</span>
                  <span className="text-[12px] font-bold" style={{ color: "var(--text-dim)" }}>{e.hours}س</span>
                  <button onClick={() => removeEntry(i)} className="text-[var(--text-muted)] text-base px-1.5 min-h-[36px]">✕</button>
                </div>
              ))}
            </div>
          )}

          {showAdd ? (
            <div className="flex gap-2 items-center">
              <select
                value={addSubject}
                onChange={(e) => setAddSubject(e.target.value)}
                className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-[13px] outline-none"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}
              >
                <option value="">اختر المادة</option>
                {track.subjects.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <select
                value={addHours}
                onChange={(e) => setAddHours(Number(e.target.value))}
                className="w-20 rounded-xl px-2 py-2.5 text-[13px] outline-none"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}
              >
                {[1,2,3,4,5,6].map((h) => <option key={h} value={h}>{h}س</option>)}
              </select>
              <button onClick={addEntry} className="px-3 py-2.5 rounded-xl font-bold text-[13px]"
                style={{ background: "transparent", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
                إضافة
              </button>
              <button onClick={() => setShowAdd(false)} className="px-2 py-2.5 text-[var(--text-muted)] text-lg">✕</button>
            </div>
          ) : (
            <button
              onClick={() => { setShowAdd(true); setAddSubject(track.subjects[0]?.name ?? ""); }}
              className="text-[13px] font-bold"
              style={{ color: "var(--accent-light)" }}
            >
              + إضافة للجدول
            </button>
          )}
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
