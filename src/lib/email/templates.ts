/* ─── سجل القوالب (Templates System) ───
   التوسعة بأقل تعديل: لإضافة قالب جديد نفعّل سطراً في TemplateProps
   ونضيف القالب المقابل في TEMPLATES — والباقي (النوعية، الراوت) يعمل تلقائياً.

   كل القوالب الجاهزة للتفعيل لاحقاً معلّقة كأمثلة بالأسفل
   (Welcome / Password Reset / Weekly Report / Announcement / Study Reminder). */

import type { EmailTemplate } from "./types";
// مكوّنات الغلاف جاهزة للاستيراد عند بناء أول قالب فعلي:
// import { layout, heading, paragraph, button } from "./layout";

/* خريطة القوالب: المفتاح → نوع خصائصه.
   أضِف سطراً هنا لكل قالب جديد ليصبح type-safe في sendTemplate. */
export interface TemplateProps {
  // welcome:        { name: string };
  // passwordReset:  { name: string; resetUrl: string };
  // weeklyReport:   { name: string; minutes: number; sessions: number };
  // announcement:   { title: string; body: string };
  // studyReminder:  { name: string; subject: string; dueCount: number };
}

export type TemplateName = keyof TemplateProps;

/* السجل الفعلي — مفاتيحه مطابقة لـ TemplateProps حرفياً.
   فارغ الآن (البنية جاهزة)؛ كل قالب يُضاف ككائن EmailTemplate نوعي. */
export const TEMPLATES: { [K in TemplateName]: EmailTemplate<TemplateProps[K]> } = {
  /* مثال جاهز — انسخه وفعّل المفتاح في TemplateProps أعلاه:

  welcome: {
    subject: ({ name }) => `أهلاً ${name} في درب 👋`,
    html: ({ name }) => layout(
      heading(`مرحباً ${name}!`) +
      paragraph("سعداء بانضمامك. ابدأ بتحديد مسارك وخريطة مهاراتك.") +
      button("افتح المنصة", "https://darb.app/dashboard"),
      { preheader: "ابدأ رحلتك في درب" },
    ),
    text: ({ name }) => `مرحباً ${name}! سعداء بانضمامك إلى درب.`,
  },

  */
};
