import { universitiesPayload, universityDetail } from "@/lib/agent/catalog";
import { agentJson, OPTIONS as opt } from "@/lib/agent/respond";

/* ▓ لا تُعِد `force-static` هنا: Next يُفرِغ `searchParams` في المعالِج الثابت،
   فكان `?id=kfupm` يُعيد الجامعات الستّ والثلاثين كلَّها بدل ملفّ الجامعة،
   و`?region=` لا يصفّي شيئاً — ووصفُ OpenAPI يَعِد بهما. الأداءُ محفوظٌ بترويسة
   التخزين (`s-maxage=3600`) لا بالتجميد. يحرسه `agentRoutes.test.ts`. */
export const dynamic = "force-dynamic";
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
