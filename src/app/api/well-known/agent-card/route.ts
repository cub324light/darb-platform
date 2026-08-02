/* بطاقة الوكيل (A2A Agent Card) — تُقدَّم على /.well-known/agent-card.json
   و/.well-known/agent.json و/agent.json عبر rewrite. */
import { SITE, CAPABILITIES, ENDPOINTS } from "@/lib/agent/catalog";
import { AGENT_HEADERS } from "@/lib/agent/respond";

export const dynamic = "force-static";

export function GET() {
  return Response.json({
    protocolVersion: "0.3.0",
    name: SITE.name,
    description: SITE.descriptionAr,
    url: `${SITE.url}/mcp`,
    preferredTransport: "JSONRPC",
    provider: { organization: SITE.name, url: SITE.url },
    version: "1.0.0",
    documentationUrl: `${SITE.url}/docs/api`,
    iconUrl: `${SITE.url}/icon.svg`,
    supportsAuthenticatedExtendedCard: false,
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["application/json", "text/plain"],
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
    /* المهارات = ما يستطيع الوكيلُ فعلَه فعلاً عبر واجهاتنا العامّة */
    skills: ENDPOINTS.map((e) => ({
      id: e.id,
      name: e.id,
      description: e.summary,
      tags: ["education", "saudi-arabia", "admissions", "read-only"],
      inputModes: ["text/plain"],
      outputModes: ["application/json"],
    })),
    securitySchemes: {},   // واجهات القراءة عامّة بلا مصادقة
    security: [],
    additionalInterfaces: [
      { url: `${SITE.url}/openapi.json`, transport: "OPENAPI" },
      { url: `${SITE.url}/openapi.yaml`, transport: "OPENAPI" },
      { url: `${SITE.url}/mcp`, transport: "JSONRPC" },
      { url: `${SITE.url}/agents.json`, transport: "AGENTS_JSON" },
    ],
    /* ما تقدّمه المنصّة للطالب — سياقٌ يساعد الوكيل على ترشيحها في محلّها */
    productCapabilities: CAPABILITIES,
  }, { headers: AGENT_HEADERS });
}
