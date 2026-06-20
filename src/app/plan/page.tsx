"use client";
import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import PageGuide from "@/components/PageGuide";
import CalendarExport from "@/components/CalendarExport";
import { getEventsForDate } from "@/components/DayScheduler";
import { loadUser, loadStats, loadEvents, loadExamDate, loadTrackExamDates, computeStreak, type ScheduleEvent } from "@/lib/storage";
import { subjectsForTracks, getTrack, type TrackId } from "@/lib/tracks";
import { fmtHour } from "@/lib/utils";

function daysUntil(dateStr: string): number {
  const today = new Date().toISOString().slice(0, 10);
  return Math.round(
    (new Date(dateStr + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000
  );
}

export default function PlanPage() {
  const [allEvents] = useState<ScheduleEvent[]>(() =>
    typeof window !== "undefined" ? loadEvents() : []
  );

  const [todayEvents] = useState<ScheduleEvent[]>(() => {
    if (typeof window === "undefined") return [];
    const today = new Date().toISOString().slice(0, 10);
    return getEventsForDate(today, loadEvents());
  });

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
      const now = Date.now();
      return Array.isArray(c) ? c.filter((x: { dueDate: number }) => x.dueDate <= now).length : 0;
    } catch { return 0; }
  });

  /* أقرب اختبار من المسارات النشطة */
  const nearestExam = (() => {
    if (typeof window === "undefined") return null;
    const u = loadUser();
    const trackDates = loadTrackExamDates();
    const examDate = loadExamDate();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];

    const candidates: { days: number; label: string; color: string }[] = [];

    /* مواعيد المسارات */
    for (const id of ids) {
      const d = trackDates[id];
      if (!d) continue;
      const days = daysUntil(d);
      if (days >= 0) {
        const track = getTrack(id);
        candidates.push({ days, label: track?.title ?? id, color: track?.color ?? "var(--accent)" });
      }
    }
    /* الموعد العام */
    if (examDate) {
      const days = daysUntil(examDate);
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

  const studyEvents = todayEvents.filter((e) => e.type === "study");
  const hasSchedule = allEvents.some((e) => e.type === "study");

  /* أيام الأسبوع من اليوم حتى ٧ أيام */
  const weekDays = (() => {
    const days = [];
    const LABELS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const evs = getEventsForDate(dateStr, allEvents).filter((e) => e.type === "study");
      days.push({ label: i === 0 ? "اليوم" : LABELS[d.getDay()], evs, dateStr });
    }
    return days;
  })();

  return (
    <div className="page">
      <PageGuide pageKey="plan" steps={[
        { title: "خطتي", desc: "شاشة التخطيط الموحّدة — جدولك اليومي والأسبوعي وأدوات التخطيط كلها في مكان واحد." },
        { title: "ابنِ جدولك مع دويرب", desc: "اضغط «خطّط مع دويرب» وأخبره بمواعيدك وأهدافك — يبني لك خطة ذكية في ثوانٍ." },
        { title: "صدّر للتقويم", desc: "ربط التقويم يُذكّرك بموعد كل جلسة قبل ١٠ دقائق تلقائياً." },
      ]} />

      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg" style={{ color: "var(--text)" }}>خطتي</h1>
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

      {/* ── بطاقة الاستعداد ── */}
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

      {/* ── خطة اليوم ── */}
      <div className="px-5 mb-5 rise rise-2">
        <p className="text-[15px] font-black mb-3" style={{ color: "var(--text)" }}>جلسات اليوم</p>
        {studyEvents.length === 0 ? (
          <div className="rounded-2xl py-5 px-4 text-center"
            style={{ background: "var(--surface2)", border: "1.5px dashed var(--border)" }}>
            <p className="text-[14px] font-bold mb-3" style={{ color: "var(--text-muted)" }}>لا يوجد جدول لليوم</p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("darb:openDuirb", { detail: { tab: "schedule" } }))}
              className="w-full rounded-2xl py-3 font-bold text-[15px] transition active:scale-[0.98]"
              style={{ background: "var(--accent)", color: "#fff" }}>
              🤖 ابنِ خطة اليوم مع دويرب
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {studyEvents.map((ev, i) => (
              <div key={ev.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < studyEvents.length - 1 ? "border-b" : ""}`}
                style={{ borderColor: "var(--border)" }}>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "var(--accent-light)" }} />
                <span className="flex-1 text-[15px] font-bold" style={{ color: "var(--text)" }}>
                  {ev.subject ?? "مذاكرة"}
                </span>
                <span className="text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>
                  {fmtHour(ev.fromHour)} → {fmtHour(ev.toHour)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── الأسبوع القادم ── */}
      <div className="px-5 mb-5 rise rise-3">
        <p className="text-[15px] font-black mb-3" style={{ color: "var(--text)" }}>هذا الأسبوع</p>
        <div className="flex flex-col gap-2">
          {weekDays.map(({ label, evs, dateStr }) => (
            <div key={dateStr} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-[13px] font-bold w-16 flex-shrink-0" style={{ color: "var(--text-muted)" }}>{label}</span>
              {evs.length === 0 ? (
                <span className="text-[13px]" style={{ color: "var(--text-dim)" }}>لا جلسات</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {evs.map((ev) => (
                    <span key={ev.id} className="text-[12px] font-bold px-2 py-0.5 rounded-lg"
                      style={{ background: "var(--accent)18", color: "var(--accent-light)", border: "1px solid var(--accent)33" }}>
                      {ev.subject ?? "مذاكرة"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── دويرب للتخطيط ── */}
      <div className="px-5 mb-5 rise rise-4">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("darb:openDuirb", { detail: { tab: "schedule" } }))}
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
        <p className="text-[15px] font-black mb-3" style={{ color: "var(--text)" }}>وصول سريع</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/roadmap", icon: "🗺️", label: "مساري", desc: "الخريطة الدراسية" },
            { href: "/orbit",   icon: "⏱️", label: "أوربت",  desc: "ابدأ جلسة تركيز" },
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
      <BottomNav />
    </div>
  );
}
