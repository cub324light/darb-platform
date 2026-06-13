"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import PageGuide from "@/components/PageGuide";
import { getTrack, TRACKS, type TrackId } from "@/lib/tracks";
import { loadUser, loadStats, computeStreak, loadEvents, loadExamDate, saveExamDate, loadDashConfig, saveDashConfig, loadTrackExamDates, saveTrackExamDates, DASH_SECTION_META, type DarbUser, type ScheduleEvent, type DashItem, type DashSectionId, saveEvents } from "@/lib/storage";
import DashAI from "@/components/DashAI";
import { syncUser } from "@/lib/firestore";
import DayScheduler, { getEventsForDate } from "@/components/DayScheduler";
import ExamDateButton from "@/components/ExamDateButton";
import Calendar from "@/components/Calendar";

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
  const [schedOpen, setSchedOpen] = useState(false);
  const [schedTab, setSchedTab] = useState<"manual" | "ai">("manual");
  const [schedPrefill, setSchedPrefill] = useState("");
  const [calDate, setCalDate] = useState<string | null>(null);
  const [allEvents, setAllEvents] = useState<ScheduleEvent[]>([]);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [trackExamDates, setTrackExamDates] = useState<Record<string, string>>({});
  const [trackFilter, setTrackFilter] = useState<TrackId | "all">("all");
  const [mounted, setMounted] = useState(false);

  /* ── تخصيص الصفحة: ترتيب وإظهار الأقسام ── */
  const [layout, setLayout] = useState<DashItem[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [dragId, setDragId] = useState<DashSectionId | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragIdRef = useRef<DashSectionId | null>(null);
  const lastY = useRef(0);
  const autoScroll = useRef<number | null>(null);

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

    setTrackExamDates(loadTrackExamDates());
    setLayout(loadDashConfig().layout);

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
  const todayPct = Math.min(100, Math.round((todayMins / DAILY_TARGET) * 100));

  const TOOLS = [
    { href: "/orbit",  label: "أوربت",   desc: "جلسة 50/10" },
    { href: "/vault",  label: "الخزنة",  desc: `${errorsCount} خطأ محفوظ` },
    { href: "/review", label: "المراجعة", desc: "نظام SM-2" },
    { href: "/roadmap",label: "الخريطة", desc: "تقدمك بالدروس" },
  ];

  /* ── منطق التخصيص: إخفاء/إظهار وإعادة الترتيب بالسحب ── */
  const persist = (next: DashItem[]) => { setLayout(next); saveDashConfig({ layout: next }); };

  const setVisible = (id: DashSectionId, visible: boolean) => {
    persist(layout.map((it) => (it.id === id ? { ...it, visible } : it)));
  };

  const tryReorder = (y: number) => {
    const dId = dragIdRef.current;
    if (!dId) return;
    const visible = layout.filter((l) => l.visible);
    for (const item of visible) {
      if (item.id === dId) continue;
      const el = itemRefs.current[item.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) {
        setLayout((prev) => {
          const arr = [...prev];
          const from = arr.findIndex((a) => a.id === dId);
          const to = arr.findIndex((a) => a.id === item.id);
          if (from === -1 || to === -1 || from === to) return prev;
          const [moved] = arr.splice(from, 1);
          arr.splice(to, 0, moved);
          return arr;
        });
        break;
      }
    }
  };

  const handleDragStart = (e: React.PointerEvent, id: DashSectionId) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragIdRef.current = id;
    setDragId(id);
    lastY.current = e.clientY;
    if (autoScroll.current) window.clearInterval(autoScroll.current);
    autoScroll.current = window.setInterval(() => {
      const y = lastY.current;
      const edge = 130;
      if (y < edge) { window.scrollBy(0, -10); tryReorder(y); }
      else if (y > window.innerHeight - edge) { window.scrollBy(0, 10); tryReorder(y); }
    }, 16);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragIdRef.current) return;
    lastY.current = e.clientY;
    tryReorder(e.clientY);
  };

  const handleDragEnd = () => {
    if (autoScroll.current) { window.clearInterval(autoScroll.current); autoScroll.current = null; }
    if (dragIdRef.current) {
      dragIdRef.current = null;
      setDragId(null);
      setLayout((prev) => { saveDashConfig({ layout: prev }); return prev; });
    }
  };

  useEffect(() => () => { if (autoScroll.current) window.clearInterval(autoScroll.current); }, []);

  /* ── رسم كل قسم حسب معرّفه ── */
  const renderSection = (id: DashSectionId) => {
    switch (id) {
      case "track": {
        const todayStr = new Date().toISOString().slice(0, 10);
        const daysLeft = (d: string) =>
          Math.round((new Date(d + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86400000);

        return (
          <section className="card">
            {/* رأس القسم */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="eyebrow">مساراتك</p>
                <p className="title-md" style={{ color: "var(--text)" }}>
                  {trackFilter === "all"
                    ? (activeTrackIds.length > 1 ? `${activeTrackIds.length} مسارات نشطة` : track.title)
                    : (TRACKS.find((tr) => tr.id === trackFilter)?.title ?? track.title)}
                </p>
              </div>
              <Link href="/roadmap" className="text-[17px] font-bold" style={{ color: "var(--accent-light)" }}>
                الخريطة ←
              </Link>
            </div>

            {/* شرائح الفلتر — [الكل] + كل مسار */}
            {activeTrackIds.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                <button onClick={() => setTrackFilter("all")}
                  className="px-3.5 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition active:scale-95 flex-shrink-0"
                  style={trackFilter === "all"
                    ? { background: "var(--accent)", color: "white", border: "1px solid var(--accent)" }
                    : { background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  الكل
                </button>
                {activeTrackIds.map((tid) => {
                  const t = TRACKS.find((tr) => tr.id === tid) ?? track;
                  const active = trackFilter === tid;
                  return (
                    <button key={tid} onClick={() => setTrackFilter(tid)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition active:scale-95 flex-shrink-0"
                      style={active
                        ? { background: t.color, color: "white", border: `1px solid ${t.color}` }
                        : { background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: active ? "white" : t.color }} />
                      {t.title}
                    </button>
                  );
                })}
              </div>
            )}

            {/* شريط التخزين المدمج — حصص بحجم عدد مواد كل اختبار (زي تخزين الآيفون) */}
            {trackFilter === "all" && (
              <div className="flex rounded-full overflow-hidden mb-4"
                style={{ height: "16px", gap: "2px", background: "var(--surface2)" }}>
                {activeTrackIds.map((tid) => {
                  const t = TRACKS.find((tr) => tr.id === tid);
                  const c = t?.color ?? "var(--accent)";
                  const weight = Math.max(1, t?.subjects.length ?? 1);
                  return <div key={tid} style={{ flex: weight, background: c }} />;
                })}
              </div>
            )}

            {/* صفوف المسارات — تتفلتر حسب الاختيار */}
            <div className="flex flex-col gap-2.5">
              {activeTrackIds.filter((tid) => trackFilter === "all" || tid === trackFilter).map((tid) => {
                const t = TRACKS.find((tr) => tr.id === tid) ?? track;
                const c = t.color;
                const examD = trackExamDates[tid] ?? "";
                const d = examD ? daysLeft(examD) : null;
                const urgentColor = d === null ? "var(--text-muted)"
                  : d <= 3 ? "#EF4444"
                  : d <= 14 ? "#F97316"
                  : "#10B981";

                return (
                  <div key={tid} className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
                    style={{
                      background: `color-mix(in srgb, ${c} 7%, var(--surface2))`,
                      border: `1.5px solid ${c}33`,
                    }}>
                    {/* الخط الدال على اللون */}
                    <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: c, minHeight: "36px" }} />
                    {/* الاسم والأيام */}
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-[16px]" style={{ color: "var(--text)" }}>{t.title}</p>
                      <p className="text-[13px] font-semibold mt-0.5" style={{ color: urgentColor }}>
                        {d === null ? "تاريخ الاختبار غير محدد"
                          : d < 0   ? "انتهى الاختبار"
                          : d === 0 ? "الاختبار اليوم — بالتوفيق"
                          : d === 1 ? "الاختبار بكرة — راجع ونم بدري"
                          : `${d} يوم على الاختبار`}
                      </p>
                    </div>
                    {/* زر تاريخ الاختبار */}
                    <ExamDateButton
                      value={examD}
                      color={c}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(v) => { const updated = { ...trackExamDates, [tid]: v }; setTrackExamDates(updated); saveTrackExamDates(updated); }}
                      onClear={() => { const updated = { ...trackExamDates }; delete updated[tid]; setTrackExamDates(updated); saveTrackExamDates(updated); }}
                    />
                  </div>
                );
              })}
            </div>

            {/* مواد المسار المُختار — تظهر فقط عند اختيار مسار محدد */}
            {trackFilter !== "all" && (() => {
              const t = TRACKS.find((tr) => tr.id === trackFilter);
              if (!t) return null;
              return (
                <div className="mt-3">
                  <p className="eyebrow mb-2">مواد {t.title}</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {t.subjects.map((s, i) => (
                      <Link key={s.name} href="/roadmap"
                        className="rounded-2xl px-4 py-3 flex items-center gap-3 transition active:scale-[0.97] subject-card"
                        style={{
                          background: "var(--surface)",
                          border: `1.5px solid ${s.color}55`,
                          boxShadow: `0 0 10px ${s.color}18`,
                          minHeight: "54px",
                          animationDelay: `${i * 60}ms`,
                        }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color, boxShadow: `0 0 5px ${s.color}88` }} />
                        <span className="font-bold text-[16px]" style={{ color: "var(--text)" }}>{s.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })()}
          </section>
        );
      }

      case "today": {
        /* أقرب موعد اختبار من كل المسارات أو التاريخ الفردي */
        const todayForToday = new Date().toISOString().slice(0, 10);
        const allDays = [
          ...(examDate ? [{ d: examDays, label: "", color: "var(--gold)", tid: null }] : []),
          ...activeTrackIds.map((tid) => {
            const examD = trackExamDates[tid];
            if (!examD) return null;
            const d2 = Math.round((new Date(examD + "T00:00:00").getTime() - new Date(todayForToday + "T00:00:00").getTime()) / 86400000);
            const t = TRACKS.find((tr) => tr.id === tid);
            return { d: d2, label: t?.title ?? "", color: t?.color ?? "var(--accent)", tid };
          }).filter(Boolean),
        ].filter((x) => x !== null && x!.d !== null && x!.d! >= 0) as { d: number; label: string; color: string; tid: string | null }[];
        allDays.sort((a, b) => a.d - b.d);
        const nearest = allDays[0] ?? null;

        return (
          <section className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="title-md" style={{ color: "var(--text)" }}>يومك</p>
              <p className="num-hero text-[17px]" style={{ color: "var(--text-dim)" }}>
                {time ? time.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true }) : "--:--"}
              </p>
            </div>
            {nearest && (
              <div className="rounded-xl px-3.5 py-2.5 mb-3 text-center"
                style={{
                  background: `color-mix(in srgb, ${nearest.d <= 1 ? "#EF4444" : nearest.d <= 7 ? "#F97316" : nearest.color} 10%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${nearest.d <= 1 ? "#EF4444" : nearest.d <= 7 ? "#F97316" : nearest.color} 30%, transparent)`,
                }}>
                <span className="text-[15px] font-bold"
                  style={{ color: nearest.d <= 1 ? "#EF4444" : nearest.d <= 7 ? "#F97316" : nearest.color }}>
                  {nearest.label ? `${nearest.label} — ` : ""}
                  {nearest.d === 0 ? "اختبارك اليوم — بالتوفيق!"
                    : nearest.d === 1 ? "اختبارك بكرة — راجع ونم بدري"
                    : nearest.d <= 7 ? `${nearest.d} أيام على الاختبار — شدّ الحزام`
                    : `باقي ${nearest.d} يوم على الاختبار`}
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
        );
      }

      case "schedule":
        return (
          <>
            <section className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="title-md" style={{ color: "var(--text)" }}>جدول اليوم</p>
              </div>
              {todayEvents.length === 0 ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl py-5"
                  style={{ background: "var(--surface2)", border: "1.5px dashed var(--border)", minHeight: "64px" }}>
                  <span className="text-[17px] font-bold" style={{ color: "var(--text-muted)" }}>
                    لا يوجد جدول اليوم — اضغط «خطة ذكية» تحت
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {todayEvents.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: ev.type === "study" ? "var(--accent-light)" : "var(--danger)" }} />
                      <span className="text-[17px] font-semibold flex-1" style={{ color: "var(--text)" }}>
                        {ev.type === "study" ? (ev.subject ?? "") : (ev.label ?? "")}
                      </span>
                      <span className="text-[17px] font-bold" style={{ color: "var(--text-dim)" }}>
                        {fmtHour(ev.fromHour)} → {fmtHour(ev.toHour)}
                      </span>
                      <button
                        onClick={() => {
                          const updated = allEvents.filter((e) => e.id !== ev.id);
                          setAllEvents(updated);
                          saveEvents(updated);
                          const tod = new Date().toISOString().slice(0, 10);
                          setTodayEvents(getEventsForDate(tod, updated));
                        }}
                        className="text-[var(--danger)] text-base px-2 min-h-[44px] flex-shrink-0"
                        aria-label="حذف">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setSchedOpen(true); setSchedTab("manual"); }}
                  className="flex-1 py-3 rounded-2xl font-bold text-[17px]"
                  style={{ background: "transparent", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
                  يدوي
                </button>
                <button onClick={() => { setSchedOpen(true); setSchedTab("ai"); }}
                  className="flex-1 py-3 rounded-2xl font-bold text-[17px]"
                  style={{ background: "var(--accent)", color: "white", border: "none" }}>
                  مساعد دويرب
                </button>
              </div>
            </section>
            <Calendar
              examDate={examDate}
              onExamDateChange={(d) => { setExamDate(d); saveExamDate(d); }}
              onDayClick={(date) => setCalDate(date)}
              getDayInfo={(date) =>
                getEventsForDate(date, allEvents).map((ev) => {
                  const subj = allSubjects.find((s) => s.name === ev.subject);
                  return {
                    id: ev.id,
                    label: ev.type === "study" ? (ev.subject ?? "مذاكرة") : (ev.label ?? "مشغول"),
                    color: ev.type === "study" ? (subj?.color ?? "var(--accent-light)") : "var(--danger)",
                    from: ev.fromHour,
                    to: ev.toHour,
                  };
                })
              }
            />
          </>
        );

      case "ai":
        return (
          <DashAI
            subjects={allSubjects.map((s) => s.name)}
            onOpenScheduler={(tab, prefill) => { setSchedTab(tab); setSchedPrefill(prefill ?? ""); setSchedOpen(true); }}
          />
        );

      case "weekly":
        return (
          <section className="card">
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
        );

      case "quote":
        return (
          <section className="rounded-2xl px-5 py-4"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--gold) 8%, transparent), transparent), var(--surface)",
              border: "1px solid color-mix(in srgb, var(--gold) 18%, transparent)",
            }}>
            <p className="text-[15px] font-bold leading-relaxed" style={{ color: "var(--text-dim)" }}>
              &ldquo;{quoteOfToday()}&rdquo;
            </p>
          </section>
        );

      case "stats":
        return (
          <section>
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
          </section>
        );

      case "tools":
        return (
          <section>
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
          </section>
        );

      case "community":
        return (
          <section className="grid grid-cols-2 gap-2.5">
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
        );

      case "certificate":
        return (
          <section className="card flex items-center gap-4"
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
        );
    }
  };

  const visibleItems = layout.filter((l) => l.visible);
  const hiddenItems = layout.filter((l) => !l.visible);

  return (
    <div className="page">

      <PageGuide pageKey="dashboard" steps={[
        { title: "أهلاً بك في درب", desc: "هذي صفحتك الرئيسية — تشوف فيها تقدم يومك، الستريك، وSilver اللي جمعته من جلسات التركيز." },
        { title: "يومك بنظرة وحدة", desc: "شريط التقدم يوضح كم ذاكرت اليوم من هدفك، وجدول اليوم يعرض المواعيد اللي بنيتها مع المساعد الذكي." },
        { title: "رتّبها على ذوقك", desc: "اضغط «تخصيص» فوق — تقدر تسحب الأقسام وترتّبها، تخفيها بزر ✕، وترجّعها من «إضافة قسم» تحت." },
      ]} />

      {/* ═══ القبة ═══ */}
      <Dome compact>
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

        {/* تنبيهات ثابتة (لا تُرتّب) */}
        {!editMode && streak > 0 && todayMins === 0 && (time?.getHours() ?? 0) >= 17 && (
          <Link href="/orbit" className="rise block rounded-2xl px-4 py-3.5 transition active:scale-[0.98]"
            style={{
              background: "color-mix(in srgb, #EF4444 9%, transparent)",
              border: "1px solid color-mix(in srgb, #EF4444 28%, transparent)",
              textDecoration: "none",
            }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-black" style={{ color: "#EF4444" }}>ستريك {streak} يوم بخطر 🔥</p>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>جلسة وحدة قبل منتصف الليل تنقذه</p>
              </div>
              <span className="text-lg font-black" style={{ color: "#EF4444" }}>←</span>
            </div>
          </Link>
        )}

        {!editMode && suggestion && (
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

        {!editMode && dueCards > 0 && (
          <Link href="/review" className="rise block rounded-2xl px-4 py-3.5 transition active:scale-[0.98]"
            style={{
              background: "color-mix(in srgb, var(--success) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--success) 25%, transparent)",
              textDecoration: "none",
            }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-black" style={{ color: "var(--success)" }}>{dueCards} بطاقة مراجعة مستحقة اليوم</p>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>راجعها الحين — قبل ما تنسى</p>
              </div>
              <span className="text-lg font-black" style={{ color: "var(--success)" }}>←</span>
            </div>
          </Link>
        )}

        {/* شريط التخصيص */}
        <div className="flex justify-between items-center">
          {editMode ? (
            <p className="text-[13px] font-bold" style={{ color: "var(--accent-light)" }}>
              اسحب ⠿ للترتيب · اضغط ✕ للإخفاء
            </p>
          ) : <span />}
          <button onClick={() => { if (editMode) saveDashConfig({ layout }); setEditMode((v) => !v); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold transition active:scale-95"
            style={editMode
              ? { background: "var(--accent)", color: "white", border: "none" }
              : { background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            <span>{editMode ? "✓" : "⚙"}</span>
            <span>{editMode ? "تم" : "تخصيص"}</span>
          </button>
        </div>

        {/* الأقسام القابلة للترتيب */}
        {visibleItems.map((item) => (
          <div
            key={item.id}
            ref={(el) => { itemRefs.current[item.id] = el; }}
            className={`relative ${dragId === item.id ? "z-50" : ""}`}
            style={
              editMode
                ? {
                    transition: dragId === item.id ? "none" : "transform .12s ease",
                    transform: dragId === item.id ? "scale(1.02)" : "none",
                    boxShadow: dragId === item.id ? "0 14px 34px rgba(0,0,0,.5)" : "none",
                    borderRadius: "20px",
                    outline: "2px dashed color-mix(in srgb, var(--accent) 45%, transparent)",
                    outlineOffset: "3px",
                    opacity: dragId && dragId !== item.id ? 0.92 : 1,
                  }
                : undefined
            }
          >
            {/* محتوى القسم — معطّل اللمس أثناء التخصيص */}
            <div style={{ pointerEvents: editMode ? "none" : "auto" }}>
              {renderSection(item.id)}
            </div>

            {editMode && (
              <>
                {/* مقبض السحب */}
                <button
                  onPointerDown={(e) => handleDragStart(e, item.id)}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  onPointerCancel={handleDragEnd}
                  aria-label="اسحب لإعادة الترتيب"
                  className="absolute z-30 flex items-center justify-center rounded-xl font-black"
                  style={{
                    insetInlineStart: "-6px",
                    top: "-10px",
                    width: "38px",
                    height: "38px",
                    fontSize: "18px",
                    touchAction: "none",
                    cursor: "grab",
                    background: "var(--accent)",
                    color: "white",
                    boxShadow: "0 4px 12px rgba(0,0,0,.35)",
                  }}>
                  ⠿
                </button>
                {/* زر الإخفاء */}
                <button
                  onClick={() => setVisible(item.id, false)}
                  aria-label="إخفاء القسم"
                  className="absolute z-30 flex items-center justify-center rounded-full font-black"
                  style={{
                    insetInlineEnd: "-8px",
                    top: "-10px",
                    width: "30px",
                    height: "30px",
                    fontSize: "14px",
                    background: "var(--danger)",
                    color: "white",
                    boxShadow: "0 4px 12px rgba(0,0,0,.35)",
                  }}>
                  ✕
                </button>
              </>
            )}
          </div>
        ))}

        {/* درج إضافة الأقسام المخفية */}
        {editMode && (
          <section className="card" style={{ border: "1.5px dashed var(--border)", background: "var(--surface2)" }}>
            <p className="eyebrow mb-3">إضافة قسم</p>
            {hiddenItems.length === 0 ? (
              <p className="text-[14px] font-semibold" style={{ color: "var(--text-muted)" }}>
                كل الأقسام ظاهرة — اسحب ⠿ لإعادة ترتيبها أو ✕ لإخفائها.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {hiddenItems.map((item) => (
                  <button key={item.id} onClick={() => setVisible(item.id, true)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[14px] font-bold transition active:scale-95"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    <span className="text-[18px] leading-none" style={{ color: "var(--accent-light)" }}>＋</span>
                    {DASH_SECTION_META[item.id].label}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

      </div>

      <BottomNav />

      {/* DayScheduler Modal — اليوم (من الأزرار) */}
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

      {/* DayScheduler Modal — من التقويم */}
      {calDate && mounted && (
        <DayScheduler
          date={calDate}
          events={allEvents}
          subjects={allSubjects}
          examDate={examDate}
          onExamDateChange={(d) => { setExamDate(d); saveExamDate(d); }}
          onEventsChange={(evs) => { setAllEvents(evs); saveEvents(evs); const today = new Date().toISOString().slice(0, 10); setTodayEvents(getEventsForDate(today, evs)); }}
          onClose={() => setCalDate(null)}
        />
      )}
    </div>
  );
}
