/* ─── فلاتر الإشراف على رسائل المجلس ───
   سياستان (قرار المنتج):
   • الألفاظ المسيئة + وسائل التواصل → تُحظر فوراً عند الإرسال.
   • المحتوى الحسّاس (سياسي/متطرّف) → لا يُحظر، بل يُرفع تلقائياً لطابور
     المراجعة (تفادياً لمنع نقاشٍ دراسيٍّ مشروع بالخطأ).
   الكشف على العميل لتجربة فورية؛ وأي محتوى يبقى قابلاً للإبلاغ يدوياً. */

/* تطبيع عربي: إزالة التشكيل والتطويل، توحيد الألف/الياء/التاء المربوطة،
   وكبح التكرار المفرط — حتى تصمد المطابقة أمام صور الكتابة المختلفة.
   نطاق التشكيل U+064B–U+065F + U+0670 يقف قبل الأرقام العربية (U+0660)
   فلا يحذفها. */
export function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // تشكيل
    .replace(/ـ/g, "")                 // تطويل (ـ)
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ؤئ]/g, "ء")
    .replace(/(.)\1{2,}/g, "$1$1");          // «حيواااان» → «حيوان»
}

/* نسخة بلا فواصل — لكشف التحايل بتفريق الحروف («ك ل ب», «k.l.b») */
function despace(text: string): string {
  return text.replace(/[\s._\-*+|/\\]/g, "");
}

/* جذور ألفاظ مسيئة شائعة (عربي + إنجليزي) — بصيغة مُطبَّعة.
   محافِظة عمداً: كلمات سبّ/شتم واضحة فقط لتقليل الإنذارات الكاذبة. */
const PROFANITY = [
  // عربي (شتائم/سباب شائعة)
  "كلب", "حمار", "خنزير", "غبي", "غبيه", "تافه", "حقير", "وسخ", "قذر",
  "كس", "طيز", "زق", "خرا", "خره", "عرص", "قحب", "شرموط", "منيك", "منيوك",
  "لعن", "يلعن", "خول", "زامل", "نجس", "حيوان", "بهيمه", "معفن", "زبي", "زبر",
  "متخلف", "معتوه", "مغفل", "ساقط", "وقح",
  // إنجليزي
  "fuck", "fuk", "fck", "shit", "bitch", "asshole", "bastard", "dick",
  "cunt", "slut", "whore", "retard", "moron", "idiot", "stupid",
];

/* مصطلحات حسّاسة (سياسي/متطرّف/عنف) — تُرفع للمراجعة لا للحظر.
   قائمة مقتضبة ومحافظة؛ الهدف لفت نظر المشرف لا منع النقاش الدراسي. */
const SENSITIVE = [
  "داعش", "القاعده", "تنظيم", "تكفير", "تفجير", "ارهاب", "ارهابي", "جهاد",
  "اغتيال", "تمرد", "انقلاب", "isis", "qaeda", "terror", "bomb", "jihad",
];

function hasAny(haystack: string, words: string[]): string | null {
  for (const w of words) {
    if (w && haystack.includes(w)) return w;
  }
  return null;
}

/* يرجع true إن احتوى النص لفظاً مسيئاً (للحظر) */
export function detectProfanity(text: string): boolean {
  const norm = normalizeArabic(text);
  return hasAny(norm, PROFANITY) !== null || hasAny(despace(norm), PROFANITY) !== null;
}

/* يرجع المصطلح الحسّاس إن وُجد (للمراجعة لا الحظر)، أو null */
export function detectSensitive(text: string): string | null {
  const norm = normalizeArabic(text);
  return hasAny(norm, SENSITIVE) ?? hasAny(despace(norm), SENSITIVE);
}
