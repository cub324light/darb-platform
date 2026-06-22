import * as Sentry from "@sentry/nextjs";

const DSN =
  process.env.SENTRY_DSN ??
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://f97a2a109fcba8ff3a77160abcbb8e86@o4511574471475200.ingest.de.sentry.io/4511574564143184";

/* رصد الأخطاء فقط — بلا تتبّع أداء ولا سجلّات ولا التقاط متغيّرات محلية.
   يقلّل حِمل المراقبة على كل طلب خادم وحجم البيانات المُرسلة، مع بقاء
   التقاط الأخطاء (الأهم) فعّالاً. */
Sentry.init({
  dsn: DSN,
  sendDefaultPii: true,
});
