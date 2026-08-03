/* ═══════════ ترتيبُ أقسام الصفحة — محرّكٌ نقيّ ١٠٠٪ ═══════════
   «التخصيص» كان في الرئيسية وحدها ثم ضاع في إعادة تنظيمها، وبقيت الإعداداتُ
   تَعِد بزرٍّ لا وجود له. هذا محرّكُه من جديد، لكن **لأيّ صفحة** لا للرئيسية
   فقط: كلُّ صفحةٍ تُعرّف أقسامها، والطالبُ يرتّبها ويخفي ما لا يعنيه.

   ▓ المبدأ: التخزينُ يحفظ **قرارَ الطالب** لا قائمةَ الأقسام. فإذا أضفنا قسماً
     جديداً ظهر في مكانه الافتراضيّ بلا أن يفقد ترتيبَه، وإذا حذفنا قسماً سقط
     من تخزينه بلا أثر. قائمةُ الأقسام في الكود هي المرجع، والتخزينُ رأيٌ عليها.

   ▓ نقيّ: مُدخلاتٌ داخلة ونتيجةٌ خارجة. لا تخزين ولا نافذة ولا وقت. */

/** قسمٌ في صفحة — يُعرّفه الكود، ويرتّبه الطالب. */
export interface SectionDef {
  id: string;
  label: string;
  desc?: string;
  /** قسمٌ لا يُخفى ولا يُحرَّك (ترويسةٌ أو شيءٌ تفقد الصفحةُ معناها بدونه). */
  fixed?: boolean;
}

/** رأيُ الطالب في قسمٍ واحد. */
export interface SectionState { id: string; visible: boolean }

const defIds = (defs: SectionDef[]): string[] => defs.map((d) => d.id);

/** الترتيبُ الافتراضيّ: كما كتبه الكود، والكلُّ ظاهر. */
export const defaultLayout = (defs: SectionDef[]): SectionState[] =>
  defs.map((d) => ({ id: d.id, visible: true }));

/**
 * يدمج رأيَ الطالب المحفوظ مع أقسام الصفحة الحالية:
 *   • ما حُفظ ولا يزال موجوداً — يبقى بترتيبه ورأيه.
 *   • قسمٌ جديدٌ لم يره الطالب — يدخل في **موضعه الافتراضيّ** بين جيرانه، ظاهراً.
 *   • قسمٌ حُذف من الكود — يسقط.
 * فلا يفاجأ الطالبُ بقسمٍ جديدٍ في آخر الصفحة ولا بترتيبٍ انقلب.
 */
export function mergeLayout(defs: SectionDef[], stored: SectionState[] | null | undefined): SectionState[] {
  const known = new Set(defIds(defs));
  const seen = new Set<string>();
  const kept: SectionState[] = [];
  for (const s of stored ?? []) {
    if (!known.has(s.id) || seen.has(s.id)) continue;
    seen.add(s.id);
    kept.push({ id: s.id, visible: s.visible !== false });
  }
  if (kept.length === 0) return defaultLayout(defs);

  /* الجديدُ يدخل عند أقرب جارٍ يعرفه الطالب — بعد السابق، وإلا قبل التالي،
     وإلا في الذيل. فقسمٌ أُضيف في رأس الصفحة يظهر في رأسها لا في ذيلها. */
  const out = [...kept];
  defs.forEach((d, i) => {
    if (seen.has(d.id)) return;
    let at = -1;
    for (let k = i - 1; k >= 0 && at < 0; k--) {
      const idx = out.findIndex((x) => x.id === defs[k].id);
      if (idx >= 0) at = idx + 1;
    }
    for (let k = i + 1; k < defs.length && at < 0; k++) {
      const idx = out.findIndex((x) => x.id === defs[k].id);
      if (idx >= 0) at = idx;
    }
    out.splice(at < 0 ? out.length : at, 0, { id: d.id, visible: true });
    seen.add(d.id);
  });

  /* الثابتُ لا يُخفى مهما قال التخزين */
  const fixed = new Set(defs.filter((d) => d.fixed).map((d) => d.id));
  return out.map((s) => (fixed.has(s.id) ? { ...s, visible: true } : s));
}

/** تحريكُ قسمٍ خطوةً: `-1` لأعلى و`+1` لأسفل. الثابتُ لا يتحرّك ولا يُزاح. */
export function moveSection(
  layout: SectionState[], defs: SectionDef[], id: string, dir: -1 | 1,
): SectionState[] {
  const fixed = new Set(defs.filter((d) => d.fixed).map((d) => d.id));
  if (fixed.has(id)) return layout;
  const i = layout.findIndex((s) => s.id === id);
  if (i < 0) return layout;
  const j = i + dir;
  if (j < 0 || j >= layout.length) return layout;
  if (fixed.has(layout[j].id)) return layout;
  const out = [...layout];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** إظهارٌ وإخفاء. الثابتُ يبقى ظاهراً. */
export function toggleSection(layout: SectionState[], defs: SectionDef[], id: string): SectionState[] {
  const fixed = new Set(defs.filter((d) => d.fixed).map((d) => d.id));
  if (fixed.has(id)) return layout;
  return layout.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s));
}

/** معرّفاتُ ما يُعرض فعلاً، بترتيبه. */
export const visibleIds = (layout: SectionState[]): string[] =>
  layout.filter((s) => s.visible).map((s) => s.id);

/** كم قسماً أخفاه الطالب — لنخبره بصدقٍ أن في الصفحة ما لا يراه. */
export const hiddenCount = (layout: SectionState[]): number =>
  layout.filter((s) => !s.visible).length;

/** هل يختلف رأيُ الطالب عن الافتراضيّ أصلاً؟ */
export function isCustomized(defs: SectionDef[], layout: SectionState[]): boolean {
  const base = defaultLayout(defs);
  if (base.length !== layout.length) return true;
  return base.some((b, i) => b.id !== layout[i].id || layout[i].visible !== true);
}
