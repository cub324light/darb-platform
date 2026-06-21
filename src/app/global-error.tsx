"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: "#07070D", color: "#E8E8F0", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px", gap: "12px" }}>
          <div style={{ fontSize: "44px" }}>🌧️</div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>صار خطأ غير متوقّع</h1>
          <p style={{ fontSize: "15px", opacity: 0.7, maxWidth: "340px", lineHeight: 1.7, margin: 0 }}>
            سجّلنا المشكلة تلقائياً ونشتغل عليها. جرّب تعيد المحاولة أو حدّث الصفحة.
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
