"use client";
import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { hasAnalyticsConsent, CONSENT_EVENT } from "@/lib/consent";

/* تحليلات Vercel (الزيارات) و Speed Insights — لا تُركَّب في الشجرة إلا بعد
   موافقة المستخدم. الافتراضي: مُعطَّل، فلا تُحمَّل سكربتاتها قبل الموافقة.
   تتفاعل مع تبديل الموافقة من الإعدادات بلا إعادة تحميل. */
export default function AnalyticsGate() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const sync = () => setConsented(hasAnalyticsConsent());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!consented) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
