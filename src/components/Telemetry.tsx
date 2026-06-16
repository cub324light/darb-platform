"use client";
import { useEffect } from "react";

/* ─── المراقبة والتحليلات ───
   كل خدمة تعمل فقط إذا ضُبط مفتاحها في متغيّرات البيئة (Vercel).
   بدون مفاتيح = لا شيء يُحمّل (آمن تماماً للنشر).
   - Sentry        : NEXT_PUBLIC_SENTRY_DSN      (رصد الأخطاء)
   - MS Clarity    : NEXT_PUBLIC_CLARITY_ID      (خرائط حرارية + تسجيل الجلسات)
   - PostHog       : NEXT_PUBLIC_POSTHOG_KEY     (تحليلات المنتج)
                     NEXT_PUBLIC_POSTHOG_HOST    (اختياري، الافتراضي us.i.posthog.com)
*/

let started = false;

export default function Telemetry() {
  useEffect(() => {
    if (started) return;
    started = true;

    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

    /* ─ Sentry: رصد الأخطاء ─ */
    if (sentryDsn) {
      import("@sentry/browser")
        .then((Sentry) => {
          Sentry.init({
            dsn: sentryDsn,
            environment: process.env.NODE_ENV,
            tracesSampleRate: 0.1,
            replaysSessionSampleRate: 0,
            replaysOnErrorSampleRate: 0,
          });
        })
        .catch(() => {});
    }

    /* ─ Microsoft Clarity: كيف يستخدم الناس الموقع ─ */
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

    /* ─ PostHog: تحليلات أعمق ─ */
    if (posthogKey) {
      import("posthog-js")
        .then((mod) => {
          const posthog = mod.default;
          posthog.init(posthogKey, {
            api_host: posthogHost,
            person_profiles: "identified_only",
            capture_pageview: true,
            capture_pageleave: true,
          });
        })
        .catch(() => {});
    }
  }, []);

  return null;
}
