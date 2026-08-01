/* وصف OpenAPI 3.1 — يُولَّد من الكتالوج نفسه فلا يفترق عن الواقع. */
import { SITE, ENDPOINTS } from "@/lib/agent/catalog";

export const dynamic = "force-static";

const jsonOk = (schema: object) => ({
  "200": { description: "نجاح", content: { "application/json": { schema } } },
});

export function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: `${SITE.name} — واجهة البيانات العامّة`,
      version: "1.0.0",
      description:
        `${SITE.descriptionAr}\n\n` +
        "واجهاتٌ للقراءة فقط، عامّة بلا مصادقة. لا تُعيد أي بيانات شخصية للطلاب. " +
        "الحقولُ الفارغة تعني «لم تُعلنه الجهة الرسمية بعد» — لا تُملأ تخميناً.",
      contact: { name: SITE.name, url: SITE.url },
      license: { name: "Proprietary", url: `${SITE.url}/terms` },
    },
    servers: [{ url: SITE.url }],
    tags: ENDPOINTS.map((e) => ({ name: e.id, description: e.summary })),
    paths: {
      "/api/agent/universities": {
        get: {
          tags: ["universities"], operationId: "listUniversities", summary: ENDPOINTS[0].summary,
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
              universities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" }, name: { type: "string" },
                    region: { type: ["string", "null"] }, kind: { type: ["string", "null"] },
                    qsRank: { type: ["integer", "null"] }, qsRankTo: { type: ["integer", "null"] },
                    qsYear: { type: ["integer", "null"] }, url: { type: "string" },
                  },
                },
              },
            },
          }),
        },
      },
      "/api/agent/exams": {
        get: {
          tags: ["exams"], operationId: "listExams", summary: ENDPOINTS[1].summary,
          responses: jsonOk({ type: "object", properties: { exams: { type: "array", items: { type: "object" } } } }),
        },
      },
      "/api/agent/calendar": {
        get: {
          tags: ["calendar"], operationId: "getCalendar", summary: ENDPOINTS[2].summary,
          responses: jsonOk({ type: "object", properties: { updatedFor: { type: "string" }, years: { type: "array", items: { type: "object" } } } }),
        },
      },
      "/api/agent/faq": {
        get: {
          tags: ["faq"], operationId: "searchFaq", summary: ENDPOINTS[3].summary,
          parameters: [{ name: "q", in: "query", required: false, schema: { type: "string" }, description: "بحثٌ نصّي" }],
          responses: jsonOk({ type: "object", properties: { count: { type: "integer" }, faq: { type: "array", items: { type: "object" } } } }),
        },
      },
      "/api/agent/skills": {
        get: {
          tags: ["skills"], operationId: "listSkills", summary: "اكتشاف المهارات المتاحة للوكلاء",
          responses: jsonOk({ type: "object", properties: { skills: { type: "array", items: { type: "object" } } } }),
        },
      },
    },
    components: {
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
  return Response.json(spec, { headers: { "cache-control": "public, max-age=3600" } });
}
