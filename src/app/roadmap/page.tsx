"use client";
import { useState, useEffect, startTransition } from "react";
import BottomNav from "@/components/BottomNav";
import { RAKAN_SCHEDULE, ROADMAP_STAGES } from "@/lib/constants";

const ROADMAP_KEY = "darb_roadmap";

type SubjectKey = keyof typeof RAKAN_SCHEDULE;

const SUBJECT_COLORS: Record<SubjectKey, string> = {
  فيزياء: "#2563EB",
  رياضيات: "#8B5CF6",
  كيمياء: "#10B981",
  أحياء: "#F59E0B",
};

const SUBJECT_ICONS: Record<SubjectKey, string> = {
  فيزياء: "⚛️",
  رياضيات: "📐",
  كيمياء: "🧪",
  أحياء: "🌿",
};

const SUBJECT_TOTALS: Record<SubjectKey, { hours: number; pages: string }> = {
  فيزياء: { hours: 30, pages: "8-90" },
  رياضيات: { hours: 42, pages: "92-157" },
  كيمياء: { hours: 30, pages: "180-263" },
  أحياء: { hours: 37, pages: "266-353" },
};

interface OverallBarProps {
  overallPct: number;
  currentStage: (typeof ROADMAP_STAGES)[number];
  totalDone: number;
  totalLessons: number;
}

function OverallBar({ overallPct, currentStage, totalDone, totalLessons }: OverallBarProps) {
  return (
    <div className="px-5 mb-6">
      <div className="rounded-3xl p-6"
        style={{ background: "linear-gradient(135deg,rgba(37,99,235,0.15),rgba(37,99,235,0.05))", border: "1.5px solid rgba(37,99,235,0.3)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] mb-1">التقدم الكلي للجدول</p>
            <p className="text-xl font-black text-[var(--text)]">
              {currentStage.icon} مرحلة {currentStage.name}
            </p>
          </div>
          <p className="font-mono-nums font-black text-5xl text-[var(--blue-light)]">{overallPct}%</p>
        </div>
        <div className="h-3 bg-[var(--border)] rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: overallPct + "%", background: "linear-gradient(90deg,#1D4ED8,#3B82F6)" }} />
        </div>
        <div className="flex justify-between">
          {ROADMAP_STAGES.map(s => (
            <div key={s.id} className="flex flex-col items-center gap-1">
              <span className="text-base">{s.icon}</span>
              <span className={`text-xs font-bold ${s.id === currentStage.id ? "text-[var(--blue-light)]" : "text-[var(--text-muted)]"}`}>
                {s.name}
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-3 text-center">
          {totalDone} درس منجز من أصل {totalLessons}
        </p>
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<SubjectKey | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROADMAP_KEY);
      if (raw) startTransition(() => setCompletedLessons(new Set(JSON.parse(raw) as string[])));
    } catch {}
  }, []);

  const subjects = Object.keys(RAKAN_SCHEDULE) as SubjectKey[];

  /* ── حساب التقدم الكلي ── */
  const totalLessons = subjects.reduce((a, s) => a + RAKAN_SCHEDULE[s].length, 0);
  const totalDone    = subjects.reduce((a, s) =>
    a + RAKAN_SCHEDULE[s].filter(l => completedLessons.has(`${s}-${l.lesson}`)).length, 0);
  const overallPct   = Math.round((totalDone / totalLessons) * 100);
  const currentStage = ROADMAP_STAGES.find(
    s => overallPct >= s.range[0] && overallPct < s.range[1]
  ) ?? ROADMAP_STAGES[ROADMAP_STAGES.length - 1];

  const toggleLesson = (subj: SubjectKey, lesson: string) => {
    const key = `${subj}-${lesson}`;
    setCompletedLessons(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem(ROADMAP_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  /* ══════════════════════════════════════
     واجهة الدروس عند اختيار مادة
  ══════════════════════════════════════ */
  if (selected) {
    const lessons  = RAKAN_SCHEDULE[selected];
    const color    = SUBJECT_COLORS[selected];
    const totals   = SUBJECT_TOTALS[selected];
    const done     = lessons.filter(l => completedLessons.has(`${selected}-${l.lesson}`)).length;
    const pct      = Math.round((done / lessons.length) * 100);

    return (
      <div className="min-h-dvh bg-[var(--bg)] pb-nav">
        {/* Header */}
        <div className="page-header">
          <button onClick={() => setSelected(null)}
            className="text-base font-bold text-[var(--text-muted)]">← رجوع</button>
          <h1 className="font-black text-xl text-[var(--text)]">
            {SUBJECT_ICONS[selected]} {selected}
          </h1>
          <div className="stat-chip">
            <span className="font-mono-nums font-bold text-base" style={{ color }}>{done}/{lessons.length}</span>
          </div>
        </div>

        {/* الشريط الكلي */}
        <OverallBar overallPct={overallPct} currentStage={currentStage} totalDone={totalDone} totalLessons={totalLessons} />

        {/* تقدم هذه المادة */}
        <div className="px-5 mb-6">
          <div className="rounded-2xl p-5"
            style={{ background: color + "12", border: `1.5px solid ${color}33` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-base text-[var(--text)]">تقدم {selected}</p>
              <span className="font-mono-nums font-black text-2xl" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: pct + "%", background: color }} />
            </div>
            <div className="flex gap-4">
              <span className="text-sm text-[var(--text-muted)]">📚 {lessons.length} درس</span>
              <span className="text-sm text-[var(--text-muted)]">⏱ {totals.hours} ساعة</span>
              <span className="text-sm text-[var(--text-muted)]">📄 ص {totals.pages}</span>
            </div>
          </div>
        </div>

        {/* قائمة الدروس */}
        <div className="px-5 flex flex-col gap-3">
          {lessons.map((lesson, idx) => {
            const key  = `${selected}-${lesson.lesson}`;
            const isDone = completedLessons.has(key);
            const diffColor = lesson.difficulty === "سهل" ? "#10B981"
              : lesson.difficulty === "متوسط" ? "#F59E0B" : "#EF4444";

            return (
              <div key={idx}
                className="rounded-2xl p-5 cursor-pointer transition active:scale-[0.98]"
                style={{
                  background: isDone ? color + "10" : "var(--surface)",
                  border: `1.5px solid ${isDone ? color + "40" : "var(--border)"}`,
                }}
                onClick={() => toggleLesson(selected, lesson.lesson)}>
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={isDone
                      ? { background: color }
                      : { border: "2px solid var(--border)" }}>
                    {isDone && <span className="text-white text-lg font-black">✓</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-base leading-snug ${isDone ? "line-through text-[var(--text-muted)]" : "text-[var(--text)]"}`}>
                      {lesson.lesson}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-base font-black" style={{ color }}>اليوم {lesson.day}</span>
                      <span className="text-sm text-[var(--text-muted)]">{lesson.hours} ساعة</span>
                      <span className="text-sm text-[var(--text-muted)]">ص {lesson.pages}</span>
                    </div>
                  </div>

                  <span className="text-sm font-bold flex-shrink-0" style={{ color: diffColor }}>
                    {lesson.difficulty}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-6" />
        <BottomNav />
      </div>
    );
  }

  /* ══════════════════════════════════════
     الواجهة الرئيسية — ٤ مواد
  ══════════════════════════════════════ */
  return (
    <div className="min-h-dvh bg-[var(--bg)] pb-nav">
      {/* Header */}
      <div className="page-header">
        <h1 className="font-black text-xl text-[var(--text)]">خريطة الطريق</h1>
        <span className="text-sm font-bold text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] px-4 py-2 rounded-xl">الجدول</span>
      </div>

      {/* الشريط الكلي */}
      <OverallBar overallPct={overallPct} currentStage={currentStage} totalDone={totalDone} totalLessons={totalLessons} />

      {/* ٤ مواد */}
      <div className="px-5 grid grid-cols-2 gap-4">
        {subjects.map(subj => {
          const lessons = RAKAN_SCHEDULE[subj];
          const done    = lessons.filter(l => completedLessons.has(`${subj}-${l.lesson}`)).length;
          const pct     = Math.round((done / lessons.length) * 100);
          const color   = SUBJECT_COLORS[subj];

          return (
            <button key={subj} onClick={() => setSelected(subj)}
              className="rounded-3xl p-6 flex flex-col gap-4 transition active:scale-[0.96] text-right"
              style={{ background: color + "12", border: `2px solid ${color}30` }}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{SUBJECT_ICONS[subj]}</span>
                <p className="font-black text-xl text-[var(--text)]">{subj}</p>
              </div>

              <div>
                <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: pct + "%", background: color }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono-nums font-black text-lg" style={{ color }}>{pct}%</span>
                  <span className="text-sm text-[var(--text-muted)] font-semibold">{done}/{lessons.length} درس</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="h-6" />
      <BottomNav />
    </div>
  );
}
