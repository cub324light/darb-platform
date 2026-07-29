"use client";
/* ─── تصدير خطة المذاكرة إلى التقويم ───
   يحوّل أحداث الجدول إلى أحداث تقويم (كل جلسة حدث مستقل) ويعرض مزوّدين:
   Google / Apple / Outlook + تنزيل ICS. معماريّة قابلة للتوسّع (providers.ts). */
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ScheduleEvent } from "@/lib/storage";
import {
  planToCalEvents,
  CALENDAR_PROVIDERS,
  UPCOMING_PROVIDERS,
  addToGoogleCalendar,
  isGoogleCalendarConfigured,
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
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

  /* المرحلة 2: ربط Google ودفع الأحداث مباشرة عبر OAuth */
  const syncGoogle = async () => {
    if (calEvents.length === 0 || syncing) return;
    setSyncMsg(null);
    if (!isGoogleCalendarConfigured()) {
      setSyncMsg({ ok: false, text: "الربط المباشر غير مُفعّل بعد — استخدم Google Calendar أو تنزيل ICS" });
      return;
    }
    setSyncing(true);
    try {
      const { ok, fail } = await addToGoogleCalendar(calEvents);
      setSyncMsg(ok > 0
        ? { ok: true, text: `أُضيفت ${ok} جلسة لتقويم Google${fail ? ` (تعذّرت ${fail})` : ""}` }
        : { ok: false, text: "تعذّرت الإضافة — تأكد من السماح بالصلاحية وحاول ثانية" });
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setSyncMsg({
        ok: false,
        text: m === "config" ? "الربط المباشر غير مُفعّل بعد"
          : m === "denied" ? "رُفض الإذن — لازم تسمح بصلاحية التقويم"
          : "تعذّر الاتصال بـ Google — حاول ثانية",
      });
    } finally {
      setSyncing(false);
    }
  };

  const hasStudy = useMemo(
    () => events.some((e) => e.type === "study"),
    [events],
  );

  /* يفتح الـmodal عند وصول حدث darb:openCalendar (من شاشة نجاح دويرب) */
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("darb:openCalendar", handler);
    return () => window.removeEventListener("darb:openCalendar", handler);
  }, []);

  const overlay = (
    <div className="fixed inset-0 z-[9990] flex flex-col overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="sticky top-0 z-10 px-5 pt-safe pt-4 pb-3 flex items-center gap-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => { setOpen(false); setDone(""); }}
          className="dome-chip text-[19px] font-bold flex-shrink-0" style={{ color: "var(--text)" }}>→ رجوع</button>
        <p className="title-lg flex-1 text-right" style={{ color: "var(--text)" }}>أضف خطتك للتقويم</p>
      </div>

      <div className="px-5 py-5 flex flex-col gap-5 pb-28 max-w-lg w-full mx-auto">
        <p className="text-[16px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          صدّر جلسات مذاكرتك إلى تقويمك المفضّل — كل جلسة تصبح حدثاً مستقلاً بتنبيه قبلها بـ10 دقائق.
        </p>

        {/* المدى الزمني */}
        <div>
          <p className="text-[15px] font-bold mb-2" style={{ color: "var(--text)" }}>المدى</p>
          <div className="grid grid-cols-4 gap-2">
            {RANGE_OPTIONS.map((o) => (
              <button key={o.days} onClick={() => { setDays(o.days); setDone(""); }}
                className="py-2.5 rounded-xl text-[15px] font-bold transition"
                style={days === o.days
                  ? { background: color, color: "#fff" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl px-4 py-3 text-center" style={{ background: "var(--surface2)" }}>
          <span className="text-[25px] font-black" style={{ color }}>{calEvents.length}</span>
          <span className="text-[16px] font-bold mr-2" style={{ color: "var(--text-muted)" }}>جلسة سيتم تصديرها</span>
        </div>

        {/* المرحلة 2: ربط Google مباشر */}
        <button onClick={syncGoogle} disabled={calEvents.length === 0 || syncing}
          className="w-full rounded-2xl py-4 px-4 font-black text-[18px] flex items-center gap-3 transition active:scale-[0.98]"
          style={{ background: color, color: "#fff", opacity: calEvents.length === 0 ? 0.4 : 1 }}>
          {syncing ? (
            <span className="inline-block w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin mx-auto" />
          ) : (
            <>
              <span className="text-[23px]">🔗</span>
              <span className="flex-1 text-right">ربط Google وإضافة مباشرة</span>
              <span>←</span>
            </>
          )}
        </button>
        {syncMsg && (
          <div className="rounded-2xl px-4 py-3"
            style={{ background: syncMsg.ok ? color + "18" : "rgba(239,68,68,0.12)", border: `1px solid ${syncMsg.ok ? color + "44" : "#EF4444"}` }}>
            <p className="text-[16px] text-center font-bold" style={{ color: syncMsg.ok ? "var(--text)" : "#EF4444" }}>
              {syncMsg.ok ? "✓ " : ""}{syncMsg.text}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>أو صدّر يدوياً</span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        {/* المزوّدون */}
        <div className="flex flex-col gap-2.5">
          {CALENDAR_PROVIDERS.map((p) => (
            <button key={p.id} onClick={() => run(p)} disabled={calEvents.length === 0}
              className="w-full rounded-2xl py-4 px-4 font-bold text-[18px] flex items-center gap-3 transition active:scale-[0.98]"
              style={{
                background: "var(--surface)", border: `1.5px solid ${color}55`, color: "var(--text)",
                opacity: calEvents.length === 0 ? 0.4 : 1,
              }}>
              <span className="text-[23px]">{p.icon}</span>
              <span className="flex-1 text-right">{p.label}</span>
              <span style={{ color }}>←</span>
            </button>
          ))}
        </div>

        {done && (
          <div className="rounded-2xl px-4 py-3" style={{ background: color + "18", border: `1px solid ${color}44` }}>
            <p className="text-[16px] text-center font-bold" style={{ color: "var(--text)" }}>✓ {done}</p>
          </div>
        )}

        {/* قريباً — إثبات قابلية التوسّع للمراحل القادمة */}
        <div>
          <p className="text-[14px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>قريباً</p>
          <div className="flex flex-col gap-2">
            {UPCOMING_PROVIDERS.map((p) => (
              <div key={p.id} className="w-full rounded-2xl py-3.5 px-4 flex items-center gap-3"
                style={{ background: "var(--surface2)", color: "var(--text-muted)", opacity: 0.7 }}>
                <span className="text-[20px]">{p.icon}</span>
                <span className="flex-1 text-right text-[16px] font-bold">{p.label}</span>
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-md"
                  style={{ background: "var(--border)", color: "var(--text-muted)" }}>قريباً</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (!hasStudy) {
    return (
      <div className="rounded-2xl p-4 flex flex-col gap-2.5"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
        <p className="text-[15px] text-center" style={{ color: "var(--text-muted)" }}>لا توجد خطة حالياً</p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("darb:openDuirb", { detail: { tab: "schedule" } }))}
          className="w-full rounded-2xl py-2.5 font-bold text-[16px] transition active:scale-[0.98] flex items-center justify-center gap-2"
          style={{
            background: "color-mix(in srgb, var(--accent) 12%, transparent)",
            border: "1.5px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            color: "var(--accent-light)",
          }}>
          <span>🤖</span>
          <span>إنشاء خطة مع دويرب</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full rounded-2xl py-3 font-bold text-[17px] transition active:scale-[0.98] flex items-center justify-center gap-2"
        style={{ background: "transparent", border: `1.5px solid ${color}`, color }}>
        🗓️ أضف للتقويم
      </button>
      {open && createPortal(overlay, document.body)}
    </>
  );
}
