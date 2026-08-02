/* بطاقةُ خادم MCP (SEP-1649) — تُقدَّم على /.well-known/mcp/server-card.json.
   الأدواتُ والمطالباتُ والموارد تُعلَن هنا بأسمائها كما يخدمها `/mcp` تماماً. */
import { SITE, ENDPOINTS } from "@/lib/agent/catalog";
import { TOOL_INPUTS } from "@/lib/agent/schemas";
import { AGENT_HEADERS } from "@/lib/agent/respond";

export const dynamic = "force-static";

export function GET() {
  return Response.json({
    $schema: "https://modelcontextprotocol.io/schemas/draft/server-card.schema.json",
    serverInfo: {
      name: "darb",
      title: SITE.name,
      version: "1.0.0",
      description: SITE.descriptionAr,
      websiteUrl: SITE.url,
      documentationUrl: `${SITE.url}/docs/api`,
      iconUrl: `${SITE.url}/icon.svg`,
    },
    protocolVersion: "2025-06-18",
    transport: {
      type: "http",
      url: `${SITE.url}/mcp`,
    },
    capabilities: {
      tools: { listChanged: false },
      prompts: { listChanged: false },
      resources: { listChanged: false, subscribe: false },
    },
    tools: Object.keys(TOOL_INPUTS),
    prompts: ["choose_university", "exam_timeline", "admission_question", "study_plan"],
    resources: ENDPOINTS.map((e) => `${SITE.url}${e.path}`),
    authentication: { type: "none" },
    /* أسماءٌ مسطّحة يقرأها المتساهلون من العملاء — نفسُ القيم لا قيمٌ ثانية */
    name: "darb",
    version: "1.0.0",
    endpoint: `${SITE.url}/mcp`,
  }, { headers: AGENT_HEADERS });
}
