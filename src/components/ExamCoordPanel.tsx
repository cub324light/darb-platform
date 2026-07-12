"use client";
/* ─── تنسيق الاختبارات: لما يكون عند الطالب مسارين أو أكثر، يختار كيف
   توزّع المنصة وقته بينهما (بالتسلسل / تناوب / نص اليوم) أو يكتب تخصيصه الحر.
   التفضيل يُحفظ في darb_exam_coord ويُغذّى للمساعد الذكي عند توليد الجداول. ───*/
import { useState } from "react";
import { loadExamCoord, saveExamCoord, type ExamCoordStrategy, type ExamCoord } from "@/lib/storage";

const OPTIONS: { id: ExamCoordStrategy; label: string; desc: string }[] = [
  { id: "sequential", label: "بالتسلسل",        desc: "خلّص الاختبار الأقرب موعداً أولاً، ثم الثاني" },
  { id: "alternate",  label: "يوم لكل مسار",     desc: "يوم قدرات، يوم تحصيلي — بالتناوب" },
  { id: "split",      label: "نص اليوم لكل مسار", desc: "كل يوم يُقسم بين المسارين" },
  { id: "custom",     label: "تخصيص حر",         desc: "اكتب تنسيقك بنفسك" },
];

export default function ExamCoordPanel({ tracks }: { tracks: string[] }) {
  const [coord, setCoord] = useState<ExamCoord>(() => loadExamCoord());
  if (tracks.length < 2) return null;

  const update = (patch: Partial<ExamCoord>) => {
    setCoord((c) => { const n = { ...c, ...patch }; saveExamCoord(n); return n; });
  };

  return (
    <div className="px-5 mb-5">
      <div className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-[19px]">🔀</span>
          <p className="font-black text-[17px]" style={{ color: "var(--text)" }}>تنسيق اختباراتك</p>
        </div>
        <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
          عندك أكثر من اختبار ({tracks.join(" و")}). اختر كيف توزّع وقتك بينها — يأخذها دويرب بالحسبان عند بناء جدولك.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map((o) => {
            const active = coord.strategy === o.id;
            return (
              <button key={o.id} onClick={() => update({ strategy: o.id })}
                className="rounded-xl px-3 py-2.5 text-right transition active:scale-[0.98]"
                style={active
                  ? { background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1.5px solid var(--accent)" }
                  : { background: "var(--surface2)", border: "1.5px solid var(--border)" }}>
                <p className="font-bold text-[15px]" style={{ color: active ? "var(--accent-light)" : "var(--text)" }}>{o.label}</p>
                <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{o.desc}</p>
              </button>
            );
          })}
        </div>

        {coord.strategy === "custom" && (
          <textarea value={coord.custom} onChange={(e) => update({ custom: e.target.value })}
            placeholder="مثال: ركّز على القدرات أسبوعين قبل اختباره، وبعد اختبار القدرات حوّل كامل الوقت للتحصيلي."
            rows={3} maxLength={400}
            className="w-full rounded-xl px-3 py-2.5 text-[15px] text-[var(--text)] placeholder-[var(--text-muted)] outline-none resize-y"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }} />
        )}
      </div>
    </div>
  );
}
