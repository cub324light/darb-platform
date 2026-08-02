import type { MetadataRoute } from "next";

/* الصفحات الخاصة (خلف تسجيل الدخول أو إدارية) — تُمنع من الفهرسة كي لا يفهرس
   Google جدران تسجيل دخول رفيعة أو مسارات خاصة. الصفحات العامة تبقى مسموحة. */
const PRIVATE_PATHS = [
  "/admin",
  "/dashboard", "/profile", "/vault", "/council", "/arena", "/orbit",
  "/roadmap", "/review", "/skills", "/challenges", "/leaderboard",
  "/study-plan", "/plan", "/university", "/opportunities", "/parent", "/onboarding",
  "/guide", "/uni-gear", "/uni-tools", "/career",
];

/* واجهاتُ الوكلاء عامّةٌ عمداً وتُقرأ آلياً، فتُستثنى من منع «/api/».
   بقيةُ «/api/» تبقى ممنوعة (مصادقة/حساب/دفع/تحليلات). */
const ALLOW = [
  "/", "/universities",
  "/llms.txt", "/llms-full.txt", "/agents.md", "/ai.txt",
  "/openapi.json", "/openapi.yaml", "/agents.json", "/schemas.json",
  "/ai-plugin.json", "/agent.json", "/agent-card.json", "/mcp.json",
  "/oauth-protected-resource", "/oauth-authorization-server",
  "/api/agent/", "/api/mcp", "/mcp", "/api/well-known/", "/.well-known/",
];

/* روبوتاتُ الذكاء الاصطناعي المسموح لها صراحةً. تُجمَع في **مجموعةٍ واحدة**
   بأسطر User-agent متتالية — هذه هي الصيغة القياسية، وتُبقي الملفّ صغيراً
   مقروءاً. (كان تكرارُ المجموعة لكل روبوتٍ ينفخ الملفّ إلى ١٢٫٧ ك.ب.) */
const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Googlebot", "Bingbot",
  "CCBot", "Amazonbot", "Applebot", "Applebot-Extended",
  "meta-externalagent", "FacebookBot", "cohere-ai", "Diffbot",
  "Timpibot", "Omgilibot", "YouBot", "DuckAssistBot", "MistralAI-User",
];

export default function robots(): MetadataRoute.Robots {
  const rules = {
    /* «/universities» (الدليل العام + ملفات الجامعات) مسموح صراحةً: بادئة المنع
       «/university» (الأداة الخاصة) تغطّي «/universities» أيضاً، والسماح الأطول
       يتغلّب (قاعدة أطول تطابق) فلا يُحجب كنز البحث العضوي. */
    allow: ALLOW,
    disallow: [...PRIVATE_PATHS, "/api/"],
  };
  return {
    rules: [
      { userAgent: "*", ...rules },
      { userAgent: AI_BOTS, ...rules },
    ],
    sitemap: "https://usedarb.com/sitemap.xml",
    host: "https://usedarb.com",
  };
}
