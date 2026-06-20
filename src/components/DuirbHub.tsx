"use client";
/* ─── دويرب Hub: الوجهة الموحّدة لكل ذكاء في درب ───
   قائمة إطلاق واحدة بخمس قدرات: خطّط / حلّل ملف / أسئلة / اشرح / استخرج مواضيع.
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

const CAPS: { id: Exclude<DuirbView, "menu">; icon: string; label: string; desc: string }[] = [
  { id: "schedule", icon: "📅", label: "خطّط لي",        desc: "جدول يومك أو أسبوعك" },
  { id: "file",     icon: "📄", label: "حلّل ملف",        desc: "PDF أو Word أو صورة" },
  { id: "quiz",     icon: "❓", label: "أسئلة تدريب",     desc: "ولّد أسئلة في مادتك" },
  { id: "explain",  icon: "💡", label: "اشرح لي",         desc: "خطأ أو مفهوم محيّرك" },
  { id: "topics",   icon: "🗺️", label: "استخرج مواضيع",   desc: "من صورة فهرس أو ملف" },
];

interface Props {
  /** إذا لم تُمرَّر، تُحمَّل من localStorage */
  subjects?: { name: string; color: string }[];
  defaultView?: DuirbView;
  onOpenScheduler?: (tab: "manual" | "ai", prefill?: string) => void;
}

export default function DuirbHub({ subjects: propSubjects, defaultView = "menu", onOpenScheduler }: Props) {
  const [view, setView] = useState<DuirbView>(defaultView);

  const subjects = useMemo(() => {
    if (propSubjects) return propSubjects;
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    return subjectsForTracks(ids.length ? ids : (["تحصيلي"] as TrackId[]));
  }, [propSubjects]);

  const subjectNames = subjects.map((s) => s.name);
  const active = CAPS.find((c) => c.id === view);

  return (
    <section className="card">
      {/* رأس دويرب */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[20px] flex-shrink-0"
          style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)" }}>
          🤖
        </div>
        <div className="flex-1 min-w-0">
          <p className="title-md leading-tight" style={{ color: "var(--text)" }}>دويرب</p>
          <p className="text-[12px] font-bold" style={{ color: "var(--accent-light)" }}>
            {view === "menu" ? "مساعدك الذكي — كل ذكاء في مكان واحد" : active?.label}
          </p>
        </div>
        {view !== "menu" && (
          <button onClick={() => setView("menu")}
            className="px-3 py-2 rounded-xl text-[13px] font-bold transition active:scale-95 flex-shrink-0"
            style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            ← كل الأدوات
          </button>
        )}
      </div>

      {/* قائمة الإطلاق */}
      {view === "menu" && (
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-bold mb-1" style={{ color: "var(--text)" }}>كيف أساعدك اليوم؟</p>
          {CAPS.map((c) => (
            <button key={c.id} onClick={() => setView(c.id)}
              className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-right transition active:scale-[0.98]"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[22px] flex-shrink-0"
                style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}>{c.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-extrabold text-[16px]" style={{ color: "var(--text)" }}>{c.label}</span>
                <span className="block text-[12.5px]" style={{ color: "var(--text-muted)" }}>{c.desc}</span>
              </span>
              <span className="text-[18px] font-black flex-shrink-0" style={{ color: "var(--accent-light)" }}>←</span>
            </button>
          ))}
        </div>
      )}

      {/* القدرة المختارة */}
      {view === "schedule" && <DashAI subjects={subjectNames} onOpenScheduler={onOpenScheduler} />}
      {view === "file"     && <FileAnalyzer subjects={subjectNames} />}
      {view === "quiz"     && <QuizGen subjects={subjects} />}
      {view === "explain"  && <ExplainTool subjects={subjectNames} />}
      {view === "topics"   && <TopicsTool subjects={subjects} />}
    </section>
  );
}
