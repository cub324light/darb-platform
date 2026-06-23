"use client";
/* ─── دويرب: اشرح لي ───
   يلصق الطالب سؤالاً غلطه أو مفهوماً محيّراً، ودويرب يشرح المفهوم الصحيح
   وأين يقع الخطأ الشائع ونصيحة لتفاديه (mode:"explain"). */
import { useState } from "react";
import { buildDuwairbProfile } from "@/lib/duwairb";
import { trackEvent } from "@/lib/events";

interface Props {
  subjects: string[];
}

export default function ExplainTool({ subjects }: Props) {
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    const p = input.trim();
    if (!p || loading) return;
    setLoading(true);
    setErr("");
    setResponse("");
    try {
      const { profile, personalized } = buildDuwairbProfile();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: subject ? `المادة: ${subject}\nالسؤال أو الخطأ: ${p}` : p,
          subjects: subject ? [subject] : subjects,
          mode: "explain",
          profile,
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (data.error && !data.text) { setErr(data.error); return; }
      setResponse((data.text ?? "لم يرجع رد، حاول مرة ثانية").trim());
      trackEvent("ai_explain_requested", { personalized });
    } catch {
      setErr("تعذّر الاتصال — حاول مرة ثانية");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-[13px] mb-3" style={{ color: "var(--text-muted)" }}>
        الصق سؤالاً غلطته أو مفهوماً يحيّرك، ودويرب يشرح لك المفهوم الصحيح وأين يقع الخطأ.
      </p>

      {subjects.length > 0 && (
        <select value={subject} onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-2xl px-4 py-3 text-[15px] outline-none min-h-[48px] mb-2"
          style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
          {subjects.map((s) => <option key={s}>{s}</option>)}
        </select>
      )}

      <textarea value={input} onChange={(e) => setInput(e.target.value)}
        placeholder="مثال: ليش جواب هذا السؤال خطأ؟ أو اشرح لي مفهوم..."
        rows={4}
        className="w-full rounded-2xl px-4 py-3.5 text-base outline-none resize-y"
        style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />

      <button onClick={send} disabled={loading || !input.trim()}
        className="w-full mt-2 rounded-2xl py-3.5 font-black text-[16px] transition active:scale-[0.98]"
        style={{
          background: loading || !input.trim() ? "var(--surface2)" : "var(--accent)",
          color: loading || !input.trim() ? "var(--text-muted)" : "white",
          border: "none",
        }}>
        {loading ? (
          <span className="inline-block w-4 h-4 rounded-full border-2 animate-spin align-middle"
            style={{ borderColor: "white", borderTopColor: "transparent" }} />
        ) : "دويرب: اشرح لي 💡"}
      </button>

      {err && (
        <p className="text-[13px] text-center mt-3 font-semibold" style={{ color: "var(--danger)" }}>{err}</p>
      )}

      {response && !loading && (
        <>
          <div className="mt-3 rounded-2xl px-4 py-3.5"
            style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>
            <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{response}</p>
          </div>
          {/* الخطوة التالية: ثبّت الفهم بأسئلة على نفس المادة */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("darb:openDuirb", { detail: { tab: "quiz" } }))}
            className="w-full mt-2 py-2.5 rounded-2xl text-[13px] font-bold transition active:scale-[0.98] flex items-center justify-center gap-1.5"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
            ❓ ثبّت فهمك — ولّد أسئلة على {subject || "هذه المادة"}
          </button>
        </>
      )}
    </div>
  );
}
