"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ScheduleEvent } from "@/lib/storage";

export type { ScheduleEvent };


// Re-export getEventsForDate for convenience
export function getEventsForDate(date: string, events: ScheduleEvent[]): ScheduleEvent[] {
  const d = new Date(date + "T12:00:00");
  const dow = d.getDay();

  return events
    .filter((ev) => {
      const r = ev.recurrence;
      if (r.kind === "once") return r.date === date;
      if (r.kind === "weekly") return r.dayOfWeek === dow;
      if (r.kind === "daily") return r.fromDate <= date;
      if (r.kind === "multiweekly") return r.days.includes(dow);
      return false;
    })
    .sort((a, b) => a.fromHour - b.fromHour);
}

// Arabic hour format: 5 ص, 12 م, 3 م
function fmtHour(h: number): string {
  if (h === 0) return "12 ص";
  if (h < 12) return `${h} ص`;
  if (h === 12) return "12 م";
  if (h === 24) return "12 ص"; // midnight as end
  return `${h - 12} م`;
}

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 5..23
const END_HOURS = Array.from({ length: 19 }, (_, i) => i + 6); // 6..24

const WEEK_DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

interface Props {
  date: string;
  events: ScheduleEvent[];
  subjects: { name: string; color: string }[];
  examDate: string | null;
  onExamDateChange: (d: string | null) => void;
  onEventsChange: (events: ScheduleEvent[]) => void;
  onClose: () => void;
}

export default function DayScheduler({
  date,
  events,
  subjects,
  examDate,
  onExamDateChange,
  onEventsChange,
  onClose,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"manual" | "ai">("manual");

  // Manual tab state
  const [addMode, setAddMode] = useState<"study" | "busy" | null>(null);
  const [addSubject, setAddSubject] = useState(subjects[0]?.name ?? "");
  const [addLabel, setAddLabel] = useState("");
  const [addFrom, setAddFrom] = useState(8);
  const [addTo, setAddTo] = useState(10);
  const [recurrence, setRecurrence] = useState<"once" | "weekly" | "multi">("once");
  const [multiDays, setMultiDays] = useState<number[]>([]);

  // AI tab state
  const [busyText, setBusyText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");

  useEffect(() => { setMounted(true); }, []);

  const dayEvents = getEventsForDate(date, events);

  const dateObj = new Date(date + "T12:00:00");
  const dow = dateObj.getDay();
  const dayName = WEEK_DAY_NAMES[dow];
  const arabicDate = dateObj.toLocaleDateString("ar-SA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const deleteEvent = (id: string) => {
    onEventsChange(events.filter((e) => e.id !== id));
  };

  const buildRecurrence = (): ScheduleEvent["recurrence"] => {
    if (recurrence === "once") return { kind: "once", date };
    if (recurrence === "weekly") return { kind: "weekly", dayOfWeek: dow };
    return { kind: "multiweekly", days: multiDays.length > 0 ? multiDays : [dow] };
  };

  const addEvent = () => {
    if (addMode === "study" && !addSubject) return;
    if (addMode === "busy" && !addLabel.trim()) return;
    if (addFrom >= addTo) return;

    const ev: ScheduleEvent = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      type: addMode as "study" | "busy",
      ...(addMode === "study" ? { subject: addSubject } : { label: addLabel.trim() }),
      fromHour: addFrom,
      toHour: addTo,
      recurrence: buildRecurrence(),
    };

    onEventsChange([...events, ev]);
    setAddMode(null);
    setAddLabel("");
    setAddFrom(8);
    setAddTo(10);
    setRecurrence("once");
    setMultiDays([]);
  };

  const runAI = async () => {
    setAiLoading(true);
    setAiResult("");
    try {
      const subjectsList = subjects.map((s) => s.name).join("، ");
      const examContext = examDate
        ? `\nيوم الاختبار: ${new Date(examDate + "T12:00:00").toLocaleDateString("ar-SA", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`
        : "";
      const prompt = `أنت مساعد جدول دراسي. اليوم: ${arabicDate}.${examContext}
المواد التي يدرسها الطالب: ${subjectsList}.
مشاغيل الطالب اليوم: ${busyText}

بناء على المشاغيل المذكورة، اقترح جدولاً دراسياً مفصلاً لهذا اليوم يوزع المواد في الأوقات الفارغة.
اذكر كل فترة بصيغة: من الساعة X إلى X — [اسم المادة أو النشاط]
كن واضحاً ومحدداً. استخدم العربية فقط.`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setAiResult(data.text ?? data.error ?? "حدث خطأ في الاستجابة");
    } catch {
      setAiResult("حدث خطأ، تحقق من الاتصال وحاول مجدداً.");
    } finally {
      setAiLoading(false);
    }
  };

  const toggleMultiDay = (d: number) => {
    setMultiDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  if (!mounted) return null;

  const modal = createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/55" />

      {/* panel */}
      <div
        className="relative w-full rounded-t-3xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* drag handle + close */}
        <div className="sticky top-0 z-10 pt-4 pb-3 px-5"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <div className="w-10 h-1.5 rounded-full bg-[var(--border)] mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <p className="font-black text-[15px]" style={{ color: "var(--text)" }}>{arabicDate}</p>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: "var(--surface2)", color: "var(--text-muted)" }}
            >✕</button>
          </div>

          {/* tabs */}
          <div className="flex gap-1 mt-3 p-1 rounded-2xl" style={{ background: "var(--surface2)" }}>
            {(["manual", "ai"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-xl text-[13px] font-bold transition"
                style={
                  tab === t
                    ? { background: "var(--accent)", color: "white" }
                    : { color: "var(--text-muted)" }
                }
              >
                {t === "manual" ? "يدوي" : "خطة ذكية"}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 pb-10">
          {/* ══════ MANUAL TAB ══════ */}
          {tab === "manual" && (
            <div>
              {/* existing events */}
              {dayEvents.length === 0 && (
                <p className="text-[13px] mb-4 text-center" style={{ color: "var(--text-muted)" }}>
                  لا توجد أحداث لهذا اليوم
                </p>
              )}
              {dayEvents.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)", minHeight: "48px" }}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: ev.type === "study" ? "var(--accent-light)" : "var(--danger)" }}
                      />
                      <span className="font-bold text-[14px] flex-1" style={{ color: "var(--text)" }}>
                        {ev.type === "study" ? (ev.subject ?? "") : (ev.label ?? "")}
                      </span>
                      <span className="text-[12px] font-semibold" style={{ color: "var(--text-muted)" }}>
                        {fmtHour(ev.fromHour)} → {fmtHour(ev.toHour)}
                      </span>
                      <button
                        onClick={() => deleteEvent(ev.id)}
                        className="text-[var(--text-muted)] text-base px-1 min-h-[44px]"
                        aria-label="حذف"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* add mode toggle buttons */}
              {addMode === null && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => { setAddMode("study"); setAddSubject(subjects[0]?.name ?? ""); }}
                    className="flex-1 py-3 rounded-2xl font-bold text-[13px] min-h-[44px]"
                    style={{
                      background: "transparent",
                      border: "1.5px solid var(--accent)",
                      color: "var(--accent-light)",
                    }}
                  >
                    + إضافة دراسة
                  </button>
                  <button
                    onClick={() => { setAddMode("busy"); setAddLabel(""); }}
                    className="flex-1 py-3 rounded-2xl font-bold text-[13px] min-h-[44px]"
                    style={{
                      background: "transparent",
                      border: "1.5px solid var(--danger)",
                      color: "var(--danger)",
                    }}
                  >
                    + إضافة مشغول
                  </button>
                </div>
              )}

              {/* add form */}
              {addMode !== null && (
                <div
                  className="rounded-2xl p-4 mb-4"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-black text-[14px]" style={{ color: "var(--text)" }}>
                      {addMode === "study" ? "إضافة دراسة" : "إضافة مشغول"}
                    </p>
                    <button
                      onClick={() => setAddMode(null)}
                      className="text-[var(--text-muted)] text-base px-1 min-h-[44px]"
                    >✕</button>
                  </div>

                  {addMode === "study" && (
                    <div className="mb-3">
                      <label className="text-[12px] font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>المادة</label>
                      <select
                        value={addSubject}
                        onChange={(e) => setAddSubject(e.target.value)}
                        className="w-full rounded-xl px-3 py-3 text-[14px] outline-none min-h-[44px]"
                        style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}
                      >
                        {subjects.map((s) => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {addMode === "busy" && (
                    <div className="mb-3">
                      <label className="text-[12px] font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>التسمية</label>
                      <input
                        value={addLabel}
                        onChange={(e) => setAddLabel(e.target.value)}
                        placeholder="مثال: مدرسة، رياضة، عمل..."
                        className="w-full rounded-xl px-3 py-3 text-[14px] outline-none min-h-[44px]"
                        style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}
                      />
                    </div>
                  )}

                  {/* from/to pickers */}
                  <div className="flex gap-3 mb-3">
                    <div className="flex-1">
                      <label className="text-[12px] font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>من</label>
                      <select
                        value={addFrom}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setAddFrom(v);
                          if (addTo <= v) setAddTo(v + 1);
                        }}
                        className="w-full rounded-xl px-3 py-3 text-[14px] outline-none min-h-[44px]"
                        style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>{fmtHour(h)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[12px] font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>إلى</label>
                      <select
                        value={addTo}
                        onChange={(e) => setAddTo(Number(e.target.value))}
                        className="w-full rounded-xl px-3 py-3 text-[14px] outline-none min-h-[44px]"
                        style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}
                      >
                        {END_HOURS.filter((h) => h > addFrom).map((h) => (
                          <option key={h} value={h}>{fmtHour(h)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* recurrence */}
                  <div className="mb-4">
                    <label className="text-[12px] font-bold mb-2 block" style={{ color: "var(--text-muted)" }}>التكرار</label>
                    <div className="flex flex-wrap gap-2">
                      {(["once", "weekly", "multi"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setRecurrence(r)}
                          className="px-3 py-2 rounded-xl text-[12px] font-bold min-h-[44px] transition"
                          style={
                            recurrence === r
                              ? { background: "var(--accent)", color: "white", border: "1.5px solid var(--accent)" }
                              : { background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }
                          }
                        >
                          {r === "once" && "هذا اليوم فقط"}
                          {r === "weekly" && `كل ${dayName} أسبوعياً`}
                          {r === "multi" && "أيام محددة"}
                        </button>
                      ))}
                    </div>

                    {recurrence === "multi" && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {WEEK_DAY_NAMES.map((name, idx) => (
                          <button
                            key={idx}
                            onClick={() => toggleMultiDay(idx)}
                            className="px-3 py-2 rounded-xl text-[12px] font-bold min-h-[44px] transition"
                            style={
                              multiDays.includes(idx)
                                ? { background: "var(--accent)", color: "white", border: "1.5px solid var(--accent)" }
                                : { background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }
                            }
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={addEvent}
                    className="w-full py-3 rounded-2xl font-black text-[14px] min-h-[44px]"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    إضافة للجدول
                  </button>
                </div>
              )}

              {/* exam date toggle */}
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3 mt-2"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "var(--gold)" }} />
                <span className="text-[13px] flex-1 font-bold" style={{ color: "var(--text-muted)" }}>
                  {examDate === date ? "يوم الاختبار محدد لهذا اليوم" : "تعيين كيوم اختبار"}
                </span>
                <button
                  onClick={() => onExamDateChange(examDate === date ? null : date)}
                  className="px-3 py-2 rounded-xl text-[12px] font-bold min-h-[44px]"
                  style={
                    examDate === date
                      ? { background: "var(--gold)", color: "#1a1200", border: "none" }
                      : { background: "transparent", border: "1.5px solid var(--gold)", color: "var(--gold)" }
                  }
                >
                  {examDate === date ? "إلغاء" : "تعيين"}
                </button>
              </div>
            </div>
          )}

          {/* ══════ AI TAB ══════ */}
          {tab === "ai" && (
            <div>
              <p className="title-md mb-4" style={{ color: "var(--text)" }}>أدخل مشاغيلك</p>

              <textarea
                value={busyText}
                onChange={(e) => setBusyText(e.target.value)}
                rows={3}
                placeholder="مثال: من 8ص-2م مدرسة، من 6م-8م رياضة..."
                className="w-full rounded-2xl px-4 py-3 text-[14px] outline-none resize-none"
                style={{
                  background: "var(--surface2)",
                  border: "1.5px solid var(--border)",
                  color: "var(--text)",
                  minHeight: "90px",
                }}
              />

              {/* subjects chips */}
              {subjects.length > 0 && (
                <div className="mt-3 mb-3">
                  <p className="text-[12px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>
                    المواد التي سيخطط لها:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((s) => (
                      <span
                        key={s.name}
                        className="px-3 py-1.5 rounded-xl text-[12px] font-bold"
                        style={{ background: s.color + "20", border: `1px solid ${s.color}55`, color: s.color }}
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* exam context */}
              {examDate && (
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3"
                  style={{ background: "color-mix(in srgb, var(--gold) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--gold) 30%, transparent)" }}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "var(--gold)" }} />
                  <span className="text-[12px] font-semibold" style={{ color: "var(--gold)" }}>
                    {"يوم الاختبار: "}
                    {new Date(examDate + "T12:00:00").toLocaleDateString("ar-SA", {
                      weekday: "long", month: "long", day: "numeric",
                    })}
                  </span>
                </div>
              )}

              <button
                onClick={runAI}
                disabled={aiLoading || !busyText.trim()}
                className="w-full py-4 rounded-2xl font-black text-[16px] min-h-[56px] mb-4 transition"
                style={{
                  background: aiLoading || !busyText.trim() ? "var(--surface2)" : "var(--accent)",
                  color: aiLoading || !busyText.trim() ? "var(--text-muted)" : "white",
                  border: "none",
                }}
              >
                {aiLoading ? "درب يبني الخطة..." : "🤖 اعمل لي خطة"}
              </button>

              {aiLoading && (
                <div className="flex items-center justify-center gap-3 py-6">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                  />
                  <span className="text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>
                    درب يبني الخطة...
                  </span>
                </div>
              )}

              {aiResult && !aiLoading && (
                <div
                  className="rounded-2xl p-4 mb-3 overflow-y-auto"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    maxHeight: "280px",
                    whiteSpace: "pre-wrap",
                    color: "var(--text)",
                    fontSize: "13px",
                    lineHeight: "1.7",
                  }}
                >
                  {aiResult}
                </div>
              )}

              <p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
                الخطة نصية — طبّق يدوياً أو احفظ المشاغيل
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );

  return <>{modal}</>;
}
