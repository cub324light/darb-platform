/* ─── أنواع خدمة البريد (Resend) ───
   نقطة الحقيقة الواحدة لأشكال الإدخال والمخرجات والقوالب. */

/* مدخلات إرسال بريد خام (بدون قالب) */
export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;        // نسخة نصّية اختيارية (تحسّن التسليم)
  from?: string;        // يتجاوز المُرسِل الافتراضي
  replyTo?: string;     // عنوان الرد
  cc?: string | string[];
  bcc?: string | string[];
}

/* نتيجة موحّدة — لا ترمي استثناءات، تُرجع حالة واضحة */
export interface SendEmailResult {
  ok: boolean;
  id?: string;          // معرّف الرسالة من Resend عند النجاح
  error?: string;       // رسالة الخطأ بالعربية عند الفشل
}

/* تعريف قالب: يحوّل خصائص نوعية إلى عنوان + HTML + نص */
export interface EmailTemplate<P> {
  subject: (props: P) => string;
  html: (props: P) => string;
  text?: (props: P) => string;
}
