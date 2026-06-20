"use client";
/* ─── دويرب Hub: الوجهة الموحّدة لكل ذكاء في درب ───
   صف تبويبات فوق بخمس قدرات: خطّط / ملف / أسئلة / اشرح / مواضيع.
   كل ذكاء يمرّ من هنا. تُستخدم في الزر العائم وأي اختصار سياقي. */
import { useState, useMemo } from "react";
import DashAI from "@/components/DashAI";
import FileAnalyzer from "@/components/FileAnalyzer";
import QuizGen from "@/components/QuizGen";
import ExplainTool from "@/components/ExplainTool";
import TopicsTool from "@/components/TopicsTool";
import { loadUser } from "@/lib/storage";
import { subjectsForTracks, type TrackId } from "@/lib/tracks";

export type DuirbView = "menu" | "schedule" | "file" | "quiz" | "explain" | "topics";
type DuirbTab = Exclude<DuirbView, "menu">;

const TABS: { id: DuirbTab; icon: string; label: string }[] = [
  { id: "schedule", icon: "📅", label: "خطّط" },
  { id: "file",     icon: "📄", label: "ملف" },
  { id: "quiz",     icon: "❓", label: "أسئلة" },
  { id: "explain",  icon: "💡", label: "اشرح" },
  { id: "topics",   icon: "🗺️", label: "مواضيع" },
];

interface Props {
  /** إذا لم تُمرَّر، تُحمَّل من localStorage */
  subjects?: { name: string; color: string }[];
  defaultView?: DuirbView;
  onOpenScheduler?: (tab: "manual" | "ai", prefill?: string) => void;
}

export default function DuirbHub({ subjects: propSubjects, defaultView = "schedule", onOpenScheduler }: Props) {
  /* «menu» القديم يُترجم لأول تبويب */
  const initial: DuirbTab = defaultView === "menu" ? "schedule" : defaultView;
  const [tab, setTab] = useState<DuirbTab>(initial);

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
      {/* رأس دويرب */}
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

      {/* صف التبويبات — خمس قدرات فوق */}
      <div className="grid grid-cols-5 gap-1 mb-4 p-1 rounded-2xl" style={{ background: "var(--surface2)" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="rounded-xl py-2 flex flex-col items-center justify-center gap-0.5 transition-all"
            style={tab === t.id
              ? { background: accent, color: "#fff", boxShadow: `0 2px 8px color-mix(in srgb, ${accent} 30%, transparent)` }
              : { background: "transparent", color: "var(--text-muted)" }}>
            <span className="text-[16px] leading-none">{t.icon}</span>
            <span className="text-[11px] font-bold">{t.label}</span>
          </button>
        ))}
      </div>

      {/* محتوى التبويب المختار */}
      <div>
        {tab === "schedule" && <DashAI subjects={subjectNames} onOpenScheduler={onOpenScheduler} />}
        {tab === "file"     && <FileAnalyzer subjects={subjectNames} />}
        {tab === "quiz"     && <QuizGen subjects={subjects} />}
        {tab === "explain"  && <ExplainTool subjects={subjectNames} />}
        {tab === "topics"   && <TopicsTool subjects={subjects} />}
      </div>
    </section>
  );
}
