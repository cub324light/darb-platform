/* ─── منع مشاركة وسائل التواصل في النصوص المرئية للآخرين ───
   يُستخدم في رسائل المجلس واسم البروفايل. الكشف على العميل لتجربة فورية،
   وقواعد Firestore تطبّق نسخة مكافئة على الخادم (دفاع متعدّد الطبقات). */

const PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /https?:\/\/|www\.[a-z0-9-]+\.[a-z]{2,}/i, reason: "رابط" },
  { re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, reason: "بريد إلكتروني" },
  /* جوال سعودي / دولي / أي تسلسل أرقام طويل (مع فواصل شائعة) */
  { re: /(?:\+?9665|\b05|٠٥)[\d\s.\-]{7,}/, reason: "رقم جوال" },
  { re: /[\d٠-٩][\s.\-]?(?:[\d٠-٩][\s.\-]?){8,}/, reason: "رقم هاتف" },
  /* منصات تواصل (إنجليزي/عربي) */
  { re: /\b(?:snap(?:chat)?|whats?app|wts|insta(?:gram)?|telegram|tiktok|discord|x\.com|twitter)\b/i, reason: "منصة تواصل" },
  { re: /(?:سناب|سناب|واتس|واتساب|انستا|إنستا|تيليجرام|تلجرام|تيك ?توك|ديسكورد)/, reason: "منصة تواصل" },
];

/** يرجع سبب المخالفة (نوع وسيلة التواصل) أو null إن كان النص نظيفاً */
export function detectContact(text: string): string | null {
  if (!text) return null;
  for (const { re, reason } of PATTERNS) {
    if (re.test(text)) return reason;
  }
  return null;
}

export function containsContact(text: string): boolean {
  return detectContact(text) !== null;
}

/** ينظّف الاسم من أي وسيلة تواصل (للاسم نكتفي بالإزالة بدل الرفض) */
export function stripContact(text: string): string {
  let out = text;
  for (const { re } of PATTERNS) {
    out = out.replace(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"), "");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}
