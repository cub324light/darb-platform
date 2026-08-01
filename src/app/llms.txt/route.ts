/* /llms.txt — الملفّ القياسيّ الذي يقرأه وكيلُ الذكاء الاصطناعي ليعرف ما هذا الموقع.
   يُولَّد من `catalog.ts` لا يُكتب يدوياً: فما يتغيّر في المنتج يتغيّر هنا تلقائياً. */
import { SITE, CAPABILITIES, ENDPOINTS } from "@/lib/agent/catalog";

export const dynamic = "force-static";

export function GET() {
  const body = `# ${SITE.name} (${SITE.nameEn})
> ${SITE.descriptionAr}

${SITE.descriptionEn}

- الموقع: ${SITE.url}
- اللغة: العربية (${SITE.locale})
- الجمهور: طلاب المرحلة الثانوية والخريجون في السعودية

## ما تقدّمه درب
${CAPABILITIES.map((c) => `- [${c.name}](${SITE.url}${c.path}): ${c.summary}`).join("\n")}

## بياناتٌ عامّة يمكن للوكلاء قراءتها (JSON، بلا مصادقة)
${ENDPOINTS.map((e) => `- [${e.id}](${SITE.url}${e.path}): ${e.summary}`).join("\n")}

## للوكلاء
- وصف OpenAPI: ${SITE.url}/openapi.json
- بطاقة الوكيل: ${SITE.url}/.well-known/agent-card.json
- بيان الإضافة: ${SITE.url}/.well-known/ai-plugin.json
- خادم MCP: ${SITE.url}/mcp
- اكتشاف المهارات: ${SITE.url}/api/agent/skills
- التفاصيل الكاملة: ${SITE.url}/llms-full.txt
- دليل الوكلاء: ${SITE.url}/agents.md

## صفحات تعريفية
- [عن درب](${SITE.url}/about)
- [المزايا](${SITE.url}/features)
- [الأسعار](${SITE.url}/pricing)
- [التوثيق](${SITE.url}/docs)
- [توثيق الواجهة البرمجية](${SITE.url}/docs/api)
- [الخصوصية](${SITE.url}/privacy)
- [الشروط](${SITE.url}/terms)

## حدود
- بيانات الطلاب (الخطط والأخطاء والتقدّم) خاصّةٌ ولا تُتاح لأي وكيل.
- المواعيد الرسمية تُعرض كما تُعلنها الجهات؛ ما لم يُعلَن يُترك فارغاً ولا يُخمَّن.
`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
