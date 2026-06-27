/* ─── فضاء أسماء المحرّكات (لكل مستخدم) ───
   مفاتيح تخزين المحرّكات (الذاكرة/الأحداث/التجاهل/علم البذرة) تُنطَّق بـ uid
   كي لا تتسرّب بيانات طالب لآخر على جهاز مشترك أو بعد تبديل الحساب.
   هذا الملف نقيّ (لا يستورد المحرّكات) لتفادي الدوران. */

let _ns = "guest";

export function engineNamespace(): string { return _ns; }

/** يضبط الفضاء (uid أو null للضيف). لا يلمس المحرّكات — يفعل ذلك engineSession. */
export function setNamespace(uid: string | null): boolean {
  const next = uid && uid.length ? uid : "guest";
  if (next === _ns) return false;
  _ns = next;
  return true;
}

/** يضيف لاحقة الفضاء لمفتاح أساسي. */
export function nsKey(base: string): string { return `${base}__${_ns}`; }
