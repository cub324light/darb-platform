/* ─── أهداف ما بعد الثانوية (Admission Targets) — متعدّدة لا حصرية ───
   أغلب طلاب ثالث ثانوي/خريج الثانوي يقدّمون على عدّة جهات معاً (جامعة + أرامكو +
   سابك + عسكري + ITC + تدريب). لا نجبر الطالب على واحدة: يختار أهدافه في
   الـOnboarding (متعدّد)، والصفحة الرئيسية ترتّب بطاقاته حسبها بترتيب هذا الكتالوج.
   دالة نقيّة — لا تخترع وجهات؛ كلٌّ يقود لصفحةٍ قائمة فعلاً. */

export interface AdmissionTarget {
  id: string;
  label: string;
  icon: string;
  desc: string;
  href: string;
}

/* الترتيب هنا = أولوية العرض على الرئيسية */
export const ADMISSION_TARGETS: AdmissionTarget[] = [
  { id: "university", label: "الجامعة",           icon: "🎓", desc: "القبول والمفاضلة",   href: "/university" },
  { id: "aramco",     label: "أرامكو",            icon: "🛢️", desc: "CPC/ITC والوظائف",   href: "/opportunities" },
  { id: "sabic",      label: "سابك",              icon: "🏭", desc: "برامج التوظيف",      href: "/opportunities" },
  { id: "military",   label: "الوظائف العسكرية",  icon: "🎖️", desc: "الكليات والقبول",    href: "/opportunities" },
  { id: "itc",        label: "ITC",               icon: "💻", desc: "المسار التقني",      href: "/opportunities" },
  { id: "training",   label: "برامج التدريب",     icon: "🛠️", desc: "دبلومات وتدريب",     href: "/opportunities" },
];

const IDS = new Set(ADMISSION_TARGETS.map((t) => t.id));

/** يحوّل معرّفات الأهداف المختارة إلى بطاقاتٍ مرتّبة بترتيب الكتالوج (يتجاهل المجهول). */
export function targetsFor(ids?: string[] | null): AdmissionTarget[] {
  const set = new Set((ids ?? []).filter((id) => IDS.has(id)));
  return ADMISSION_TARGETS.filter((t) => set.has(t.id));
}
