"use client";
/* ─── عدّاد الفضة — يظهر في ترويسة كل صفحة (القبة) ───
   يقرأ الرصيد من darb_stats ويحدّثه دورياً وعند العودة للتبويب. عند أي تغيّرٍ
   في الرصيد تظهر حركةٌ بسيطة (نبضة + شارة ±N عابرة). عرضٌ فقط — لا يغيّر أي منطق. */
import { useEffect, useRef, useState } from "react";
import { loadStats } from "@/lib/storage";
import { n } from "@/lib/format";

const readSilver = (): number => {
  if (typeof window === "undefined") return 0;
  try { return loadStats()?.silver ?? 0; } catch { return 0; }
};

export default function SilverCounter() {
  /* يبدأ فارغاً لا بصفر: العرض الأوّل يجري على الخادم بلا localStorage، فلو بدأنا بصفرٍ
     لعرضنا «0» ثم قفز الرصيد الحقيقيّ بشارة «+67» كاذبة عند كل فتحةِ صفحة. */
  const [silver, setSilver] = useState<number | null>(null);
  const [pop, setPop] = useState(false);
  const [delta, setDelta] = useState(0);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const sync = () => {
      const s = readSilver();
      if (s === prev.current) return;
      /* القراءة الأولى بعد التركيب = خطُّ الأساس: تُعرض بلا نبضةٍ ولا شارة */
      const first = prev.current === null;
      const d = first ? 0 : s - prev.current!;
      prev.current = s;
      setSilver(s);
      if (first) return;
      setDelta(d);
      setPop(true);
      timers.push(setTimeout(() => setPop(false), 600));
      timers.push(setTimeout(() => setDelta(0), 1200));
    };
    sync();
    const id = setInterval(sync, 1500);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl" aria-label={`رصيد الفضة ${silver ?? 0}`}
      style={{ background: "color-mix(in srgb, var(--text-muted) 10%, transparent)", border: "1px solid var(--border)", color: "var(--text)" }}>
      <span className={`inline-flex items-center gap-1.5 ${pop ? "silver-pop" : ""}`}>
        <span className="text-[16px] leading-none" aria-hidden>🥈</span>
        {/* عرضٌ أدنى ثابت: تغيّر عدد الخانات (99 ← 100) كان يزحزح الساعة بجانبه */}
        <span className="text-[16px] font-black font-mono-nums tabular-nums inline-block text-center"
          style={{ minWidth: "2.2ch" }}>{silver === null ? "" : n(silver)}</span>
      </span>
      {delta !== 0 && (
        <span className="absolute left-1/2 -top-3.5 -translate-x-1/2 text-[11px] font-black silver-delta whitespace-nowrap"
          style={{ color: delta > 0 ? "var(--success)" : "var(--danger)" }}>
          {delta > 0 ? "+" : "−"}{n(Math.abs(delta))}
        </span>
      )}
    </div>
  );
}
