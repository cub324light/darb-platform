/* ─── أنواع نظام التقويم ───
   حدث تقويم محايد عن المزوّد. كل مزوّد (Google / Apple / Outlook / لاحقاً
   Notion وOAuth) يستهلك نفس CalEvent[] — فالنظام قابل للتوسّع بإضافة مزوّد
   جديد للسجل دون تغيير بقية الكود. */

export interface CalEvent {
  uid: string;          // معرّف فريد ثابت للحدث (لمنع التكرار عند إعادة الاستيراد)
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}

export type ProviderKind = "download" | "weblink" | "oauth";

export interface CalendarProvider {
  id: string;
  label: string;
  icon: string;             // إيموجي/حرف
  kind: ProviderKind;
  /** هل يقبل عدة أحداث دفعة واحدة؟ (روابط الويب تقبل حدثاً واحداً) */
  multi: boolean;
  /** نفّذ التصدير: تنزيل ملف أو فتح رابط أو (لاحقاً) دفع عبر API */
  handler: (events: CalEvent[], calName: string) => void | Promise<void>;
  /** متاح الآن؟ (مراحل لاحقة قد تتطلب إعداداً — تظهر كـ"قريباً") */
  enabled: boolean;
}
