"use client";
/* ─── تنبيهات التقويم الدراسي — تظهر لطلاب الثانوية فقط ─── */
import { useMemo, useState } from "react";
import { loadUser } from "@/lib/storage";
import { activeSchoolEvent, upcomingSchoolEvents } from "@/lib/school-calendar";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SchoolCalendarAlert() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("darb_school_dismissed") : null;
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem("darb_school_dismissed", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const alerts = useMemo(() => {
    if (typeof window === "undefined") return [];
    const u = loadUser();
    if (u?.studyLevel !== "ثانوي") return [];

    const today = todayStr();
    const result: { id: string; text: string; sub: string; color: string }[] = [];

    const active = activeSchoolEvent(today);
    if (active && active.type === "break") {
      const ends = new Date(active.to);
      const endsStr = ends.toLocaleDateString("ar-SA", { day: "numeric", month: "long" });
      result.push({
        id: active.id,
        text: `🎉 ${active.label} — استغل الوقت للمذاكرة`,
        sub: `تنتهي الإجازة ${endsStr}`,
        color: "var(--success)",
      });
    }
    if (active && active.type === "end") {
      result.push({
        id: active.id,
        text: "☀️ إجازة نهاية العام — وقت مثالي للتحضير",
        sub: "اغتنم الصيف لرفع درجاتك قبل السنة القادمة",
        color: "var(--gold)",
      });
    }

    const upcoming = upcomingSchoolEvents(today, 7);
    for (const ev of upcoming) {
      if (ev.type === "break" || ev.type === "end") {
        const daysLeft = Math.round((new Date(ev.from).getTime() - new Date(today).getTime()) / 86400000);
        result.push({
          id: ev.id,
          text: `🔔 ${ev.label} خلال ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"}`,
          sub: "فرصة مذاكرة قادمة — خطّط مسبقاً",
          color: "var(--accent)",
        });
      }
    }

    return result.filter((a) => !dismissed.has(a.id));
  }, [dismissed]);

  if (!alerts.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a) => (
        <div key={a.id} className="rounded-2xl px-4 py-3 flex items-start gap-3"
          style={{
            background: `color-mix(in srgb, ${a.color} 8%, var(--surface))`,
            border: `1px solid color-mix(in srgb, ${a.color} 22%, transparent)`,
          }}>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black" style={{ color: a.color }}>{a.text}</p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>{a.sub}</p>
          </div>
          <button onClick={() => dismiss(a.id)} aria-label="إغلاق"
            className="text-[var(--text-muted)] text-sm font-bold px-1 flex-shrink-0">✕</button>
        </div>
      ))}
    </div>
  );
}
