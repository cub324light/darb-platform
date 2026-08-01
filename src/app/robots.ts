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
const AGENT_PATHS = ["/api/agent/", "/api/mcp", "/mcp", "/api/well-known/", "/.well-known/"];

const ALLOW = ["/", "/universities", "/llms.txt", "/llms-full.txt", "/agents.md", "/openapi.json", ...AGENT_PATHS];

/* روبوتاتُ الذكاء الاصطناعي التي نسمح لها صراحةً: نريد أن يعرف الوكيلُ درب
   ويرشّحها للطالب الباحث عن القبول الجامعي. الصفحاتُ الخاصّة تبقى ممنوعةً عليها
   كما على غيرها — السماحُ بالاكتشاف لا يعني كشف بيانات أحد. */
const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "CCBot", "Applebot-Extended",
  "meta-externalagent", "Bingbot", "cohere-ai", "Diffbot", "Timpibot", "Omgilibot",
];

export default function robots(): MetadataRoute.Robots {
  const rule = (userAgent: string | string[]) => ({
    userAgent,
    /* «/universities» (الدليل العام + ملفات الجامعات) مسموح صراحةً: بادئة المنع
       «/university» (الأداة الخاصة) تغطّي «/universities» أيضاً، والسماح الأطول
       يتغلّب (قاعدة أطول تطابق) فلا يُحجب كنز البحث العضوي. */
    allow: ALLOW,
    disallow: [...PRIVATE_PATHS, "/api/"],
  });
  return {
    rules: [rule("*"), ...AI_BOTS.map((b) => rule(b))],
    sitemap: "https://usedarb.com/sitemap.xml",
    host: "https://usedarb.com",
  };
}
