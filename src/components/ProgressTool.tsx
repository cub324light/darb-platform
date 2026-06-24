"use client";
/* ─── دويرب: حلّل تقدّمي 🎯 ───
   يقرأ ملف الطالب (الجاهزية، أقوى/أحوج مادة، الهدف) ويطلب من دويرب
   قراءة موجزة + خطوة عملية واحدة. أبرز قدرة شخصية في درب. */
import { useState } from "react";
import { buildDuwairbProfile } from "@/lib/duwairb";
import { loadPlanningPrefs, currentCalendarSignals } from "@/lib/strategy";
import { recordAIChat } from "@/lib/storage";
import { recordCoachInteraction } from "@/lib/coachMemory";
import DuwairbScoreView from "@/components/DuwairbScoreView";
import { trackEvent } from "@/lib/events";

interface Props {
  subjects: string[];
}

export default function ProgressTool({ subjects }: Props) {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const { profile, goalLine, personalized } = buildDuwairbProfile();
  const readiness = profile.readinessPct;

  const analyze = async () => {
    if (loading) return;
    setLoading(true);
    setErr("");
    setResponse("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "حلّل تقدّمي الحالي وأعطني أهم تركيز وخطوة عملية واحدة لأقترب من هدفي.",
          subjects,
          mode: "progress",
          profile,
          planning: loadPlanningPrefs(),
          calendar: currentCalendarSignals(),
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (data.error && !data.text) { setErr(data.error); return; }
      const text = (data.text ?? "لم يرجع رد، حاول مرة ثانية").trim();
      setResponse(text);
      recordAIChat();
      trackEvent("ai_progress_analyzed", { personalized });
      const { goalLine } = buildDuwairbProfile();
      recordCoachInteraction("progress", text, { subjects, goalLine: goalLine ?? undefined });
    } catch {
      setErr("تعذّر الاتصال — حاول مرة ثانية");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-[13px] mb-3" style={{ color: "var(--text-muted)" }}>
        دويرب يقرأ جاهزيتك وأقوى/أحوج موادك، ويعطيك خطوة عملية واحدة تقرّبك من هدفك.
      </p>

      {/* لمحة الملف — تطمئن الطالب أن التحليل مبني على بياناته */}
      <div className="rounded-2xl px-4 py-3 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
        {goalLine && <span className="text-[13px] font-bold" style={{ color: "var(--accent-light)" }}>🎯 {goalLine}</span>}
        {readiness != null && (
          <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>
            🚀 جاهزيتك {readiness.toLocaleString("ar")}٪
          </span>
        )}
        {profile.weakest && (
          <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>⚠️ ركّز على {profile.weakest}</span>
        )}
        {!goalLine && readiness == null && !profile.weakest && (
          <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            أكمل أهدافك في ملفك لتحصل على تحليل أدق.
          </span>
        )}
      </div>

      <button onClick={analyze} disabled={loading}
        className="w-full rounded-2xl py-3.5 font-black text-[16px] transition active:scale-[0.98]"
        style={{ background: loading ? "var(--surface2)" : "var(--accent)", color: loading ? "var(--text-muted)" : "white", border: "none" }}>
        {loading ? (
          <span className="inline-block w-4 h-4 rounded-full border-2 animate-spin align-middle"
            style={{ borderColor: "white", borderTopColor: "transparent" }} />
        ) : "دويرب: حلّل تقدّمي 🎯"}
      </button>

      {err && <p className="text-[13px] text-center mt-3 font-semibold" style={{ color: "var(--danger)" }}>{err}</p>}

      {response && !loading && (
        <>
          <div className="mt-3 rounded-2xl px-4 py-3.5"
            style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>
            <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{response}</p>
          </div>
          {/* تقييم دويرب + فرص ضائعة */}
          <div className="mt-2">
            <DuwairbScoreView expanded={false} />
          </div>
          {/* الخطوة التالية */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <a href="/orbit"
              className="py-2.5 rounded-2xl text-[13px] font-bold transition active:scale-[0.97] flex items-center justify-center gap-1.5 no-underline"
              style={{ background: "var(--accent)", color: "#fff" }}>
              ⏱️ ابدأ جلسة الآن
            </a>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("darb:openDuirb", { detail: { tab: "schedule" } }))}
              className="py-2.5 rounded-2xl text-[13px] font-bold transition active:scale-[0.97] flex items-center justify-center gap-1.5"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
              📅 خطّط لهذا
            </button>
          </div>
        </>
      )}
    </div>
  );
}
