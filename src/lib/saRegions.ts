/* ─── مناطق السعودية الرسمية (١٣) + أقرب الجامعات ───
   مصدرٌ نقيّ لخطوة «المنطقة» في التسجيل و«أقرب جامعة» في الملخّص. يعيد استخدام كتالوج
   UNIVERSITIES (لا كتالوج جامعاتٍ ثانٍ). أسماء المناطق تطابق حقل region في الجامعات،
   مع تطبيعٍ للمواضع التي خزّنّاها بمحافظةٍ (الخرج/الطائف/الأحساء/عرعر) إلى منطقتها الرسمية. */

import { UNIVERSITIES, type UniversityOption } from "./university";

/* المناطق الإدارية الـ١٣ (بالترتيب الرسمي المتعارف عليه). */
export const SA_REGIONS = [
  "الرياض",
  "مكة المكرمة",
  "المدينة المنورة",
  "القصيم",
  "المنطقة الشرقية",
  "عسير",
  "تبوك",
  "حائل",
  "الحدود الشمالية",
  "جازان",
  "نجران",
  "الباحة",
  "الجوف",
] as const;

export type SaRegion = (typeof SA_REGIONS)[number];

const REGION_SET = new Set<string>(SA_REGIONS);

/* محافظة/مدينة خُزّنت كـregion في UNIVERSITIES → منطقتها الرسمية. */
const UNI_REGION_TO_OFFICIAL: Record<string, SaRegion> = {
  "الخرج": "الرياض",
  "الطائف": "مكة المكرمة",
  "الأحساء": "المنطقة الشرقية",
  "عرعر": "الحدود الشمالية",
};

/** يطبّع اسم منطقةٍ (من جامعةٍ أو إدخال) إلى إحدى المناطق الـ١٣ — أو undefined إن لم تُعرَف. */
export function toOfficialRegion(region?: string | null): SaRegion | undefined {
  if (!region) return undefined;
  const r = region.trim();
  if (REGION_SET.has(r)) return r as SaRegion;
  return UNI_REGION_TO_OFFICIAL[r];
}

/** هل الاسم منطقةٌ رسمية من الـ١٣؟ */
export const isSaRegion = (region?: string | null): region is SaRegion =>
  !!region && REGION_SET.has(region.trim());

/** جامعات المنطقة الرسمية (بترتيب الكتالوج) — فارغة إن لم تكن هناك جامعةٌ مسجّلة. */
export function universitiesInRegion(region?: string | null): UniversityOption[] {
  const official = toOfficialRegion(region);
  if (!official) return [];
  return UNIVERSITIES.filter((u) => toOfficialRegion(u.region) === official);
}

/** أقرب جامعةٍ لمنطقة الطالب (الأولى في الكتالوج ضمن منطقته) — أو undefined. */
export function nearestUniversity(region?: string | null): UniversityOption | undefined {
  return universitiesInRegion(region)[0];
}
