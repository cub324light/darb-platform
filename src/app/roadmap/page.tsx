"use client";
import { useState, useEffect, startTransition } from "react";
import BottomNav from "@/components/BottomNav";
import { RAKAN_SCHEDULE, ROADMAP_STAGES } from "@/lib/constants";

const ROADMAP_KEY = "darb_roadmap";

type SubjectKey = keyof typeof RAKAN_SCHEDULE;

const SUBJECT_COLORS: Record<SubjectKey, string> = {
  فيزياء:  "#3B82F6",
  رياضيات: "#8B5CF6",
  كيمياء:  "#10B981",
  أحياء:   "#F59E0B",
};

const SUBJECT_ICONS: Record<SubjectKey, string> = {
  فيزياء:  "⚛️",
  رياضيات: "📐",
  كيمياء:  "🧪",
  أحياء:   "🌿",
};

const SUBJECT_TOTALS: Record<SubjectKey, { hours: number; pages: string }> = {
  فيزياء:  { hours: 30, pages: "8-90"    },
  رياضيات: { hours: 42, pages: "92-157"  },
  كيمياء:  { hours: 30, pages: "180-263" },
  أحياء:   { hours: 37, pages: "266-353" },
};

interface OverallBarProps {
  overallPct:   number;
  currentStage: (typeof ROADMAP_STAGES)[number];
  totalDone:    number;
  totalLessons: number;
}

function OverallBar({ overallPct, currentStage, totalDone, totalLessons }: OverallBarProps) {
  return (
    <div className="px-5 mb-5">
      <div className="rounded-2xl p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>التقدم الكلي</p>
            <p className="font-bold text-sm text-white">{currentStage.icon} {currentStage.name}</p>
          </div>
          <p className="font-mono-nums font-black text-4xl" style={{ color: "var(--blue-light)" }}>
            {overallPct}%
          </p>
        </div>
        <div className="h-[3px] rounded-full overflow-hidden mb-4" style={{ background: "var(--surface2)" }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: overallPct + "%", background: "var(--blue)" }} />
        </div>
        <div className="flex justify-between">
          {ROADMAP_STAGES.map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-1">
              <span className="text-sm">{s.icon}</span>
              <span className="text-[10px] font-bold"
                style={{ color: s.id === currentStage.id ? "var(--blue-light)" : "var(--text-muted)" }}>
                {s.name}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-center mt-3" style={{ color: "var(--text-muted)" }}>
          {totalDone} من {totalLessons} درس
        </p>
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [selected, setSelected]                 = useState<SubjectKey | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROADMAP_KEY);
      if (raw) startTransition(() => setCompletedLessons(new Set(JSON.parse(raw) as string[])));
    } catch {}
  }, []);

  const subjects = Object.keys(RAKAN_SCHEDULE) as SubjectKey[];

  const totalLessons = subjects.reduce((a, s) => a + RAKAN_SCHEDULE[s].length, 0);
  const totalDone    = subjects.reduce(
    (a, s) => a + RAKAN_SCHEDULE[s].filter((l) => completedLessons.has(`${s}-${l.lesson}`)).length, 0
  );
  const overallPct   = Math.round((totalDone / totalLessons) * 100);
  const currentStage = ROADMAP_STAGES.find(
    (s) => overallPct >= s.range[0] && overallPct < s.range[1]
  ) ?? ROADMAP_STAGES[ROADMAP_STAGES.length - 1];

  const toggleLesson = (subj: SubjectKey, lesson: string) => {
    const key = `${subj}-${lesson}`;
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem(ROADMAP_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  /* ── Subject detail view ── */
  if (selected) {
    const lessons = RAKAN_SCHEDULE[selected];
    const color   = SUBJECT_COLORS[selected];
    const totals  = SUBJECT_TOTALS[selected];
    const done    = lessons.filter((l) => completedLessons.has(`${selected}-${l.lesson}`)).length;
    const pct     = Math.round((done / lessons.length) * 100);

    return (
      <div className="min-h-dvh bg-[var(--bg)]"
        style={{ paddingBottom: "calc(var(--nav-h) + 16px)" }}>

        {/* Header */}
        <div className="anim-1 flex items-center justify-between px-5 pt-12 pb-5">
          <button onClick={() => setSelected(null)}
            className="text-sm font-bold px-3 py-1.5 rounded-xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            ← رجوع
          </button>
          <h1 className="font-black text-base text-white">
            {SUBJECT_ICONS[selected]} {selected}
          </h1>
          <div className="stat-chip">
            <span className="font-mono-nums font-bold text-sm" style={{ color }}>{done}/{lessons.length}</span>
          </div>
        </div>

        {/* Overall bar */}
        <OverallBar
          overallPct={overallPct} currentStage={currentStage}
          totalDone={totalDone} totalLessons={totalLessons}
        />

        {/* Subject progress */}
        <div className="anim-2 px-5 mb-5">
          <div className="rounded-2xl p-4"
            style={{ background: color + "0c", border: `1px solid ${color}22` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-sm text-white">تقدم {selected}</p>
              <span className="font-mono-nums font-black text-xl" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-[3px] rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + "%", background: color }} />
            </div>
            <div className="flex gap-4">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{lessons.length} درس</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{totals.hours} ساعة</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>ص {totals.pages}</span>
            </div>
          </div>
        </div>

        {/* Lessons list */}
        <div className="anim-3 px-5 flex flex-col gap-2">
          {lessons.map((lesson, idx) => {
            const key    = `${selected}-${lesson.lesson}`;
            const isDone = completedLessons.has(key);
            const diffColor = lesson.difficulty === "سهل" ? "#10B981"
              : lesson.difficulty === "متوسط" ? "#F59E0B" : "#EF4444";

            return (
              <div key={idx}
                className="rounded-xl p-4 cursor-pointer transition active:scale-[0.98]"
                style={{
                  background: isDone ? color + "0a" : "var(--surface)",
                  border: `1px solid ${isDone ? color + "28" : "var(--border)"}`,
                }}
                onClick={() => toggleLesson(selected, lesson.lesson)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition"
                    style={isDone
                      ? { background: color }
                      : { border: "1.5px solid var(--border)", background: "var(--surface2)" }}>
                    {isDone && <span className="text-white text-sm font-black">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold leading-snug ${isDone ? "line-through" : "text-white"}`}
                      style={isDone ? { color: "var(--text-muted)", textDecoration: "line-through" } : {}}>
                      {lesson.lesson}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-bold" style={{ color }}>يوم {lesson.day}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{lesson.hours}س</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>ص {lesson.pages}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: diffColor }}>
                    {lesson.difficulty}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-4" />
        <BottomNav />
      </div>
    );
  }

  /* ── Main view ── */
  return (
    <div className="min-h-dvh bg-[var(--bg)]" style={{ paddingBottom: "calc(var(--nav-h) + 16px)" }}>

      {/* Header */}
      <div className="anim-1 flex items-center justify-between px-5 pt-12 pb-5">
        <div>
          <h1 className="font-black text-xl text-white">الخريطة</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>خطتك الدراسية المفصّلة</p>
        </div>
        <span className="font-mono-nums font-black text-xl" style={{ color: "var(--blue-light)" }}>
          {overallPct}%
        </span>
      </div>

      {/* Overall bar */}
      <div className="anim-2">
        <OverallBar
          overallPct={overallPct} currentStage={currentStage}
          totalDone={totalDone} totalLessons={totalLessons}
        />
      </div>

      {/* Subject grid */}
      <div className="anim-3 px-5 grid grid-cols-2 gap-3">
        {subjects.map((subj) => {
          const lessons = RAKAN_SCHEDULE[subj];
          const done    = lessons.filter((l) => completedLessons.has(`${subj}-${l.lesson}`)).length;
          const pct     = Math.round((done / lessons.length) * 100);
          const color   = SUBJECT_COLORS[subj];

          return (
            <button key={subj} onClick={() => setSelected(subj)}
              className="rounded-2xl p-5 flex flex-col gap-3 transition active:scale-[0.96] text-right"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderTop: `3px solid ${color}`,
              }}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{SUBJECT_ICONS[subj]}</span>
                <p className="font-black text-base text-white">{subj}</p>
              </div>
              <div>
                <div className="h-[3px] rounded-full overflow-hidden mb-2" style={{ background: "var(--surface2)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: pct + "%", background: color }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono-nums font-black text-base" style={{ color }}>{pct}%</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{done}/{lessons.length}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="h-4" />
      <BottomNav />
    </div>
  );
}
