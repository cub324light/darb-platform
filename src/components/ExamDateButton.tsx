"use client";
import { useRef } from "react";

/* زر تحديد موعد الاختبار — يفتح منتقي التاريخ الأصلي بثبات على الجوال
   (showPicker أولاً ثم بدائل) بدون أي إيموجي. */
export default function ExamDateButton({
  value,
  color,
  min,
  onChange,
  onClear,
}: {
  value: string;
  color: string;
  min?: string;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const open = () => {
    const el = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!el) return;
    if (el.showPicker) {
      try { el.showPicker(); return; } catch {}
    }
    el.focus();
    el.click();
  };

  const label = value
    ? new Date(value + "T00:00:00").toLocaleDateString("ar-SA", { month: "short", day: "numeric" })
    : "تحديد الموعد";

  return (
    <div className="relative flex items-center gap-1.5 flex-shrink-0">
      <button
        type="button"
        onClick={open}
        className="px-3 py-2 rounded-xl text-[12.5px] font-bold min-h-[40px] transition active:scale-95 whitespace-nowrap"
        style={{
          background: value ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--surface2)",
          color: value ? color : "var(--text-muted)",
          border: `1px solid ${value ? `${color}66` : "var(--border)"}`,
        }}
      >
        {label}
      </button>
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="text-[var(--text-muted)] text-base px-1 min-h-[40px] flex-shrink-0"
          aria-label="مسح"
        >
          ✕
        </button>
      )}
      {/* مدخل التاريخ الفعلي — مخفي بصرياً لكنه يبقى قابلاً للفتح عبر showPicker */}
      <input
        ref={ref}
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="absolute opacity-0 pointer-events-none"
        style={{ width: 1, height: 1, bottom: 0, insetInlineStart: 0 }}
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
