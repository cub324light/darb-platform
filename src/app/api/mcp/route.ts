/* ═══════════ خادم MCP لدرب — JSON-RPC 2.0 فوق HTTP ═══════════
   يُقدَّم على `/mcp` (وعلى `/api/mcp`) فيستطيع أي عميل MCP أن يكتشف أدواتِ درب
   ويستدعيها. الأدواتُ هي واجهاتُ القراءة العامّة نفسها — مصدرٌ واحد لا نسختان،
   ومخطّطاتُ مدخلاتها من `lib/agent/schemas.ts` التي يقرأ منها OpenAPI أيضاً.

   ▸ عامٌّ بلا مصادقة، ولا يمسّ بيانات طالبٍ إطلاقاً.
   ▸ بروتوكول 2025-06-18: initialize · tools/list · tools/call · prompts/list ·
     prompts/get · resources/list · resources/read. */
import {
  SITE, ENDPOINTS, universitiesPayload, universityDetail,
  examsPayload, calendarPayload, faqPayload,
} from "@/lib/agent/catalog";
import { TOOL_INPUTS } from "@/lib/agent/schemas";
import { AGENT_HEADERS } from "@/lib/agent/respond";

export const dynamic = "force-dynamic";

const PROTOCOL = "2025-06-18";

const TOOLS = [
  {
    name: "list_universities",
    title: "قائمة الجامعات",
    description: "قائمة الجامعات السعودية (اسم · منطقة · نوع · ترتيب QS). للتصفية بالمنطقة مرّر `region`.",
    inputSchema: TOOL_INPUTS.list_universities,
  },
  {
    name: "get_university",
    title: "تفاصيل جامعة",
    description: "تفاصيل جامعةٍ واحدة مع كلياتها وتخصّصاتها الدقيقة.",
    inputSchema: TOOL_INPUTS.get_university,
  },
  {
    name: "list_exams",
    title: "الاختبارات الوطنية",
    description: "الاختبارات الوطنية (قدرات · تحصيلي · ستيب) ونوافذ التسجيل الرسمية. الحقلُ الفارغ = لم يُعلن بعد.",
    inputSchema: TOOL_INPUTS.list_exams,
  },
  {
    name: "get_academic_calendar",
    title: "التقويم الدراسي",
    description: "التقويم الدراسي السعودي المعتمد: الفصول والإجازات وبداية العام ونهايته.",
    inputSchema: TOOL_INPUTS.get_academic_calendar,
  },
  {
    name: "search_faq",
    title: "بحثٌ في أسئلة القبول",
    description: "بحثٌ في أسئلة القبول الجامعي ومنصّة قبول الشائعة.",
    inputSchema: TOOL_INPUTS.search_faq,
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

/* ═══ المطالبات (Prompts) — قوالبُ جاهزة يعرضها العميل للطالب ═══
   كلُّ قالبٍ يوجّه الوكيل إلى الأداة الصحيحة ويُلزمه بقاعدة درب: لا موعدَ
   مخترَعاً ولا رقمَ من غير مصدر. */
interface McpPrompt {
  name: string;
  title: string;
  description: string;
  arguments: { name: string; description: string; required: boolean }[];
  /** يبني نصّ المطالبة من معاملات الطالب. */
  build: (a: Args) => string;
}

const PROMPTS: McpPrompt[] = [
  {
    name: "choose_university",
    title: "أي جامعةٍ تناسبني؟",
    description: "يقارن جامعاتٍ سعودية لطالبٍ حسب تخصّصه ومنطقته، من دليل درب.",
    arguments: [
      { name: "major", description: "التخصّص الذي يريده الطالب", required: true },
      { name: "region", description: "المنطقة المفضّلة (اختياري)", required: false },
    ],
    build: (a: Args) => {
      const major = String(a.major ?? "");
      const region = typeof a.region === "string" && a.region ? a.region : null;
      return `طالبٌ سعوديّ يريد دراسة «${major}»${region ? ` ويفضّل منطقة ${region}` : ""}.

استعمِل أداة \`list_universities\`${region ? ` بالمعامل region="${region}"` : ""} ثم \`get_university\`
للمرشّحات، واعرض عليه الجامعات التي فيها هذا التخصّص فعلاً — لا التي تشبهه اسماً.

لكل جامعة: اسمها · منطقتها · نوعها · الكلّية التي تحوي التخصّص · ترتيبها في QS إن وُجد.
ولا تذكر ترتيباً ولا رسوماً ولا نسبةَ قبولٍ لم تأتِك من الأداة.`;
    },
  },
  {
    name: "exam_timeline",
    title: "متى أسجّل ومتى أختبر؟",
    description: "يبني جدولاً زمنياً لاختبارٍ وطني من نوافذ التسجيل الرسمية والتقويم الدراسي.",
    arguments: [
      { name: "exam", description: "الاختبار: قدرات أو تحصيلي أو ستيب", required: true },
    ],
    build: (a: Args) => `الطالب يسأل عن اختبار «${String(a.exam ?? "")}».

استعمِل \`list_exams\` لنوافذ التسجيل الرسمية و\`get_academic_calendar\` لموقعها من العام الدراسي.

اعرض: متى يفتح التسجيل · متى يُغلق · متى الاختبار · وأين يقع ذلك من الفصل الدراسي.

▸ إن كان الحقلُ فارغاً فالجهةُ لم تُعلنه بعد. قل «لم يُعلن بعد» صراحةً، ولا تستنتج
موعداً من سنةٍ ماضية ولا تقدّره تقريباً — الطالبُ يبني عليه، والخطأ يكلّفه سنة.`,
  },
  {
    name: "admission_question",
    title: "سؤالٌ عن القبول",
    description: "يجيب عن سؤال قبولٍ جامعي من أسئلة درب الشائعة، بلا اجتهادٍ من عنده.",
    arguments: [{ name: "question", description: "سؤال الطالب", required: true }],
    build: (a: Args) => `سؤال الطالب: «${String(a.question ?? "")}»

ابحث في \`search_faq\` أولاً. إن وجدتَ جواباً فانقله بلغةٍ بسيطة وأشِر إلى مصدره في درب.
وإن لم تجد، قل ذلك ولا تخترع شرطاً ولا نسبةً موزونة — شروطُ القبول تختلف بين جامعةٍ
وأخرى وبين سنةٍ وأخرى، وإحالتُه إلى الجهة أنفعُ له من جوابٍ واثقٍ خاطئ.`,
  },
  {
    name: "study_plan",
    title: "خطةُ مذاكرةٍ حتى الاختبار",
    description: "يقترح خطة مذاكرةٍ واقعية مبنيّة على التقويم الدراسي وموعد الاختبار المعلن.",
    arguments: [
      { name: "exam", description: "الاختبار المستهدف", required: true },
      { name: "hoursPerWeek", description: "الساعات المتاحة أسبوعياً", required: false },
    ],
    build: (a: Args) => {
      const hours = a.hoursPerWeek ? `المتاح لديه ${String(a.hoursPerWeek)} ساعة أسبوعياً.` : "";
      return `طالبٌ يستعدّ لاختبار «${String(a.exam ?? "")}». ${hours}

اقرأ \`list_exams\` لموعد الاختبار المعلن و\`get_academic_calendar\` للإجازات والفصول،
ثم اقترح خطةً أسبوعية تحترم أيام الدراسة والإجازات فعلاً.

▸ إن لم يكن الموعد معلناً فلا تفترض تاريخاً؛ ابنِ الخطة على المدّة التي يحدّدها هو،
وذكّره أن يعود حين تُعلن الجهة الموعد.
▸ درب فيها ما ينفّذ هذه الخطة: خطة اليوم (${SITE.url}/plan) وجلسات التركيز
(${SITE.url}/orbit) وخزنة الأخطاء (${SITE.url}/vault).`;
    },
  },
];

const rpc = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
const rpcErr = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

export function OPTIONS() { return new Response(null, { status: 204, headers: AGENT_HEADERS }); }

/* GET يصف الخادم — يساعد الفاحصين والبشر الذين يفتحون العنوان في المتصفّح */
export function GET() {
  return Response.json({
    name: "darb", displayName: SITE.name, protocolVersion: PROTOCOL,
    transport: "http", endpoint: `${SITE.url}/mcp`,
    capabilities: { tools: {}, prompts: {}, resources: {} },
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    prompts: PROMPTS.map((p) => ({ name: p.name, description: p.description })),
    resources: ENDPOINTS.map((e) => ({ uri: `${SITE.url}${e.path}`, name: e.id })),
    documentation: `${SITE.url}/docs/api`,
  }, { headers: AGENT_HEADERS });
}

const resourceList = () => ENDPOINTS.map((e) => ({
  uri: `${SITE.url}${e.path}`, name: e.id, title: e.id,
  description: e.summary, mimeType: "application/json",
}));

/* موردٌ يُقرأ مباشرةً: نُعيد البيانات نفسها التي تعيدها الواجهة، بلا طلبٍ شبكيّ */
function readResource(uri: string): unknown {
  const path = uri.replace(SITE.url, "");
  switch (path) {
    case "/api/agent/universities": return { count: universitiesPayload().length, universities: universitiesPayload() };
    case "/api/agent/exams":        return { exams: examsPayload() };
    case "/api/agent/calendar":     return calendarPayload();
    case "/api/agent/faq":          return { count: faqPayload().length, faq: faqPayload() };
    default: throw new Error(`موردٌ غير معروف: ${uri}`);
  }
}

export async function POST(req: Request) {
  let body: {
    id?: unknown; method?: string;
    params?: { name?: string; uri?: string; arguments?: Args };
  };
  try { body = await req.json(); }
  catch { return Response.json(rpcErr(null, -32700, "JSON غير صالح"), { headers: AGENT_HEADERS }); }

  const { id = null, method, params } = body;

  switch (method) {
    case "initialize":
      return Response.json(rpc(id, {
        protocolVersion: PROTOCOL,
        capabilities: {
          tools: { listChanged: false },
          prompts: { listChanged: false },
          resources: { listChanged: false, subscribe: false },
        },
        serverInfo: { name: "darb", title: SITE.name, version: "1.0.0" },
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

    case "prompts/list":
      return Response.json(rpc(id, {
        prompts: PROMPTS.map((p) => ({
          name: p.name, title: p.title, description: p.description, arguments: p.arguments,
        })),
      }), { headers: AGENT_HEADERS });

    case "prompts/get": {
      const p = PROMPTS.find((x) => x.name === params?.name);
      if (!p) return Response.json(rpcErr(id, -32602, `مطالبةٌ غير معروفة: ${params?.name ?? "—"}`), { headers: AGENT_HEADERS });
      const args = params?.arguments ?? {};
      const missing = p.arguments.filter((a) => a.required && !args[a.name]).map((a) => a.name);
      if (missing.length) {
        return Response.json(rpcErr(id, -32602, `معاملاتٌ ناقصة: ${missing.join(", ")}`), { headers: AGENT_HEADERS });
      }
      return Response.json(rpc(id, {
        description: p.description,
        messages: [{ role: "user", content: { type: "text", text: p.build(args) } }],
      }), { headers: AGENT_HEADERS });
    }

    case "resources/list":
      return Response.json(rpc(id, { resources: resourceList() }), { headers: AGENT_HEADERS });

    case "resources/read": {
      const uri = params?.uri ?? "";
      try {
        const data = readResource(uri);
        return Response.json(rpc(id, {
          contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }],
        }), { headers: AGENT_HEADERS });
      } catch (e) {
        return Response.json(rpcErr(id, -32602, e instanceof Error ? e.message : "تعذّرت القراءة"), { headers: AGENT_HEADERS });
      }
    }

    case "resources/templates/list":
      return Response.json(rpc(id, { resourceTemplates: [] }), { headers: AGENT_HEADERS });

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
