"use client";
/* ─── إعدادات التقويم الدراسي ───
   يخزّن تفضيلات الطالب (نوعه/منطقته/سنة تخرّجه) في darb_calendar.
   تُشتقّ افتراضياً من ملف الطالب — التعديل اختياري (لا يعتمد على إدخال يدوي). */
import { useMemo, useState } from "react";
import { loadUser, loadCalendarConfig, saveCalendarConfig } from "@/lib/storage";
import { CALENDAR_UPDATED_FOR, type CalendarConfig, type StudentType } from "@/lib/academicCalendar";

const REGIONS = [
  "الرياض", "مكة المكرمة", "المدينة المنورة", "القصيم", "المنطقة الشرقية",
  "عسير", "تبوك", "حائل", "الحدود الشمالية", "جازان", "نجران", "الباحة", "الجوف",
];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className="px-3.5 py-2 rounded-full text-[15px] font-bold transition active:scale-95"
      style={{
        background: on ? "var(--accent)" : "var(--surface2)",
        color: on ? "#fff" : "var(--text-muted)",
        border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
      }}>
      {children}
    </button>
  );
}

export default function CalendarSettings() {
  const user = useMemo(() => loadUser(), []);
  const [cfg, setCfg] = useState<CalendarConfig>(() => loadCalendarConfig<CalendarConfig>());

  /* قيم فعّالة: تجاوز الطالب أو المشتقّ من ملفه */
  const studentType: StudentType = cfg.studentType
    ?? (user?.studyLevel === "جامعي" || user?.studyLevel === "خريج" ? "جامعي" : "ثانوي");
  const region = cfg.region ?? user?.region ?? "";
  const gradYear = cfg.graduationYear ?? "";

  const update = (partial: Partial<CalendarConfig>) => {
    setCfg((prev) => { const next = { ...prev, ...partial }; saveCalendarConfig(next); return next; });
  };

  const thisYear = 2026;
  const gradYears = [thisYear, thisYear + 1, thisYear + 2, thisYear + 3];

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div>
        <p className="label mb-1">🗓️ التقويم الدراسي</p>
        <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
          يربط خطتك بالدراسة والإجازات والاختبارات الحقيقية. مُحدَّث لـ {CALENDAR_UPDATED_FOR}.
        </p>
      </div>

      <div>
        <p className="text-[15px] font-bold mb-2" style={{ color: "var(--text)" }}>نوع الطالب</p>
        <div className="flex flex-wrap gap-2">
          {(["ثانوي", "جامعي"] as StudentType[]).map((t) => (
            <Chip key={t} on={studentType === t} onClick={() => update({ studentType: t })}>{t}</Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[15px] font-bold mb-2" style={{ color: "var(--text)" }}>المنطقة</p>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <Chip key={r} on={region === r} onClick={() => update({ region: region === r ? undefined : r })}>{r}</Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[15px] font-bold mb-2" style={{ color: "var(--text)" }}>سنة التخرّج المتوقعة</p>
        <div className="flex flex-wrap gap-2">
          {gradYears.map((y) => (
            <Chip key={y} on={gradYear === y} onClick={() => update({ graduationYear: gradYear === y ? undefined : y })}>
              {y.toLocaleString("ar")}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
