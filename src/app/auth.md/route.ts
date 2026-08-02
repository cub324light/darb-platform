/* /auth.md — كيف يُصادِق الوكيلُ على درب (اصطلاح auth.md من WorkOS).
   نكتب الحقيقة كما هي: السطحُ العامّ مفتوحٌ بلا مصادقة، والسطحُ الخاص خلف
   هويّة Google. ولا نُعلن تسجيلاً ديناميكياً لا نخدمه — عنوانٌ مخترَعٌ يكسر
   أوّل وكيلٍ يجرّبه، والصمتُ عنه أصدق. */
import { SITE } from "@/lib/agent/catalog";

export const dynamic = "force-static";

export function GET() {
  /* ▓ العنوان الأول «Auth.md» حرفاً بحرف: هو اسمُ الاصطلاح لا ترجمتُه، والقارئُ
     الآليّ يبحث عنه بنصّه. كان العنوانُ عربياً فقُرئ الملفُّ ناقصاً وإن كان
     محتواه كاملاً. الاسمُ إنجليزيّ والشرحُ عربيّ — كلٌّ في موضعه. */
  const body = `# Auth.md

## المصادقة — ${SITE.name} (${SITE.nameEn})

${SITE.url}

## الخلاصة
| السطح | المصادقة |
|---|---|
| البيانات العامّة (\`/api/agent/*\` · \`/mcp\` · ملفّات الاكتشاف) | **لا شيء** — مفتوحة للقراءة |
| ما يخصّ حساب طالبٍ بعينه | **OAuth 2.0 عبر Google** (Firebase Authentication) |

## السطح العامّ
اقرأ مباشرةً بلا رمزٍ ولا مفتاح:

- \`GET ${SITE.url}/api/agent/universities\`
- \`GET ${SITE.url}/api/agent/exams\`
- \`GET ${SITE.url}/api/agent/calendar\`
- \`GET ${SITE.url}/api/agent/faq\`
- \`POST ${SITE.url}/mcp\` (JSON-RPC 2.0)

الحدُّ ستّون طلباً في الدقيقة لكل عنوان. الترويسة \`Access-Control-Allow-Origin: *\`.

## السطح المحميّ
بيانات الطالب — خطّته وأخطاؤه وتقدّمه — لا تخرج من درب إلى وكيلٍ إطلاقاً.
**لا توجد واجهةٌ تُخرجها، ولن توجد.** ما خلف الدخول هو تطبيق الطالب نفسه:
يفتحه هو بهويّته من Google، ولا يُفوَّض وكيلٌ ثالث بقراءته.

- خادم التفويض: \`https://accounts.google.com\`
- بيانُ الخادم: [\`/.well-known/oauth-authorization-server\`](${SITE.url}/.well-known/oauth-authorization-server) (RFC 8414)
- بيانُ المورد المحميّ: [\`/.well-known/oauth-protected-resource\`](${SITE.url}/.well-known/oauth-protected-resource) (RFC 9728)
- الرمز يُرسَل: \`Authorization: Bearer <Google ID token>\`
- النطاقات: \`openid\` · \`email\` · \`profile\`

## تسجيلُ الوكلاء (Agent Registration)
درب **لا تُصدر** رموزاً ولا تملك سجلَّ عملاء خاصاً بها؛ الهويّةُ من Google.
فليس عندنا \`register_uri\`: التسجيلُ الديناميكي (RFC 7591) غير مدعوم، ويُنشئ
المطوّرُ عميلَه في Google Cloud Console ثم يستعمل خادم تفويض Google أعلاه.

\`\`\`json
{
  "agent_auth": {
    "public_api": { "auth_required": false },
    "authorization_servers": ["https://accounts.google.com"],
    "protected_resource_metadata": "${SITE.url}/.well-known/oauth-protected-resource",
    "authorization_server_metadata": "${SITE.url}/.well-known/oauth-authorization-server",
    "identity_types": ["human"],
    "credential_types": ["oauth2_access_token", "oidc_id_token"],
    "token_endpoint_auth_methods": ["client_secret_post", "client_secret_basic"],
    "dynamic_client_registration": false,
    "register_uri": null,
    "claims_uri": "https://openidconnect.googleapis.com/v1/userinfo",
    "revocation_uri": "https://oauth2.googleapis.com/revoke",
    "delegated_agent_access": false
  }
}
\`\`\`

\`identity_types\` بشريٌّ وحده و\`delegated_agent_access\` مُطفأ عن قصد: لا يدخل
وكيلٌ نيابةً عن طالبٍ إلى بياناته في درب.

## التواصل
support@usedarb.com · [توثيق الواجهة](${SITE.url}/docs/api)
`;
  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "access-control-allow-origin": "*",
    },
  });
}
