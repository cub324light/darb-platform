import * as Sentry from "@sentry/nextjs";

/* DSN عام (آمن للنشر) — يُفضّل ضبطه عبر متغيّر البيئة عند الحاجة */
const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://f97a2a109fcba8ff3a77160abcbb8e86@o4511574471475200.ingest.de.sentry.io/4511574564143184";

/* أزلنا Session Replay (rrweb) من الحزمة — تسجيل الجلسات يغطّيه Microsoft Clarity
   أصلاً، وهذا يوفّر أكبر قطعة JS على كل صفحة. يبقى رصد الأخطاء والتتبّع فعّالاً. */
Sentry.init({
  dsn: DSN,
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enableLogs: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
