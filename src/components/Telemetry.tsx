"use client";
import { useEffect } from "react";

/* ─── التحليلات ───
   - MS Clarity : NEXT_PUBLIC_CLARITY_ID   (خرائط حرارية + تسجيل الجلسات)
   - PostHog    : NEXT_PUBLIC_POSTHOG_KEY  (تحليلات المنتج — منطقة EU)
   - Sentry     : يُدار عبر @sentry/nextjs في ملفات instrumentation
*/

let started = false;

export default function Telemetry() {
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

    /* PostHog — 'history_change' يلتقط $pageview تلقائياً عند كل تنقّل في App Router */
    if (posthogKey) {
      import("posthog-js")
        .then((mod) => {
          mod.default.init(posthogKey, {
            api_host: posthogHost,
            person_profiles: "identified_only",
            capture_pageview: "history_change",
            capture_pageleave: true,
          });
        })
        .catch(() => {});
    }
  }, []);

  return null;
}
