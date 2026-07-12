"use client";
/* ─── بطاقة «اعرف أكثر» — تعريفٌ قصير قابل للطيّ ───
   ليست مقدّمة كبيرة: سطران–ثلاثة، صغيرة الأثر. تظهر مفتوحةً مرّةً واحدة للمستخدم
   الجديد ثم تبقى مطويّةً في الزيارات التالية إلا إذا فتحها بنفسه. حالة «شوهدت»
   تُحفَظ محلياً بمفتاحٍ خاص لكل تعريف. SSR-safe، بلا setState في effect. */
import { useState, useEffect } from "react";

export default function DefCard({ id, q, a }: { id: string; q: string; a: string }) {
  const key = `darb_def_${id}`;
  /* أول مرة (لم تُشاهَد بعد) → مفتوحة؛ وإلا مطويّة */
  const [open, setOpen] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem(key) !== "1");
  /* نُعلّمها «مُشاهَدة» عند أول تركيب — دون setState (لا يخالف React Compiler) */
  useEffect(() => { try { localStorage.setItem(key, "1"); } catch { /* */ } }, [key]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-right transition active:scale-[0.99]">
        <span className="text-[16px] flex-shrink-0" aria-hidden="true">❔</span>
        <span className="t-small font-bold flex-1 min-w-0" style={{ color: "var(--text-dim)" }}>{q}</span>
        <span className="t-caption flex-shrink-0" style={{ color: "var(--text-muted)" }}>{open ? "إخفاء ▾" : "اعرف أكثر ▸"}</span>
      </button>
      {open && (
        <p className="px-3.5 pb-3 t-small" style={{ color: "var(--text-muted)", lineHeight: 1.75 }}>{a}</p>
      )}
    </div>
  );
}
