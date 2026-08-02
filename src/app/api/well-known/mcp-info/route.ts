/* وصفُ خادم MCP — يُقدَّم على /.well-known/mcp.json و/mcp.json عبر rewrite. */
import { SITE } from "@/lib/agent/catalog";
import { AGENT_HEADERS } from "@/lib/agent/respond";

export const dynamic = "force-static";

export function GET() {
  return Response.json({
    name: "darb",
    displayName: SITE.name,
    description: SITE.descriptionAr,
    version: "1.0.0",
    /* شكلُ التسجيل الذي تقرأه أدلّة MCP وعملاؤها */
    mcpServers: {
      darb: { type: "http", url: `${SITE.url}/mcp` },
    },
    transport: "http",
    endpoint: `${SITE.url}/mcp`,
    protocolVersion: "2025-06-18",
    capabilities: {
      tools: { listChanged: false },
      prompts: { listChanged: false },
      resources: { listChanged: false, subscribe: false },
    },
    authentication: { type: "none" },
    documentation: `${SITE.url}/docs/api`,
    openapi: `${SITE.url}/openapi.json`,
  }, { headers: AGENT_HEADERS });
}
