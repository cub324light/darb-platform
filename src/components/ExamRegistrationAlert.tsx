"use client";
/* ─── تنبيه التسجيل في الاختبارات الرسمية ───
   يظهر في: الداشبورد + صفحة الخطة + ملف الطالب (قسم الأهداف).
   يُخفى تلقائياً إذا لا يوجد تنبيه نشط. */
import { useMemo, useState } from "react";
import { loadUser, loadTrackExamDates } from "@/lib/storage";
import { buildExamAlerts, nearestActiveWindow, type ExamAlert } from "@/lib/examProvider";
import type { TrackId } from "@/lib/tracks";

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ar = (n: number) => n.toLocaleString("ar-SA");

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
        className="text-[var(--text-muted)] text-sm font-bold px-1 flex-shrink-0">✕</button>
    </div>
  );
}

export default function ExamRegistrationAlert() {
  const today = todayStr();

  const alerts = useMemo((): ExamAlert[] => {
    if (typeof window === "undefined") return [];
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
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

/* ── بطاقة معلومات الاختبار الكاملة (لصفحة الملف الشخصي / الأهداف) ── */
export function ExamWindowInfo({ trackId }: { trackId: TrackId }) {
  const today = todayStr();
  const info = useMemo(() => nearestActiveWindow(trackId, today), [trackId, today]);

  if (!info) {
    return (
      <p className="text-[14px] px-1" style={{ color: "var(--text-muted)" }}>
        بانتظار الإعلان الرسمي عن مواعيد {String(trackId)}
      </p>
    );
  }

  const { window: w, status } = info;
  if (status === "pending") {
    return (
      <p className="text-[14px] px-1" style={{ color: "var(--text-muted)" }}>
        ⏳ بانتظار الإعلان الرسمي — {w.yearLabel}
      </p>
    );
  }

  const isOpen = status === "open";
  const color = isOpen ? "var(--success)" : "var(--gold)";
  return (
    <div className="rounded-xl px-3 py-2 text-[14px]"
      style={{ background: `color-mix(in srgb, ${color} 8%, var(--surface2))`, border: `1px solid color-mix(in srgb, ${color} 20%, transparent)` }}>
      <span className="font-black" style={{ color }}>{isOpen ? "🟢 التسجيل مفتوح" : "🔔 التسجيل قادم"}</span>
      <span className="mr-2" style={{ color: "var(--text-muted)" }}>{w.yearLabel}</span>
      {isOpen && w.registrationEnd && (
        <span style={{ color: "var(--text-muted)" }}> · ينتهي {w.registrationEnd}</span>
      )}
      {status === "upcoming" && w.registrationStart && (
        <span style={{ color: "var(--text-muted)" }}> · يبدأ {w.registrationStart}</span>
      )}
    </div>
  );
}
