"use client";
import { useState } from "react";
import { loadEvents, saveEvents, loadUser, loadExamCoord, examCoordPrompt, recordPlanCreated, recordAIChat, type ScheduleEvent } from "@/lib/storage";
import { getEventsForDate } from "@/components/DayScheduler";
import { normalizeDigits, fmtHour } from "@/lib/utils";
import { buildDuwairbProfile } from "@/lib/duwairb";
import { trackEvent } from "@/lib/events";

const QUICK_PROMPTS = [
  { label: "عطني جدول جاهز", text: "عطني جدول دراسي جاهز لليوم" },
  { label: "مشغول الصباح (٦-١٢)", text: "من 6 ص الى 12 م مشغول، اعمل لي جدول للأوقات الفارغة" },
  { label: "مشغول الليل", text: "من 9 م الى 12 ص مشغول، اعمل لي جدول للأوقات الفارغة" },
  { label: "جدول بدون مدرسة", text: "من 7 ص الى 2 م مشغول بالمدرسة، اعمل لي جدول بعدها" },
];

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
      /* مرّر الأوقات المحجوزة مسبقاً (من خطط سابقة) ليتفادى الذكاء التعارض */
      const busy = getEventsForDate(today, loadEvents());
      const busyNote = busy.length > 0
        ? ` الأوقات المحجوزة اليوم (تجنّبها تماماً ولا تضع فيها شيئاً): ${busy.map((e) => `${fmtHour(e.fromHour)}–${fmtHour(e.toHour)}`).join("، ")}.`
        : "";
      /* تنسيق الاختبارات المتعددة (قدرات + تحصيلي ...) */
      const u = loadUser();
      const activeTracks = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as string[];
      const coordNote = examCoordPrompt(loadExamCoord(), activeTracks);
      const { profile, personalized } = buildDuwairbProfile();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p + busyNote + coordNote, subjects, mode: "schedule", profile }),
      });
      const data = await res.json() as { text?: string; error?: string };
      const raw = (data.text ?? data.error ?? "حدث خطأ").trim();
      setResponse(raw);
      if (!data.error) { recordAIChat(); trackEvent("ai_plan_generated", { personalized }); }
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
    /* لا نضيف حدثاً يتعارض مع حدث موجود اليوم (يمنع تداخل خطة القدرات مع التحصيلي) */
    const todayBusy = getEventsForDate(today, existing);
    const nonConflicting = parsed.filter(
      (e) => !todayBusy.some((b) => e.fromHour < b.toHour && b.fromHour < e.toHour)
    );
    if (nonConflicting.length === 0) { setApplied(true); setParsedCount(0); return; }
    saveEvents([...existing, ...nonConflicting]);
    recordPlanCreated();
    setParsedCount(nonConflicting.length);
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
      <p className="title-md mb-3" style={{ color: "var(--text)" }}>دويرب — مساعدك الذكي</p>

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
            parsedCount > 0 ? (
              <div className="rounded-2xl p-4 flex flex-col gap-2.5 mt-2"
                style={{
                  background: "color-mix(in srgb, var(--success) 8%, var(--surface2))",
                  border: "1px solid color-mix(in srgb, var(--success) 25%, transparent)",
                }}>
                <p className="text-center text-[14px] font-black" style={{ color: "var(--success)" }}>
                  ✅ تم إنشاء الخطة — {parsedCount} جلسة أُضيفت
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("darb:openCalendar"))}
                    className="py-2.5 rounded-2xl text-[13px] font-bold transition active:scale-[0.97] flex items-center justify-center gap-1.5"
                    style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
                    🗓️ أضف للتقويم
                  </button>
                  <a href="/orbit"
                    className="py-2.5 rounded-2xl text-[13px] font-bold transition active:scale-[0.97] flex items-center justify-center gap-1.5 no-underline"
                    style={{ background: "var(--accent)", color: "#fff" }}>
                    ⏱️ ابدأ جلسة
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-center text-[14px] font-bold py-1.5" style={{ color: "var(--text-muted)" }}>
                كل الأوقات المقترحة متعارضة مع جدولك الحالي
              </p>
            )
          )}
        </div>
      )}
    </section>
  );
}
