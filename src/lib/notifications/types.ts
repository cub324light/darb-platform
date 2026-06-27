/* ═══════════════════════════════════════════════════════════════════════
   Smart Notification Engine — الأنواع
   ───────────────────────────────────────────────────────────────────────
   طبقة قرار «هل/متى/كيف نقاطع الطالب». لا تحمل أي منطق تعليمي — تسأل محرّكات
   المعرفة/الذاكرة/التوصيات/الأحداث. كل قرار يُسجَّل كحدث (لا حالة موازية).
   حتميّ، قابل للاختبار، مستقل عن أي مزوّد. القاعدة: لا تقاطع إلا إذا كانت
   المقاطعة تخلق قيمة تفوق كلفتها.
   ═══════════════════════════════════════════════════════════════════════ */
import type { StudyWindow } from "../memory/types";

/* أنواع الإشعارات (تُشتق من مصادر التوصيات + مُحفّزات غير توصيوية) */
export type NotificationType =
  | "studyReminder" | "goalProgress" | "streakRecovery" | "examCountdown"
  | "reviewReminder" | "universityDeadline" | "stepReminder"
  | "parentSummary" | "achievement" | "duwairbAdvice";

/* مُرشّح إشعار — يُبنى من توصية أو مُحفّز */
export interface NotificationCandidate {
  id: string;                 // ثابت لكل مصدر (= معرّف التوصية غالباً)
  type: NotificationType;
  title: string;
  body: string;
  recId?: string;
  source: string;             // مصدر التوصية
  priority: number;           // 0..100 من التوصية
  confidence: number;         // 0..1 من التوصية
  targetPage?: string;
  deadlineDays?: number | null; // أيام حتى الموعد (اختبار/تسجيل) إن عُرف
}

/* نافذة هدوء (تدعم الالتفاف حول منتصف الليل، مثل النوم 23→6) */
export interface QuietWindow { startHour: number; endHour: number; label: string }

/* سياق التسليم — كل الإشارات اللازمة للقرار (تُجمَع من الأحداث/الذاكرة/المعرفة) */
export interface DeliveryContext {
  now: number;
  hour: number;                    // ساعة محلية 0..23
  inApp: boolean;                  // الطالب نشِط داخل درب الآن
  lastSentAt: number | null;
  sentLast24h: number;
  openRateByHour: number[];        // 24 — معدّل الفتح حسب الساعة (مُنعَّم)
  studyActivityByHour: number[];   // 24 — نشاط المذاكرة حسب الساعة
  preferredWindow?: StudyWindow;   // من الذاكرة
  fatigue: number;                 // 0..1
  quietWindows: QuietWindow[];
  pendingTypes: Set<NotificationType>; // لأنواع مجدولة/معلّقة (للدمج)
}

/* درجة الإشعار */
export interface NotificationScore {
  urgency: number;        // 0..1
  importance: number;     // 0..1
  confidence: number;     // 0..1 — أن «الآن» مناسب
  composite: number;      // 0..1 — الدرجة الحاكمة
  bestDeliveryTime: number; // epoch ms لأفضل وقت تالٍ
}

/* القرار */
export type NotificationAction = "send" | "delay" | "merge" | "cancel";
export interface NotificationDecision {
  action: NotificationAction;
  reason: string;          // قابل للشرح دائماً
  deliverAt?: number;      // لـ delay
  mergeInto?: string;      // لـ merge
}

export interface ScoredCandidate {
  candidate: NotificationCandidate;
  score: NotificationScore;
  decision: NotificationDecision;
}

/* النقل — واجهة قابلة للتوصيل (in-app / web-push / parent) بلا مزوّد محدّد */
export interface NotificationTransport {
  name: string;
  deliver(n: { id: string; type: NotificationType; title: string; body: string; targetPage?: string }): void;
}

/* إعدادات قابلة للضبط */
export interface NotificationConfig {
  sendThreshold: number;       // أدنى composite للإرسال
  cancelThreshold: number;     // تحت هذا → إلغاء
  cooldownMs: number;          // مهلة بين الإشعارات عالية الأولوية
  dailyCap: number;            // سقف الإشعارات اليومي (لقياس الإرهاق)
  urgencyOverride: number;     // urgency ≥ هذا يتجاوز التوقيت/المهلة
}

export const DEFAULT_CONFIG: NotificationConfig = {
  sendThreshold: 0.55,
  cancelThreshold: 0.30,
  cooldownMs: 6 * 60 * 60 * 1000, // ٦ ساعات
  dailyCap: 4,
  urgencyOverride: 0.85,
};

/* نوافذ الهدوء الافتراضية (حتمية، قابلة للحقن لاحقاً بمصدر دقيق) ──
   تقريب أوقات الصلاة + نوم ليلي. الالتفاف حول منتصف الليل مدعوم. */
export const DEFAULT_QUIET_WINDOWS: QuietWindow[] = [
  { startHour: 23, endHour: 6, label: "نوم" },        // ليلاً
  { startHour: 4,  endHour: 5,  label: "الفجر" },
  { startHour: 12, endHour: 13, label: "الظهر" },
  { startHour: 18, endHour: 19, label: "المغرب" },
];
