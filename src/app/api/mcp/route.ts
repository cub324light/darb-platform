/* ═══════════ خادم MCP لدرب — JSON-RPC 2.0 فوق HTTP ═══════════
   يُقدَّم على `/mcp` (وعلى `/api/mcp`) فيستطيع أي عميل MCP أن يكتشف أدواتِ درب
   ويستدعيها. الأدواتُ هي واجهاتُ القراءة العامّة نفسها — مصدرٌ واحد لا نسختان.

   ▸ عامٌّ بلا مصادقة، ولا يمسّ بيانات طالبٍ إطلاقاً.
   ▸ بروتوكول 2025-06-18: initialize · tools/list · tools/call · resources/list. */
import {
  SITE, ENDPOINTS, universitiesPayload, universityDetail,
  examsPayload, calendarPayload, faqPayload,
} from "@/lib/agent/catalog";
import { AGENT_HEADERS } from "@/lib/agent/respond";

export const dynamic = "force-dynamic";

const PROTOCOL = "2025-06-18";

const TOOLS = [
  {
    name: "list_universities",
    description: "قائمة الجامعات السعودية (اسم · منطقة · نوع · ترتيب QS). للتصفية بالمنطقة مرّر `region`.",
    inputSchema: { type: "object", properties: { region: { type: "string", description: "المنطقة" } } },
  },
  {
    name: "get_university",
    description: "تفاصيل جامعةٍ واحدة مع كلياتها وتخصّصاتها الدقيقة.",
    inputSchema: { type: "object", properties: { id: { type: "string", description: "معرّف الجامعة" } }, required: ["id"] },
  },
  {
    name: "list_exams",
    description: "الاختبارات الوطنية (قدرات · تحصيلي · ستيب) ونوافذ التسجيل الرسمية. الحقلُ الفارغ = لم يُعلن بعد.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_academic_calendar",
    description: "التقويم الدراسي السعودي المعتمد: الفصول والإجازات وبداية العام ونهايته.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "search_faq",
    description: "بحثٌ في أسئلة القبول الجامعي ومنصّة قبول الشائعة.",
    inputSchema: { type: "object", properties: { q: { type: "string", description: "نصّ البحث" } } },
  },
] as const;

type Args = Record<string, unknown>;

function callTool(name: string, args: Args): unknown {
  switch (name) {
    case "list_universities": {
      const all = universitiesPayload();
      const region = typeof args.region === "string" ? args.region : null;
      const list = region ? all.filter((u) => u.region === region) : all;
      return { count: list.length, universities: list };
    }
    case "get_university": {
      const id = String(args.id ?? "");
      const one = universityDetail(id);
      if (!one) throw new Error(`لا جامعة بالمعرّف «${id}»`);
      return one;
    }
    case "list_exams":
      return { note: "الحقول الفارغة تعني أن الجهة لم تُعلن الموعد بعد — لا تُخمَّن.", exams: examsPayload() };
    case "get_academic_calendar":
      return calendarPayload();
    case "search_faq": {
      const q = typeof args.q === "string" ? args.q : undefined;
      const faq = faqPayload(q);
      return { count: faq.length, faq };
    }
    default:
      throw new Error(`أداةٌ غير معروفة: ${name}`);
  }
}

const rpc = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
const rpcErr = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

export function OPTIONS() { return new Response(null, { status: 204, headers: AGENT_HEADERS }); }

/* GET يصف الخادم — يساعد الفاحصين والبشر الذين يفتحون العنوان في المتصفّح */
export function GET() {
  return Response.json({
    name: "darb", displayName: SITE.name, protocolVersion: PROTOCOL,
    transport: "http", endpoint: `${SITE.url}/mcp`,
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    documentation: `${SITE.url}/docs/api`,
  }, { headers: AGENT_HEADERS });
}

export async function POST(req: Request) {
  let body: { id?: unknown; method?: string; params?: { name?: string; arguments?: Args } };
  try { body = await req.json(); }
  catch { return Response.json(rpcErr(null, -32700, "JSON غير صالح"), { headers: AGENT_HEADERS }); }

  const { id = null, method, params } = body;

  switch (method) {
    case "initialize":
      return Response.json(rpc(id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
        serverInfo: { name: "darb", version: "1.0.0" },
        instructions:
          "بياناتُ درب العامّة عن القبول الجامعي السعودي. لا تُعيد بيانات طلابٍ أبداً. " +
          "الحقول الفارغة تعني أن الجهة الرسمية لم تُعلن الموعد — انقل «لم يُعلن بعد» ولا تخمّن.",
      }), { headers: AGENT_HEADERS });

    case "notifications/initialized":
      return new Response(null, { status: 204, headers: AGENT_HEADERS });

    case "ping":
      return Response.json(rpc(id, {}), { headers: AGENT_HEADERS });

    case "tools/list":
      return Response.json(rpc(id, { tools: TOOLS }), { headers: AGENT_HEADERS });

    case "resources/list":
      return Response.json(rpc(id, {
        resources: ENDPOINTS.map((e) => ({
          uri: `${SITE.url}${e.path}`, name: e.id, description: e.summary, mimeType: "application/json",
        })),
      }), { headers: AGENT_HEADERS });

    case "tools/call": {
      const name = params?.name ?? "";
      try {
        const out = callTool(name, params?.arguments ?? {});
        return Response.json(rpc(id, {
          content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
          structuredContent: out,
          isError: false,
        }), { headers: AGENT_HEADERS });
      } catch (e) {
        return Response.json(rpc(id, {
          content: [{ type: "text", text: e instanceof Error ? e.message : "فشل الاستدعاء" }],
          isError: true,
        }), { headers: AGENT_HEADERS });
      }
    }

    default:
      return Response.json(rpcErr(id, -32601, `طريقةٌ غير مدعومة: ${method ?? "—"}`), { headers: AGENT_HEADERS });
  }
}
