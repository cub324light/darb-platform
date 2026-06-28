import * as Sentry from "@sentry/nextjs";

const DSN =
  process.env.SENTRY_DSN ??
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://f97a2a109fcba8ff3a77160abcbb8e86@o4511574471475200.ingest.de.sentry.io/4511574564143184";

/* رصد الأخطاء فقط — بلا تتبّع أداء ولا سجلّات (يقلّل حِمل المراقبة على الحافة) */
Sentry.init({
  dsn: DSN,
  /* خصوصية-أولاً: لا إرسال IP ولا بيانات الطلب/المستخدم؛ يبقى التقاط الأخطاء فعّالاً */
  sendDefaultPii: false,
});
