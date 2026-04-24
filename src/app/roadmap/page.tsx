"use client";
import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { RAKAN_SCHEDULE, ROADMAP_STAGES } from "@/lib/constants";
import type { SubjectId } from "@/lib/types";

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
      <div className="px-5 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text)] transition text-sm">
          ← الرئيسية
        </Link>
        <h1 className="font-black text-[var(--text)]">خريطة الطريق</h1>
        <span className="text-xs text-[var(--text-muted)]">جدول راكان 2026</span>
      </div>

      {/* Overall stage */}
      <div className="px-5 mb-4">
        <div
          className="rounded-2xl p-4"
          style={{
            background: `linear-gradient(135deg, ${color}18, ${color}05)`,
            border: `1px solid ${color}33`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentStage.icon}</span>
              <div>
                <p className="font-black text-sm text-[var(--text)]">مرحلة {currentStage.name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{activeSubject} · {SUBJECT_ICONS[activeSubject]}</p>
              </div>
            </div>
            <span className="font-mono-nums text-2xl font-black" style={{ color }}>{overallProgress}%</span>
          </div>
          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: overallProgress + "%", background: color }}
            />
          </div>
          <div className="flex justify-between mt-1">
            {ROADMAP_STAGES.map((s) => (
              <div key={s.id} className="flex items-center gap-0.5">
                <span className="text-[10px]">{s.icon}</span>
                <span className="text-[9px] text-[var(--text-muted)]">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subject tabs */}
      <div className="px-5 mb-4">
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(RAKAN_SCHEDULE) as SubjectKey[]).map((s) => {
            const subLessons = RAKAN_SCHEDULE[s];
            const done = subLessons.filter((l) => completedLessons.has(`${s}-${l.lesson}`)).length;
            const pct = Math.round((done / subLessons.length) * 100);
            const c = SUBJECT_COLORS[s];
            return (
              <button
                key={s}
                onClick={() => setActiveSubject(s)}
                className={`rounded-2xl p-2 flex flex-col items-center gap-1 transition ${
                  activeSubject === s ? "glow-blue" : "glass"
                }`}
                style={
                  activeSubject === s
                    ? { background: c + "22", border: `1px solid ${c}66` }
                    : {}
                }
              >
                <span className="text-base">{SUBJECT_ICONS[s]}</span>
                <span className="text-[9px] font-bold text-[var(--text)]">{s}</span>
                <span className="font-mono-nums text-[10px]" style={{ color: c }}>{pct}%</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subject info */}
      <div className="px-5 mb-3">
        <div className="glass rounded-2xl p-3 flex justify-between text-center">
          <div>
            <p className="font-mono-nums font-bold text-sm" style={{ color }}>{totals.lessons}</p>
            <p className="text-[9px] text-[var(--text-muted)]">درس</p>
          </div>
          <div>
            <p className="font-mono-nums font-bold text-sm text-[var(--gold)]">{totals.hours}</p>
            <p className="text-[9px] text-[var(--text-muted)]">ساعة</p>
          </div>
          <div>
            <p className="font-mono-nums font-bold text-sm text-[var(--text-dim)]">ص {totals.pages}</p>
            <p className="text-[9px] text-[var(--text-muted)]">كتاب ناصر</p>
          </div>
          <div>
            <p className="font-mono-nums font-bold text-sm text-[var(--success)]">{completedCount}/{lessons.length}</p>
            <p className="text-[9px] text-[var(--text-muted)]">منجز</p>
          </div>
        </div>
      </div>

      {/* Lessons list */}
      <div className="px-5 space-y-2">
        {lessons.map((lesson, idx) => {
          const key = `${activeSubject}-${lesson.lesson}`;
          const done = completedLessons.has(key);
          const diffColor =
            lesson.difficulty === "سهل" ? "#10B981" : lesson.difficulty === "متوسط" ? "#F59E0B" : "#EF4444";

          return (
            <div
              key={idx}
              className={`glass rounded-2xl p-4 transition cursor-pointer active:scale-[0.98] ${
                done ? "opacity-60" : ""
              }`}
              style={done ? { borderColor: color + "22" } : {}}
              onClick={() => toggleLesson(lesson.lesson)}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition"
                  style={
                    done
                      ? { background: color, border: `1px solid ${color}` }
                      : { border: `1.5px solid var(--border)` }
                  }
                >
                  {done && <span className="text-white text-xs">✓</span>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`font-bold text-sm truncate ${done ? "line-through text-[var(--text-muted)]" : "text-[var(--text)]"}`}>
                      {lesson.lesson}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                    <span>اليوم {lesson.day}</span>
                    <span>{lesson.hours} ساعة</span>
                    <span>ص {lesson.pages}</span>
                  </div>
                </div>

                {/* Right info */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] font-bold" style={{ color: diffColor }}>
                    {lesson.difficulty}
                  </span>
                  <div className="w-16 h-1 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: lesson.progress + "%", background: color }}
                    />
                  </div>
                  <span className="text-[9px] text-[var(--text-muted)]">{lesson.progress}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div className="px-5 py-5">
        <div
          className="rounded-2xl p-4 text-center"
          style={{
            background: "rgba(37,99,235,0.08)",
            border: "1px solid rgba(37,99,235,0.15)",
          }}
        >
          <p className="text-xs text-[var(--text-dim)] leading-relaxed">
            💡 <strong className="text-[var(--text)]">نصيحة أصحاب الـ 100:</strong> كتاب ناصر عبدالكريم = الأساس.
            اختمه مرتين أو ثلاث. التجميعات بعد الختم، مش بدله.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
