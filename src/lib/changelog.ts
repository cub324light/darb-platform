/* ─── سجلّ تحديثات درب — يُعرض في /changelog ───
   أضف الإصدار الأحدث في الأعلى. النوع: new (جديد) / improve (تحسين) / fix (إصلاح). */
export type ChangeType = "new" | "improve" | "fix";

export interface ChangelogEntry {
  date: string;            // "YYYY-MM-DD"
  title?: string;
  changes: { type: ChangeType; text: string }[];
}

export const CHANGE_META: Record<ChangeType, { label: string; color: string; icon: string }> = {
  new:     { label: "جديد",  color: "#10B981", icon: "✦" },
  improve: { label: "تحسين", color: "#2563EB", icon: "↑" },
  fix:     { label: "إصلاح", color: "#F59E0B", icon: "⚙" },
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-06-21",
    title: "ملاحظاتك تصل لنا",
    changes: [
      { type: "new", text: "نظام ملاحظات: اقترح ميزة أو بلّغ عن مشكلة أو شاركنا رأيك — يصل مباشرة للفريق." },
      { type: "new", text: "صفحة «آخر التحديثات» (هذي الصفحة) لتتابع كل جديد في درب." },
    ],
  },
  {
    date: "2026-06-20",
    title: "تجربة أوضح وأسرع",
    changes: [
      { type: "new", text: "«خطتي»: شاشة تخطيط موحّدة بعرض يوم/أسبوع/شهر ومخطّط زمني يبرز جلستك الحالية." },
      { type: "improve", text: "دويرب صار محوراً واحداً بتبويبات: خطّط · حلّل ملف · أسئلة · اشرح · استخرج مواضيع." },
      { type: "improve", text: "أوربت: تختار الاختبار ثم المادة، والسجل والإعدادات انتقلوا لأسفل الصفحة." },
      { type: "improve", text: "الخريطة: تظهر المرحلة الحالية فقط لتبسيط المتابعة." },
      { type: "improve", text: "تصميم متحرّك أنيق على رأس كل صفحة." },
    ],
  },
  {
    date: "2026-06-19",
    title: "أمان وخصوصية أقوى",
    changes: [
      { type: "fix", text: "حماية الباقات من التلاعب، واحترام «البروفايل الخاص» في كل المنصة." },
      { type: "improve", text: "منع مشاركة وسائل التواصل في المجلس حفاظاً على أمان الجميع." },
      { type: "improve", text: "تحميل أسرع للصفحات وتقليل استهلاك البطارية." },
    ],
  },
];
