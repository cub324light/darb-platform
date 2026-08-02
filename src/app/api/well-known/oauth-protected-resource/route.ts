/* بيانُ المورد المحميّ (RFC 9728) — يخبر الوكيل أين يُصادِق للوصول إلى ما يخصّ
   حساب طالبٍ بعينه. واجهاتُ القراءة العامّة لا تحتاجه، لكن الإعلان عنه صدقٌ في
   الوصف: درب فيها سطحٌ محميّ فعلاً (بيانات الطالب) خلف دخول Google. */
import { SITE } from "@/lib/agent/catalog";
import { AGENT_AUTH } from "@/lib/agent/authMeta";
import { AGENT_HEADERS } from "@/lib/agent/respond";

export const dynamic = "force-static";

export function GET() {
  return Response.json({
    resource: SITE.url,
    authorization_servers: ["https://accounts.google.com"],
    bearer_methods_supported: ["header"],
    resource_documentation: `${SITE.url}/docs/api`,
    scopes_supported: ["openid", "email", "profile"],
    /* السطح العامّ مفتوحٌ عمداً؛ وما وراءه لا يُفتح لوكيلٍ إلا بإذن صاحبه */
    resource_signing_alg_values_supported: ["RS256"],
    /* بيانُ مصادقة الوكلاء — من `authMeta.ts` نفسِه الذي يغذّي /auth.md وبيانَ
       خادم التفويض. القارئُ يسحب الملفّات الثلاثة معاً، فليجد الكتلةَ في أيّها
       فتح. RFC 9728 يسمح بالحقول الإضافية، والقيمُ واحدة لا ثلاث. */
    agent_auth: AGENT_AUTH,
  }, { headers: AGENT_HEADERS });
}
