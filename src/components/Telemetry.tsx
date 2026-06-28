"use client";
import { useEffect } from "react";
import { hasAnalyticsConsent, CONSENT_EVENT } from "@/lib/consent";

/* ─── التحليلات (PostHog فقط — أحداث يدوية صريحة) ───
   - لا تُحمَّل إطلاقاً قبل موافقة المستخدم (consent). الافتراضي: مُعطَّل.
   - بلا autocapture وبلا التقاط تلقائي للصفحات أو المغادرة —
     فقط استدعاءات trackEvent()/capture() الصريحة تُسجَّل.
   - أُزيل Microsoft Clarity (تسجيل الجلسات) بالكامل.
   - Sentry يُدار في instrumentation-client، مشروطاً بنفس الموافقة.
*/

let started = false;

function initPostHog() {
  if (started) return;
  // المعرّف عام (يظهر في كود المتصفح) — مضمّن افتراضياً بلا ضبط إضافي في Vercel
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || "phc_B9zkWuSUTpoQuZ4JZWyeTp3mFzDVmdYBkqPygVjJjziL";
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
  if (!posthogKey) return;
  started = true;

  import("posthog-js")
    .then((mod) => {
      mod.default.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: "identified_only",
        /* خصوصية-أولاً: لا التقاط تلقائي — أحداث صريحة فقط */
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
      });
      // نتيحه عالمياً ليقرأه نظام أعلام الميزات (src/lib/flags.ts) ونظام الأحداث
      (window as unknown as { posthog?: unknown }).posthog = mod.default;
    })
    .catch(() => {});
}

export default function Telemetry() {
  useEffect(() => {
    if (hasAnalyticsConsent()) initPostHog();
    /* لو فعّل المستخدم التحليلات لاحقاً من الإعدادات — نهيّئها فوراً بلا إعادة تحميل */
    const onConsent = () => { if (hasAnalyticsConsent()) initPostHog(); };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  return null;
}
