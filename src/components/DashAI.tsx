"use client";
import { useState } from "react";
import { loadEvents, saveEvents, type ScheduleEvent } from "@/lib/storage";

const QUICK_PROMPTS = [
  { label: "عطني جدول جاهز", text: "عطني جدول دراسي جاهز لليوم" },
  { label: "مشغول الصباح (٦-١٢)", text: "من 6 ص الى 12 م مشغول، اعمل لي جدول للأوقات الفارغة" },
  { label: "مشغول الليل", text: "من 9 م الى 12 ص مشغول، اعمل لي جدول للأوقات الفارغة" },
  { label: "جدول بدون مدرسة", text: "من 7 ص الى 2 م مشغول بالمدرسة، اعمل لي جدول بعدها" },
];

function normalizeDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

function parseHourArabic(num: string, mins: string, period: string): number {
  const n = parseInt(num);
  if (isNaN(n)) return -1;
  const m = parseInt(mins || "0");
  const p = period.trim();
  let h = n;
  if (p === "م" || p === "مساء") h = n === 12 ? 12 : n + 12;
  else if (p === "ص" || p === "صباح") h = n === 12 ? 0 : n;
  return h + (m >= 30 ? 1 : 0);
}

function parseSchedule(text: string, date: string, subjects: { name: string }[]): ScheduleEvent[] {
  const result: ScheduleEvent[] = [];
  const subjectNames = subjects.map((s) => s.name);
  const normalized = normalizeDigits(text);
  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/من\s+(?:الساعة\s+)?(\d+)(?::(\d+))?\s*([صمظ]?)\s*(?:إلى|الى)\s*(?:الساعة\s+)?(\d+)(?::(\d+))?\s*([صمظ]?)\s*[—–\-:]\s*(.+)/);
    if (!m) continue;
    const fromH = parseHourArabic(m[1], m[2] ?? "", m[3]);
    const toH   = parseHourArabic(m[4], m[5] ?? "", m[6]);
    const label = m[7].trim();
    if (fromH < 0 || toH < 0 || fromH >= toH || fromH < 5 || toH > 24) continue;
    const overlaps = result.some((e) => fromH < e.toHour && e.fromHour < toH);
    if (overlaps) continue;
    const matchedSubject = subjectNames.find((n) => label.includes(n));
    result.push({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      type: matchedSubject ? "study" : "busy",
      ...(matchedSubject ? { subject: matchedSubject } : { label }),
      fromHour: fromH, toHour: toH,
      recurrence: { kind: "once", date },
    });
  }
  return result;
}

interface Props {
  subjects: string[];
  onOpenScheduler?: (tab: "manual" | "ai", prefill?: string) => void;
}

export default function DashAI({ subjects, onOpenScheduler }: Props) {
  const [input, setInput]         = useState("");
  const [response, setResponse]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [applied, setApplied]     = useState(false);
  const [parsedCount, setParsedCount] = useState(0);

  const today = new Date().toISOString().slice(0, 10);

  const send = async (prompt: string) => {
    const p = prompt.trim();
    if (!p) return;
    setLoading(true);
    setResponse("");
    setApplied(false);
    setParsedCount(0);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p, subjects, mode: "schedule" }),
      });
      const data = await res.json() as { text?: string; error?: string };
      const raw = (data.text ?? data.error ?? "حدث خطأ").trim();
      setResponse(raw);
      const parsed = parseSchedule(raw, today, subjects.map((s) => ({ name: s })));
      setParsedCount(parsed.length);
    } catch {
      setResponse("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const applySchedule = () => {
    const parsed = parseSchedule(response, today, subjects.map((s) => ({ name: s })));
    if (parsed.length === 0) return;
    const existing = loadEvents();
    saveEvents([...existing, ...parsed]);
    setApplied(true);
  };

  const handleQuick = (prompt: { label: string; text: string }) => {
    if (onOpenScheduler) {
      onOpenScheduler("ai", prompt.text);
    } else {
      setInput(prompt.text);
      send(prompt.text);
    }
  };

  return (
    <section className="card rise rise-6">
      <p className="title-md mb-3" style={{ color: "var(--text)" }}>دربي الذكي</p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {QUICK_PROMPTS.map((p) => (
          <button key={p.label} onClick={() => handleQuick(p)}
            className="px-3 py-2.5 rounded-xl text-[13px] font-bold text-right transition active:scale-[0.97] leading-snug"
            style={{
              background: "color-mix(in srgb, var(--accent) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
              color: "var(--accent-light)",
            }}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !loading) send(input); }}
          placeholder="اوصف يومك..."
          className="flex-1 rounded-2xl px-4 py-3 text-[15px] outline-none"
          style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
        <button onClick={() => send(input)} disabled={loading || !input.trim()}
          className="rounded-2xl px-4 font-bold text-[17px] min-w-[48px] transition"
          style={{
            background: loading || !input.trim() ? "var(--surface2)" : "var(--accent)",
            color: loading || !input.trim() ? "var(--text-muted)" : "white",
            border: "none",
          }}>
          {loading ? <span className="inline-block w-4 h-4 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} /> : "←"}
        </button>
      </div>

      {response && !loading && (
        <div className="mt-3">
          <div className="rounded-2xl px-4 py-3.5 mb-2"
            style={{
              background: "color-mix(in srgb, var(--accent) 6%, var(--surface2))",
              border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)",
            }}>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{response}</p>
          </div>
          {parsedCount > 0 && !applied && (
            <button onClick={applySchedule}
              className="w-full py-2.5 rounded-2xl font-bold text-[15px] transition"
              style={{ background: "var(--accent)", color: "white", border: "none" }}>
              أضف للجدول ← ({parsedCount} حدث)
            </button>
          )}
          {applied && (
            <p className="text-center text-[14px] font-bold py-1.5" style={{ color: "var(--success)" }}>
              ✓ أُضيف {parsedCount} حدث لجدولك اليوم
            </p>
          )}
        </div>
      )}
    </section>
  );
}
