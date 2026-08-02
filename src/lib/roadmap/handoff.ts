/* ═══════════ عقد التسليم: مساري → ⏱️ التركيز ═══════════
   ▸ لماذا؟ نظام توقيتٍ واحدٌ للتطبيق كلّه. «ابدأ المذاكرة» في مساري و«ابدأ الآن» في جلسة
     اليوم كلاهما يفتح /orbit بنفس الوسطاء — فعرّفناها هنا مرّةً واحدة بدل نسختين تتباعدان.
   ▸ نقيٌّ 100٪: بناء/قراءة نصٍّ فقط، بلا window ولا router ولا localStorage.
   ▸ الوسطاء: from=masari · auto=1 · subject · task (دقائق المهمّة) · tlabel (اسمها). */

export interface FocusHandoff {
  from: string;
  subject: string;
  auto: boolean;
  /** وزن المهمّة بالدقائق — 0 إذا كانت المهمّة معدودةً بالأسئلة لا بالوقت. */
  taskMins: number;
  taskLabel: string;
}

export const EMPTY_HANDOFF: FocusHandoff = { from: "", subject: "", auto: false, taskMins: 0, taskLabel: "" };

/** مصدرُ التسليم — يحدّد نسبةَ الجلسة ونصَّ خيط المهمّة في التركيز. */
export type HandoffFrom = "masari" | "plan";

/** يبني وسطاء العنوان للانتقال إلى /orbit. المهمّة اختيارية (زرّ البطل في مساري قد لا يملكها).
    و`from` يبقى «مساري» افتراضاً حفاظاً على المستدعين القدامى حرفاً بحرف. */
export function focusHandoffQuery(
  i: { subject?: string; taskMins?: number; taskLabel?: string; from?: HandoffFrom },
): string {
  const q = new URLSearchParams({ from: i.from ?? "masari", auto: "1" });
  if (i.subject) q.set("subject", i.subject);
  /* دقائقُ المهمّة تُمرَّر فقط إن كانت موجبة: مهمّة «حلّ 5 أسئلة» لا وزن زمنيَّ لها. */
  if (i.taskMins && i.taskMins > 0) q.set("task", String(i.taskMins));
  if (i.taskLabel) q.set("tlabel", i.taskLabel);
  return q.toString();
}

/** يقرأ الوسطاء في صفحة التركيز. يُستدعى بعد التركيب لا في مُهيّئ الحالة (لا window على الخادم). */
export function readFocusHandoff(search: string): FocusHandoff {
  const q = new URLSearchParams(search);
  const from = q.get("from") ?? "";
  const auto = q.get("auto") === "1";
  if (!from && !auto) return EMPTY_HANDOFF;
  const mins = Number(q.get("task"));
  return {
    from,
    subject: q.get("subject") ?? "",
    auto,
    taskMins: Number.isFinite(mins) && mins > 0 ? Math.round(mins) : 0,
    taskLabel: q.get("tlabel") ?? "",
  };
}

/** هل جاء الطالبُ من صفحةٍ تحمل عملاً (مساري أو خطتي)؟ يُعرض عندها خيطُ المهمّة. */
export const isTaskHandoff = (h: FocusHandoff): boolean =>
  (h.from === "masari" || h.from === "plan") && h.taskMins > 0;

/** بمَ نُسمّي مصدرَ المهمّة أمام الطالب — «من مهمّتك» أم «من جدولك». */
export const handoffSourceLabel = (h: FocusHandoff): string =>
  h.from === "plan" ? "من جدولك" : "من مهمّتك";

/** ما يتبقّى من المهمّة بعد جلسةٍ طولها focusMins. صفرٌ = الجلسة تُنهي المهمّة (أو لا وزن زمنيّ). */
export function remainingTaskMins(taskMins: number, focusMins: number): number {
  if (taskMins <= 0) return 0;
  return Math.max(0, taskMins - focusMins);
}
