/* حزمةُ مخطّطات JSON Schema 2020-12 لكل ما تُعيده واجهاتُ درب العامّة.
   مصدرُها `lib/agent/schemas.ts` نفسُه الذي يغذّي OpenAPI وأدوات MCP. */
import { SITE } from "@/lib/agent/catalog";
import { SCHEMAS } from "@/lib/agent/schemas";
import { AGENT_HEADERS } from "@/lib/agent/respond";

export const dynamic = "force-static";

export function GET() {
  return Response.json({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${SITE.url}/schemas.json`,
    title: `${SITE.name} — مخطّطات البيانات العامّة`,
    description: "أشكالُ ما تُعيده واجهاتُ درب. الحقلُ الفارغ يعني «لم يُعلَن بعد» لا «صفر».",
    $defs: SCHEMAS,
  }, { headers: { ...AGENT_HEADERS, "content-type": "application/schema+json; charset=utf-8" } });
}
