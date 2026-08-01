/* اكتشاف المهارات — ما يستطيع الوكيلُ طلبَه من درب، بصيغةٍ يقرأها آلياً. */
import { SITE, ENDPOINTS, CAPABILITIES } from "@/lib/agent/catalog";
import { agentJson, OPTIONS as opt } from "@/lib/agent/respond";

export const dynamic = "force-static";
export const OPTIONS = opt;

export function GET() {
  return agentJson({
    version: "1.0.0",
    provider: { name: SITE.name, url: SITE.url },
    skills: ENDPOINTS.map((e) => ({
      id: e.id,
      name: e.id,
      description: e.summary,
      invocation: { method: "GET", url: `${SITE.url}${e.path}`, parameters: e.params ?? [] },
      auth: "none",
      outputMimeType: "application/json",
    })),
    productCapabilities: CAPABILITIES,
    limits: { rateLimitPerMinute: 60, personalData: "never" },
  });
}
