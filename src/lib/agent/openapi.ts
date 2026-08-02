/* ═══════════ وصفُ OpenAPI 3.1 — يُبنى مرّةً ويُقدَّم بصيغتين ═══════════
   `/openapi.json` و`/openapi.yaml` كلاهما يقرأ من هنا، والمخطّطات من
   `schemas.ts` — فلا يوجد وصفٌ ثانٍ يشيخ بصمت.

   نقيّ: لا `window` ولا `Date`. */
import { SITE, ENDPOINTS } from "./catalog";
import { SCHEMAS } from "./schemas";

/** المخطّطات مكتوبةٌ بلغة JSON Schema (`#/$defs/…`)؛ OpenAPI يضعها في
    `components/schemas`. نُعيد ربط الإشارات بدل كتابتها مرّتين. */
function rebasedSchemas(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(SCHEMAS).replaceAll("#/$defs/", "#/components/schemas/"));
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const jsonOk = (schema: object) => ({
  "200": { description: "نجاح", content: { "application/json": { schema } } },
});

const byId = (id: string) => ENDPOINTS.find((e) => e.id === id)!.summary;

export function openApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: `${SITE.name} — واجهة البيانات العامّة`,
      version: "1.0.0",
      summary: "بياناتُ القبول الجامعي السعودي للقراءة الآلية.",
      description:
        `${SITE.descriptionAr}\n\n` +
        "واجهاتٌ للقراءة فقط، عامّة بلا مصادقة. لا تُعيد أي بيانات شخصية للطلاب. " +
        "الحقولُ الفارغة تعني «لم تُعلنه الجهة الرسمية بعد» — لا تُملأ تخميناً.",
      contact: { name: SITE.name, url: SITE.url, email: "support@usedarb.com" },
      license: { name: "Proprietary", url: `${SITE.url}/terms` },
      termsOfService: `${SITE.url}/terms`,
    },
    servers: [{ url: SITE.url, description: "الإنتاج" }],
    externalDocs: { description: "توثيق الواجهة", url: `${SITE.url}/docs/api` },
    tags: ENDPOINTS.map((e) => ({ name: e.id, description: e.summary })),
    paths: {
      "/api/agent/universities": {
        get: {
          tags: ["universities"], operationId: "listUniversities", summary: byId("universities"),
          parameters: [
            { name: "id", in: "query", required: false, schema: { type: "string" },
              description: "معرّف جامعة — يُعيد كلياتها وتخصّصاتها الدقيقة" },
            { name: "region", in: "query", required: false, schema: { type: "string" },
              description: "تصفية بالمنطقة" },
          ],
          responses: jsonOk({
            type: "object",
            properties: {
              count: { type: "integer" },
              universities: { type: "array", items: ref("University") },
              university: ref("UniversityDetail"),
            },
          }),
        },
      },
      "/api/agent/exams": {
        get: {
          tags: ["exams"], operationId: "listExams", summary: byId("exams"),
          responses: jsonOk({
            type: "object",
            properties: { note: { type: "string" }, exams: { type: "array", items: ref("Exam") } },
          }),
        },
      },
      "/api/agent/calendar": {
        get: {
          tags: ["calendar"], operationId: "getCalendar", summary: byId("calendar"),
          responses: jsonOk(ref("AcademicCalendar")),
        },
      },
      "/api/agent/faq": {
        get: {
          tags: ["faq"], operationId: "searchFaq", summary: byId("faq"),
          parameters: [{ name: "q", in: "query", required: false, schema: { type: "string" }, description: "بحثٌ نصّي" }],
          responses: jsonOk({
            type: "object",
            properties: { count: { type: "integer" }, faq: { type: "array", items: ref("FaqItem") } },
          }),
        },
      },
      "/api/agent/skills": {
        get: {
          tags: ["skills"], operationId: "listSkills", summary: "اكتشاف المهارات المتاحة للوكلاء",
          responses: jsonOk({ type: "object", properties: { skills: { type: "array", items: { type: "object" } } } }),
        },
      },
      "/mcp": {
        post: {
          tags: ["mcp"], operationId: "mcpJsonRpc",
          summary: "خادم MCP — JSON-RPC 2.0 (initialize · tools/list · tools/call · prompts · resources)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["jsonrpc", "method"],
                  properties: {
                    jsonrpc: { const: "2.0" },
                    id: { type: ["string", "integer", "null"] },
                    method: { type: "string" },
                    params: { type: "object" },
                  },
                },
              },
            },
          },
          responses: jsonOk({
            type: "object",
            properties: {
              jsonrpc: { const: "2.0" },
              id: { type: ["string", "integer", "null"] },
              result: { type: "object" },
              error: { type: "object", properties: { code: { type: "integer" }, message: { type: "string" } } },
            },
          }),
        },
      },
    },
    components: {
      schemas: rebasedSchemas(),
      securitySchemes: {
        /* السطح المحميّ (بيانات الطالب) — موجودٌ فعلاً ولا يُفتح إلا بإذن صاحبه */
        googleOAuth: {
          type: "oauth2",
          description: "دخولُ Google عبر Firebase — للوصول إلى ما يخصّ حساب طالبٍ بعينه، بإذنه.",
          flows: {
            authorizationCode: {
              authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
              tokenUrl: "https://oauth2.googleapis.com/token",
              scopes: { openid: "الهوية", email: "البريد", profile: "الملف العام" },
            },
          },
        },
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "Firebase ID token" },
      },
    },
    security: [],   // كل ما سبق عامّ
  };
}
