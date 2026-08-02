/* نقطةُ «المطالبة» لتسجيل الوكلاء مجهولي الهويّة (Auth.md · anonymous).
   ▸ ما فائدتها إن كانت الواجهةُ مفتوحة؟ أن يعرف الوكيلُ **آلياً** أنه لا يحتاج
     اعتماداً، فيمضي بدل أن يبحث عن مفتاحٍ لا وجود له أو يظنّ الباب مغلقاً.
   ▸ GET وحده: المواصفة تنبّه ألّا تُطرَق نقاطُ التسجيل بـPOST في الفحص السلبيّ،
     ونحن أصلاً لا نُنشئ حساباً ولا نُصدر رمزاً ولا نرسل بريداً. */
import { SITE, ENDPOINTS } from "@/lib/agent/catalog";
import { agentJson, OPTIONS as opt } from "@/lib/agent/respond";

export const dynamic = "force-static";
export const OPTIONS = opt;

export function GET() {
  return agentJson({
    identity_type: "anonymous",
    credential_type: "none",
    granted: true,
    /* لا رمزَ يُصدر: الوصولُ ممنوحٌ بلا اعتماد */
    credential: null,
    token: null,
    message:
      "واجهةُ درب العامّة مفتوحةٌ للقراءة بلا مصادقة. لا تحتاج تسجيلاً ولا مفتاحاً — " +
      "استدعِ العناوين أدناه مباشرةً.",
    messageEn:
      "Darb's public API is open for reading without authentication. No registration or key " +
      "is required — call the endpoints below directly.",
    endpoints: ENDPOINTS.map((e) => `${SITE.url}${e.path}`),
    mcp: `${SITE.url}/mcp`,
    rate_limit: { requests_per_minute: 60, scope: "per endpoint" },
    documentation: `${SITE.url}/auth.md`,
    /* الحدُّ الذي لا يتغيّر: بيانات الطالب لا تُمنح لوكيلٍ بحال */
    scope: "public-data-only",
    student_data_access: false,
  });
}
