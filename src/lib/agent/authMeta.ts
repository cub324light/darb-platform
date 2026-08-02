/* ═══════════ بيانُ مصادقة الوكلاء — مصدرٌ واحد ═══════════
   يُقرأ من ثلاثة مواضع: ترويسةُ `/auth.md` (YAML)، وكتلةُ JSON داخلها،
   و`/.well-known/oauth-authorization-server`. كانت مكتوبةً مرّتين — نصّاً في
   الماركداون وكائناً في المعالِج — فكان يكفي أن يُعدَّل أحدُهما ليكذب الآخر.

   نقولُ الحقيقة كما هي: درب لا تُصدر رموزاً (الهويّة من Google)، فلا
   `register_uri` عندنا ولا تسجيلٌ ديناميكيّ. عنوانٌ مخترَعٌ يكسر أوّل وكيلٍ
   يجرّبه، والصمتُ عنه أصدق.

   نقيّ: لا `window` ولا `Date`. */

export const AGENT_AUTH = {
  public_api: { auth_required: false },
  authorization_servers: ["https://accounts.google.com"],
  protected_resource_metadata: "https://usedarb.com/.well-known/oauth-protected-resource",
  authorization_server_metadata: "https://usedarb.com/.well-known/oauth-authorization-server",
  documentation: "https://usedarb.com/auth.md",
  identity_types: ["human"],
  credential_types: ["oauth2_access_token", "oidc_id_token"],
  token_endpoint_auth_methods: ["client_secret_post", "client_secret_basic"],
  dynamic_client_registration: false,
  register_uri: null,
  claims_uri: "https://openidconnect.googleapis.com/v1/userinfo",
  revocation_uri: "https://oauth2.googleapis.com/revoke",
  delegated_agent_access: false,
} as const;
