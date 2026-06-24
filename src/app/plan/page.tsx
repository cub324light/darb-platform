"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import PageFooter from "@/components/PageFooter";
import Dome from "@/components/Dome";
import PageGuide from "@/components/PageGuide";
import CalendarExport from "@/components/CalendarExport";
import dynamic from "next/dynamic";
const Calendar = dynamic(() => import("@/components/Calendar"), { ssr: false });
const StrategyBanner = dynamic(() => import("@/components/StrategyBanner"), { ssr: false });
const CalendarStatusCard = dynamic(() => import("@/components/CalendarStatusCard"), { ssr: false });
const GoalRealityCard = dynamic(() => import("@/components/GoalRealityCard"), { ssr: false });
const ExamRegistrationAlert = dynamic(() => import("@/components/ExamRegistrationAlert"), { ssr: false });
import { getEventsForDate } from "@/components/DayScheduler";
import { loadUser, loadStats, loadEvents, loadExamDate, saveExamDate, loadTrackExamDates, computeStreak, type ScheduleEvent } from "@/lib/storage";
import { subjectsForTracks, getTrack, colorForSubject, type TrackId } from "@/lib/tracks";
import { fmtHour } from "@/lib/utils";

function daysUntil(dateStr: string): number {
  const today = new Date().toISOString().slice(0, 10);
  return Math.round(
    (new Date(dateStr + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000
  );
}

type PlanView = "day" | "week" | "month";

export default function PlanPage() {
  const [allEvents] = useState<ScheduleEvent[]>(() =>
    typeof window !== "undefined" ? loadEvents() : []
  );
  const [activeIds] = useState<TrackId[]>(() => {
    if (typeof window === "undefined") return ["تحصيلي"] as TrackId[];
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    return ids.length ? ids : (["تحصيلي"] as TrackId[]);
  });

  const [view, setView] = useState<PlanView>("day");
  const [examDate, setExamDate] = useState<string | null>(() =>
    typeof window !== "undefined" ? loadExamDate() : null
  );

  /* الوقت الحالي — يُحدّث كل دقيقة لإبراز الجلسة الجارية */
  const [now, setNow] = useState<Date | null>(() => typeof window !== "undefined" ? new Date() : null);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const nowHour = now ? now.getHours() + now.getMinutes() / 60 : -1;

  const [streak] = useState(() =>
    typeof window !== "undefined" ? computeStreak(loadStats()) : 0
  );
  const [todayMins] = useState(() =>
    typeof window !== "undefined" ? loadStats().todayFocusMins : 0
  );
  const [dueCards] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const c = JSON.parse(localStorage.getItem("darb_cards") ?? "[]");
      const n = Date.now();
      return Array.isArray(c) ? c.filter((x: { dueDate: number }) => x.dueDate <= n).length : 0;
    } catch { return 0; }
  });

  /* أقرب اختبار من المسارات النشطة */
  const nearestExam = (() => {
    if (typeof window === "undefined") return null;
    const u = loadUser();
    const trackDates = loadTrackExamDates();
    const ed = loadExamDate();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    const candidates: { days: number; label: string; color: string }[] = [];
    for (const id of ids) {
      const d = trackDates[id];
      if (!d) continue;
      const days = daysUntil(d);
      if (days >= 0) {
        const track = getTrack(id);
        candidates.push({ days, label: track?.title ?? id, color: track?.color ?? "var(--accent)" });
      }
    }
    if (ed) {
      const days = daysUntil(ed);
      if (days >= 0) candidates.push({ days, label: "الاختبار", color: "var(--accent)" });
    }
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => a.days - b.days)[0];
  })();

  const urgentColor = nearestExam
    ? nearestExam.days <= 1 ? "#EF4444"
      : nearestExam.days <= 7 ? "#F97316"
      : nearestExam.color
    : "var(--accent)";

  /* جلسات اليوم مرتّبة بالوقت */
  const todayStudy = getEventsForDate(new Date().toISOString().slice(0, 10), allEvents)
    .filter((e) => e.type === "study")
    .sort((a, b) => a.fromHour - b.fromHour);

  /* الجلسة الجارية الآن (إن وُجدت) والقادمة */
  const currentEv = todayStudy.find((e) => nowHour >= e.fromHour && nowHour < e.toHour);
  const nextEv = todayStudy.find((e) => e.fromHour > nowHour);

  const colorFor = (subj?: string) => subj ? colorForSubject(activeIds, subj) : "var(--accent-light)";

  /* أيام الأسبوع القادمة */
  const weekDays = (() => {
    const LABELS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const evs = getEventsForDate(dateStr, allEvents).filter((e) => e.type === "study").sort((a, b) => a.fromHour - b.fromHour);
      out.push({ label: i === 0 ? "اليوم" : LABELS[d.getDay()], evs, dateStr });
    }
    return out;
  })();

  const hasSchedule = allEvents.some((e) => e.type === "study");

  const openScheduler = () =>
    window.dispatchEvent(new CustomEvent("darb:openDuirb", { detail: { tab: "schedule" } }));

  return (
    <div className="page">
      <PageGuide pageKey="plan" steps={[
        { title: "خطتي", desc: "شاشة التخطيط الموحّدة — يومك وأسبوعك وشهرك وأدوات التخطيط كلها في مكان واحد." },
        { title: "اليوم بمخطط زمني", desc: "تبويب «اليوم» يعرض جلساتك على خط زمني، ويبرز الجلسة الجارية الآن." },
        { title: "ابنِ جدولك مع دويرب", desc: "اضغط «خطّط مع دويرب» وأخبره بمواعيدك وأهدافك — يبني لك خطة ذكية في ثوانٍ." },
      ]} />

      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg grad-title">خطتي</h1>
          {nearestExam !== null && (
            <div className="dome-chip flex items-center gap-1.5">
              <span className="num-hero text-base" style={{ color: urgentColor }}>{nearestExam.days}</span>
              <span className="text-[13px] font-semibold" style={{ color: "var(--text-dim)" }}>
                يوم على {nearestExam.label}
              </span>
            </div>
          )}
        </div>
      </Dome>
      <div className="h-5" />

      {/* ── التقويم الدراسي + استراتيجية المذاكرة الموحّدة ── */}
      <div className="px-5 mb-5 rise rise-1 flex flex-col gap-4">
        <ExamRegistrationAlert />
        <CalendarStatusCard />
        <GoalRealityCard />
        <StrategyBanner defaultExpanded />
      </div>

      {/* ── الاستعداد ── */}
      <div className="px-5 mb-5 rise rise-1">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="font-mono-nums font-black text-3xl" style={{ color: streak > 0 ? "var(--gold)" : "var(--text-muted)" }}>{streak}</p>
            <p className="text-[12px] font-bold mt-1" style={{ color: "var(--text-muted)" }}>يوم ستريك</p>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="font-mono-nums font-black text-3xl" style={{ color: "var(--accent-light)" }}>{todayMins}</p>
            <p className="text-[12px] font-bold mt-1" style={{ color: "var(--text-muted)" }}>دقيقة اليوم</p>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="font-mono-nums font-black text-3xl" style={{ color: dueCards > 0 ? "#EF4444" : "var(--success)" }}>{dueCards}</p>
            <p className="text-[12px] font-bold mt-1" style={{ color: "var(--text-muted)" }}>بطاقة مستحقة</p>
          </div>
        </div>
      </div>

      {/* ── مبدّل العرض: يوم / أسبوع / شهر ── */}
      <div className="px-5 mb-4 rise rise-2">
        <div className="flex gap-2 p-1 rounded-2xl" style={{ background: "var(--surface)" }}>
          {([["day", "اليوم"], ["week", "الأسبوع"], ["month", "الشهر"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className="flex-1 py-2.5 rounded-xl text-[14px] font-bold text-center transition"
              style={view === v
                ? { background: "var(--accent)", color: "#fff" }
                : { color: "var(--text-muted)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── عرض اليوم — مخطط زمني يبرز الجلسة الجارية ── */}
      {view === "day" && (
        <div className="px-5 mb-5 rise rise-3">
          {todayStudy.length === 0 ? (
            <div className="rounded-2xl py-6 px-4 text-center"
              style={{ background: "var(--surface2)", border: "1.5px dashed var(--border)" }}>
              <p className="text-[14px] font-bold mb-3" style={{ color: "var(--text-muted)" }}>لا يوجد جدول لليوم</p>
              <button onClick={openScheduler}
                className="w-full rounded-2xl py-3 font-bold text-[15px] transition active:scale-[0.98]"
                style={{ background: "var(--accent)", color: "#fff" }}>
                🤖 ابنِ خطة اليوم مع دويرب
              </button>
            </div>
          ) : (
            <>
              {/* شريط «أنت الآن» */}
              <div className="rounded-2xl px-4 py-3 mb-3 flex items-center gap-3"
                style={{ background: `color-mix(in srgb, ${colorFor(currentEv?.subject ?? nextEv?.subject)} 12%, var(--surface))`, border: `1px solid ${colorFor(currentEv?.subject ?? nextEv?.subject)}44` }}>
                <span className="text-[20px]">{currentEv ? "▶️" : nextEv ? "⏭️" : "✓"}</span>
                <div className="flex-1 text-right">
                  {currentEv ? (
                    <>
                      <p className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>الآن — حتى {fmtHour(currentEv.toHour)}</p>
                      <p className="text-[16px] font-black" style={{ color: colorFor(currentEv.subject) }}>{currentEv.subject ?? "مذاكرة"}</p>
                    </>
                  ) : nextEv ? (
                    <>
                      <p className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>القادمة — {fmtHour(nextEv.fromHour)}</p>
                      <p className="text-[16px] font-black" style={{ color: colorFor(nextEv.subject) }}>{nextEv.subject ?? "مذاكرة"}</p>
                    </>
                  ) : (
                    <p className="text-[15px] font-black" style={{ color: "var(--success)" }}>خلّصت جلسات اليوم 🎉</p>
                  )}
                </div>
                <Link href="/orbit" className="text-[13px] font-black px-3 py-2 rounded-xl"
                  style={{ background: "var(--accent)", color: "#fff", textDecoration: "none" }}>ابدأ ←</Link>
              </div>

              {/* الخط الزمني */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                {todayStudy.map((ev, i) => {
                  const isNow = currentEv?.id === ev.id;
                  const isPast = ev.toHour <= nowHour;
                  const c = colorFor(ev.subject);
                  return (
                    <div key={ev.id}
                      className={`flex items-center gap-3 px-4 py-3.5 ${i < todayStudy.length - 1 ? "border-b" : ""}`}
                      style={{ borderColor: "var(--border)", background: isNow ? `color-mix(in srgb, ${c} 10%, transparent)` : "transparent", opacity: isPast ? 0.5 : 1 }}>
                      <div className="flex flex-col items-center w-14 flex-shrink-0">
                        <span className="text-[13px] font-black" style={{ color: isNow ? c : "var(--text)" }}>{fmtHour(ev.fromHour)}</span>
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{fmtHour(ev.toHour)}</span>
                      </div>
                      <div className="w-1.5 self-stretch rounded-full flex-shrink-0" style={{ background: c }} />
                      <span className="flex-1 text-[15px] font-bold" style={{ color: "var(--text)" }}>
                        {ev.subject ?? "مذاكرة"}
                      </span>
                      {isNow && (
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-lg" style={{ background: c, color: "#fff" }}>الآن</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── عرض الأسبوع ── */}
      {view === "week" && (
        <div className="px-5 mb-5 rise rise-3">
          <div className="flex flex-col gap-2">
            {weekDays.map(({ label, evs, dateStr }, i) => (
              <div key={dateStr} className="flex items-start gap-3 rounded-xl px-3 py-3"
                style={{ background: "var(--surface)", border: `1px solid ${i === 0 ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "var(--border)"}` }}>
                <span className="text-[13px] font-black w-16 flex-shrink-0 pt-0.5" style={{ color: i === 0 ? "var(--accent-light)" : "var(--text-muted)" }}>{label}</span>
                {evs.length === 0 ? (
                  <span className="text-[13px] pt-0.5" style={{ color: "var(--text-dim)" }}>لا جلسات</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {evs.map((ev) => (
                      <span key={ev.id} className="text-[12px] font-bold px-2 py-1 rounded-lg"
                        style={{ background: `color-mix(in srgb, ${colorFor(ev.subject)} 16%, transparent)`, color: colorFor(ev.subject), border: `1px solid ${colorFor(ev.subject)}44` }}>
                        {ev.subject ?? "مذاكرة"} · {fmtHour(ev.fromHour)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── عرض الشهر — تقويم كامل ── */}
      {view === "month" && (
        <div className="px-5 mb-5 rise rise-3">
          <Calendar
            examDate={examDate}
            onExamDateChange={(d) => { setExamDate(d); saveExamDate(d); }}
            getDayInfo={(date) =>
              getEventsForDate(date, allEvents).map((ev) => ({
                id: ev.id,
                label: ev.type === "study" ? (ev.subject ?? "مذاكرة") : (ev.label ?? "مشغول"),
                color: ev.type === "study" ? colorFor(ev.subject) : "var(--danger)",
                from: ev.fromHour,
                to: ev.toHour,
              }))
            }
          />
        </div>
      )}

      {/* ── دويرب للتخطيط ── */}
      <div className="px-5 mb-5 rise rise-4">
        <button onClick={openScheduler}
          className="w-full rounded-2xl py-4 px-4 font-black text-[16px] flex items-center gap-3 transition active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-hi))", color: "#fff" }}>
          <span className="text-[20px]">🤖</span>
          <span className="flex-1 text-right">خطّط مع دويرب</span>
          <span>←</span>
        </button>
        <p className="text-[12px] text-center mt-2" style={{ color: "var(--text-muted)" }}>
          أخبره بوقتك ومواعيدك — يبني لك جدول ذكي في ثوانٍ
        </p>
      </div>

      {/* ── تصدير التقويم ── */}
      <div className="px-5 mb-5 rise rise-5">
        <p className="text-[15px] font-black mb-3" style={{ color: "var(--text)" }}>تصدير للتقويم</p>
        <CalendarExport events={allEvents} />
        {!hasSchedule && (
          <p className="text-[12px] text-center mt-2" style={{ color: "var(--text-muted)" }}>
            ابنِ خطة أولاً ثم صدّرها لتقويمك المفضّل
          </p>
        )}
      </div>

      {/* ── روابط سريعة ── */}
      <div className="px-5 mb-5 rise rise-6">
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/study-plan", icon: "📊", label: "مخطط الدراسة", desc: "وزّع ساعاتك الأسبوعية" },
            { href: "/roadmap",    icon: "🗺️", label: "مساري",         desc: "الخريطة الدراسية" },
            { href: "/orbit",      icon: "⏱️", label: "أوربت",          desc: "ابدأ جلسة تركيز" },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="rounded-2xl p-4 flex flex-col gap-1.5 transition active:scale-[0.97]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", textDecoration: "none" }}>
              <span className="text-[22px]">{item.icon}</span>
              <span className="text-[15px] font-black" style={{ color: "var(--text)" }}>{item.label}</span>
              <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{item.desc}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
