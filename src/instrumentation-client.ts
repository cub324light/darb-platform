import * as Sentry from "@sentry/nextjs";

/* DSN عام (آمن للنشر) — يُفضّل ضبطه عبر متغيّر البيئة عند الحاجة */
const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://f97a2a109fcba8ff3a77160abcbb8e86@o4511574471475200.ingest.de.sentry.io/4511574564143184";

/* رصد الأخطاء فقط، بأخفّ حزمة ممكنة:
   - أزلنا Session Replay (rrweb) وتتبّع الأداء (browserTracingIntegration)
     و enableLogs — كلها تجرّ تكاملات ثقيلة إلى حزمة كل صفحة.
   - integrations: [] مع غياب tracesSampleRate ⇒ يحذف البنّاء (tree-shaking)
     كل آلية التتبّع، فتبقى نواة Sentry وحدها (~18KB gz) — وهي الأصغر الممكن.
   ملاحظة: التحميل الكسول (dynamic import) جُرِّب وأُلغي لأنه يستورد فضاء
   @sentry/nextjs كاملاً (168KB gz) دون tree-shaking، فيزيد إجمالي البايتات.
   تتبّع الأداء يغطّيه Vercel SpeedInsights، والجلسات Clarity، والتحليلات PostHog. */
Sentry.init({
  dsn: DSN,
  sendDefaultPii: true,
  integrations: [],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
