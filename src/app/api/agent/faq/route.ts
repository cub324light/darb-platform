import { faqPayload } from "@/lib/agent/catalog";
import { agentJson, OPTIONS as opt } from "@/lib/agent/respond";

/* ▓ لا `force-static`: يُفرِغ `searchParams` فيصير `?q=` بلا أثر — كان بحثُ
   «زززز» يُعيد السبعة والخمسين سؤالاً كلَّها. التخزين المؤقّت يكفي للأداء. */
export const dynamic = "force-dynamic";
export const OPTIONS = opt;

export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? undefined;
  const faq = faqPayload(q);
  return agentJson({ count: faq.length, query: q ?? null, faq });
}
