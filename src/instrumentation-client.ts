import * as Sentry from "@sentry/nextjs";
import { hasAnalyticsConsent } from "@/lib/consent";

/* DSN عام (آمن للنشر) — يُفضّل ضبطه عبر متغيّر البيئة عند الحاجة */
const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://f97a2a109fcba8ff3a77160abcbb8e86@o4511574471475200.ingest.de.sentry.io/4511574564143184";

/* رصد الأخطاء فقط، بأخفّ حزمة ممكنة وبخصوصية-أولاً:
   - لا يُهيّأ إطلاقاً قبل موافقة المستخدم على التحليلات (الافتراضي: مُعطَّل).
   - sendDefaultPii=false: لا يُرسل عنوان IP ولا بيانات الطلب/المستخدم.
   - أزلنا Session Replay (rrweb) وتتبّع الأداء و enableLogs.
   - integrations: [] مع غياب tracesSampleRate ⇒ يحذف البنّاء (tree-shaking)
     كل آلية التتبّع، فتبقى نواة رصد الأخطاء وحدها. */
if (hasAnalyticsConsent()) {
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,
    integrations: [],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
