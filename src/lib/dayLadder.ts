/* ═══════════ نطاق سلّم اليوم — حسابٌ نقيّ ═══════════
   أضيقُ نطاقِ ساعاتٍ يسع كل الفترات والساعةَ الحالية معاً. المكوّن يرسم فقط. */

export interface Slot {
  id: string;
  title: string;
  /** ساعةٌ عشرية (١٧٫٥ = الخامسة والنصف مساءً) */
  fromHour: number;
  toHour: number;
  color: string;
  icon?: string;
}

export interface LadderRange {
  from: number;
  to: number;
  hours: number[];
}

/**
 * النطاق الافتراضي ٧ ص – ١٠ م حتى مع يومٍ فارغ (سلّمٌ بلا ساعاتٍ ليس سلّماً)،
 * ويتمدّد للفترات الخارجة عنه وللساعة الحالية. `nowHour` سالبةٌ ⇒ لم تُقرأ بعد.
 */
export function ladderRange(slots: Slot[], nowHour = -1): LadderRange {
  const marks = [
    ...slots.map((s) => s.fromHour),
    ...slots.map((s) => s.toHour),
    ...(nowHour >= 0 ? [nowHour] : []),
  ];
  const from = Math.max(0, Math.floor(Math.min(...marks, 7)));
  const to = Math.min(24, Math.ceil(Math.max(...marks, 22)));
  return { from, to, hours: Array.from({ length: to - from + 1 }, (_, i) => from + i) };
}
