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
  /* مسارات الاكتشاف القياسية: المجلّدات التي تبدأ بنقطة لا يولّدها موجّه Next،
     فنُعيد كتابتها إلى معالِجاتٍ حقيقية. و/mcp اسمٌ قصير يتوقّعه عملاء MCP. */
  async rewrites() {
    /* تفاوضُ المحتوى (Markdown for Agents): الطلبُ الذي يحمل
       `Accept: text/markdown` يُحوَّل إلى معالِج النصّ. لا بدّ أن يكون في
       `beforeFiles` — الصفحاتُ ملفّاتٌ موجودة، و`afterFiles` لا يُفحص بعدها
       فلا يفير التحويل أبداً. المتصفّح لا يرسل هذه القيمة فيبقى HTML الأصل. */
    const acceptsMarkdown = [{ type: "header" as const, key: "accept", value: ".*text/markdown.*" }];
    const markdownPages = ["/", "/about", "/features", "/universities", "/faq", "/docs/api", "/changelog"];

    return {
      beforeFiles: markdownPages.map((p) => ({
        source: p,
        has: acceptsMarkdown,
        destination: `/api/markdown?p=${encodeURIComponent(p)}`,
      })),
      afterFiles: [
      /* ‹١› بيانات ومَنافِست تحت /.well-known (المسار القياسيّ الأول) */
      { source: "/.well-known/ai-plugin.json", destination: "/api/well-known/ai-plugin" },
      { source: "/.well-known/agent-card.json", destination: "/api/well-known/agent-card" },
      { source: "/.well-known/agent.json", destination: "/api/well-known/agent-card" },
      { source: "/.well-known/agents.json", destination: "/agents.json" },
      { source: "/.well-known/mcp.json", destination: "/api/well-known/mcp-info" },
      { source: "/.well-known/openapi.json", destination: "/openapi.json" },
      { source: "/.well-known/openapi.yaml", destination: "/openapi.yaml" },
      { source: "/.well-known/schemas.json", destination: "/schemas.json" },
      { source: "/.well-known/llms.txt", destination: "/llms.txt" },
      { source: "/.well-known/llms-full.txt", destination: "/llms-full.txt" },
      { source: "/.well-known/agents.md", destination: "/agents.md" },
      { source: "/.well-known/ai.txt", destination: "/ai.txt" },
      { source: "/.well-known/oauth-protected-resource", destination: "/api/well-known/oauth-protected-resource" },
      { source: "/.well-known/oauth-authorization-server", destination: "/api/well-known/oauth-authorization-server" },
      /* ‹٢› الأسماءُ الجذرية القصيرة — عملاءُ كثيرون يجرّبونها قبل /.well-known،
         والمحتوى واحدٌ في الحالتين (نفس المعالِج، لا نسخة ثانية). */
      { source: "/ai-plugin.json", destination: "/api/well-known/ai-plugin" },
      { source: "/agent.json", destination: "/api/well-known/agent-card" },
      { source: "/agent-card.json", destination: "/api/well-known/agent-card" },
      { source: "/mcp.json", destination: "/api/well-known/mcp-info" },
      { source: "/oauth-protected-resource", destination: "/api/well-known/oauth-protected-resource" },
      { source: "/oauth-authorization-server", destination: "/api/well-known/oauth-authorization-server" },
      { source: "/mcp", destination: "/api/mcp" },
      /* ‹٣› معاييرُ الاكتشاف الحديثة */
      { source: "/.well-known/api-catalog", destination: "/api/well-known/api-catalog" },
      { source: "/.well-known/mcp/server-card.json", destination: "/api/well-known/mcp-server-card" },
      { source: "/.well-known/agent-skills/index.json", destination: "/api/well-known/agent-skills-index" },
      { source: "/.well-known/agent-skills/:skill/SKILL.md", destination: "/api/well-known/agent-skills/:skill" },
      { source: "/.well-known/auth.md", destination: "/auth.md" },
      ],
    };
  },

  async headers() {
    return [
      {
        /* ترويسةُ Link (RFC 8288) على الجذر — تقود الوكيلَ إلى فهرس الواجهات
           ووصفِها وتوثيقِها قبل أن يقرأ حرفاً من الصفحة. أنواعُ العلاقات
           مسجَّلةٌ في IANA: `api-catalog` (RFC 9727) و`service-desc`/`service-doc`
           (RFC 8631). */
        source: "/",
        headers: [
          {
            key: "Link",
            value: [
              '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
              '</openapi.json>; rel="service-desc"; type="application/json"',
              '</docs/api>; rel="service-doc"; type="text/html"',
            ].join(", "),
          },
        ],
      },
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
