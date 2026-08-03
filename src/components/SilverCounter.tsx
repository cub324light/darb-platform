"use client";
/* ─── عدّاد الفضة — يظهر في ترويسة كل صفحة (القبة) ───
   عرضٌ فقط — لا يغيّر أي منطق. عند أي تغيّرٍ حقيقيّ في الرصيد تظهر حركةٌ بسيطة
   (نبضة + شارة ±N عابرة).

   ▓ كان يستجوب التخزين كلَّ ١٫٥ ثانية **في كل صفحة**، ويبدأ فارغاً عند كل تركيب.
     فالانتقالُ من مساري إلى المدرسة يُفرِغ العدّاد ثم يملؤه بعد لحظة — يبدو
     كأنّ الترويسة «تعلّق». صار:
       • يبدأ من **آخر رصيدٍ معروف** (ذاكرةٌ في الوحدة) فلا يومض عند كل انتقال.
       • ويسمع `STATS_CHANGED` بدل الاستجواب — يتحدّث لحظةَ يتغيّر لا بعد ثانيتين.
     وبقيت مزامنةٌ عند العودة للتبويب: تبويبٌ آخر قد يكون غيّر الرصيد. */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadStats, STATS_CHANGED } from "@/lib/storage";
import { n } from "@/lib/format";

/* آخرُ رصيدٍ رآه التطبيق في هذه الجلسة — يعبر بين الصفحات فلا يومض العدّاد */
let lastSeen: number | null = null;

const readSilver = (): number => {
  if (typeof window === "undefined") return 0;
  try { return loadStats()?.silver ?? 0; } catch { return 0; }
};

export default function SilverCounter() {
  /* الرسمةُ الأولى على الخادم بلا تخزين — فتبدأ من الذاكرة إن وُجدت، وإلا فارغة.
     البدءُ بصفرٍ كان يطبع «0» ثم يقفز الرصيدُ بشارة «+67» كاذبة. */
  const [silver, setSilver] = useState<number | null>(lastSeen);
  const [pop, setPop] = useState(false);
  const [delta, setDelta] = useState(0);
  const prev = useRef<number | null>(lastSeen);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const sync = () => {
      const s = readSilver();
      if (s === prev.current) return;
      /* أوّلُ قراءةٍ في عمر التطبيق = خطُّ الأساس: تُعرض بلا نبضةٍ ولا شارة */
      const first = prev.current === null;
      const d = first ? 0 : s - prev.current!;
      prev.current = s;
      lastSeen = s;
      setSilver(s);
      if (first) return;
      setDelta(d);
      setPop(true);
      timers.push(setTimeout(() => setPop(false), 600));
      timers.push(setTimeout(() => setDelta(0), 1200));
    };
    sync();
    window.addEventListener(STATS_CHANGED, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener(STATS_CHANGED, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    /* يفتح المتجر: الفضةُ صارت تُصرف، فعدّادُها بابُها */
    <Link href="/store" prefetch={false}
      className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl no-underline transition active:scale-95"
      aria-label={`رصيد الفضة ${silver ?? 0} — افتح المتجر`}
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
    </Link>
  );
}
