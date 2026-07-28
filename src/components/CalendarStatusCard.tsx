"use client";
/* ─── بطاقة حالة التقويم الدراسي ───
   تعرض ما يعرفه دويرب عن واقع الطالب: إجازة؟ اختبارات قريبة؟ دراسة؟
   كم أسبوع للاختبار؟ — مشتقّة من محرّك التقويم السعودي (currentCalendarSnapshot). */
import { useMemo } from "react";
import { currentCalendarSnapshot } from "@/lib/strategy";
import { n as ar } from "@/lib/format";


const PHASE_STYLE: Record<string, { bg: string; fg: string; icon: string }> = {
  study:         { bg: "var(--accent)",  fg: "var(--accent-light)", icon: "📖" },
  break:         { bg: "var(--success)", fg: "var(--success)",      icon: "🌴" },
  summer:        { bg: "var(--gold)",    fg: "var(--gold)",         icon: "☀️" },
  school_finals: { bg: "var(--danger)",  fg: "var(--danger)",       icon: "📝" },
};

export default function CalendarStatusCard() {
  const snap = useMemo(() => currentCalendarSnapshot(), []);
  if (!snap.hasData) return null;

  const ps = PHASE_STYLE[snap.phase] ?? PHASE_STYLE.study;

  return (
    <div className="rounded-3xl p-4 flex flex-col gap-3"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

      {/* الرأس: الطور الحالي */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[20px] flex-shrink-0"
          style={{ background: `color-mix(in srgb, ${ps.bg} 15%, transparent)` }}>
          <span aria-hidden="true">{ps.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>التقويم الدراسي</p>
          <p className="text-[17px] font-black" style={{ color: ps.fg }}>{snap.phaseLabel}</p>
        </div>
        {snap.yearLabel && (
          <span className="text-[12px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
            {snap.yearLabel}
          </span>
        )}
      </div>

      {/* الفترة النشطة (إن وُجدت) */}
      {snap.activePeriods[0] && (
        <p className="text-[14px] font-semibold" style={{ color: "var(--text-muted)" }}>
          {snap.activePeriods[0].label}
        </p>
      )}

      {/* عدّادات */}
      <div className="grid grid-cols-2 gap-2">
        {snap.nextExam && (
          <div className="rounded-2xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
            <p className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>أقرب اختبار</p>
            <p className="text-[15px] font-black truncate" style={{ color: "var(--text)" }}>{snap.nextExam.label}</p>
            <p className="text-[14px] font-bold" style={{ color: "var(--accent-light)" }}>
              بعد {ar(snap.nextExam.weeksUntil)} أسبوع{snap.nextExam.approximate ? " (تقديري)" : ""}
            </p>
          </div>
        )}
        {snap.nextSchoolFinals && snap.nextSchoolFinals.daysUntil <= 45 && (
          <div className="rounded-2xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
            <p className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>اختبارات مدرسية</p>
            <p className="text-[15px] font-black truncate" style={{ color: "var(--text)" }}>{snap.nextSchoolFinals.label}</p>
            <p className="text-[14px] font-bold" style={{ color: "var(--gold)" }}>
              بعد {ar(snap.nextSchoolFinals.daysUntil)} يوماً
            </p>
          </div>
        )}
      </div>

      {/* تنبيه فترة الاختبارات المدرسية */}
      {snap.inSchoolFinals && (
        <p className="text-[14px] font-bold rounded-xl px-3 py-2"
          style={{ background: "color-mix(in srgb, var(--danger) 8%, transparent)", color: "var(--danger)" }}>
          📝 أنت في فترة اختباراتك المدرسية — قدّمها الآن، وخفّفنا تركيز قياس مؤقتاً.
        </p>
      )}
      {snap.onVacation && !snap.inSchoolFinals && (
        <p className="text-[14px] font-bold rounded-xl px-3 py-2"
          style={{ background: "color-mix(in srgb, var(--success) 8%, transparent)", color: "var(--success)" }}>
          🌴 أنت في إجازة — رفعنا ساعات المذاكرة المقترحة لاستثمار الوقت.
        </p>
      )}

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        مُحدَّث لـ {snap.updatedFor} · مواعيد قياس قد تتغيّر — اعتمد موعدك المسجّل
      </p>
    </div>
  );
}
