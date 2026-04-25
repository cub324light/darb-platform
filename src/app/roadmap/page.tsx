"use client";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import { RAKAN_SCHEDULE, ROADMAP_STAGES } from "@/lib/constants";

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

const SUBJECT_TOTALS: Record<SubjectKey, { lessons: number; hours: number; pages: string }> = {
  فيزياء: { lessons: 12, hours: 30, pages: "8-90" },
  رياضيات: { lessons: 12, hours: 42, pages: "92-157" },
  كيمياء: { lessons: 11, hours: 30, pages: "180-263" },
  أحياء: { lessons: 11, hours: 37, pages: "266-353" },
};

export default function RoadmapPage() {
  const [activeSubject, setActiveSubject] = useState<SubjectKey>("فيزياء");
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  const lessons = RAKAN_SCHEDULE[activeSubject];
  const color = SUBJECT_COLORS[activeSubject];
  const totals = SUBJECT_TOTALS[activeSubject];

  const completedCount = lessons.filter((l) =>
    completedLessons.has(`${activeSubject}-${l.lesson}`)
  ).length;
  const overallProgress = Math.round((completedCount / lessons.length) * 100);

  const currentStage = ROADMAP_STAGES.find(
    (s) => overallProgress >= s.range[0] && overallProgress < s.range[1]
  ) ?? ROADMAP_STAGES[ROADMAP_STAGES.length - 1];

  const toggleLesson = (lesson: string) => {
    const key = `${activeSubject}-${lesson}`;
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-dvh bg-[var(--bg)] pb-nav">
      {/* Header */}
      <div className="page-header">
        <h1 className="font-black text-xl text-[var(--text)]">خريطة الطريق</h1>
        <span className="text-sm text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] px-4 py-2 rounded-xl font-semibold">الجدول</span>
      </div>

      {/* Stage card */}
      <div className="px-5 mb-6">
        <div
          className="rounded-3xl p-6"
          style={{
            background: `linear-gradient(135deg, ${color}18, ${color}05)`,
            border: `1.5px solid ${color}33`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentStage.icon}</span>
              <div>
                <p className="font-black text-base text-[var(--text)]">مرحلة {currentStage.name}</p>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">{activeSubject} {SUBJECT_ICONS[activeSubject]}</p>
              </div>
            </div>
            <span className="font-mono-nums text-4xl font-black" style={{ color }}>{overallProgress}%</span>
          </div>
          <div className="h-3 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: overallProgress + "%", background: color }}
            />
          </div>
          <div className="flex justify-between mt-3">
            {ROADMAP_STAGES.map((s) => (
              <div key={s.id} className="flex items-center gap-1">
                <span className="text-sm">{s.icon}</span>
                <span className="text-xs text-[var(--text-muted)] font-medium">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subject tabs — 2×2 grid */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(RAKAN_SCHEDULE) as SubjectKey[]).map((s) => {
            const subLessons = RAKAN_SCHEDULE[s];
            const done = subLessons.filter((l) => completedLessons.has(`${s}-${l.lesson}`)).length;
            const pct = Math.round((done / subLessons.length) * 100);
            const c = SUBJECT_COLORS[s];
            return (
              <button
                key={s}
                onClick={() => setActiveSubject(s)}
                className="rounded-2xl p-4 flex items-center gap-3 transition active:scale-[0.97]"
                style={
                  activeSubject === s
                    ? { background: c + "22", border: `2px solid ${c}66` }
                    : { background: "var(--surface)", border: "1.5px solid var(--border)" }
                }
              >
                <span className="text-2xl">{SUBJECT_ICONS[s]}</span>
                <div className="text-right flex-1">
                  <p className="font-black text-base text-[var(--text)]">{s}</p>
                  <p className="font-mono-nums text-sm font-bold mt-0.5" style={{ color: c }}>{pct}%</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subject stats */}
      <div className="px-5 mb-6">
        <div className="rounded-2xl p-5 grid grid-cols-4 text-center gap-2"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div>
            <p className="font-mono-nums font-black text-xl" style={{ color }}>{totals.lessons}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">درس</p>
          </div>
          <div>
            <p className="font-mono-nums font-black text-xl text-[var(--gold)]">{totals.hours}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">ساعة</p>
          </div>
          <div>
            <p className="font-mono-nums font-black text-xl text-[var(--text-dim)]">{totals.pages}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">صفحة</p>
          </div>
          <div>
            <p className="font-mono-nums font-black text-xl text-[var(--success)]">{completedCount}/{lessons.length}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">منجز</p>
          </div>
        </div>
      </div>

      {/* Lessons list */}
      <div className="px-5 flex flex-col gap-3">
        {lessons.map((lesson, idx) => {
          const key = `${activeSubject}-${lesson.lesson}`;
          const done = completedLessons.has(key);
          const diffColor =
            lesson.difficulty === "سهل" ? "#10B981" : lesson.difficulty === "متوسط" ? "#F59E0B" : "#EF4444";

          return (
            <div
              key={idx}
              className={`rounded-2xl p-5 transition cursor-pointer active:scale-[0.98] ${done ? "opacity-50" : ""}`}
              style={{
                background: "var(--surface)",
                border: done ? `1.5px solid ${color}22` : "1.5px solid var(--border)",
              }}
              onClick={() => toggleLesson(lesson.lesson)}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition"
                  style={
                    done
                      ? { background: color, border: `1px solid ${color}` }
                      : { border: `2px solid var(--border)` }
                  }
                >
                  {done && <span className="text-white text-base font-bold">✓</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-base leading-snug ${done ? "line-through text-[var(--text-muted)]" : "text-[var(--text)]"}`}>
                    {lesson.lesson}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-sm text-[var(--text-muted)]">اليوم {lesson.day}</span>
                    <span className="text-sm text-[var(--text-muted)]">{lesson.hours} ساعة</span>
                    <span className="text-sm text-[var(--text-muted)]">ص {lesson.pages}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-sm font-bold" style={{ color: diffColor }}>{lesson.difficulty}</span>
                  <div className="w-16 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: lesson.progress + "%", background: color }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div className="px-5 py-6">
        <div className="rounded-2xl p-5" style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.15)" }}>
          <p className="text-sm text-[var(--text-dim)] leading-relaxed">
            💡 <strong className="text-[var(--text)]">نصيحة أصحاب الـ 100:</strong> كتاب ناصر عبدالكريم = الأساس.
            اختمه مرتين أو ثلاث. التجميعات بعد الختم، مش بدله.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
