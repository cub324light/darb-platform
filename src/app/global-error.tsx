"use client";

import { useEffect } from "react";
import { hasAnalyticsConsent } from "@/lib/consent";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  /* استيرادٌ ديناميكيّ: صفحةُ العطل جزءٌ من الحزمة الأولى، فاستيرادُ Sentry في
     رأسها يُدخل ٤٢٨ ك.ب على كلّ طالبٍ ليقرأ صفحةً قد لا يراها أبداً. ولا يُرسَل
     شيءٌ بلا موافقةٍ على التحليلات — والرسالةُ أدناه تقول ذلك بصدق. */
  useEffect(() => {
    if (!hasAnalyticsConsent()) return;
    import("@sentry/nextjs").then((S) => S.captureException(error)).catch(() => {});
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: "#07070D", color: "#E8E8F0", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px", gap: "12px" }}>
          <div style={{ fontSize: "44px" }}>🌧️</div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>صار خطأ غير متوقّع</h1>
          <p style={{ fontSize: "15px", opacity: 0.7, maxWidth: "340px", lineHeight: 1.7, margin: 0 }}>
            جرّب تعيد المحاولة أو حدّث الصفحة. وإذا تكرّر معك راسلنا على support@usedarb.com.
          </p>
          <button
            onClick={() => (reset ? reset() : window.location.reload())}
            style={{ marginTop: "8px", padding: "12px 28px", borderRadius: "16px", border: "none", background: "#2563EB", color: "#fff", fontSize: "16px", fontWeight: 800, cursor: "pointer" }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
