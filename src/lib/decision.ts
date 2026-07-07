/* ─── طبقة التاريخ (History) لشبكة التخصص — سلوك الطالب يعيد الترتيب ───
   قرار «ما يهمّ الطالب الآن» انتقل بالكامل إلى العقل المركزي (lifeEngine).
   يبقى هنا ما تخصّه شبكة التخصص: ما ضغطه الطالب كثيراً يهبط، فنتوقّف عن تكرار
   ما رآه ويتقدّم الجديد. سلوك الطالب نفسه، لا تخمين. دالّات نقيّة بلا IO. */

/* ── طبقة التاريخ: ما رآه الطالب كثيراً يهبط ── */

/* ترتيب مستقرّ يُنزِل الأكثر مشاهدةً (فرزٌ ثابت لا يقلب المتساويين). عمليٌّ لأي
   عناصر تحمل label. لا يحذف شيئاً — يعيد الترتيب فقط (يبقى كل شيء متاحاً). */
export function rankBySeen<T extends { label: string }>(
  items: T[],
  visits: Record<string, number>,
): T[] {
  return items
    .map((item, i) => ({ item, i, seen: visits[item.label] ?? 0 }))
    .sort((a, b) => a.seen - b.seen || a.i - b.i) // الأقلّ مشاهدةً أولاً، ثم ترتيبها الأصلي
    .map((x) => x.item);
}

/* هل رأى الطالب هذه العقدة كثيراً؟ (عتبة بسيطة لإبراز «تعرفها؟») */
export const SEEN_FAMILIAR = 3;
export function isFamiliar(label: string, visits: Record<string, number>): boolean {
  return (visits[label] ?? 0) >= SEEN_FAMILIAR;
}
