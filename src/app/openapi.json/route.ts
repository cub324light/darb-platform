/* وصف OpenAPI 3.1 — يُولَّد من `lib/agent/openapi.ts` فلا يفترق عن الواقع.
   الصيغةُ اليمليّة أختُه: `/openapi.yaml`. */
import { openApiSpec } from "@/lib/agent/openapi";
import { AGENT_HEADERS } from "@/lib/agent/respond";

export const dynamic = "force-static";

export function GET() {
  return Response.json(openApiSpec(), { headers: AGENT_HEADERS });
}
