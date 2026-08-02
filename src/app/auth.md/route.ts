/* /auth.md — كيف يُصادِق الوكيلُ على درب (اصطلاح auth.md من WorkOS).
   نكتب الحقيقة كما هي: السطحُ العامّ مفتوحٌ بلا مصادقة، والسطحُ الخاص خلف
   هويّة Google. ولا نُعلن تسجيلاً ديناميكياً لا نخدمه — عنوانٌ مخترَعٌ يكسر
   أوّل وكيلٍ يجرّبه، والصمتُ عنه أصدق. */
import { SITE } from "@/lib/agent/catalog";
import { AGENT_AUTH } from "@/lib/agent/authMeta";
import { toYaml } from "@/lib/agent/yaml";

export const dynamic = "force-static";

export function GET() {
  /* ▓ ترويسةُ YAML: الفاحصُ قرأ الملفّ ووجد العنوان، ثم قال «agent_auth غير
     موجود» — لأن الكتلة كانت داخل سياجِ ```json، والقارئُ الآليّ يقرأ الترويسة
     لا نصَّ الشيفرة. نطبعها هنا من `authMeta.ts` نفسه الذي يغذّي بيانَ خادم
     التفويض والكتلةَ أدناه: ثلاثةُ مواضع بقيمةٍ واحدة. */
  const frontMatter = `---\n${toYaml({ agent_auth: AGENT_AUTH })}---\n\n`;
  /* ▓ العنوان الأول «Auth.md» حرفاً بحرف: هو اسمُ الاصطلاح لا ترجمتُه، والقارئُ
     الآليّ يبحث عنه بنصّه. كان العنوانُ عربياً فقُرئ الملفُّ ناقصاً وإن كان
     محتواه كاملاً. الاسمُ إنجليزيّ والشرحُ عربيّ — كلٌّ في موضعه. */
  const body = `${frontMatter}# Auth.md

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
**نوعُ الهويّة \`anonymous\` ونوعُ الاعتماد \`none\`.** لا تسجيلَ ولا مفتاح: استدعِ
الواجهةَ العامّة مباشرةً. وللتأكّد آلياً بدل التخمين:

\`\`\`
GET ${SITE.url}/api/agent/claim
→ {"identity_type":"anonymous","credential_type":"none","granted":true,"credential":null}
\`\`\`

يُعيد معها قائمةَ العناوين المتاحة وحدَّ الطلبات. لا يُنشئ حساباً ولا يُصدر رمزاً
ولا يرسل بريداً — إنما يخبرك أن البابَ مفتوحٌ أصلاً.

المهارةُ الكاملة: [\`agent-auth\`](${SITE.url}/.well-known/agent-skills/agent-auth/SKILL.md)

### أمّا دخولُ Google
فهو **للطالب البشريّ في تطبيقه**، لا لوكيلٍ ينوب عنه. من أراد بناء عميلٍ يدخل
به مستخدمٌ بنفسه: يُنشئ عميلاً يدوياً في
[وحدة اعتماد Google](https://console.cloud.google.com/apis/credentials) — والتسجيلُ
الديناميكي (RFC 7591) غير مدعوم. ولا يوجد — ولن يوجد — تفويضٌ يُدخل وكيلاً إلى
بيانات طالبٍ نيابةً عنه؛ ولذلك \`delegated_agent_access\` مُطفأ.

\`\`\`json
${JSON.stringify({ agent_auth: AGENT_AUTH }, null, 2)}
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
