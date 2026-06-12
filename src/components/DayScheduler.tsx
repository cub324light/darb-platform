"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ScheduleEvent } from "@/lib/storage";

export type { ScheduleEvent };

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

function fmtHour(h: number): string {
  if (h === 0) return "12 ص";
  if (h < 12) return `${h} ص`;
  if (h === 12) return "12 م";
  if (h === 24) return "12 ص";
  return `${h - 12} م`;
}

/* ─── تطبيع الأرقام العربية إلى غربية ─── */
function normalizeDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

/* ─── تحويل رقم + مؤشر الفترة ─── */
function parseHourArabic(num: string, mins: string, period: string): number {
  const n = parseInt(num);
  if (isNaN(n)) return -1;
  const m = parseInt(mins || "0");
  const p = period.trim();
  let h = n;
  if (p === "م" || p === "مساء" || p === "مساءً") h = n === 12 ? 12 : n + 12;
  else if (p === "ص" || p === "صباح" || p === "صباحاً") h = n === 12 ? 0 : n;
  // إذا فيه دقائق (≥30) نرفع الساعة للأعلى لتجنب from=to
  return h + (m >= 30 ? 1 : 0);
}

/* ─── تحليل نص الخطة إلى أحداث ─── */
function parseAISchedule(text: string, date: string, subjects: { name: string }[]): ScheduleEvent[] {
  const result: ScheduleEvent[] = [];
  const subjectNames = subjects.map((s) => s.name);
  const normalized   = normalizeDigits(text);

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    // من [الساعة] H[:MM] [ص/م] [N دقيقة] إلى [الساعة] H[:MM] [ص/م] [N دقيقة] [—–-:] النشاط
    const m = line.match(
      /من\s+(?:الساعة\s+)?(\d+)(?::(\d+))?\s*(?:\d+\s*(?:دقيقة|دق|د)\s*)?([صم]?)\s*(?:إلى|الى)\s*(?:الساعة\s+)?(\d+)(?::(\d+))?\s*([صم]?)\s*(?:\d+\s*(?:دقيقة|دق|د)\s*)?[—–\-:]\s*(.+)/
    );
    if (!m) continue;

    const fromH = parseHourArabic(m[1], m[2] ?? "", m[3]);
    const toH   = parseHourArabic(m[4], m[5] ?? "", m[6]);
    const label = m[7].trim();

    if (fromH < 0 || toH < 0 || fromH >= toH || fromH < 5 || toH > 24) continue;

    // تجاهل الفترات المتداخلة مع أحداث موجودة في نفس الدُفعة
    const overlaps = result.some((e) => fromH < e.toHour && e.fromHour < toH);
    if (overlaps) continue;

    const matchedSubject = subjectNames.find((n) => label.includes(n));
    result.push({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      type: matchedSubject ? "study" : "busy",
      ...(matchedSubject ? { subject: matchedSubject } : { label }),
      fromHour: fromH,
      toHour: toH,
      recurrence: { kind: "once", date },
    });
  }
  return result;
}

const HOURS     = Array.from({ length: 19 }, (_, i) => i + 5);
const END_HOURS = Array.from({ length: 19 }, (_, i) => i + 6);
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

export default function DayScheduler({ date, events, subjects, examDate, onExamDateChange, onEventsChange, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"manual" | "ai">("manual");

  // Manual
  const [addMode, setAddMode]     = useState<"study" | "busy" | null>(null);
  const [addSubject, setAddSubject] = useState(subjects[0]?.name ?? "");
  const [addLabel, setAddLabel]   = useState("");
  const [addFrom, setAddFrom]     = useState(8);
  const [addTo, setAddTo]         = useState(10);
  const [recurrence, setRecurrence] = useState<"once" | "weekly" | "multi">("once");
  const [multiDays, setMultiDays] = useState<number[]>([]);

  // AI
  const [busyText, setBusyText]   = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult]   = useState("");
  const [editText, setEditText]   = useState("");
  const [showEdit, setShowEdit]   = useState(false);
  const [applyFeedback, setApplyFeedback] = useState("");

  useEffect(() => { setMounted(true); }, []);

  const dayEvents  = getEventsForDate(date, events);
  const dateObj    = new Date(date + "T12:00:00");
  const dow        = dateObj.getDay();
  const dayName    = WEEK_DAY_NAMES[dow];
  const arabicDate = dateObj.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const deleteEvent = (id: string) => onEventsChange(events.filter((e) => e.id !== id));

  const buildRecurrence = (): ScheduleEvent["recurrence"] => {
    if (recurrence === "once")   return { kind: "once", date };
    if (recurrence === "weekly") return { kind: "weekly", dayOfWeek: dow };
    return { kind: "multiweekly", days: multiDays.length > 0 ? multiDays : [dow] };
  };

  const addEvent = () => {
    if (addMode === "study" && !addSubject) return;
    if (addMode === "busy"  && !addLabel.trim()) return;
    if (addFrom >= addTo) return;
    onEventsChange([...events, {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      type: addMode as "study" | "busy",
      ...(addMode === "study" ? { subject: addSubject } : { label: addLabel.trim() }),
      fromHour: addFrom, toHour: addTo,
      recurrence: buildRecurrence(),
    }]);
    setAddMode(null); setAddLabel(""); setAddFrom(8); setAddTo(10); setRecurrence("once"); setMultiDays([]);
  };

  /* ─── طلب ذكاء اصطناعي ─── */
  const callAI = async (prompt: string) => {
    setAiLoading(true);
    try {
      const res  = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const data = await res.json();
      const raw = (data.text ?? data.error ?? "حدث خطأ في الاستجابة").replace(/\n{3,}/g, "\n\n").trim();
      const parsed = parseAISchedule(raw, date, subjects);
      setAiResult(parsed.length > 0 ? raw : "أنا فقط أبني جداول دراسية 📅\nأدخل مشاغيلك مثل: من 8ص إلى 2م مدرسة");
    } catch { setAiResult("حدث خطأ، تحقق من الاتصال وحاول مجدداً."); }
    finally  { setAiLoading(false); }
  };

  const runAI = () => {
    const subjectsList = subjects.map((s) => s.name).join("، ");
    const examCtx = examDate
      ? `\nيوم الاختبار: ${new Date(examDate + "T12:00:00").toLocaleDateString("ar-SA", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`
      : "";
    callAI(`أنت مساعد جدول دراسي. اليوم: ${arabicDate}.${examCtx}
المواد: ${subjectsList}.
مشاغيل الطالب: ${busyText}

اقترح جدولاً دراسياً للأوقات الفارغة باستخدام نظام Orbit (50 دقيقة تركيز + 10 دقائق راحة).
اكتب كل فترة بهذه الصيغة فقط — أرقام ساعات صحيحة فقط بدون دقائق:
من [رقم] [ص/م] إلى [رقم] [ص/م] — [المادة أو الراحة]
مثال:
من 8 ص إلى 9 ص — رياضيات
من 9 ص إلى 10 ص — فيزياء
لا تضف أي شرح أو نص خارج هذه الصيغة.`);
  };

  const runEdit = () => {
    if (!editText.trim()) return;
    callAI(`الخطة الحالية:\n${aiResult}\n\nالتعديل المطلوب: ${editText.trim()}\n\nأعد كتابة الخطة بعد التعديل بهذه الصيغة فقط:\nمن [رقم] [ص/م] إلى [رقم] [ص/م] — [المادة أو الراحة]`);
    setEditText(""); setShowEdit(false);
  };

  const applyPlan = () => {
    const parsed = parseAISchedule(aiResult, date, subjects);
    if (parsed.length === 0) { setApplyFeedback("⚠️ لم أتمكن من قراءة الجدول — تأكد أن الخطة بالصيغة الصحيحة"); return; }
    onEventsChange([...events, ...parsed]);
    setApplyFeedback(`✅ أُضيف ${parsed.length} حدث للجدول`);
    setTab("manual");
  };

  const toggleMultiDay = (d: number) =>
    setMultiDays((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d]);

  if (!mounted) return null;

  const modal = createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative w-full rounded-t-3xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 z-10 pt-4 pb-3 px-5" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <div className="w-10 h-1.5 rounded-full bg-[var(--border)] mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <p className="font-black text-[15px]" style={{ color: "var(--text)" }}>{arabicDate}</p>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>✕</button>
          </div>
          <div className="flex gap-1 mt-3 p-1 rounded-2xl" style={{ background: "var(--surface2)" }}>
            {(["manual", "ai"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-xl text-[13px] font-bold transition"
                style={tab === t ? { background: "var(--accent)", color: "white" } : { color: "var(--text-muted)" }}>
                {t === "manual" ? "يدوي" : "خطة ذكية"}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 pb-10">

          {/* ══ MANUAL TAB ══ */}
          {tab === "manual" && (
            <div>
              {applyFeedback && (
                <div className="rounded-2xl px-4 py-3 mb-4 text-[13px] font-bold text-center"
                  style={{ background: "color-mix(in srgb, var(--success) 12%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)", color: "var(--success)" }}>
                  {applyFeedback}
                </div>
              )}
              {dayEvents.length === 0 && !applyFeedback && (
                <p className="text-[13px] mb-4 text-center" style={{ color: "var(--text-muted)" }}>لا توجد أحداث لهذا اليوم</p>
              )}
              {dayEvents.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  {dayEvents.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3 rounded-2xl px-4 py-3"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)", minHeight: "48px" }}>
                      <div className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: ev.type === "study" ? "var(--accent-light)" : "var(--danger)" }} />
                      <span className="font-bold text-[14px] flex-1" style={{ color: "var(--text)" }}>
                        {ev.type === "study" ? (ev.subject ?? "") : (ev.label ?? "")}
                      </span>
                      <span className="text-[12px] font-semibold" style={{ color: "var(--text-muted)" }}>
                        {fmtHour(ev.fromHour)} → {fmtHour(ev.toHour)}
                      </span>
                      <button onClick={() => deleteEvent(ev.id)}
                        className="text-[var(--text-muted)] text-base px-1 min-h-[44px]" aria-label="حذف">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {addMode === null && (
                <div className="flex gap-2 mb-4">
                  <button onClick={() => { setAddMode("study"); setAddSubject(subjects[0]?.name ?? ""); }}
                    className="flex-1 py-3 rounded-2xl font-bold text-[13px] min-h-[44px]"
                    style={{ background: "transparent", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
                    + إضافة دراسة</button>
                  <button onClick={() => { setAddMode("busy"); setAddLabel(""); }}
                    className="flex-1 py-3 rounded-2xl font-bold text-[13px] min-h-[44px]"
                    style={{ background: "transparent", border: "1.5px solid var(--danger)", color: "var(--danger)" }}>
                    + إضافة مشغول</button>
                </div>
              )}

              {addMode !== null && (
                <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-black text-[14px]" style={{ color: "var(--text)" }}>
                      {addMode === "study" ? "إضافة دراسة" : "إضافة مشغول"}</p>
                    <button onClick={() => setAddMode(null)} className="text-[var(--text-muted)] text-base px-1 min-h-[44px]">✕</button>
                  </div>

                  {addMode === "study" && (
                    <div className="mb-3">
                      <label className="text-[12px] font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>المادة</label>
                      <select value={addSubject} onChange={(e) => setAddSubject(e.target.value)}
                        className="w-full rounded-xl px-3 py-3 text-[14px] outline-none min-h-[44px]"
                        style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
                        {subjects.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                  {addMode === "busy" && (
                    <div className="mb-3">
                      <label className="text-[12px] font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>التسمية</label>
                      <input value={addLabel} onChange={(e) => setAddLabel(e.target.value)}
                        placeholder="مثال: مدرسة، رياضة، عمل..."
                        className="w-full rounded-xl px-3 py-3 text-[14px] outline-none min-h-[44px]"
                        style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
                    </div>
                  )}

                  <div className="flex gap-3 mb-3">
                    <div className="flex-1">
                      <label className="text-[12px] font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>من</label>
                      <select value={addFrom} onChange={(e) => { const v = Number(e.target.value); setAddFrom(v); if (addTo <= v) setAddTo(v + 1); }}
                        className="w-full rounded-xl px-3 py-3 text-[14px] outline-none min-h-[44px]"
                        style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
                        {HOURS.map((h) => <option key={h} value={h}>{fmtHour(h)}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[12px] font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>إلى</label>
                      <select value={addTo} onChange={(e) => setAddTo(Number(e.target.value))}
                        className="w-full rounded-xl px-3 py-3 text-[14px] outline-none min-h-[44px]"
                        style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
                        {END_HOURS.filter((h) => h > addFrom).map((h) => <option key={h} value={h}>{fmtHour(h)}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-[12px] font-bold mb-2 block" style={{ color: "var(--text-muted)" }}>التكرار</label>
                    <div className="flex flex-wrap gap-2">
                      {(["once", "weekly", "multi"] as const).map((r) => (
                        <button key={r} onClick={() => setRecurrence(r)}
                          className="px-3 py-2 rounded-xl text-[12px] font-bold min-h-[44px] transition"
                          style={recurrence === r
                            ? { background: "var(--accent)", color: "white", border: "1.5px solid var(--accent)" }
                            : { background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
                          {r === "once" && "هذا اليوم فقط"}
                          {r === "weekly" && `كل ${dayName} أسبوعياً`}
                          {r === "multi" && "أيام محددة"}
                        </button>
                      ))}
                    </div>
                    {recurrence === "multi" && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {WEEK_DAY_NAMES.map((name, idx) => (
                          <button key={idx} onClick={() => toggleMultiDay(idx)}
                            className="px-3 py-2 rounded-xl text-[12px] font-bold min-h-[44px] transition"
                            style={multiDays.includes(idx)
                              ? { background: "var(--accent)", color: "white", border: "1.5px solid var(--accent)" }
                              : { background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={addEvent} className="w-full py-3 rounded-2xl font-black text-[14px] min-h-[44px]"
                    style={{ background: "var(--accent)", color: "white" }}>إضافة للجدول</button>
                </div>
              )}

              {/* تعيين يوم الاختبار */}
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3 mt-2"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "var(--gold)" }} />
                <span className="text-[13px] flex-1 font-bold" style={{ color: "var(--text-muted)" }}>
                  {examDate === date ? "يوم الاختبار محدد لهذا اليوم" : "تعيين كيوم اختبار"}
                </span>
                <button onClick={() => onExamDateChange(examDate === date ? null : date)}
                  className="px-3 py-2 rounded-xl text-[12px] font-bold min-h-[44px]"
                  style={examDate === date
                    ? { background: "var(--gold)", color: "#1a1200", border: "none" }
                    : { background: "transparent", border: "1.5px solid var(--gold)", color: "var(--gold)" }}>
                  {examDate === date ? "إلغاء" : "تعيين"}
                </button>
              </div>
            </div>
          )}

          {/* ══ AI TAB ══ */}
          {tab === "ai" && (
            <div>
              <p className="title-md mb-4" style={{ color: "var(--text)" }}>أدخل مشاغيلك</p>

              <textarea value={busyText} onChange={(e) => setBusyText(e.target.value)} rows={3}
                placeholder="مثال: من 8ص-2م مدرسة، من 6م-8م رياضة..."
                className="w-full rounded-2xl px-4 py-3 text-[14px] outline-none resize-none"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)", minHeight: "90px" }} />

              {subjects.length > 0 && (
                <div className="mt-3 mb-3">
                  <p className="text-[12px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>المواد:</p>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((s) => (
                      <span key={s.name} className="px-3 py-1.5 rounded-xl text-[12px] font-bold"
                        style={{ background: s.color + "20", border: `1px solid ${s.color}55`, color: s.color }}>
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {examDate && (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3"
                  style={{ background: "color-mix(in srgb, var(--gold) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--gold) 30%, transparent)" }}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "var(--gold)" }} />
                  <span className="text-[12px] font-semibold" style={{ color: "var(--gold)" }}>
                    يوم الاختبار: {new Date(examDate + "T12:00:00").toLocaleDateString("ar-SA", { weekday: "long", month: "long", day: "numeric" })}
                  </span>
                </div>
              )}

              <button onClick={runAI} disabled={aiLoading || !busyText.trim()}
                className="w-full py-4 rounded-2xl font-black text-[16px] min-h-[56px] mb-4 transition"
                style={{ background: aiLoading || !busyText.trim() ? "var(--surface2)" : "var(--accent)", color: aiLoading || !busyText.trim() ? "var(--text-muted)" : "white", border: "none" }}>
                {aiLoading ? "درب يبني الخطة..." : "🤖 اعمل لي خطة"}
              </button>

              {aiLoading && (
                <div className="flex items-center justify-center gap-3 py-6">
                  <div className="w-6 h-6 rounded-full border-2 animate-spin"
                    style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                  <span className="text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>درب يبني الخطة...</span>
                </div>
              )}

              {aiResult && !aiLoading && (
                <div>
                  {/* عرض الخطة */}
                  <div className="rounded-2xl p-4 mb-3 overflow-y-auto"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", maxHeight: "260px", color: "var(--text)", fontSize: "13px", lineHeight: "1.9" }}>
                    {aiResult.split("\n").map((line, i) => (
                      <p key={i} className={line.trim() === "" ? "h-2" : ""}>{line}</p>
                    ))}
                  </div>

                  {/* زرا التعديل والتطبيق */}
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => { setShowEdit((v) => !v); setApplyFeedback(""); }}
                      className="flex-1 py-3 rounded-2xl font-bold text-[14px] min-h-[48px]"
                      style={{ background: "transparent", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
                      ✏️ تعديل
                    </button>
                    <button onClick={() => { setApplyFeedback(""); applyPlan(); }}
                      className="flex-1 py-3 rounded-2xl font-black text-[14px] min-h-[48px]"
                      style={{ background: "var(--accent)", color: "white", border: "none" }}>
                      ✅ تطبيق
                    </button>
                  </div>

                  {/* حقل التعديل */}
                  {showEdit && (
                    <div className="rounded-2xl p-4 mb-3" style={{ background: "var(--surface2)", border: "1.5px solid var(--accent)" }}>
                      <p className="text-[12px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>وش تبي تعدّل؟</p>
                      <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2}
                        placeholder="مثال: غيّر رياضيات إلى كيمياء في الفترة الأولى..."
                        className="w-full rounded-xl px-3 py-3 text-[13px] outline-none resize-none mb-3"
                        style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)", minHeight: "70px" }} />
                      <button onClick={runEdit} disabled={!editText.trim()}
                        className="w-full py-2.5 rounded-xl font-bold text-[13px] min-h-[44px]"
                        style={{ background: editText.trim() ? "var(--accent)" : "var(--surface)", color: editText.trim() ? "white" : "var(--text-muted)", border: "none" }}>
                        أعد بناء الخطة
                      </button>
                    </div>
                  )}

                  {applyFeedback && (
                    <p className="text-[12px] font-bold text-center py-2" style={{ color: applyFeedback.startsWith("✅") ? "var(--success)" : "var(--danger)" }}>
                      {applyFeedback}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );

  return <>{modal}</>;
}
