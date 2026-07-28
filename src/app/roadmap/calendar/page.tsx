"use client";
/* ═══════════ 🗓️ التقويم — حياة الطالب كاملة (V2) ═══════════
   «القريب» أولاً (اليوم/غداً/هذا الأسبوع) ثم شبكة الشهر الحقيقية ثم Timeline اليوم.
   الحدث يحمل تأثيره على الخطة (block يمنع · reduce يخفّف · busy ينقل)، ودويرب يبني
   الجلسات حول الحياة — مع تحذيرٍ صريح عند الأحداث المؤثّرة. IO عبر calendarStore فقط. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { localDayKey, loadExamDate, saveExamDate } from "@/lib/storage";
import {
  EVENT_KIND_META, kindMeta, groupUpcoming, eventsOnDay, warnsPlanChange,
  type CalendarEvent, type EventKind, type EventImpact, type Recurrence,
} from "@/lib/roadmap/calendar";
import { loadCalendar, addCalendarEvent, removeCalendarEvent } from "@/lib/roadmap/calendarStore";
import { slotsToEvents } from "@/lib/roadmap/aiSchedule";
import { loadUser, ensureWorkspace } from "@/lib/storage";
import { readPriorityExam } from "@/lib/roadmap/nowRead";
import { n, time } from "@/lib/format";

const Calendar = dynamic(() => import("@/components/Calendar"), { ssr: false });
const DayLadder = dynamic(() => import("@/components/DayLadder"), { ssr: false });

const IMPACT_LABEL: Record<EventImpact, string> = { busy: "ينقل", reduce: "يخفّف", block: "يمنع" };
const IMPACT_COLOR: Record<EventImpact, string> = { busy: "#3B82F6", reduce: "#D9A23C", block: "#EF4444" };
const REC_LABEL: Record<Recurrence, string> = { none: "لا يتكرر", daily: "يومياً", weekly: "أسبوعياً", monthly: "شهرياً" };
const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

/* الساعة الكسريّة من ISO محلّيّ. `start`/`end` تُخزَّن بلا منطقةٍ زمنية، فالقراءة محلّية
   دائماً — لا تخلطها مع weekdayOf/domOf في المحرّك (تلك بـUTC عن قصد). */
const hourOf = (iso: string, fallback?: number): number => {
  if (fallback != null) return fallback;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 0 : d.getHours() + d.getMinutes() / 60;
};

function EventRow({ ev, when, onDelete }: { ev: CalendarEvent; when?: string; onDelete?: () => void }) {
  const meta = kindMeta(ev.kind);
  return (
    <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
      {when && <span className="t-caption font-black w-14 flex-shrink-0" style={{ color: "var(--text-muted)" }}>{when}</span>}
      <span className="text-[18px] flex-shrink-0" aria-hidden="true">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="t-body font-bold truncate" style={{ color: "var(--text)" }}>{ev.title}</p>
        <p className="t-caption mt-0.5" style={{ color: "var(--text-dim)" }}>
          {ev.allDay ? "يومٌ كامل" : `${time(hourOf(ev.start))}–${time(hourOf(ev.end))}`}{ev.recurrence !== "none" ? ` (${REC_LABEL[ev.recurrence]})` : ""}
        </p>
      </div>
      <span className="t-caption font-black px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ background: `color-mix(in srgb, ${IMPACT_COLOR[ev.impact]} 14%, transparent)`, color: IMPACT_COLOR[ev.impact] }}>
        {IMPACT_LABEL[ev.impact]}
      </span>
      {onDelete && <button onClick={onDelete} className="t-caption px-1 flex-shrink-0" style={{ color: "var(--text-dim)" }} aria-label="حذف">✕</button>}
    </div>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>(() => (typeof window !== "undefined" ? loadCalendar() : []));
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<"manual" | "ai">("manual");
  /* مواد اختبار الأولوية — يبني دويرب حولها لا حول موادَّ مخترعة */
  const [aiSubjects] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const u = loadUser(); if (!u) return [];
    const ws = ensureWorkspace(u).workspace; if (!ws) return [];
    return readPriorityExam(ws)?.subjects.map((s) => s.name) ?? [];
  });
  /* نموذج الإضافة */
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EventKind>("occasion");
  const [date, setDate] = useState(() => localDayKey());
  const [from, setFrom] = useState("18:00");
  const [to, setTo] = useState("20:00");
  const [allDay, setAllDay] = useState(false);
  const [rec, setRec] = useState<Recurrence>("none");
  const [impact, setImpact] = useState<EventImpact | null>(null);

  const [examDate, setExamDate] = useState<string | null>(() => (typeof window !== "undefined" ? loadExamDate() : null));

  const today = localDayKey();
  const [y, m] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  const up = groupUpcoming(events, today);
  const todayEvents = eventsOnDay(events, today).sort((a, b) => a.start.localeCompare(b.start));
  const warnEv = [...up.today, ...up.tomorrow, ...up.week].find(warnsPlanChange);

  const saveEvent = () => {
    if (!title.trim()) return;
    const meta = EVENT_KIND_META[kind];
    const ev: CalendarEvent = {
      id: `${Date.now()}`, title: title.trim(), kind,
      start: allDay ? `${date}T00:00` : `${date}T${from}`,
      end: allDay ? `${date}T23:59` : `${date}T${to}`,
      allDay: allDay || undefined, recurrence: rec,
      impact: impact ?? meta.defaultImpact, color: meta.color, source: "local",
    };
    setEvents(addCalendarEvent(ev));
    setAdding(false); setTitle(""); setImpact(null); setRec("none"); setAllDay(false);
  };

  return (
    <div className="min-h-dvh pb-nav relative z-[1] page-enter">
      <div className="max-w-xl mx-auto w-full px-5 pt-7 pb-8 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push("/roadmap")} className="t-body font-bold" style={{ color: "var(--text-muted)" }}>← الآن</button>
          <span className="t-caption font-black" style={{ color: "var(--text-muted)" }}>{AR_MONTHS[m - 1]} {n(y)}</span>
        </div>
        <h1 className="t-h2 font-black -mt-2" style={{ color: "var(--text)" }}>🗓️ التقويم</h1>

        {/* القريب — أغلب الزيارات سؤالها «وش عندي قريب؟» */}
        {(up.today.length + up.tomorrow.length + up.week.length) > 0 ? (
          <div className="flex flex-col gap-2">
            {up.today.map((ev) => <EventRow key={ev.id} ev={ev} when="اليوم" onDelete={() => setEvents(removeCalendarEvent(ev.id))} />)}
            {up.tomorrow.map((ev) => <EventRow key={ev.id} ev={ev} when="غداً" onDelete={() => setEvents(removeCalendarEvent(ev.id))} />)}
            {up.week.slice(0, 3).map((ev) => <EventRow key={ev.id} ev={ev} when="الأسبوع" onDelete={() => setEvents(removeCalendarEvent(ev.id))} />)}
          </div>
        ) : (
          <div className="rounded-2xl p-5 text-center" style={{ background: "var(--surface)", border: "1.5px dashed var(--border)" }}>
            <p className="t-body font-bold" style={{ color: "var(--text)" }}>لا أحداث قريبة</p>
            <p className="t-caption mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              سجّل أي شيءٍ في حياتك — صلاة، دوام، سفر، مناسبة — وسيبني دويرب خطتك حوله.
            </p>
          </div>
        )}

        {warnEv && (
          <div className="rounded-2xl px-4 py-3 t-caption font-bold"
            style={{ background: "color-mix(in srgb, #D9A23C 12%, var(--surface))", border: "1.5px solid color-mix(in srgb, #D9A23C 30%, var(--border))", color: "var(--text)" }}>
            ⚠️ سيتم تعديل خطتك تلقائياً بسبب «{warnEv.title}».
          </div>
        )}

        {/* تقويم الشهر — نفس المكوّن المستخدَم في «خطتي» (ميلادي/هجري · تنقّل الأشهر ·
            معاينة اليوم بالضغط المطوّل). نمرّر أحداثنا عبر getDayInfo فلا نفرّع نسخةً ثانية. */}
        <Calendar
          examDate={examDate}
          onExamDateChange={(d) => { setExamDate(d); saveExamDate(d); }}
          getDayInfo={(date) =>
            eventsOnDay(events, date).map((ev) => ({
              id: ev.id,
              label: ev.title,
              color: kindMeta(ev.kind).color,
              from: hourOf(ev.start, ev.allDay ? 0 : undefined),
              to: hourOf(ev.end, ev.allDay ? 24 : undefined),
            }))
          }
        />

        {/* جدول اليوم — سلّم ساعاتٍ حقيقيّ بخطٍّ عند الساعة الآن */}
        <p className="eyebrow mb-2 px-1">جدول اليوم</p>
        <DayLadder
          slots={todayEvents.filter((e) => !e.allDay).map((e) => ({
            id: e.id, title: e.title, fromHour: hourOf(e.start), toHour: hourOf(e.end),
            color: kindMeta(e.kind).color, icon: kindMeta(e.kind).icon,
          }))}
          allDay={todayEvents.filter((e) => e.allDay).map((e) => ({
            id: e.id, title: e.title, color: kindMeta(e.kind).color, icon: kindMeta(e.kind).icon,
          }))}
        />

        {/* زرّان كما كانا: يدويّ ومع دويرب — كلاهما يفتح نفس الورقة على تبويبه. */}
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => { setTab("manual"); setAdding(true); }}
            className="rounded-2xl py-4 t-body font-black transition active:scale-[0.98]"
            style={{ background: "transparent", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
            ＋ يدويّاً
          </button>
          <button onClick={() => { setTab("ai"); setAdding(true); }}
            className="rounded-2xl py-4 t-body font-black transition active:scale-[0.98]"
            style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
            🤖 مع دويرب
          </button>
        </div>
      </div>

      {/* ورقة إضافة حدث */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setAdding(false)} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 rise max-h-[86dvh] overflow-y-auto"
            style={{ background: "var(--surface)", borderTop: "1.5px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />

            {/* تبويبان كما كانا: «خطة يدوية» (وهي إضافة الحدث نفسها) و«خطة مع دويرب» */}
            <div className="grid grid-cols-2 gap-1 rounded-2xl p-1 mb-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              {([["manual", "خطة يدوية"], ["ai", "خطة مع دويرب"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k}
                  className="py-2.5 rounded-xl t-body font-bold transition active:scale-[0.98]"
                  style={tab === k ? { background: "var(--accent)", color: "#fff" } : { background: "transparent", color: "var(--text-muted)" }}>
                  {label}
                </button>
              ))}
            </div>

            {tab === "ai" ? (
              <DuwairbPlan date={date} subjects={aiSubjects}
                onDone={(evs) => { setEvents(evs); setAdding(false); }} />
            ) : (
            <>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="العنوان — مثل: زيارة أعمامي"
              className="w-full rounded-xl px-4 py-3 t-body font-bold outline-none"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />

            <p className="t-caption font-bold mt-4 mb-2" style={{ color: "var(--text-muted)" }}>النوع</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(EVENT_KIND_META) as EventKind[]).map((k) => (
                <button key={k} onClick={() => setKind(k)}
                  className="t-caption font-bold px-3 py-1.5 rounded-full transition"
                  style={{ background: kind === k ? "color-mix(in srgb, var(--accent) 14%, var(--surface2))" : "var(--surface2)",
                    border: `1.5px solid ${kind === k ? "var(--accent)" : "var(--border)"}`, color: "var(--text)" }}>
                  {EVENT_KIND_META[k].icon} {EVENT_KIND_META[k].label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <label className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>التاريخ
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 t-body mt-1 outline-none" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
              </label>
              <label className="t-caption font-bold flex items-end gap-2 pb-1" style={{ color: "var(--text-muted)" }}>
                <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="w-5 h-5" /> يومٌ كامل
              </label>
              {!allDay && (
                <>
                  <label className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>من
                    <input type="time" value={from} onChange={(e) => setFrom(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 t-body mt-1 outline-none" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
                  </label>
                  <label className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>إلى
                    <input type="time" value={to} onChange={(e) => setTo(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 t-body mt-1 outline-none" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
                  </label>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <label className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>التكرار
                <select value={rec} onChange={(e) => setRec(e.target.value as Recurrence)}
                  className="w-full rounded-xl px-3 py-2.5 t-body mt-1 outline-none" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
                  {(Object.keys(REC_LABEL) as Recurrence[]).map((r) => <option key={r} value={r}>{REC_LABEL[r]}</option>)}
                </select>
              </label>
              <div>
                <p className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>تأثيره على الخطة</p>
                <div className="flex gap-1.5 mt-1">
                  {(["block", "reduce", "busy"] as EventImpact[]).map((im) => {
                    const on = (impact ?? EVENT_KIND_META[kind].defaultImpact) === im;
                    return (
                      <button key={im} onClick={() => setImpact(im)}
                        className="t-caption font-black px-2.5 py-2 rounded-lg flex-1"
                        style={{ background: on ? `color-mix(in srgb, ${IMPACT_COLOR[im]} 16%, transparent)` : "var(--surface2)",
                          border: `1.5px solid ${on ? IMPACT_COLOR[im] : "var(--border)"}`, color: on ? IMPACT_COLOR[im] : "var(--text-muted)" }}>
                        {IMPACT_LABEL[im]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {warnsPlanChange({ kind, impact: impact ?? EVENT_KIND_META[kind].defaultImpact }) && (
              <p className="t-caption font-bold mt-3" style={{ color: "#B45309" }}>⚠️ سيتم تعديل خطتك تلقائياً بسبب هذا الحدث.</p>
            )}

            <button onClick={saveEvent} disabled={!title.trim()} className="btn-primary glow-blue w-full mt-4" style={{ opacity: title.trim() ? 1 : 0.5 }}>
              حفظ الحدث
            </button>
            </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ «خطة مع دويرب» — النسخة القديمة: اقتراحاتٌ سريعة ثم وصفُ مشاغيلك ثم «اعمل لي خطة».
   المخرَج يُحوَّل إلى CalendarEvent (لا ScheduleEvent) فيظهر في هذا التقويم نفسه. ═══ */
const QUICK = [
  { label: "عطني جدول جاهز", text: "عطني جدول دراسي جاهز لليوم" },
  { label: "مشغول الصباح (٦-١٢)", text: "من 6 ص الى 12 م مشغول، اعمل لي جدول للأوقات الفارغة" },
  { label: "مشغول الليل", text: "من 9 م الى 12 ص مشغول، اعمل لي جدول للأوقات الفارغة" },
  { label: "جدول بدون مدرسة", text: "من 7 ص الى 2 م مشغول بالمدرسة، اعمل لي جدول بعدها" },
];

function DuwairbPlan({ date, subjects, onDone }: {
  date: string; subjects: string[]; onDone: (evs: CalendarEvent[]) => void;
}) {
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<CalendarEvent[]>([]);

  const build = async (prompt: string) => {
    setLoading(true); setErr(""); setPreview([]);
    try {
      const { askDuwairb } = await import("@/lib/orchestrator");
      const res = await askDuwairb({ prompt, mode: "schedule", subjects, topic: "جدول اليوم" });
      const evs = slotsToEvents(res.text ?? "", {
        date, subjects,
        idOf: (i) => `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      });
      /* بلا فتراتٍ مفهومة لا نحفظ شيئاً ولا ندّعي نجاحاً */
      if (evs.length === 0) setErr("ما قدرتُ أقرأ جدولاً من ردّ دويرب — جرّب وصفاً أوضح لمشاغيلك.");
      setPreview(evs);
    } catch {
      setErr("تعذّر الوصول إلى دويرب الآن. حاول بعد قليل.");
    } finally { setLoading(false); }
  };

  const apply = () => {
    let list = loadCalendar();
    for (const e of preview) list = addCalendarEvent(e);
    onDone(list);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="t-caption font-bold" style={{ color: "var(--text-dim)" }}>أدخل مشاغيلك</p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK.map((q) => (
          <button key={q.label} onClick={() => { setBusy(q.text); build(q.text); }} disabled={loading}
            className="px-3 py-2.5 rounded-xl t-caption font-bold text-right leading-snug transition active:scale-[0.97]"
            style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                     border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)", color: "var(--accent-light)" }}>
            {q.label}
          </button>
        ))}
      </div>

      <textarea value={busy} onChange={(e) => setBusy(e.target.value)} rows={3}
        placeholder="مثال: من 8ص-2م مدرسة، من 6م-8م رياضة..."
        className="w-full rounded-2xl px-4 py-3 t-body outline-none resize-none"
        style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />

      {subjects.length > 0 && (
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>المواد: {subjects.join(" · ")}</p>
      )}

      <button onClick={() => build(busy.trim() || QUICK[0].text)} disabled={loading}
        className="w-full rounded-2xl py-4 t-body font-black transition active:scale-[0.98]"
        style={{ background: loading ? "var(--surface2)" : "var(--accent)", color: loading ? "var(--text-muted)" : "#fff", border: "none" }}>
        {loading ? "دويرب يبني الخطة..." : "اعمل لي خطة"}
      </button>

      {err && <p className="t-caption font-bold" style={{ color: "var(--danger)" }}>{err}</p>}

      {preview.length > 0 && (
        <>
          <p className="t-caption font-black" style={{ color: "var(--text)" }}>معاينة — {n(preview.length)} فترة</p>
          <div className="flex flex-col gap-1.5">
            {preview.map((e) => (
              <div key={e.id} className="rounded-xl px-3 py-2 flex items-center gap-2"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <span className="t-caption font-mono-nums flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {time(hourOf(e.start))}–{time(hourOf(e.end))}
                </span>
                <span className="t-body font-bold truncate" style={{ color: "var(--text)" }}>{e.title}</span>
              </div>
            ))}
          </div>
          <button onClick={apply} className="w-full rounded-2xl py-3.5 t-body font-black"
            style={{ background: "var(--success)", color: "#fff", border: "none" }}>
            أضِفها إلى تقويمي
          </button>
        </>
      )}
    </div>
  );
}
