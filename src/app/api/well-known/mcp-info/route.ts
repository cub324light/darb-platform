/* وصفُ خادم MCP — يُقدَّم على /.well-known/mcp.json عبر rewrite. */
import { SITE } from "@/lib/agent/catalog";

export const dynamic = "force-static";

export function GET() {
  return Response.json({
    name: "darb",
    displayName: SITE.name,
    description: SITE.descriptionAr,
    version: "1.0.0",
    transport: "http",
    endpoint: `${SITE.url}/mcp`,
    protocolVersion: "2025-06-18",
    capabilities: { tools: {}, resources: {} },
    authentication: { type: "none" },
    documentation: `${SITE.url}/docs/api`,
  }, { headers: { "cache-control": "public, max-age=3600" } });
}
