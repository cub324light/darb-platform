"use client";
/* ─── دويرب Hub: بطاقة موحّدة بثلاثة أوضاع ───
   schedule (جدول ذكي) / file (تحليل ملف) / quiz (أسئلة تدريبية)
   الواجهة الوحيدة لدويرب — تُستخدم في الداشبورد والزر العائم وأي مكان آخر. */
import { useState, useMemo } from "react";
import DashAI from "@/components/DashAI";
import FileAnalyzer from "@/components/FileAnalyzer";
import QuizGen from "@/components/QuizGen";
import { loadUser } from "@/lib/storage";
import { subjectsForTracks, type TrackId } from "@/lib/tracks";

type DuirbTab = "schedule" | "file" | "quiz";

const TABS: { id: DuirbTab; icon: string; label: string }[] = [
  { id: "schedule", icon: "📅", label: "خطة ذكية" },
  { id: "file",     icon: "📄", label: "تحليل ملف" },
  { id: "quiz",     icon: "❓", label: "أسئلة" },
];

interface Props {
  /** إذا لم تُمرَّر، يُحمَّل من localStorage */
  subjects?: { name: string; color: string }[];
  defaultTab?: DuirbTab;
  onOpenScheduler?: (tab: "manual" | "ai", prefill?: string) => void;
}

export default function DuirbHub({ subjects: propSubjects, defaultTab = "schedule", onOpenScheduler }: Props) {
  const [tab, setTab] = useState<DuirbTab>(defaultTab);

  const subjects = useMemo(() => {
    if (propSubjects) return propSubjects;
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    return subjectsForTracks(ids.length ? ids : (["تحصيلي"] as TrackId[]));
  }, [propSubjects]);

  const subjectNames = subjects.map((s) => s.name);
  const accent = "var(--accent)";

  return (
    <section className="card">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[18px] flex-shrink-0"
          style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)" }}>
          🤖
        </div>
        <p className="title-md" style={{ color: "var(--text)" }}>دويرب</p>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full mr-auto"
          style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>
          مساعدك الذكي
        </span>
      </div>

      {/* Tab Switcher */}
      <div className="grid grid-cols-3 gap-1.5 mb-4 p-1 rounded-2xl" style={{ background: "var(--surface2)" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="rounded-xl py-2 text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all"
            style={tab === t.id
              ? { background: accent, color: "#fff", boxShadow: `0 2px 8px color-mix(in srgb, ${accent} 30%, transparent)` }
              : { background: "transparent", color: "var(--text-muted)" }}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {tab === "schedule" && (
          <DashAI subjects={subjectNames} onOpenScheduler={onOpenScheduler} />
        )}
        {tab === "file" && (
          <FileAnalyzer subjects={subjectNames} />
        )}
        {tab === "quiz" && (
          <QuizGen subjects={subjects} />
        )}
      </div>
    </section>
  );
}
