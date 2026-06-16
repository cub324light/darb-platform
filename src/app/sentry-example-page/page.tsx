"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

/* دالة غير معرّفة عمداً — تُطلق خطأً يلتقطه Sentry للتحقق */
declare const myUndefinedFunction: () => void;

export default function SentryExamplePage() {
  const [msg, setMsg] = useState("");

  /* خطأ في الواجهة (العميل) */
  const throwClientError = () => {
    myUndefinedFunction();
  };

  /* خطأ في الخادم (عبر API) داخل span للتتبّع */
  const throwServerError = async () => {
    setMsg("...جاري إرسال خطأ تجريبي للخادم");
    await Sentry.startSpan({ name: "Sentry Example Frontend Span", op: "test" }, async () => {
      try {
        const res = await fetch("/api/sentry-example-api");
        if (!res.ok) setMsg("✅ أُرسل خطأ الخادم — تحقّق من لوحة Sentry");
      } catch {
        setMsg("✅ أُرسل خطأ الخادم — تحقّق من لوحة Sentry");
      }
    });
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 32, textAlign: "center", fontFamily: "sans-serif" }} dir="rtl">
      <h1 style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>صفحة اختبار Sentry</h1>
      <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>
        اضغط الأزرار لإطلاق أخطاء تجريبية والتأكّد من وصولها إلى لوحة Sentry، ثم احذف هذه الصفحة.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button onClick={throwClientError}
          style={{ padding: "12px 16px", borderRadius: 12, background: "#7553FF", color: "#fff", fontWeight: 700, border: 0 }}>
          إطلاق خطأ في الواجهة (العميل)
        </button>
        <button onClick={throwServerError}
          style={{ padding: "12px 16px", borderRadius: 12, background: "#362d59", color: "#fff", fontWeight: 700, border: 0 }}>
          إطلاق خطأ في الخادم (API)
        </button>
      </div>
      {msg && <p style={{ marginTop: 16, fontWeight: 700 }}>{msg}</p>}
    </main>
  );
}
