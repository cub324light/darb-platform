import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/* سياسة أمان المحتوى (CSP) — تسمح بمصادر درب المعروفة فقط (Firebase/Google،
   PostHog، Vercel) وتمنع غيرها. Sentry يمرّ عبر /monitoring (self).
   أُزيلت مصادر Microsoft Clarity (clarity.ms/bing.com) بعد حذف الأداة.
   'unsafe-inline'/'unsafe-eval' لازمة لـ Next/Firebase/pdf.js. عدّل بحذر. */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com https://va.vercel-scripts.com https://apis.google.com https://*.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.gstatic.com https://*.firebaseio.com wss://*.firebaseio.com https://*.storage.googleapis.com https://*.posthog.com https://*.vercel-insights.com https://*.vercel-scripts.com",
  "frame-src 'self' https://*.firebaseapp.com https://*.google.com https://accounts.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["firebase-admin"],
  /* ملاحظة: لا تضع "firebase" في optimizePackageImports — يكسر تسجيل خدمات
     Firebase المعيارية ويسبب «Service firestore is not available» وقت
     prerender لـ /_not-found. */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

/* تغليف Sentry — رفع خرائط المصدر اختياري:
   يعمل فقط عند ضبط SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN في البيئة،
   وإلا يُبنى المشروع طبيعياً مع بقاء رصد الأخطاء وقت التشغيل فعّالاً. */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "darb-05",
  project: process.env.SENTRY_PROJECT ?? "javascript-nextj",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
  /* يحذف عبارات تسجيل التشخيص (logger.*) من حزمة العميل عبر tree-shaking —
     يقلّص بقايا Sentry المدموجة في الحزمة المشتركة دون التأثير على رصد الأخطاء. */
  disableLogger: true,
});
