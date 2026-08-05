"use client";
/* ─── دويرب Hub: الوجهة الموحّدة لكل ذكاء في درب ───
   صف تبويبات فوق بخمس قدرات: خطّط / ملف / أسئلة / اشرح / مواضيع.
   كل ذكاء يمرّ من هنا. تُستخدم في الزر العائم وأي اختصار سياقي. */
import { useState, useMemo } from "react";
import DashAI from "@/components/DashAI";
import FileAnalyzer from "@/components/FileAnalyzer";
import QuizGen from "@/components/QuizGen";
import ExplainTool from "@/components/ExplainTool";
import ProgressTool from "@/components/ProgressTool";
import TopicsTool from "@/components/TopicsTool";
import { activeTrackIds } from "@/lib/storage";
import { subjectsForTracks, type TrackId } from "@/lib/tracks";
import { currentPhase } from "@/lib/transition";
import { buildDuwairbProfile } from "@/lib/duwairb";
import { loadCoachMemory, formatMemoryHint } from "@/lib/coachMemory";
import { trackEvent } from "@/lib/analytics";

export type DuirbView = "menu" | "schedule" | "progress" | "file" | "quiz" | "explain" | "topics";
type DuirbTab = Exclude<DuirbView, "menu">;

const TABS: { id: DuirbTab; icon: string; label: string }[] = [
  { id: "schedule", icon: "📅", label: "خطّط" },
  { id: "progress", icon: "🎯", label: "تقدّمي" },
  { id: "quiz",     icon: "❓", label: "أسئلة" },
  { id: "explain",  icon: "📚", label: "اشرح" },
  { id: "file",     icon: "📄", label: "ملف" },
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
    return subjectsForTracks(activeTrackIds() as TrackId[]);
  }, [propSubjects]);

  const subjectNames = subjects.map((s) => s.name);
  const accent = "var(--accent)";

  /* جملة هدف الطالب — تجعل التخصيص مرئياً في رأس الهَب */
  const goalLine = useMemo(() => buildDuwairbProfile().goalLine, []);

  /* اقتراح دويرب الافتتاحي المختلف لكل مرحلة (من مصدر الحقيقة phaseExperience):
     أول ثانوي «ابدأ بالقدرات» · ثالث «نحسب موزونتك» · جامعي «جهّز سيرتك». */
  const phaseHint = useMemo(() => currentPhase().duwairbHint, []);

  /* تذكير الذاكرة القصيرة */
  const memoryHint = useMemo(() => {
    const m = loadCoachMemory();
    const hint = formatMemoryHint(m);
    if (hint) trackEvent("coach_memory_shown");
    return hint;
  }, []);

  return (
    <section className="card">
      {/* رأس دويرب */}
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[20px] flex-shrink-0"
          style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)" }}>
          🤖
        </div>
        <p className="title-md" style={{ color: "var(--text)" }}>دويرب</p>
        <span className="text-[12px] font-bold px-2 py-0.5 rounded-full mr-auto"
          style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>
          مساعدك الذكي
        </span>
      </div>
      {/* اقتراح افتتاحي سياقي حسب المرحلة — دائم الظهور (يجعل دويرب يعرف الطالب) */}
      <p className="text-[14px] font-bold mr-10" style={{ color: "var(--accent-light)" }}>🧭 {phaseHint}</p>
      {goalLine && (
        <p className="text-[14px] font-bold mr-10 mt-1" style={{ color: "var(--accent-light)" }}>🎯 {goalLine} — دويرب يخصّص لك كل شيء حسب هدفك</p>
      )}
      {memoryHint && (
        <p className="text-[14px] font-semibold mr-10 mt-1" style={{ color: "var(--text-muted)" }}>💬 {memoryHint}</p>
      )}
      <div className="mb-3" />

      {/* صف التبويبات — ست قدرات في صفّين */}
      <div className="grid grid-cols-3 gap-1.5 mb-4 p-1.5 rounded-2xl" style={{ background: "var(--surface2)" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} aria-pressed={tab === t.id}
            className="rounded-xl py-2.5 flex flex-col items-center justify-center gap-0.5 transition-all"
            style={tab === t.id
              ? { background: accent, color: "#fff", boxShadow: `0 2px 8px color-mix(in srgb, ${accent} 30%, transparent)` }
              : { background: "transparent", color: "var(--text-muted)" }}>
            <span className="text-[20px] leading-none" aria-hidden="true">{t.icon}</span>
            <span className="text-[13px] font-bold">{t.label}</span>
          </button>
        ))}
      </div>

      {/* محتوى التبويب المختار */}
      <div>
        {tab === "schedule" && <DashAI subjects={subjectNames} onOpenScheduler={onOpenScheduler} />}
        {tab === "progress" && <ProgressTool subjects={subjectNames} />}
        {tab === "file"     && <FileAnalyzer subjects={subjectNames} />}
        {tab === "quiz"     && <QuizGen subjects={subjects} />}
        {tab === "explain"  && <ExplainTool subjects={subjectNames} />}
        {tab === "topics"   && <TopicsTool subjects={subjects} />}
      </div>
    </section>
  );
}
