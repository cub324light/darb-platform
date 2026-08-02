/* بيانُ خادم التفويض (RFC 8414).
   ▸ درب لا تُصدر رموزاً بنفسها — الهويّة من Google عبر Firebase. كنّا نُحيل
     بتحويل 308، لكن الفاحصَ (ومكتباتِ الوكلاء) تتوقّع **JSON بحالة 200** على هذا
     المسار، فالتحويل يُقرأ فشلاً. نُقدّم البيان مباشرةً ونصرّح أن المُصدِر Google —
     فلا ندّعي ما لا نملك ولا نكسر التوقّع القياسيّ. */
import { AGENT_AUTH } from "@/lib/agent/authMeta";

export const dynamic = "force-static";

export function GET() {
  return Response.json({
    issuer: "https://accounts.google.com",
    authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    token_endpoint: "https://oauth2.googleapis.com/token",
    userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo",
    jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
    revocation_endpoint: "https://oauth2.googleapis.com/revoke",
    response_types_supported: ["code", "id_token", "token id_token"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "email", "profile"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["plain", "S256"],
    /* توضيحٌ صريح: المُصدِر ليس درب */
    service_documentation: "https://usedarb.com/docs/api",
    op_policy_uri: "https://usedarb.com/privacy",
    op_tos_uri: "https://usedarb.com/terms",
    /* بيانُ مصادقة الوكلاء — من `authMeta.ts`، هو نفسُه الذي يُطبع في ترويسة
       `/auth.md` وكتلتها. مصدرٌ واحد فلا يكذب أحدُهما على الآخر. */
    agent_auth: AGENT_AUTH,
  }, { headers: { "cache-control": "public, max-age=3600", "access-control-allow-origin": "*" } });
}
