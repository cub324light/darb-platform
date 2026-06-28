/* ─── موافقة التحليلات (Analytics Consent) ───
   علم واحد في localStorage يحكم تحميل كل أدوات الطرف الثالث:
   PostHog، Sentry (المتصفح)، Vercel Analytics، Vercel Speed Insights.

   مبدأ خصوصية-أولاً: الافتراضي «مُعطَّل». لا شيء يُحمَّل قبل موافقة صريحة —
   ويشمل ذلك المستخدمين الحاليين (غياب المفتاح = رفض). المستخدم يفعّلها
   لاحقاً من الملف الشخصي ← التفضيلات. وحدة نقية بلا أي طرف ثالث. */

export const ANALYTICS_CONSENT_KEY = "darb_analytics_consent";
export const CONSENT_EVENT = "darb:consent-changed";

/* هل وافق المستخدم على التحليلات؟ الغياب = لا (افتراضي مُعطَّل). */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ANALYTICS_CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

/* ضبط الموافقة — يبثّ حدثاً ليستجيب الموجّهون فوراً (تفعيل بلا إعادة تحميل). */
export function setAnalyticsConsent(on: boolean): void {
  try {
    if (on) localStorage.setItem(ANALYTICS_CONSENT_KEY, "1");
    else localStorage.removeItem(ANALYTICS_CONSENT_KEY);
  } catch {
    /* تجاهل — رفض التخزين يعني بقاء الافتراضي «مُعطَّل» */
  }
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { on } }));
  } catch {
    /* بيئة بلا window */
  }
}
