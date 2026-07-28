"use client";
/* ─── شريط الاستراتيجية الموحّد ───
   عرض واحد لكائن StudyStrategy — يُستعمل في الخطة والخريطة والمدرّب الأسبوعي.
   لا يقرّر شيئاً: يعرض قرار المحرّك فقط (getStrategy) فيرى الطالب نفس التوجيه. */
import { useMemo, useState } from "react";
import { getStrategy } from "@/lib/strategy";
import { n as ar } from "@/lib/format";


const INTENSITY_ICON: Record<string, string> = { light: "🌿", moderate: "⚖️", intensive: "🔥" };
const ALLOCATION_ICON: Record<string, string> = { single: "🎯", parallel: "⚌", rotating: "🔄" };

interface Props {
  /** افتراضياً مضغوط؛ expanded يفتح التفاصيل مباشرة */
  defaultExpanded?: boolean;
  /** عنوان مخصّص */
  title?: string;
}

export default function StrategyBanner({ defaultExpanded = false, title = "استراتيجية دويرب لك" }: Props) {
  const s = useMemo(() => getStrategy(), []);
  const [open, setOpen] = useState(defaultExpanded);

  const intensityColor =
    s.intensity === "intensive" ? "var(--danger)" :
    s.intensity === "moderate" ? "var(--accent-light)" : "var(--success)";

  return (
    <div className="rounded-3xl p-4 flex flex-col gap-3"
      style={{ background: "color-mix(in srgb, var(--accent) 7%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>

      {/* الرأس */}
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex items-center gap-2.5 w-full text-right">
        <span className="text-[23px]" aria-hidden="true">🧭</span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>{title}</p>
          <p className="text-[17px] font-black truncate" style={{ color: "var(--text)" }}>
            <span style={{ color: intensityColor }}>{INTENSITY_ICON[s.intensity]} {s.labels.intensity}</span>
            {" · "}
            {ALLOCATION_ICON[s.allocation]} {s.labels.allocation}
          </p>
        </div>
        <span className="text-[14px] font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* صفّ سريع دائم الظهور */}
      <div className="flex flex-wrap gap-1.5">
        {[
          `⏱️ ${s.session.label}`,
          `📚 مراجعة ${s.labels.review}`,
          `📅 ${ar(s.weeklyHoursTotal)} ساعة/أسبوع`,
          ...(s.preferredTime ? [`🌙 ${s.preferredTime}`] : []),
          `🗓️ ${s.calendarStatus}`,
          ...(s.weeksToExam != null ? [`⏳ ${ar(s.weeksToExam)} أسبوع للاختبار`] : []),
        ].map((chip) => (
          <span key={chip} className="text-[13px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
            {chip}
          </span>
        ))}
      </div>

      {/* التفاصيل عند الفتح */}
      {open && (
        <div className="flex flex-col gap-3 pt-1">
          {/* المبرّر */}
          <p className="text-[14px] font-semibold" style={{ color: "var(--text-muted)" }}>{s.rationale}</p>

          {/* ملاحظة فترة الاختبارات المدرسية */}
          {s.schoolFinalsNote && (
            <p className="text-[14px] font-bold rounded-xl px-3 py-2"
              style={{ background: "color-mix(in srgb, var(--danger) 8%, transparent)", color: "var(--danger)" }}>
              📝 {s.schoolFinalsNote}
            </p>
          )}

          {/* ساعات كل مادة */}
          {s.perSubject.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[14px] font-black" style={{ color: "var(--text)" }}>توزيع الساعات الأسبوعية</p>
              {s.perSubject.map((sub) => {
                const maxH = Math.max(...s.perSubject.map((x) => x.hoursPerWeek), 1);
                return (
                  <div key={sub.name} className="flex items-center gap-2">
                    <p className="text-[14px] font-bold w-24 flex-shrink-0 truncate" style={{ color: "var(--text-muted)" }}>{sub.name}</p>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(sub.hoursPerWeek / maxH) * 100}%`, background: "var(--accent)" }} />
                    </div>
                    <p className="text-[12px] font-bold w-12 text-left" style={{ color: "var(--text-muted)" }}>{ar(sub.hoursPerWeek)} س</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* قاعدة الانتقال */}
          <div className="rounded-2xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
            <p className="text-[14px] font-black mb-0.5" style={{ color: "var(--accent-light)" }}>↔️ قاعدة الانتقال بين المواد</p>
            <p className="text-[14px] font-semibold leading-relaxed" style={{ color: "var(--text)" }}>{s.transitionRule}</p>
          </div>
        </div>
      )}
    </div>
  );
}
