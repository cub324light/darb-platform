"use client";
/* ─── تنبيه التسجيل في الاختبارات الرسمية ───
   يظهر في: الداشبورد + صفحة الخطة + ملف الطالب (قسم الأهداف).
   يُخفى تلقائياً إذا لا يوجد تنبيه نشط. */
import { useMemo, useState } from "react";
import { activeExamTrackIds } from "@/lib/storage";
import { buildExamAlerts, type ExamAlert } from "@/lib/examProvider";
import type { TrackId } from "@/lib/tracks";
import { n as ar } from "@/lib/format";

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function AlertCard({ alert, onDismiss }: { alert: ExamAlert; onDismiss: () => void }) {
  const isOpen = alert.status === "open";
  const accent = isOpen ? "var(--success)" : "var(--gold)";
  const bg = isOpen
    ? "color-mix(in srgb, var(--success) 8%, var(--surface))"
    : "color-mix(in srgb, var(--gold) 8%, var(--surface))";
  const border = isOpen
    ? "color-mix(in srgb, var(--success) 20%, transparent)"
    : "color-mix(in srgb, var(--gold) 20%, transparent)";

  return (
    <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
      style={{ background: bg, border: `1px solid ${border}` }}>
      <span className="text-[20px] flex-shrink-0 mt-0.5">{isOpen ? "🟢" : "🔔"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-black" style={{ color: accent }}>
          {isOpen ? `التسجيل مفتوح الآن — ${alert.trackTitle}` : `التسجيل يفتح خلال ${ar(alert.daysUntilOpen ?? 0)} يوم — ${alert.trackTitle}`}
        </p>
        <p className="text-[14px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          {alert.windowLabel}
          {isOpen && alert.registrationEnd ? ` · ينتهي التسجيل ${alert.registrationEnd}` : ""}
        </p>
      </div>
      <button onClick={onDismiss} aria-label="إغلاق التنبيه"
        className="text-[var(--text-muted)] text-sm font-bold px-1 flex-shrink-0 tap-44">✕</button>
    </div>
  );
}

export default function ExamRegistrationAlert() {
  const today = todayStr();

  const alerts = useMemo((): ExamAlert[] => {
    if (typeof window === "undefined") return [];
    /* المصدر الواحد: اختبارات الطالب من Workspace (فراغ = لا تنبيهات) */
    const ids = activeExamTrackIds() as TrackId[];
    if (!ids.length) return [];
    return buildExamAlerts(ids, today);
  }, [today]);

  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("darb_alert_dismissed") : null;
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });

  const dismiss = (trackId: TrackId) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(String(trackId));
      try { localStorage.setItem("darb_alert_dismissed", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const visible = alerts.filter((a) => !dismissed.has(String(a.trackId)));
  if (!visible.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {visible.map((a) => (
        <AlertCard key={a.trackId} alert={a} onDismiss={() => dismiss(a.trackId)} />
      ))}
    </div>
  );
}

