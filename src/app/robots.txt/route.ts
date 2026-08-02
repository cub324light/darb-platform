/* robots.txt — يُكتب نصّاً بدل `MetadataRoute.Robots` لأن الأخير لا يسمح
   بتوجيه `Content-Signal` (اصطلاح contentsignals.org). القواعدُ هي نفسُها
   حرفاً بحرف، وأُضيفت إشاراتُ المحتوى فقط.

   ملاحظة جانبية نافعة: معالِجُ المسار يظهر في سجلّات التشغيل، بخلاف ملفّ
   البيانات الوصفية الساكن — فصار بالإمكان رؤية مَن يطلب robots.txt فعلاً. */

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
  "/llms.txt", "/llms-full.txt", "/agents.md", "/ai.txt", "/auth.md",
  "/openapi.json", "/openapi.yaml", "/agents.json", "/schemas.json",
  "/ai-plugin.json", "/agent.json", "/agent-card.json", "/mcp.json",
  "/oauth-protected-resource", "/oauth-authorization-server",
  "/api/agent/", "/api/mcp", "/mcp", "/api/well-known/", "/.well-known/",
];

/* روبوتاتُ الذكاء الاصطناعي المسموح لها صراحةً. تُجمَع في **مجموعةٍ واحدة**
   بأسطر User-agent متتالية — هذه هي الصيغة القياسية، وتُبقي الملفّ صغيراً. */
const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Googlebot", "Bingbot",
  "CCBot", "Amazonbot", "Applebot", "Applebot-Extended",
  "meta-externalagent", "FacebookBot", "cohere-ai", "Diffbot",
  "Timpibot", "Omgilibot", "YouBot", "DuckAssistBot", "MistralAI-User",
];

/* إشاراتُ المحتوى (contentsignals.org) — تعبيرٌ عن التفضيل لا عن المنع التقني.
   قيمُ درب هي نفسُها المعلنة في /ai.txt: البحثُ مسموح، والاستشهادُ اللحظي
   مسموح، والتدريبُ مسموحٌ مع الإسناد. (الاصطلاح ثنائيّ نعم/لا، والإسنادُ
   شرطُنا المكتوب في /ai.txt.) */
const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=yes";

const SIGNAL_NOTICE = [
  "# إشاراتُ المحتوى (Content Signals) — تفضيلاتُ درب لاستخدام محتواها العامّ.",
  "# search=yes    : الفهرسةُ وعرضُ روابط نتائج البحث مسموحة.",
  "# ai-input=yes  : الاستشهادُ بالمحتوى لحظةَ الإجابة (RAG/التلخيص) مسموح.",
  "# ai-train=yes  : التدريبُ مسموحٌ بشرط الإسناد — التفصيل في /ai.txt.",
  "# صفحاتُ الطلاب الخاصّة ممنوعةٌ على الجميع، كما في Disallow أدناه.",
].join("\n");

function group(agents: string[]): string {
  return [
    ...agents.map((a) => `User-agent: ${a}`),
    `Content-Signal: ${CONTENT_SIGNAL}`,
    ...ALLOW.map((p) => `Allow: ${p}`),
    ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`),
    "Disallow: /api/",
  ].join("\n");
}

export const dynamic = "force-static";

export function GET() {
  const body = [
    SIGNAL_NOTICE,
    "",
    group(["*"]),
    "",
    group(AI_BOTS),
    "",
    "Host: https://usedarb.com",
    "Sitemap: https://usedarb.com/sitemap.xml",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
      "access-control-allow-origin": "*",
    },
  });
}
