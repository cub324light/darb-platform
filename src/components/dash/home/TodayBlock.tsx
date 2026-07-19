"use client";
/* ─── كتلة «اليوم» في الرئيسية: البطل + التقويم الأسبوعي + خطة اليوم ───
   قراءةٌ فقط من المحرّكات القائمة (Stats/الواجبات/المستخدم) — لا تغيّر أي منطق.
   تجيب «وش أسوي اليوم؟» بأكبر بطاقةٍ في الصفحة، ثم إيقاع الأسبوع، ثم قائمة اليوم. */
import { useState } from "react";
import Link from "next/link";
import { loadUser, loadStats, computeStreak, localDayKey } from "@/lib/storage";
import { loadHomework, bucketOf } from "@/lib/homework";
import { upcomingMilestones } from "@/lib/home/homeSignals";
import { n } from "@/lib/format";

const round1 = (x: number) => Math.round(x * 10) / 10;

interface TodayData {
  studyHours: number; doneHours: number; remainingHours: number;
  tasksToday: { id: string; title: string; subject?: string; priority: string }[];
  nearestExamDays: number | null; nearestExamName: string | null;
  week: { key: string; label: string; done: boolean; isToday: boolean; isFuture: boolean }[];
  streak: number;
}

const DAY_INITIAL = ["ح", "ن", "ث", "ر", "خ", "ج", "س"]; // الأحد → السبت

function buildToday(): TodayData | null {
  if (typeof window === "undefined") return null;
  const u = loadUser();
  const s = loadStats();
  const todayKey = localDayKey(new Date());
  const doneHours = round1((s.todayFocusMins ?? 0) / 60);
  const studyHours = u?.studyHours ?? 3;
  const hw = loadHomework();
  const tasksToday = hw
    .filter((h) => !h.done && (bucketOf(h, todayKey) === "today" || bucketOf(h, todayKey) === "overdue"))
    .slice(0, 4)
    .map((h) => ({ id: h.id, title: h.title, subject: h.subject, priority: h.priority }));

  /* أقرب اختبار: أقرب «موعد اختبار» قادم من التقويم بين اختبارات الطالب (إن أُعلن) */
  const tracks = new Set<string>(u?.activeTracks ?? []);
  const exams = upcomingMilestones({ today: todayKey, horizonDays: 365, pending: u?.pendingResults ?? [], limit: 20 })
    .filter((m) => m.kind === "exam" && (tracks.size === 0 || tracks.has(m.track)));
  const nearest = exams[0] ?? null;

  /* أسبوع التقويم الحالي (الأحد → السبت) */
  const now = new Date();
  const dow = now.getDay(); // 0 = الأحد
  const sunday = new Date(now); sunday.setDate(now.getDate() - dow);
  const done = new Set(s.sessionDays ?? []);
  const week = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(sunday); dt.setDate(sunday.getDate() + i);
    const key = localDayKey(dt);
    return { key, label: DAY_INITIAL[i], done: done.has(key), isToday: key === todayKey, isFuture: key > todayKey };
  });

  return {
    studyHours, doneHours, remainingHours: Math.max(0, round1(studyHours - doneHours)),
    tasksToday, nearestExamDays: nearest?.daysUntil ?? null, nearestExamName: nearest?.track ?? null,
    week, streak: computeStreak(s),
  };
}

const PRIO_COLOR: Record<string, string> = { high: "var(--danger)", medium: "var(--gold)", low: "var(--success)" };

export default function TodayBlock() {
  const [d] = useState(buildToday);
  if (!d) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* ═══ ٢) البطل: ماذا سأفعل اليوم؟ ═══ */}
      <section className="rounded-3xl p-5 rise" style={{ background: "linear-gradient(150deg, color-mix(in srgb, var(--accent) 16%, var(--surface)) 0%, var(--surface) 70%)", border: "1.5px solid color-mix(in srgb, var(--accent) 30%, var(--border))" }}>
        <p className="eyebrow mb-1">يومك</p>
        <h2 className="t-h2 font-black mb-3" style={{ color: "var(--text)" }}>ماذا سأفعل اليوم؟</h2>
        <Link href="/orbit" className="btn-primary glow-blue no-underline flex items-center justify-center gap-2 mb-4">
          <span className="text-[18px]">▶️</span> ابدأ جلسة تركيز الآن
        </Link>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: "📝", val: n(d.tasksToday.length), label: "مهام اليوم" },
            { icon: "⏳", val: `${n(d.remainingHours)}`, label: "ساعة متبقّية" },
            { icon: "🎯", val: d.nearestExamDays != null ? n(d.nearestExamDays) : "—", label: d.nearestExamName ? `يوم لـ${d.nearestExamName}` : "لا اختبار قادم" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl px-2 py-2.5 text-center" style={{ background: "color-mix(in srgb, var(--surface2) 70%, transparent)", border: "1px solid var(--border)" }}>
              <div className="text-[17px] leading-none mb-1">{m.icon}</div>
              <div className="t-h3 font-black font-mono-nums leading-none" style={{ color: "var(--text)" }}>{m.val}</div>
              <div className="t-caption mt-1 leading-tight" style={{ color: "var(--text-muted)" }}>{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ ٣) التقويم الأسبوعي (نمط Duolingo) ═══ */}
      <section className="ds-card ds-card-tight">
        <div className="flex items-center justify-between mb-3">
          <p className="t-title font-black" style={{ color: "var(--text)" }}>أسبوعك</p>
          <span className="t-caption font-black px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: "color-mix(in srgb, var(--gold) 15%, transparent)", color: "var(--gold)" }}>
            <span className="streak-fire">🔥</span> {n(d.streak)} يوم
          </span>
        </div>
        <div className="flex items-stretch justify-between gap-1">
          {d.week.map((day) => (
            <div key={day.key} className="flex flex-col items-center gap-1.5 flex-1">
              <span className="t-caption font-bold" style={{ color: day.isToday ? "var(--accent-light)" : "var(--text-muted)" }}>{day.label}</span>
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-[15px] font-black transition"
                style={day.done
                  ? { background: "var(--success)", color: "#04240f", border: "none" }
                  : day.isToday
                    ? { background: "transparent", color: "var(--accent-light)", border: "2px solid var(--accent)" }
                    : { background: "var(--surface2)", color: "var(--text-dim)", border: "1px solid var(--border)", opacity: day.isFuture ? 0.5 : 1 }}>
                {day.done ? "✓" : day.isToday ? "•" : ""}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ ٤) خطة اليوم: المهام + رابط الخطة الكاملة ═══ */}
      <section className="ds-card ds-card-tight">
        <div className="flex items-center justify-between mb-2.5">
          <p className="t-title font-black" style={{ color: "var(--text)" }}>خطة اليوم</p>
          <Link href="/plan" className="t-caption font-bold no-underline" style={{ color: "var(--accent-light)" }}>الخطة الكاملة ←</Link>
        </div>
        {d.tasksToday.length > 0 ? (
          <div className="flex flex-col gap-2">
            {d.tasksToday.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIO_COLOR[t.priority] ?? "var(--text-muted)" }} />
                <span className="t-body font-bold flex-1 min-w-0 truncate" style={{ color: "var(--text)" }}>{t.title}</span>
                {t.subject && <span className="t-caption flex-shrink-0" style={{ color: "var(--text-muted)" }}>{t.subject}</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="t-body" style={{ color: "var(--text-muted)" }}>لا مهام لهذا اليوم — ابدأ جلسة تركيز أو راجع أخطاءك.</p>
        )}
        <p className="t-caption mt-2.5" style={{ color: "var(--text-dim)" }}>الجلسات وفترات الراحة الكاملة في «خطتي».</p>
      </section>
    </div>
  );
}
