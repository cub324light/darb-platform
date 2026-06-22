import * as Sentry from "@sentry/nextjs";

/* DSN عام (آمن للنشر) — يُفضّل ضبطه عبر متغيّر البيئة عند الحاجة */
const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://f97a2a109fcba8ff3a77160abcbb8e86@o4511574471475200.ingest.de.sentry.io/4511574564143184";

/* أزلنا Session Replay (rrweb) سابقاً، والآن أزلنا تتبّع الأداء (Tracing)
   و enableLogs — كلاهما يجرّ browserTracingIntegration الثقيل إلى حزمة كل صفحة.
   تتبّع الأداء يغطّيه Vercel SpeedInsights، وتسجيل الجلسات يغطّيه Clarity،
   والتحليلات PostHog. يبقى رصد الأخطاء (الأهم) فعّالاً بأخف حزمة ممكنة. */
Sentry.init({
  dsn: DSN,
  sendDefaultPii: true,
  /* بلا tracesSampleRate ⇒ لا يُحمَّل تكامل التتبّع. رصد الأخطاء فقط. */
  integrations: [],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
