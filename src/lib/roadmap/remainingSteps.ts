/* ═══════════ «ماذا ينقصك؟» — تحويل الأرقام إلى خطواتٍ عملية (نقيّ) ═══════════
   ▸ لماذا؟ لا نريد الطالب يرى أرقاماً فقط في «تفاصيل الاختبار»، بل خطواتٍ ملموسة.
   ▸ المصدر: نفس مدخلات P1 (المتبقّي من المواد · أسئلة التدريب · الأخطاء غير المُراجَعة).
   ▸ الهدف: قائمةٌ قصيرةٌ واضحة. لا خطوةٌ بلا رصيدٍ حقيقيّ (٠ ⇒ تُحذف، لا «باقٍ ٠»). */

const ar = (x: number): string => new Intl.NumberFormat("ar-EG-u-nu-arab").format(x);

/* صياغة عربية سليمة للعدد + المعدود: مفرد(١) · مثنّى(٢) · جمع قلّة(٣-١٠) · تمييز مفرد(١١+). */
export function arCount(x: number, one: string, two: string, few: string, many: string): string {
  if (x === 1) return one;
  if (x === 2) return two;
  if (x >= 3 && x <= 10) return `${ar(x)} ${few}`;
  return `${ar(x)} ${many}`;
}

export function remainingSteps(i: {
  remainingLessons: number;
  remainingDrills: number;
  unreviewedErrors: number;
}): string[] {
  const out: string[] = [];
  if (i.remainingLessons > 0) out.push(`إنهاء ${arCount(i.remainingLessons, "وحدة واحدة", "وحدتين", "وحدات", "وحدة")}`);
  if (i.remainingDrills > 0) out.push(`حل ${arCount(i.remainingDrills, "سؤال واحد", "سؤالين", "أسئلة", "سؤالاً")}`);
  if (i.unreviewedErrors > 0) out.push(`مراجعة ${arCount(i.unreviewedErrors, "خطأ واحد", "خطأين", "أخطاء", "خطأً")}`);
  return out;
}
