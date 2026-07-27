/* ═══════════ تتبّع المصادر المستخدمة — طبقة IO رقيقة ═══════════
   ▸ لماذا؟ بطاقة «المصادر» في مساري يجب أن تعرض ما يستخدمه الطالب فعلاً، لا رقماً مجرّداً.
   ▸ المصدر: نقرات «فتح الموقع الرسمي» — تُسجَّل هنا (الأحدث أولاً، بلا تكرار).
   ▸ صدق: قبل أي استخدام تعرض الواجهة أبرز الجهات الرسمية بدل ادّعاء تفضيلاتٍ لا نملكها. */

const KEY = "darb_resource_use";
const CAP = 12;

export function recentResourceIds(): string[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(KEY); const arr = raw ? JSON.parse(raw) : null; return Array.isArray(arr) ? arr : []; }
  catch { return []; }
}

/** يسجّل فتح مصدرٍ (الأحدث أولاً، بلا تكرار) ويعيد القائمة المحدّثة. */
export function recordResourceUse(id: string): string[] {
  if (typeof window === "undefined") return [];
  const next = [id, ...recentResourceIds().filter((x) => x !== id)].slice(0, CAP);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* تجاهل */ }
  return next;
}
