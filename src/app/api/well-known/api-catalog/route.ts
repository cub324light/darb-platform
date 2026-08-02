/* فهرسُ الواجهات (RFC 9727) بصيغة linkset+json (RFC 9264).
   يُقدَّم على /.well-known/api-catalog عبر rewrite.

   كلُّ عنوانٍ هنا موجودٌ فعلاً — لا نُدرج واجهةً لا نخدمها. */
import { SITE } from "@/lib/agent/catalog";
import { AGENT_HEADERS } from "@/lib/agent/respond";

export const dynamic = "force-static";

const doc = (href: string, type: string, title: string) => ({ href, type, title });

export function GET() {
  const linkset = [
    {
      /* المرساة: الواجهةُ العامّة للقراءة */
      anchor: `${SITE.url}/api/agent`,
      "service-desc": [
        doc(`${SITE.url}/openapi.json`, "application/json", "OpenAPI 3.1 (JSON)"),
        doc(`${SITE.url}/openapi.yaml`, "application/yaml", "OpenAPI 3.1 (YAML)"),
      ],
      "service-doc": [
        doc(`${SITE.url}/docs/api`, "text/html", "توثيق الواجهة"),
        doc(`${SITE.url}/agents.md`, "text/markdown", "دليل الوكلاء"),
      ],
      "service-meta": [
        doc(`${SITE.url}/.well-known/agent-card.json`, "application/json", "بطاقة الوكيل"),
        doc(`${SITE.url}/schemas.json`, "application/schema+json", "مخطّطات JSON Schema"),
      ],
      status: [doc(`${SITE.url}/api/agent/health`, "application/json", "حالة الواجهة")],
      author: [doc(SITE.url, "text/html", SITE.name)],
    },
    {
      /* المرساة: خادم MCP */
      anchor: `${SITE.url}/mcp`,
      "service-desc": [
        doc(`${SITE.url}/.well-known/mcp/server-card.json`, "application/json", "MCP Server Card"),
        doc(`${SITE.url}/.well-known/mcp.json`, "application/json", "وصف خادم MCP"),
      ],
      "service-doc": [doc(`${SITE.url}/docs/api`, "text/html", "توثيق الواجهة")],
      status: [doc(`${SITE.url}/api/agent/health`, "application/json", "حالة الواجهة")],
    },
  ];

  return Response.json({ linkset }, {
    headers: { ...AGENT_HEADERS, "content-type": "application/linkset+json; charset=utf-8" },
  });
}
