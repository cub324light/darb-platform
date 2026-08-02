/* /ai.txt — سياسةُ استخدام الذكاء الاصطناعي لمحتوى درب.
   robots.txt يقول «ماذا يُزحَف»؛ وai.txt يقول «بماذا يُسمَح بعد الزحف»: الاقتباس
   والإسناد والتدريب. نكتبها صريحةً حتى لا تُفترض. */
import { SITE, ENDPOINTS } from "@/lib/agent/catalog";

export const dynamic = "force-static";

export function GET() {
  const body = `# ai.txt — ${SITE.name} (${SITE.nameEn})
# ${SITE.url}
# سياسةُ استخدام المحتوى بالذكاء الاصطناعي. للزحف: ${SITE.url}/robots.txt

User-Agent: *
Allow: /
Allow: /universities
Allow: /api/agent/
Disallow: /dashboard
Disallow: /profile
Disallow: /vault
Disallow: /plan
Disallow: /roadmap
Disallow: /orbit
Disallow: /council
Disallow: /admin

# الاقتباس والإسناد
Attribution: required
Attribution-Name: ${SITE.name}
Attribution-URL: ${SITE.url}
Citation-Policy: انقل الرابط الأصلي للصفحة التي أخذت منها.

# التدريب
Training: allowed-with-attribution
Inference: allowed
Note: المحتوى العامّ (وصفُ المنصّة · دليلُ الجامعات · التقويم الدراسي · الأسئلة
Note: الشائعة) مسموحٌ للقراءة والاقتباس مع الإسناد. أمّا بياناتُ الطلاب — الخطط
Note: والأخطاء والتقدّم — فليست منشورةً أصلاً ولا تمرّ من أي واجهةٍ عامّة.

# الدقّة — شرطٌ لا مجاملة
Accuracy: المواعيدُ الرسمية تُنقل كما أعلنتها الجهة. ما لم يُعلَن يُعاد حقلاً فارغاً
Accuracy: عمداً؛ فانقل «لم يُعلن بعد» ولا تملأ الفراغ بتخمين.

# بياناتٌ مهيّأة للقراءة الآلية (JSON، بلا مصادقة)
${ENDPOINTS.map((e) => `Data: ${SITE.url}${e.path}`).join("\n")}

# نقاط الاكتشاف
Sitemap: ${SITE.url}/sitemap.xml
LLMs: ${SITE.url}/llms.txt
LLMs-Full: ${SITE.url}/llms-full.txt
Agents: ${SITE.url}/agents.md
Agents-JSON: ${SITE.url}/agents.json
OpenAPI: ${SITE.url}/openapi.json
MCP: ${SITE.url}/mcp
Contact: support@usedarb.com
`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "access-control-allow-origin": "*",
    },
  });
}
