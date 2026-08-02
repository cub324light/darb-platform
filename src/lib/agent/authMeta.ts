/* ═══════════ بيانُ مصادقة الوكلاء (Auth.md) — مصدرٌ واحد ═══════════
   يُقرأ من ثلاثة مواضع: ترويسةُ `/auth.md` (YAML)، وكتلةُ JSON داخلها،
   وبيانا OAuth (خادم التفويض والمورد المحميّ). كانت مكتوبةً مرّتين فكان يكفي
   أن يُعدَّل أحدُهما ليكذب الآخر.

   ▸ طريقةُ التسجيل المعلنة **anonymous** — وهي وصفُ حالنا حرفياً: واجهةُ درب
     العامّة لا تطلب هويّةً ولا اعتماداً ولا تسجيلاً. لم نخترها لتمرير فحص،
     بل لأنها الصادقة؛ ولو أعلنّا ID-JAG أو verified_email لادّعينا تدفّقاً
     لا نخدمه فينكسر أوّل وكيلٍ يسلكه.
   ▸ ودخولُ Google يبقى موصوفاً لأنه حقيقيّ أيضاً — لكنه للطالب البشريّ في
     تطبيقه، لا لوكيلٍ ينوب عنه. ولذلك `delegated_agent_access: false`.

   نقيّ: لا `window` ولا `Date`. */
import { SITE } from "./catalog";

/** حيث «يسجّل» الوكيلُ فيعلم أنه لا يحتاج تسجيلاً — بيانٌ آليّ لا وعدٌ فارغ. */
export const CLAIM_URI = `${SITE.url}/api/agent/claim`;

export const AGENT_AUTH = {
  /* وثيقةُ المهارة التي تشرح للوكيل كيف يتعامل مع مصادقة درب */
  skill: `${SITE.url}/.well-known/agent-skills/agent-auth/SKILL.md`,
  register_uri: CLAIM_URI,

  /* ═══ طريقةُ التسجيل: مجهولةُ الهويّة، كاملةٌ كما تصفها المواصفة ═══ */
  identity_types_supported: ["anonymous"],
  anonymous: {
    credential_types_supported: ["none"],
    claim_uri: CLAIM_URI,
  },
  claim_uri: CLAIM_URI,

  /* ═══ السطح العامّ ═══ */
  public_api: { auth_required: false },

  /* ═══ السطح المحميّ (للطالب البشريّ لا للوكيل) ═══ */
  authorization_servers: ["https://accounts.google.com"],
  protected_resource_metadata: `${SITE.url}/.well-known/oauth-protected-resource`,
  authorization_server_metadata: `${SITE.url}/.well-known/oauth-authorization-server`,
  documentation: `${SITE.url}/auth.md`,
  credential_types_supported: ["oauth2_access_token", "oidc_id_token"],
  token_endpoint_auth_methods: ["client_secret_post", "client_secret_basic"],
  revocation_uri: "https://oauth2.googleapis.com/revoke",

  /* تسجيلُ عميلٍ لدخول Google يدويٌّ في وحدة اعتماده — لا تسجيلَ ديناميكيّاً
     (RFC 7591) عندنا، ولا نَعِد به. */
  dynamic_client_registration: false,
  registration_type: "manual",
  client_registration_uri: "https://console.cloud.google.com/apis/credentials",

  /* ▓ لا يدخل وكيلٌ إلى بيانات طالبٍ نيابةً عنه — لا اليوم ولا لاحقاً */
  delegated_agent_access: false,
} as const;
