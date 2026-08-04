import { hasAnalyticsConsent } from "@/lib/consent";

/* DSN عام (آمن للنشر) — يُفضّل ضبطه عبر متغيّر البيئة عند الحاجة */
const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://f97a2a109fcba8ff3a77160abcbb8e86@o4511574471475200.ingest.de.sentry.io/4511574564143184";

/* ═══════════ رصدُ الأخطاء — يُحمَّل بإذنٍ لا بالافتراض ═══════════
   ▓ العطل المقيس: كان `import * as Sentry from "@sentry/nextjs"` في رأس الملفّ،
   و`init()` وحده خلف الموافقة. فالحزمةُ **تُنزَّل وتُحلَّل عند كل طالب** وإن لم
   يوافق قطّ — وهي ٤٢٨ ك.ب، أكبرُ قطعةٍ في الصفحة (أكبرُ من Firestore نفسِه)
   من أصل ٢٬٢٧٦ ك.ب. أي أنّ خُمسَ ما ينزّله الطالبُ أداةُ تقاريرَ لا تعمل عنده.

   ▓ الآن الاستيرادُ **ديناميكيّ داخل شرط الموافقة**: من لم يوافق لا يُطلب
   الملفُّ أصلاً، ومن وافق يُحمَّل بعد الرسم فلا يؤخّر أوّل شاشة.

   ▓ الخصوصية كما كانت: `sendDefaultPii=false` (لا IP ولا بيانات طلب)،
   و`integrations: []` بلا Session Replay ولا تتبّع أداء. */
type SentryModule = typeof import("@sentry/nextjs");
let sentry: SentryModule | null = null;

if (hasAnalyticsConsent()) {
  import("@sentry/nextjs")
    .then((m) => {
      m.init({ dsn: DSN, sendDefaultPii: false, integrations: [] });
      sentry = m;
    })
    .catch(() => { /* الرصدُ ليس ميزةً للطالب — فشلُه لا يُعطّل شيئاً */ });
}

/* خطّافُ إطار Next: يُستدعى عند كل انتقال. يُمرَّر إلى Sentry إن كان محمَّلاً،
   وإلا فلا شيء — لا انتظارَ ولا تحميلَ متأخّرٌ يُشغّل الحزمة من الباب الخلفيّ. */
export function onRouterTransitionStart(
  ...args: Parameters<SentryModule["captureRouterTransitionStart"]>
): void {
  sentry?.captureRouterTransitionStart(...args);
}
