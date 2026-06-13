"use client";
import { useState } from "react";

const QUICK_PROMPTS = [
  "ابني جدول اليوم",
  "وش أذاكر أول؟",
  "نصيحة تركيز سريعة",
  "حفّزني للمذاكرة",
];

interface Props {
  subjects: string[];
}

export default function DashAI({ subjects }: Props) {
  const [input, setInput]       = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading]   = useState(false);

  const send = async (prompt: string) => {
    const p = prompt.trim();
    if (!p) return;
    setLoading(true);
    setResponse("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p, subjects, mode: "study" }),
      });
      const data = await res.json() as { text?: string; error?: string };
      setResponse(data.text ?? data.error ?? "حدث خطأ، حاول مرة ثانية");
    } catch {
      setResponse("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = (p: string) => {
    setInput(p);
    send(p);
  };

  return (
    <section className="card rise rise-6">
      <p className="title-md mb-3" style={{ color: "var(--text)" }}>دربي الذكي</p>

      {/* أزرار سريعة */}
      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_PROMPTS.map((p) => (
          <button key={p} onClick={() => handleQuick(p)}
            className="px-3 py-1.5 rounded-xl text-[13px] font-bold transition active:scale-[0.97]"
            style={{
              background: "color-mix(in srgb, var(--accent) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
              color: "var(--accent-light)",
            }}>
            {p}
          </button>
        ))}
      </div>

      {/* حقل الإدخال */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !loading) send(input); }}
          placeholder="اسألني أي شيء..."
          className="flex-1 rounded-2xl px-4 py-3 text-[15px] outline-none"
          style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="rounded-2xl px-4 font-bold text-[17px] min-w-[48px] transition"
          style={{
            background: loading || !input.trim() ? "var(--surface2)" : "var(--accent)",
            color: loading || !input.trim() ? "var(--text-muted)" : "white",
            border: "none",
          }}>
          {loading ? (
            <span className="inline-block w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          ) : "←"}
        </button>
      </div>

      {/* رد الذكاء */}
      {response && !loading && (
        <div className="mt-3 rounded-2xl px-4 py-3.5"
          style={{
            background: "color-mix(in srgb, var(--accent) 6%, var(--surface2))",
            border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)",
          }}>
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>
            {response}
          </p>
        </div>
      )}
    </section>
  );
}
