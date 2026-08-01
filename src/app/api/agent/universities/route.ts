import { universitiesPayload, universityDetail } from "@/lib/agent/catalog";
import { agentJson, OPTIONS as opt } from "@/lib/agent/respond";

export const dynamic = "force-static";
export const OPTIONS = opt;

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const one = universityDetail(id);
    return one ? agentJson(one) : agentJson({ error: "لا جامعة بهذا المعرّف", id }, { status: 404 });
  }
  const region = searchParams.get("region");
  const all = universitiesPayload();
  const list = region ? all.filter((u) => u.region === region) : all;
  return agentJson({ count: list.length, universities: list });
}
