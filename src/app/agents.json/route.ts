/* ═══════════ agents.json — عقدُ التنفيذ بين درب والوكيل ═══════════
   OpenAPI يصف *ما يوجد*؛ وagents.json يصف *كيف يُستعمَل*: مساراتُ عملٍ
   (flows) لكلٍّ منها خطوةٌ واضحة ومدخلاتُها ومخرجاتها. يُقدَّم هنا وعلى
   `/.well-known/agents.json` عبر rewrite.

   يُبنى من `ENDPOINTS` نفسها ويشير إلى `openapi.json` بدل نسخ الوصف — فلا
   تعريفَ ثانياً يشيخ. */
import { SITE, ENDPOINTS, CAPABILITIES } from "@/lib/agent/catalog";
import { AGENT_HEADERS } from "@/lib/agent/respond";

export const dynamic = "force-static";

/* اسمُ العملية في OpenAPI + مخرَجُها الرئيس — الجسرُ بين الوصفين */
const FLOW: Record<string, { path: string; operationId: string; output: string }> = {
  universities: { path: "/api/agent/universities", operationId: "listUniversities", output: "universities" },
  exams:        { path: "/api/agent/exams",        operationId: "listExams",        output: "exams" },
  calendar:     { path: "/api/agent/calendar",     operationId: "getCalendar",      output: "years" },
  faq:          { path: "/api/agent/faq",          operationId: "searchFaq",        output: "faq" },
};

/* JSON Pointer داخل مستند OpenAPI: «/» تُرمَّز «~1» حسب RFC 6901 */
const pointer = (path: string) => `openapi.json#/paths/${path.replaceAll("/", "~1")}/get`;

export function GET() {
  return Response.json({
    $schema: "https://raw.githubusercontent.com/wild-card-ai/agents-json/refs/heads/master/schema/schema.json",
    agentsJson: "0.1.0",
    info: {
      title: `${SITE.name} — بيانات القبول الجامعي السعودي`,
      version: "1.0.0",
      description:
        `${SITE.descriptionAr}\n\n` +
        "قراءةٌ فقط، بلا مصادقة. لا تُعاد بيانات طالبٍ أبداً. والحقلُ الفارغ يعني " +
        "«لم تُعلنه الجهة الرسمية بعد» — لا يُملأ تخميناً.",
      contact: { name: SITE.name, url: SITE.url, email: "support@usedarb.com" },
    },
    sources: [{ id: "darb", path: `${SITE.url}/openapi.json`, description: "وصف OpenAPI 3.1 لواجهات درب العامّة" }],
    overrides: [],
    flows: ENDPOINTS.map((e) => {
      const f = FLOW[e.id];
      return {
        id: f.operationId,
        title: e.id,
        description: e.summary,
        actions: [{ id: f.operationId, sourceId: "darb", operationId: pointer(f.path) }],
        links: [],
        fields: {
          parameters: (e.params ?? []).map((p) => ({ name: p, description: `تصفية بـ${p}`, required: false })),
          responses: [{ name: f.output, description: e.summary, required: true }],
        },
      };
    }),
    /* سياقٌ إضافي: ما تقدّمه المنصّة للطالب، ونقاطُ الاكتشاف الأخرى */
    productCapabilities: CAPABILITIES,
    discovery: {
      openapi: `${SITE.url}/openapi.json`,
      openapiYaml: `${SITE.url}/openapi.yaml`,
      mcp: `${SITE.url}/mcp`,
      agentCard: `${SITE.url}/.well-known/agent-card.json`,
      aiPlugin: `${SITE.url}/.well-known/ai-plugin.json`,
      llmsTxt: `${SITE.url}/llms.txt`,
      schemas: `${SITE.url}/schemas.json`,
    },
  }, { headers: AGENT_HEADERS });
}
