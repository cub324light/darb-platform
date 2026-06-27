/* ═══════════════════════════════════════════════════════════════════════
   Notifications — طبقة الوصول (السطح العام)
   يربط محرّك الإشعار بالأحداث + الذاكرة + التوصيات + نقل داخل التطبيق.
   النقل قابل للتوصيل (web-push لاحقاً) فيبقى المحرّك مستقلاً عن أي مزوّد.
   ═══════════════════════════════════════════════════════════════════════ */
import { NotificationEngine } from "./engine";
import type { NotificationTransport } from "./types";
import { events } from "../events";
import { memory } from "../memory";
import { loadRecommendations } from "../recommendationClient";

/* نقل داخل التطبيق — يبثّ حدث DOM يلتقطه عنصر التوست (بلا مزوّد خارجي) */
export const InAppTransport: NotificationTransport = {
  name: "in-app",
  deliver(n) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("darb:notification", { detail: n }));
  },
};

let _engine: NotificationEngine | null = null;

export function notifications(): NotificationEngine {
  if (!_engine) {
    _engine = new NotificationEngine({
      events: events(),
      getRecommendations: () => loadRecommendations(),
      getMemoryContext: () => memory().buildStudentContext(),
      transport: InAppTransport,
      /* «داخل درب الآن» = التبويب ظاهر — فلا نقاطع بدفعٍ بينما يستعمل الطالب درب
         (التوصيات تُعرَض داخلياً في صفحة الرئيسية). درايفر web-push لاحقاً يحترم هذا. */
      isInApp: () => typeof document !== "undefined" && document.visibilityState === "visible",
    });
  }
  return _engine;
}

export function __resetNotifications(): void { _engine = null; }

export { NotificationEngine } from "./engine";
export {
  inQuietWindow, buildTimingBuckets, computeFatigue, scoreCandidate, decide, bestDeliveryTime,
} from "./scoring";
export {
  DEFAULT_CONFIG, DEFAULT_QUIET_WINDOWS,
} from "./types";
export type {
  NotificationType, NotificationCandidate, NotificationScore, NotificationDecision,
  NotificationAction, ScoredCandidate, DeliveryContext, QuietWindow,
  NotificationTransport, NotificationConfig,
} from "./types";
