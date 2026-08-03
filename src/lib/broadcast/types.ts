/* ─── مركز الإشعارات (Broadcast) — نماذج البيانات ───
   تعريف الإشعار الجماعي: نوعه، جمهوره (فلتر قابل للتوسّع)، جدولته، حالته،
   وإحصاءاته. اللوحة الإدارية تُنشئ هذه التعريفات؛ محرّك الإشعار في العميل
   هو من يُسلّمها (لا تكرار لمنطق المحرّك). أنواع نقية فقط. */

export type BroadcastType =
  | "announcement"   // إعلان
  | "reminder"       // تذكير
  | "alert"          // تنبيه
  | "news"           // خبر
  | "urgent"         // إشعار عاجل
  | "admin_message"; // رسالة من الإدارة

export const BROADCAST_TYPES: { id: BroadcastType; label: string; icon: string }[] = [
  { id: "announcement",  label: "إعلان",          icon: "📣" },
  { id: "reminder",      label: "تذكير",          icon: "⏰" },
  { id: "alert",         label: "تنبيه",          icon: "⚠️" },
  { id: "news",          label: "خبر",            icon: "📰" },
  { id: "urgent",        label: "إشعار عاجل",     icon: "🚨" },
  { id: "admin_message", label: "رسالة من الإدارة", icon: "🛡️" },
];

/* ─── فلتر الجمهور — قابل للتوسّع بأنواع مستقبلية ─── */
export type AudienceKind = "all" | "stage" | "grade" | "university" | "rank" | "inactive" | "score";

export const AUDIENCE_KINDS: { id: AudienceKind; label: string }[] = [
  { id: "all",        label: "جميع المستخدمين" },
  { id: "stage",      label: "حسب المرحلة الدراسية" },
  { id: "grade",      label: "حسب الصف" },
  { id: "university", label: "حسب الجامعة المستهدفة" },
  { id: "rank",       label: "حسب الرتبة (RP)" },
  { id: "inactive",   label: "حسب النشاط (غير النشطين)" },
  { id: "score",      label: "حسب نتائج القدرات/التحصيلي" },
];

export interface AudienceFilter {
  kind: AudienceKind;
  stage?: string;        // ثانوي | جامعي | خريج
  grade?: string;        // أول ثانوي | ثاني ثانوي | ثالث ثانوي
  university?: string;   // مطابقة جزئية على الجامعة المستهدفة
  minRp?: number;        // الرتبة: حدّ أدنى/أعلى RP
  maxRp?: number;
  inactiveDays?: number; // غير نشِط منذ ≥ N يوم
  exam?: "qudurat" | "tahsili"; // النتائج
  scoreOp?: "gte" | "lte";
  scoreValue?: number;
}

export type BroadcastStatus = "draft" | "scheduled" | "sent" | "canceled";

export interface BroadcastStats {
  targeted: number;   // عدد المستهدفين (تقدير عند الإرسال)
  delivered: number;  // وصلت فعلاً (يبلّغ عنها العميل)
  opened: number;     // فُتحت
  dismissed: number;  // تُجوهِلت
}

export interface Broadcast {
  id: string;
  type: BroadcastType;
  title: string;
  body: string;
  targetPage?: string;
  audience: AudienceFilter;
  status: BroadcastStatus;
  scheduledAt: number | null;
  sentAt: number | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  stats: BroadcastStats;
}

/* قوالب جاهزة لإعادة الاستخدام السريع */
export interface BroadcastTemplate {
  id: string;
  label: string;
  type: BroadcastType;
  title: string;
  body: string;
}

export const BROADCAST_TEMPLATES: BroadcastTemplate[] = [
  { id: "exam-soon",   label: "اقتراب موعد اختبار", type: "reminder",     title: "اقترب موعد اختبارك!", body: "تبقّت أيام قليلة على اختبارك — راجع خطتك في درب وذاكر بتركيز." },
  { id: "new-feature", label: "ميزة جديدة",         type: "announcement", title: "ميزة جديدة في درب", body: "أضفنا ميزة جديدة تساعدك على المذاكرة بذكاء — جرّبها الآن!" },
  { id: "comeback",    label: "تحفيز العائدين",     type: "admin_message", title: "اشتقنا لك في درب", body: "مرّ وقت من آخر جلسة لك — رجوعك اليوم يصنع فرقاً. ابدأ بجلسة قصيرة." },
  { id: "maintenance", label: "صيانة",              type: "alert",        title: "صيانة مجدولة", body: "سيكون هناك تحديث قصير على المنصة. شكراً لتفهّمك." },
];

export const EMPTY_AUDIENCE: AudienceFilter = { kind: "all" };
