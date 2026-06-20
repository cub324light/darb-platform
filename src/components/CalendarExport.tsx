"use client";
/* ─── تصدير خطة المذاكرة إلى التقويم ───
   يحوّل أحداث الجدول إلى أحداث تقويم (كل جلسة حدث مستقل) ويعرض مزوّدين:
   Google / Apple / Outlook + تنزيل ICS. معماريّة قابلة للتوسّع (providers.ts). */
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ScheduleEvent } from "@/lib/storage";
import {
  planToCalEvents,
  CALENDAR_PROVIDERS,
  UPCOMING_PROVIDERS,
  type CalEvent,
} from "@/lib/calendar";

const RANGE_OPTIONS = [
  { days: 1, label: "اليوم" },
  { days: 7, label: "أسبوع" },
  { days: 14, label: "أسبوعان" },
  { days: 30, label: "شهر" },
];

export default function CalendarExport({
  events, color = "var(--accent)",
}: { events: ScheduleEvent[]; color?: string }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(7);
  const [done, setDone] = useState("");

  const calEvents: CalEvent[] = useMemo(
    () => planToCalEvents(events, { days }),
    [events, days],
  );

  const run = (provider: typeof CALENDAR_PROVIDERS[number]) => {
    if (calEvents.length === 0) return;
    setDone("");
    Promise.resolve(provider.handler(calEvents, "خطة درب")).then(() => {
      const note = provider.kind === "weblink" && calEvents.length > 1
        ? "عدة جلسات — نزّلنا ملف ICS استورده في تقويمك"
        : provider.kind === "download"
          ? "نزّل الملف ثم افتحه ليُضاف للتقويم"
          : "افتح النافذة وأكّد الإضافة";
      setDone(note);
    });
  };

  const hasStudy = useMemo(
    () => events.some((e) => e.type === "study"),
    [events],
  );

  const overlay = (
    <div className="fixed inset-0 z-[9990] flex flex-col overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="sticky top-0 z-10 px-5 pt-safe pt-4 pb-3 flex items-center gap-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => { setOpen(false); setDone(""); }}
          className="dome-chip text-[17px] font-bold flex-shrink-0" style={{ color: "var(--text)" }}>← رجوع</button>
        <p className="title-lg flex-1 text-right" style={{ color: "var(--text)" }}>أضف خطتك للتقويم</p>
      </div>

      <div className="px-5 py-5 flex flex-col gap-5 pb-28 max-w-lg w-full mx-auto">
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          صدّر جلسات مذاكرتك إلى تقويمك المفضّل — كل جلسة تصبح حدثاً مستقلاً بتنبيه قبلها بـ١٠ دقائق.
        </p>

        {/* المدى الزمني */}
        <div>
          <p className="text-[13px] font-bold mb-2" style={{ color: "var(--text)" }}>المدى</p>
          <div className="grid grid-cols-4 gap-2">
            {RANGE_OPTIONS.map((o) => (
              <button key={o.days} onClick={() => { setDays(o.days); setDone(""); }}
                className="py-2.5 rounded-xl text-[13px] font-bold transition"
                style={days === o.days
                  ? { background: color, color: "#fff" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl px-4 py-3 text-center" style={{ background: "var(--surface2)" }}>
          <span className="text-[22px] font-black" style={{ color }}>{calEvents.length}</span>
          <span className="text-[14px] font-bold mr-2" style={{ color: "var(--text-muted)" }}>جلسة سيتم تصديرها</span>
        </div>

        {/* المزوّدون */}
        <div className="flex flex-col gap-2.5">
          {CALENDAR_PROVIDERS.map((p) => (
            <button key={p.id} onClick={() => run(p)} disabled={calEvents.length === 0}
              className="w-full rounded-2xl py-4 px-4 font-bold text-[16px] flex items-center gap-3 transition active:scale-[0.98]"
              style={{
                background: "var(--surface)", border: `1.5px solid ${color}55`, color: "var(--text)",
                opacity: calEvents.length === 0 ? 0.4 : 1,
              }}>
              <span className="text-[20px]">{p.icon}</span>
              <span className="flex-1 text-right">{p.label}</span>
              <span style={{ color }}>←</span>
            </button>
          ))}
        </div>

        {done && (
          <div className="rounded-2xl px-4 py-3" style={{ background: color + "18", border: `1px solid ${color}44` }}>
            <p className="text-[14px] text-center font-bold" style={{ color: "var(--text)" }}>✓ {done}</p>
          </div>
        )}

        {/* قريباً — إثبات قابلية التوسّع للمراحل القادمة */}
        <div>
          <p className="text-[12px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>قريباً</p>
          <div className="flex flex-col gap-2">
            {UPCOMING_PROVIDERS.map((p) => (
              <div key={p.id} className="w-full rounded-2xl py-3.5 px-4 flex items-center gap-3"
                style={{ background: "var(--surface2)", color: "var(--text-muted)", opacity: 0.7 }}>
                <span className="text-[18px]">{p.icon}</span>
                <span className="flex-1 text-right text-[14px] font-bold">{p.label}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                  style={{ background: "var(--border)", color: "var(--text-muted)" }}>قريباً</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (!hasStudy) return null;

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full rounded-2xl py-3 font-bold text-[15px] transition active:scale-[0.98] flex items-center justify-center gap-2"
        style={{ background: "transparent", border: `1.5px solid ${color}`, color }}>
        🗓️ أضف للتقويم
      </button>
      {open && createPortal(overlay, document.body)}
    </>
  );
}
