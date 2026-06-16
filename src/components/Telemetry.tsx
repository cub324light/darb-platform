"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/* ─── التحليلات ───
   - MS Clarity : NEXT_PUBLIC_CLARITY_ID   (خرائط حرارية + تسجيل الجلسات)
   - PostHog    : NEXT_PUBLIC_POSTHOG_KEY  (تحليلات المنتج — منطقة EU)
   - Sentry     : يُدار عبر @sentry/nextjs في ملفات instrumentation
*/

let started = false;
// نحتفظ بـ Promise حتى يستطيع تأثير المسار التقاط الصفحة الأولى وما بعدها
let phReady: Promise<{ capture: (e: string) => void } | null> | null = null;

export default function Telemetry() {
  const pathname = usePathname();

  /* التهيئة — مرة واحدة فقط */
  useEffect(() => {
    if (started) return;
    started = true;

    // المعرّفات عامة (تظهر في كود المتصفح) — مضمّنة افتراضياً بلا ضبط إضافي في Vercel
    const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID || "x7xp1l6g8h";
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || "phc_B9zkWuSUTpoQuZ4JZWyeTp3mFzDVmdYBkqPygVjJjziL";
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

    /* Microsoft Clarity */
    if (clarityId && !document.getElementById("ms-clarity")) {
      const s = document.createElement("script");
      s.id = "ms-clarity";
      s.type = "text/javascript";
      s.async = true;
      s.innerHTML =
        `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};` +
        `t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;` +
        `y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`;
      document.head.appendChild(s);
    }

    /* PostHog — capture_pageview:false لأن تأثير pathname يتولّى تتبّع كل الصفحات */
    if (posthogKey) {
      phReady = import("posthog-js")
        .then((mod) => {
          const posthog = mod.default;
          posthog.init(posthogKey, {
            api_host: posthogHost,
            person_profiles: "identified_only",
            capture_pageview: false,
            capture_pageleave: true,
          });
          return posthog;
        })
        .catch(() => null);
    }
  }, []);

  /* تتبّع $pageview عند كل تنقّل (بما فيه الصفحة الأولى) */
  useEffect(() => {
    phReady?.then((ph) => { ph?.capture("$pageview"); });
  }, [pathname]);

  return null;
}
