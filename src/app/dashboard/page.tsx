"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import PageGuide from "@/components/PageGuide";
import { getTrack, TRACKS, type TrackId } from "@/lib/tracks";
import { loadUser, loadStats, computeStreak, loadEvents, loadExamDate, saveExamDate, loadDashConfig, saveDashConfig, type DarbUser, type ScheduleEvent, type DashConfig, saveEvents } from "@/lib/storage";
import DashAI from "@/components/DashAI";
import { syncUser } from "@/lib/firestore";
import DayScheduler, { getEventsForDate } from "@/components/DayScheduler";

const DAILY_TARGET = 200;

/* اقتباس اليوم — يتغير بتاريخ اليوم */
const QUOTES = [
  "الدرجة العالية ما تجي صدفة — تجي من جلسات صغيرة متراكمة.",
  "اللي يذاكر ساعة كل يوم، يسبق اللي يذاكر عشر ساعات ليلة الاختبار.",
  "ما فيه طالب فاشل، فيه طالب ما لقى طريقته. أنت لقيتها.",
  "خل الجوال يستنى. مستقبلك ما يستنى.",
  "كل سؤال تغلط فيه اليوم، درجة تكسبها يوم الاختبار.",
  "الستريك مب رقم — هو دليل أنك صادق مع نفسك.",
  "الفرق بين الحلم والهدف؟ جدول.",
  "ذاكر وأنت متعب، ترتاح وأنت ناجح.",
  "اللي زرعته اليوم، تحصده في القاعة.",
  "أنت أقرب من أمس، وأبعد ما تكون عن البداية.",
];
function quoteOfToday(): string {
  const d = new Date();
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

/* آخر 7 أيام للرسم */
function last7Days(dayMins: Record<string, number>): { label: string; mins: number; isToday: boolean }[] {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      label: d.toLocaleDateString("ar-SA", { weekday: "narrow" }),
      mins: dayMins?.[key] ?? 0,
      isToday: i === 0,
    });
  }
  return out;
}

function fmtHour(h: number): string {
  if (h === 0) return "12 ص";
  if (h < 12) return `${h} ص`;
  if (h === 12) return "12 م";
  if (h === 24) return "12 ص";
  return `${h - 12} م`;
}

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
  const [todayEvents, setTodayEvents] = useState<ScheduleEvent[]>([]);
  const [examDays, setExamDays] = useState<number | null>(null);
  const [dueCards, setDueCards] = useState(0);
  const [week, setWeek] = useState<{ label: string; mins: number; isToday: boolean }[]>([]);
  const [suggestion, setSuggestion] = useState<{ text: string; sub: string; href: string; color: string } | null>(null);
  const [dashConfig, setDashConfig] = useState<DashConfig | null>(null);
  const [schedOpen, setSchedOpen] = useState(false);
  const [schedTab, setSchedTab] = useState<"manual" | "ai">("manual");
  const [schedPrefill, setSchedPrefill] = useState("");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [allEvents, setAllEvents] = useState<ScheduleEvent[]>([]);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(loadUser());
    const s = loadStats();
    setStreak(computeStreak(s));
    setSilver(s.silver);
    setFocusHours(Math.floor(s.totalFocusMins / 60));
    setSessions(s.sessionsCount);
    setTodayMins(s.todayFocusMins);
    setWeek(last7Days(s.dayMins));
    try {
      const vault = JSON.parse(localStorage.getItem("darb_vault") ?? "[]");
      setErrorsCount(Array.isArray(vault) ? vault.length : 0);
    } catch {}
    try {
      const cards = JSON.parse(localStorage.getItem("darb_cards") ?? "[]");
      setDueCards(Array.isArray(cards) ? cards.filter((c: { dueDate: number }) => c.dueDate <= Date.now()).length : 0);
    } catch {}

    // load today's events
    const today = new Date().toISOString().slice(0, 10);
    const eventsData = loadEvents();
    setAllEvents(eventsData);
    setTodayEvents(getEventsForDate(today, eventsData));

    // عداد أيام الاختبار
    const examDateVal = loadExamDate();
    setExamDate(examDateVal);
    if (examDateVal) {
      const diff = Math.round(
        (new Date(examDateVal + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000
      );
      setExamDays(diff);
    }

    setMounted(true);

    // اقتراح ذكي
    try {
      const vault = JSON.parse(localStorage.getItem("darb_vault") ?? "[]");
      const unreviewedVault = Array.isArray(vault) ? vault.filter((e: { reviewCount: number }) => e.reviewCount === 0).length : 0;
      const cardsRaw = JSON.parse(localStorage.getItem("darb_cards") ?? "[]");
      const due = Array.isArray(cardsRaw) ? cardsRaw.filter((c: { dueDate: number }) => c.dueDate <= Date.now()).length : 0;
      const todS = loadStats();
      if (due > 0) {
        setSuggestion({ text: `${due} بطاقة مراجعة مستحقة`, sub: "راجعها الحين قبل ما تنسى", href: "/review", color: "#10B981" });
      } else if (unreviewedVault > 0) {
        setSuggestion({ text: `${unreviewedVault} خطأ لم تراجعه بعد`, sub: "افتح الخزنة وراجعها", href: "/vault", color: "#F59E0B" });
      } else if (todS.todayFocusMins === 0) {
        setSuggestion({ text: "ما بدأت اليوم بعد", sub: "جلسة أوربت تكسر الصفر", href: "/orbit", color: "#2563EB" });
      }
    } catch {}

    setDashConfig(loadDashConfig());

    // مزامنة مع Firestore
    const u = loadUser();
    if (u) {
      syncUser({
        name: u.name,
        track: u.track,
        streak: computeStreak(s),
        focusMins: s.totalFocusMins,
        sessions: s.sessionsCount,
        silver: s.silver,
      });
    }

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
  // كل مواد المسارات النشطة للمستخدم
  const activeTrackIds: TrackId[] = (user?.activeTracks?.length ? user.activeTracks : [user?.track]).filter(Boolean) as TrackId[];
  const allSubjects = Array.from(
    new Map(
      activeTrackIds.flatMap((id) => {
        const t = TRACKS.find((tr) => tr.id === id);
        return t ? t.subjects.map((s) => [s.name, s]) : [];
      })
    ).values()
  );
  const activeSubjects = allSubjects.length ? allSubjects : track.subjects;
  const todayPct = Math.min(100, Math.round((todayMins / DAILY_TARGET) * 100));

  const TOOLS = [
    { href: "/orbit",  label: "أوربت",   desc: "جلسة 50/10" },
    { href: "/vault",  label: "الخزنة",  desc: `${errorsCount} خطأ محفوظ` },
    { href: "/review", label: "المراجعة", desc: "نظام SM-2" },
    { href: "/roadmap",label: "الخريطة", desc: "تقدمك بالدروس" },
  ];

  return (
    <div className="page">

      <PageGuide pageKey="dashboard" steps={[
        { title: "أهلاً بك في درب", desc: "هذي صفحتك الرئيسية — تشوف فيها تقدم يومك، الستريك، وSilver اللي جمعته من جلسات التركيز." },
        { title: "يومك بنظرة وحدة", desc: "شريط التقدم يوضح كم ذاكرت اليوم من هدفك، وجدول اليوم يعرض المواعيد اللي بنيتها مع المساعد الذكي." },
        { title: "أدواتك تحت", desc: "من القائمة السفلية توصل لأوربت (التايمر)، الخريطة، خزنة الأخطاء، وبنك المراجعة. كل وحدة لها دور." },
      ]} />

      {/* ═══ القبة ═══ */}
      <Dome compact>
        {/* أهلاً بخط كبير + الرفيق */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="title-lg text-right mb-1" style={{ color: "var(--text)" }}>
              أهلاً، {user ? user.name : <span className="skeleton" style={{ width: "90px", height: "1em", verticalAlign: "middle" }} />}
            </p>
            <p className="text-[17px] font-semibold text-right" style={{ color: "var(--text-muted)" }}>
              {greeting}
            </p>
          </div>
        </div>

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
              <span className="text-[17px] font-semibold" style={{ color: "var(--text-dim)" }}>اليوم</span>
              <span className="font-mono-nums font-bold text-sm" style={{ color: "var(--text)" }}>{todayPct}%</span>
            </div>
          </div>
        </div>
      </Dome>

      {/* ═══ المحتوى ═══ */}
      <div className="page-content mt-4">

        {/* تحذير الستريك — يظهر المساء إذا ما فيه جلسة اليوم */}
        {streak > 0 && todayMins === 0 && (time?.getHours() ?? 0) >= 17 && (
          <Link href="/orbit" className="rise block rounded-2xl px-4 py-3.5 transition active:scale-[0.98]"
            style={{
              background: "color-mix(in srgb, #EF4444 9%, transparent)",
              border: "1px solid color-mix(in srgb, #EF4444 28%, transparent)",
              textDecoration: "none",
            }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-black" style={{ color: "#EF4444" }}>
                  ستريك {streak} يوم بخطر 🔥
                </p>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  جلسة وحدة قبل منتصف الليل تنقذه
                </p>
              </div>
              <span className="text-lg font-black" style={{ color: "#EF4444" }}>←</span>
            </div>
          </Link>
        )}

        {/* اقتراح ذكي */}
        {suggestion && (
          <Link href={suggestion.href} className="rise block rounded-2xl px-4 py-3.5 transition active:scale-[0.98]"
            style={{
              background: `color-mix(in srgb, ${suggestion.color} 9%, transparent)`,
              border: `1px solid color-mix(in srgb, ${suggestion.color} 28%, transparent)`,
              textDecoration: "none",
            }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold mb-0.5" style={{ color: "var(--text-muted)" }}>خطوتك التالية</p>
                <p className="text-[15px] font-black" style={{ color: suggestion.color }}>{suggestion.text}</p>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>{suggestion.sub}</p>
              </div>
              <span className="text-lg font-black" style={{ color: suggestion.color }}>←</span>
            </div>
          </Link>
        )}

        {/* المسار */}
        <section className="card rise rise-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="eyebrow">مسارك</p>
              <p className="title-md" style={{ color: "var(--text)" }}>
                {activeTrackIds.length > 1 ? `${activeTrackIds.length} مسارات` : track.title}
              </p>
            </div>
            <Link href="/roadmap" className="text-[17px] font-bold" style={{ color: "var(--accent-light)" }}>
              الخريطة ←
            </Link>
          </div>
          {activeTrackIds.map((trackId) => {
            const t = TRACKS.find((tr) => tr.id === trackId) ?? track;
            return (
              <div key={trackId} className="mb-3 last:mb-0">
                {activeTrackIds.length > 1 && (
                  <p className="eyebrow mb-2">{t.title}</p>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  {t.subjects.map((s, i) => (
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
                      <span className="font-bold text-[17px]" style={{ color: "var(--text)" }}>{s.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* اليوم: تقدم + ساعة + CTA في بطاقة واحدة */}
        <section className="card rise rise-2">
          <div className="flex items-center justify-between mb-3">
            <p className="title-md" style={{ color: "var(--text)" }}>يومك</p>
            <p className="num-hero text-[17px]" style={{ color: "var(--text-dim)" }}>
              {time ? time.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true }) : "--:--"}
            </p>
          </div>
          {examDays !== null && examDays >= 0 && (
            <div className="rounded-xl px-3.5 py-2.5 mb-3 text-center"
              style={{
                background: examDays <= 1 ? "color-mix(in srgb, #EF4444 10%, transparent)"
                  : examDays <= 7 ? "color-mix(in srgb, #F97316 10%, transparent)"
                  : "color-mix(in srgb, var(--gold) 10%, transparent)",
                border: examDays <= 1 ? "1px solid color-mix(in srgb, #EF4444 30%, transparent)"
                  : examDays <= 7 ? "1px solid color-mix(in srgb, #F97316 30%, transparent)"
                  : "1px solid color-mix(in srgb, var(--gold) 30%, transparent)",
              }}>
              <span className="text-[15px] font-bold"
                style={{ color: examDays <= 1 ? "#EF4444" : examDays <= 7 ? "#F97316" : "var(--gold)" }}>
                {examDays === 0 ? "اختبارك اليوم — بالتوفيق!"
                  : examDays === 1 ? "اختبارك بكرة — راجع ونم بدري"
                  : examDays <= 7 ? `${examDays} أيام على الاختبار — شدّ الحزام`
                  : `باقي ${examDays} يوم على الاختبار`}
              </span>
            </div>
          )}
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

        {/* أسبوعك — رسم حقيقي من جلساتك */}
        {(dashConfig?.showWeekly ?? true) && (
        <section className="card rise rise-3">
          <div className="flex items-center justify-between mb-4">
            <p className="title-md" style={{ color: "var(--text)" }}>أسبوعك</p>
            <p className="text-[13px] font-semibold" style={{ color: "var(--text-muted)" }}>
              {week.reduce((a, d) => a + d.mins, 0)} دقيقة
            </p>
          </div>
          <div className="flex items-end justify-between gap-2" style={{ height: "92px" }}>
            {week.map((d, i) => {
              const max = Math.max(...week.map((w) => w.mins), DAILY_TARGET / 2);
              const h = d.mins === 0 ? 4 : Math.max(8, Math.round((d.mins / max) * 72));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  {d.mins > 0 && (
                    <span className="font-mono-nums text-[10px] font-bold" style={{ color: d.isToday ? "var(--accent-light)" : "var(--text-muted)" }}>
                      {d.mins}
                    </span>
                  )}
                  <div className="w-full rounded-full transition-all duration-700"
                    style={{
                      height: `${h}px`,
                      maxWidth: "26px",
                      background: d.isToday
                        ? "linear-gradient(180deg, var(--accent-hi), var(--accent-2))"
                        : d.mins > 0 ? "color-mix(in srgb, var(--accent) 45%, var(--surface2))" : "var(--surface2)",
                      boxShadow: d.isToday && d.mins > 0 ? "0 0 10px color-mix(in srgb, var(--accent) 40%, transparent)" : "none",
                    }} />
                  <span className="text-[11px] font-bold" style={{ color: d.isToday ? "var(--accent-light)" : "var(--text-muted)" }}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* اقتباس اليوم */}
        <section className="rise rise-3 rounded-2xl px-5 py-4"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--gold) 8%, transparent), transparent), var(--surface)",
            border: "1px solid color-mix(in srgb, var(--gold) 18%, transparent)",
          }}>
          <p className="text-[15px] font-bold leading-relaxed" style={{ color: "var(--text-dim)" }}>
            &ldquo;{quoteOfToday()}&rdquo;
          </p>
        </section>

        {/* الإحصاءات */}
        {(dashConfig?.showStats ?? true) && <section className="rise rise-3">
          <p className="eyebrow mb-2.5 px-1">إحصاءاتك</p>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { val: focusHours,  unit: "ساعة تركيز", color: "var(--accent-light)" },
              { val: sessions,    unit: "جلسة أوربت", color: "var(--success)" },
              { val: errorsCount, unit: "خطأ بالخزنة", color: "var(--danger)" },
            ].map((s) => (
              <div key={s.unit} className="card text-center" style={{ padding: "18px 8px" }}>
                <p className="num-hero text-[34px] leading-none" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[17px] font-semibold mt-2 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{s.unit}</p>
              </div>
            ))}
          </div>
        </section>}

        {/* تنبيه المراجعة المستحقة */}
        {dueCards > 0 && (
          <Link href="/review" className="rise rise-4 block rounded-2xl px-4 py-3.5 transition active:scale-[0.98]"
            style={{
              background: "color-mix(in srgb, var(--success) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--success) 25%, transparent)",
              textDecoration: "none",
            }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-black" style={{ color: "var(--success)" }}>
                  {dueCards} بطاقة مراجعة مستحقة اليوم
                </p>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  راجعها الحين — قبل ما تنسى
                </p>
              </div>
              <span className="text-lg font-black" style={{ color: "var(--success)" }}>←</span>
            </div>
          </Link>
        )}

        {/* الأدوات */}
        {(dashConfig?.showTools ?? true) && <section className="rise rise-4">
          <p className="eyebrow mb-2.5 px-1">الأدوات</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
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
        </section>}

        {/* جدول اليوم */}
        {(dashConfig?.showSchedule ?? true) && <section className="card rise rise-5">
          <div className="flex items-center justify-between mb-3">
            <p className="title-md" style={{ color: "var(--text)" }}>جدول اليوم</p>
            <button onClick={() => setCustomizeOpen(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              aria-label="تخصيص">⚙</button>
          </div>

          {todayEvents.length === 0 ? (
            <div
              className="flex items-center justify-center gap-2 rounded-2xl py-5"
              style={{
                background: "var(--surface2)",
                border: "1.5px dashed var(--border)",
                minHeight: "64px",
              }}
            >
              <span className="text-[17px] font-bold" style={{ color: "var(--text-muted)" }}>
                لا يوجد جدول اليوم
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {todayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: ev.type === "study" ? "var(--accent-light)" : "var(--danger)" }}
                  />
                  <span className="text-[17px] font-semibold flex-1" style={{ color: "var(--text)" }}>
                    {ev.type === "study" ? (ev.subject ?? "") : (ev.label ?? "")}
                  </span>
                  <span className="text-[17px] font-bold" style={{ color: "var(--text-dim)" }}>
                    {fmtHour(ev.fromHour)} → {fmtHour(ev.toHour)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button onClick={() => { setSchedOpen(true); setSchedTab("manual"); }}
              className="flex-1 py-3 rounded-2xl font-bold text-[17px]"
              style={{ background: "transparent", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
              تعديل يدوي
            </button>
            <button onClick={() => { setSchedOpen(true); setSchedTab("ai"); }}
              className="flex-1 py-3 rounded-2xl font-bold text-[17px]"
              style={{ background: "var(--accent)", color: "white", border: "none" }}>
              خطة ذكية
            </button>
          </div>
        </section>}

        {/* دربي الذكي — تحت الجدول */}
        {(dashConfig?.showAI ?? true) && <DashAI
          subjects={allSubjects.map((s) => s.name)}
          onOpenScheduler={(tab, prefill) => { setSchedTab(tab); setSchedPrefill(prefill ?? ""); setSchedOpen(true); }}
        />}

        {/* المجتمع */}
        <section className="grid grid-cols-2 gap-2.5 rise rise-5">
          <Link href="/council" className="card flex items-center gap-3 active:scale-[0.97] transition"
            style={{ minHeight: "74px", textDecoration: "none" }}>
            <div>
              <p className="font-extrabold text-[17px]" style={{ color: "var(--text)" }}>المجلس</p>
              <p className="text-[17px]" style={{ color: "var(--text-muted)" }}>نقاشات الطلاب</p>
            </div>
          </Link>
          <Link href="/arena" className="card flex items-center gap-3 active:scale-[0.97] transition"
            style={{ minHeight: "74px", textDecoration: "none", borderColor: "color-mix(in srgb, var(--gold) 25%, transparent)" }}>
            <div>
              <p className="font-extrabold text-[17px]" style={{ color: "var(--gold)" }}>الأرينا</p>
              <p className="text-[17px]" style={{ color: "var(--text-muted)" }}>تحدي 1v1</p>
            </div>
          </Link>
        </section>

        {/* الشهادة + الترقية */}
        <section className="card flex items-center gap-4 rise rise-6"
          style={{ borderColor: "color-mix(in srgb, var(--gold) 22%, transparent)" }}>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[14.5px]" style={{ color: "var(--gold)" }}>شهادة الانضباط الرقمية</p>
            <p className="text-[17px]" style={{ color: "var(--text-muted)" }}>
              {focusHours === 0 ? "تبدأ مع أول ساعة تركيز" : `${focusHours} ساعة موثقة حتى الآن`}
            </p>
          </div>
          <Link href="/pricing" className="text-[17px] font-bold flex-shrink-0" style={{ color: "var(--accent-light)" }}>
            شاهين ←
          </Link>
        </section>

      </div>

      <BottomNav />

      {/* DayScheduler Modal */}
      {schedOpen && mounted && (
        <DayScheduler
          date={new Date().toISOString().slice(0, 10)}
          events={allEvents}
          subjects={allSubjects}
          examDate={examDate}
          onExamDateChange={(d) => { setExamDate(d); saveExamDate(d); }}
          onEventsChange={(evs) => { setAllEvents(evs); saveEvents(evs); const today = new Date().toISOString().slice(0, 10); setTodayEvents(getEventsForDate(today, evs)); }}
          onClose={() => setSchedOpen(false)}
          prefillText={schedPrefill}
          initialTab={schedTab}
        />
      )}

      {/* Customize Bottom Sheet */}
      {customizeOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end" onClick={() => setCustomizeOpen(false)}>
          <div className="absolute inset-0 bg-black/55 fade-in" />
          <div className="relative w-full rounded-t-3xl max-h-[80vh] overflow-y-auto slide-up"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 pt-4 pb-3 px-5" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
              <div className="w-10 h-1.5 rounded-full bg-[var(--border)] mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <p className="font-black text-[17px]" style={{ color: "var(--text)" }}>تخصيص الصفحة الرئيسية</p>
                <button onClick={() => setCustomizeOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                  style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>✕</button>
              </div>
            </div>
            <div className="px-5 py-4 pb-10">
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {([
                  { key: "showStats"    as keyof DashConfig, label: "الإحصاءات",   desc: "ساعات التركيز والجلسات المنجزة" },
                  { key: "showWeekly"   as keyof DashConfig, label: "رسم الأسبوع", desc: "مخطط التقدم اليومي بالدقائق" },
                  { key: "showSchedule" as keyof DashConfig, label: "جدول اليوم",  desc: "مواعيد المذاكرة والمشاغيل" },
                  { key: "showTools"    as keyof DashConfig, label: "الأدوات",     desc: "أوربت، الخزنة، المراجعة، الخريطة" },
                  { key: "showAI"       as keyof DashConfig, label: "دربي الذكي",  desc: "المساعد الذكي للجداول والنصائح" },
                ]).map(({ key, label, desc }, i, arr) => {
                  const cfg = dashConfig ?? { showStats: true, showWeekly: true, showSchedule: true, showTools: true, showAI: true };
                  const on = cfg[key];
                  return (
                    <button key={key} onClick={() => {
                      const next = { ...cfg, [key]: !on };
                      setDashConfig(next);
                      saveDashConfig(next);
                    }}
                      className="w-full flex items-center justify-between px-4 py-3.5 transition"
                      style={{ background: "var(--surface2)", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div className="text-right">
                        <p className="font-bold text-[15px]" style={{ color: "var(--text)" }}>{label}</p>
                        <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{desc}</p>
                      </div>
                      <div className="w-10 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 mr-3"
                        style={{ background: on ? "var(--accent)" : "var(--border)", height: "22px" }}>
                        <div className="w-4 h-4 rounded-full bg-white transition-transform"
                          style={{ transform: on ? "translateX(18px)" : "translateX(0)" }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
