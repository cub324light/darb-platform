"use client";
/* ═══════════ 🗓️ التقويم — حياة الطالب كاملة (V2) ═══════════
   «القريب» أولاً (اليوم/غداً/هذا الأسبوع) ثم شبكة الشهر الحقيقية ثم Timeline اليوم.
   الحدث يحمل تأثيره على الخطة (block يمنع · reduce يخفّف · busy ينقل)، ودويرب يبني
   الجلسات حول الحياة — مع تحذيرٍ صريح عند الأحداث المؤثّرة. IO عبر calendarStore فقط. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { localDayKey } from "@/lib/storage";
import {
  EVENT_KIND_META, kindMeta, groupUpcoming, eventsOnDay, occursOnDay, warnsPlanChange,
  type CalendarEvent, type EventKind, type EventImpact, type Recurrence,
} from "@/lib/roadmap/calendar";
import { loadCalendar, addCalendarEvent, removeCalendarEvent } from "@/lib/roadmap/calendarStore";
import { n } from "@/lib/format";

const IMPACT_LABEL: Record<EventImpact, string> = { busy: "ينقل", reduce: "يخفّف", block: "يمنع" };
const IMPACT_COLOR: Record<EventImpact, string> = { busy: "#3B82F6", reduce: "#D9A23C", block: "#EF4444" };
const REC_LABEL: Record<Recurrence, string> = { none: "لا يتكرر", daily: "يومياً", weekly: "أسبوعياً", monthly: "شهرياً" };
const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DOW = ["س","ح","ن","ث","ر","خ","ج"]; // السبت أول الأسبوع

const timeOf = (iso: string) => {
  const d = new Date(iso); const h = d.getHours(), m = d.getMinutes();
  const two = (x: number) => new Intl.NumberFormat("ar-EG-u-nu-arab", { minimumIntegerDigits: 2 }).format(x);
  return `${new Intl.NumberFormat("ar-EG-u-nu-arab").format(((h + 11) % 12) + 1)}:${two(m)}${h >= 12 ? "م" : "ص"}`;
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
          {ev.allDay ? "يومٌ كامل" : `${timeOf(ev.start)}–${timeOf(ev.end)}`}{ev.recurrence !== "none" ? ` (${REC_LABEL[ev.recurrence]})` : ""}
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
  /* نموذج الإضافة */
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EventKind>("occasion");
  const [date, setDate] = useState(() => localDayKey());
  const [from, setFrom] = useState("18:00");
  const [to, setTo] = useState("20:00");
  const [allDay, setAllDay] = useState(false);
  const [rec, setRec] = useState<Recurrence>("none");
  const [impact, setImpact] = useState<EventImpact | null>(null);

  const today = localDayKey();
  const [y, m] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  const monthDays = new Date(y, m, 0).getDate();
  const firstDow = new Date(y, m - 1, 1).getDay(); // 0=أحد
  const leading = (firstDow + 1) % 7;               // السبت أول الأسبوع
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

        {/* شبكة الشهر الحقيقية — السبت أول الأعمدة، اليوم مميّز، نقاط الأحداث بلون النوع */}
        <div className="rounded-3xl p-4" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
          <div className="grid grid-cols-7 mb-2">
            {DOW.map((d) => <span key={d} className="t-caption font-black text-center" style={{ color: "var(--text-dim)" }}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1.5">
            {Array.from({ length: leading }).map((_, i) => <span key={`x${i}`} />)}
            {Array.from({ length: monthDays }).map((_, i) => {
              const dayNum = i + 1;
              const dayIso = `${today.slice(0, 8)}${String(dayNum).padStart(2, "0")}`;
              const isToday = dayNum === Number(today.slice(8, 10));
              const evs = events.filter((e) => occursOnDay(e, dayIso));
              const blocked = evs.some((e) => e.impact === "block");
              return (
                <div key={dayNum} className="flex flex-col items-center justify-center rounded-xl py-1.5"
                  style={{ background: isToday ? "var(--accent)" : blocked ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent" }}>
                  <span className="t-caption font-bold font-mono-nums" style={{ color: isToday ? "#fff" : "var(--text)" }}>{n(dayNum)}</span>
                  <span className="flex gap-0.5 mt-0.5" style={{ minHeight: "5px" }}>
                    {evs.slice(0, 3).map((e) => (
                      <i key={e.id} className="block w-[4.5px] h-[4.5px] rounded-full" style={{ background: isToday ? "#fff" : kindMeta(e.kind).color }} />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* خطّ اليوم الزمنيّ */}
        {todayEvents.length > 0 && (
          <div>
            <p className="eyebrow mb-2 px-1">اليوم</p>
            <div className="flex flex-col">
              {todayEvents.map((ev) => (
                <div key={ev.id} className="flex gap-3">
                  <span className="t-caption font-bold w-12 flex-shrink-0 text-left pt-0.5" style={{ color: "var(--text-dim)" }}>{ev.allDay ? "اليوم" : timeOf(ev.start)}</span>
                  <div className="flex-1 pb-4 relative" style={{ borderInlineStart: "2px solid var(--border)", paddingInlineStart: "14px" }}>
                    <i className="absolute block w-2 h-2 rounded-full" style={{ background: kindMeta(ev.kind).color, insetInlineStart: "-5px", top: "6px" }} />
                    <p className="t-body font-bold" style={{ color: "var(--text)" }}>{kindMeta(ev.kind).icon} {ev.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => setAdding(true)} className="btn-primary glow-blue w-full">＋ أضف حدثاً</button>
      </div>

      {/* ورقة إضافة حدث */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setAdding(false)} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 rise max-h-[86dvh] overflow-y-auto"
            style={{ background: "var(--surface)", borderTop: "1.5px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
            <p className="t-title font-black text-center mb-4" style={{ color: "var(--text)" }}>حدثٌ جديد</p>

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
          </div>
        </div>
      )}
    </div>
  );
}
