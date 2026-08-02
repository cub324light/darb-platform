/* نفسُ وصف OpenAPI بصيغة YAML — كثيرٌ من أدوات الوكلاء تطلبها بهذا الامتداد.
   المصدر واحد (`lib/agent/openapi.ts`) فلا نسختان تختلفان. */
import { openApiSpec } from "@/lib/agent/openapi";
import { toYaml } from "@/lib/agent/yaml";
import { AGENT_HEADERS } from "@/lib/agent/respond";

export const dynamic = "force-static";

export function GET() {
  return new Response(toYaml(openApiSpec()), {
    headers: { ...AGENT_HEADERS, "content-type": "application/yaml; charset=utf-8" },
  });
}
