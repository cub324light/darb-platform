/* ─── تنقية المدخلات (معرّفات/مسارات) — وحدة نقية قابلة للاختبار ───
   تمنع حقن مسارات Firestore (عبر «/») وإعادة التوجيه الخارجي. تُستعمل في
   الرواتات وفي العميل (المسار الداخلي). لا اعتماد على بيئة معيّنة. */

/* M-1: معرّف آمن — أحرف/أرقام/شرطة/شرطة سفلية فقط (نفس أسلوب رواتات KB).
   يمنع «/» وأي محرف مسار → لا حقن مسار وثائق. */
export function cleanId(v: unknown, max = 128): string {
  if (typeof v !== "string") return "";
  return v.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, max);
}

/* M-2: يتحقّق أن الرابط مسار داخلي آمن قبل التنقّل (location.assign).
   يقبل فقط مساراً يبدأ بـ«/» وليس «//» (protocol-relative) وبلا أي scheme
   (http:/https:/javascript:/data:…) ولا «\» ولا محرف تحكّم. يعيد المسار أو null. */
export function safeInternalPath(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s.length === 0 || s.length > 512) return null;
  if (!s.startsWith("/")) return null;          // داخلي يبدأ بـ«/»
  if (s.startsWith("//")) return null;           // //evil.com (protocol-relative)
  if (s.includes("\\")) return null;             // «\» قد يُعامَل كـ«/»
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) < 0x20) return null;     // محارف تحكّم
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return null; // أي scheme (احتياط)
  return s;
}

/* M-3: هل يُسمح بقراءة ملف خاص؟ صاحبه فقط، أو صداقة مؤكَّدة من الطرفين.
   الصداقة أحادية الجانب (إضافة ذاتية) لا تكفي — يجب أن يكون كلٌّ صديقاً للآخر. */
export function canViewPrivateProfile(opts: {
  isPrivate: boolean; isOwner: boolean; iAddedThem: boolean; theyAddedMe: boolean;
}): boolean {
  if (!opts.isPrivate) return true;       // عام
  if (opts.isOwner) return true;           // صاحبه
  return opts.iAddedThem && opts.theyAddedMe; // صداقة متبادلة فقط
}
