import { faqPayload } from "@/lib/agent/catalog";
import { agentJson, OPTIONS as opt } from "@/lib/agent/respond";

export const dynamic = "force-static";
export const OPTIONS = opt;

export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? undefined;
  const faq = faqPayload(q);
  return agentJson({ count: faq.length, query: q ?? null, faq });
}
