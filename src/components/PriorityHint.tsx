"use client";
/* ─── تلميح الأولوية — «درب يقترح الشيء الصحيح» بلا أي مصطلح ───
   شريطٌ خفيف يقرأ أولوية الطالب الأولى من العقل المركزي ويعرضها كاقتراح طبيعي
   (أيقونة + العنوان + سببٌ قصير + إجراء). لا يذكر «العقل» ولا نِسَب ثقة ولا قواعد.
   يختفي إن كانت الوجهة هي الصفحة الحالية (لا دوران). بوابة mount تمنع أي تباين
   hydration في الصفحات المُخدَّمة من الخادم. */
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { readLifeContext, lifeEngine, type Priority } from "@/lib/lifeEngine";

/* «هل نحن على العميل؟» بلا setState في effect (قاعدة React Compiler):
   لقطة الخادم false، لقطة العميل true — يعالج React التباين بأمان. */
const noop = () => () => {};
function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export default function PriorityHint() {
  const pathname = usePathname();
  const mounted = useMounted();
  const [top] = useState<Priority | null>(() =>
    typeof window === "undefined" ? null : lifeEngine(readLifeContext())[0] ?? null);

  if (!mounted || !top) return null;
  const target = top.href.split("#")[0];
  if (target !== "/" && pathname.startsWith(target)) return null; // لا تقترح صفحتك الحالية

  return (
    <Link href={top.href}
      className="ds-card flex items-center gap-3 no-underline transition active:scale-[0.99]"
      style={{
        background: "color-mix(in srgb, var(--accent) 7%, var(--surface))",
        borderColor: "color-mix(in srgb, var(--accent) 22%, var(--border))",
      }}>
      <span className="text-[20px] flex-shrink-0" aria-hidden="true">{top.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="t-body font-black leading-snug" style={{ color: "var(--text)" }}>{top.title}</p>
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>{top.why}</p>
      </div>
      <span className="t-caption font-black px-3 rounded-lg flex-shrink-0 flex items-center whitespace-nowrap"
        style={{ height: "var(--btn-h-sm)", background: "var(--accent)", color: "#fff" }}>
        {top.cta} ←
      </span>
    </Link>
  );
}
