/* ═══════════ خطّةُ الاختبارات على الأشهر — محرّكٌ نقيّ ١٠٠٪ ═══════════
   السؤالُ الذي يعيش في رأس الطالب ولا يجيبه أحد: «عندي قدرات وستيب — أبدأ بأيّهما؟
   ومتى أُدخل الثاني؟ ومتى أخلص؟»

   ▓ ثلاثةُ أنماط:
     • بالتتابع — واحدٌ حتى يُنهيه ثم الذي يليه. أعمقُ تركيزاً، وأطولُ زمناً.
     • معاً     — كلُّها من اليوم الأول. أسرعُ إلى المجموع، وأشتُّ.
     • متداخل   — الأوّلُ وحده مدّةً، ثم **فترةٌ مشتركة** يدخل فيها الثاني، فإذا
                  اختُبر الأوّلُ تفرّغ للثاني. وهذا ما وصفه المالك، وهو أقربُ ما
                  يفعله الطالبُ الحقيقيّ.

   ▓ الصدق قبل الجمال: **لا تقديرَ بلا قياس**. لا نرسم جدولاً لثلاثة أشهرٍ من
     أوّل يوم؛ ننتظر أسبوعاً نقيس فيه وتيرتَه الحقيقية (دقائقُ تركيزٍ في اليوم)،
     ثم نقدّر. وما نقدّره **جاهزيّتُه** لا موعدَ اختباره: الموعدُ تُعلنه الجهةُ
     الرسمية أو يحدّده هو، ولا نخترعه.

   ▓ نقيّ: مُدخلاتٌ داخلة ونتيجةٌ خارجة. لا تخزين ولا نافذة ولا وقت. */
import { ROADMAP_TUNING } from "./config";
import { addDays, daysBetween } from "./metrics";

export type ExamPlanMode = "sequential" | "together" | "staged";

/** توزيعُ وقت اليوم في الفترة المشتركة. */
export type OverlapSplit = "even" | "priority" | "nearest";

export const OVERLAP_SPLIT_LABEL: Record<OverlapSplit, string> = {
  even:     "نصفٌ ونصف",
  priority: "الأهمّ أكثر",
  nearest:  "الأقربُ موعداً أكثر",
};

export interface PlanExamInput {
  id: string;
  label: string;
  /** موعدٌ حدّده الطالبُ أو أعلنته الجهة — إن لم يوجد قدّرنا الجاهزية فقط. */
  examDate?: string | null;
  /** ما تبقّى من دروسٍ وتدريبات (عدداً). */
  remainingItems: number;
}

export interface PlanPace {
  /** متوسّطُ دقائق التركيز في اليوم خلال النافذة الأخيرة. */
  minsPerDay: number;
  /** كم يوماً فيه بياناتٌ فعلية — دونَ الحدّ لا نقدّر. */
  daysMeasured: number;
}

export interface PlanPhase {
  kind: "solo" | "overlap";
  examIds: string[];
  start: string;              // YYYY-MM-DD
  end: string;                // YYYY-MM-DD (شامل)
  /** حصّةُ كلّ اختبارٍ من وقت اليوم (٠..١، مجموعُها ١). */
  share: Record<string, number>;
}

export type PlanFail = "need-pace" | "need-two-exams" | "no-work";

export interface StagedPlan {
  ok: boolean;
  reason?: PlanFail;
  /** ما ينقص لبدء التقدير — نصٌّ للطالب لا رمز. */
  phases: PlanPhase[];
  /** تقديرُ يوم الجاهزية لكلِّ اختبار (لا موعدَ اختباره). */
  readyBy: Record<string, string>;
  minsPerDay: number;
  totalDays: number;
}

/** أدنى ما نحتاجه قبل أن نقدّر شيئاً — أسبوعٌ من الوتيرة الحقيقية. */
export const PLAN_MIN_DAYS = ROADMAP_TUNING.commitmentWindowDays;

/** دقائقُ العنصر الواحد (درسٌ أو تمرين) — مرتكزُ التحويل بين العمل والزمن. */
export const MINS_PER_ITEM = 15;

/** حصّةُ الأوّل من الفترة المشتركة بحسب التوزيع المختار. */
export function overlapShare(
  split: OverlapSplit,
  a: PlanExamInput,
  b: PlanExamInput,
  today: string,
): { a: number; b: number } {
  if (split === "even") return { a: 0.5, b: 0.5 };
  if (split === "priority") return { a: 0.65, b: 0.35 };
  /* الأقرب: نوزّع عكسَ المسافة إلى الموعد. بلا موعدين نرجع إلى «الأهمّ». */
  const da = a.examDate ? daysBetween(today, a.examDate) : null;
  const db = b.examDate ? daysBetween(today, b.examDate) : null;
  if (da == null || db == null || da <= 0 || db <= 0) return { a: 0.65, b: 0.35 };
  const wa = 1 / da, wb = 1 / db;
  const sum = wa + wb;
  /* نحدّ الطرفين فلا يُهمَل اختبارٌ تماماً */
  const share = Math.max(0.35, Math.min(0.75, wa / sum));
  return { a: share, b: 1 - share };
}

/** نسبةُ عملِ الأوّل التي يُنجزها وحده قبل أن يدخل الثاني. */
export const SOLO_FRACTION = 2 / 3;

const ceilDays = (x: number): number => Math.max(1, Math.ceil(x));

/**
 * يبني خطّةَ الأشهر لأيّ نمط:
 *   • بالتتابع — الأوّلُ وحده حتى يجهز، ثم الثاني وحده.
 *   • متداخل   — وحده ← مشتركة ← وحده.
 *   • معاً     — مشتركةٌ من اليوم الأوّل، ثم يتفرّغ لمن بقي عمله.
 * لا يُرجع شيئاً بلا وتيرةٍ مقيسة ولا باختبارٍ واحد — الصدقُ أولى من جدولٍ مخترع.
 */
export function buildExamPlan(i: {
  mode: ExamPlanMode;
  exams: PlanExamInput[];        // مرتّبةٌ بالأولوية
  pace: PlanPace;
  split: OverlapSplit;
  today: string;
}): StagedPlan {
  const empty: StagedPlan = { ok: false, phases: [], readyBy: {}, minsPerDay: i.pace.minsPerDay, totalDays: 0 };

  if (i.exams.length < 2) return { ...empty, reason: "need-two-exams" };
  if (i.pace.daysMeasured < PLAN_MIN_DAYS || i.pace.minsPerDay <= 0) return { ...empty, reason: "need-pace" };

  const [a, b] = i.exams;
  if (a.remainingItems <= 0 && b.remainingItems <= 0) return { ...empty, reason: "no-work" };

  const p = i.pace.minsPerDay;                       // دقائقُ اليوم
  const workA = a.remainingItems * MINS_PER_ITEM;    // دقائقُ العمل المتبقّي
  const workB = b.remainingItems * MINS_PER_ITEM;
  const sh = overlapShare(i.split, a, b, i.today);

  const phases: PlanPhase[] = [];
  let readyA: string, readyB: string;

  if (i.mode === "together") {
    /* مشتركةٌ من اليوم الأول: كلٌّ بحصّته حتى يجهز أوّلُهما، ثم يتفرّغ الباقي. */
    const dA = ceilDays(workA / (p * sh.a));
    const dB = ceilDays(workB / (p * sh.b));
    const dShared = Math.min(dA, dB);
    phases.push({
      kind: "overlap", examIds: [a.id, b.id],
      start: i.today, end: addDays(i.today, dShared - 1),
      share: { [a.id]: sh.a, [b.id]: sh.b },
    });
    const firstDone = dA <= dB ? a : b;
    const rest = dA <= dB ? b : a;
    const restWork = Math.max(0, (rest.id === a.id ? workA : workB) - p * (rest.id === a.id ? sh.a : sh.b) * dShared);
    const dRest = restWork > 0 ? ceilDays(restWork / p) : 0;
    const firstEnd = addDays(i.today, dShared - 1);
    if (dRest > 0) {
      phases.push({
        kind: "solo", examIds: [rest.id],
        start: addDays(i.today, dShared), end: addDays(i.today, dShared + dRest - 1),
        share: { [rest.id]: 1 },
      });
    }
    const restEnd = dRest > 0 ? phases[phases.length - 1].end : firstEnd;
    readyA = firstDone.id === a.id ? firstEnd : restEnd;
    readyB = firstDone.id === b.id ? firstEnd : restEnd;
  } else if (i.mode === "sequential") {
    /* واحدٌ حتى يجهز، ثم الذي يليه — أعمقُ تركيزاً وأطولُ زمناً. */
    const d1 = ceilDays(workA / p);
    phases.push({ kind: "solo", examIds: [a.id], start: i.today, end: addDays(i.today, d1 - 1), share: { [a.id]: 1 } });
    readyA = phases[0].end;
    const start2 = a.examDate && a.examDate > readyA ? addDays(a.examDate, 1) : addDays(readyA, 1);
    const d2 = workB > 0 ? ceilDays(workB / p) : 0;
    if (d2 > 0) {
      phases.push({ kind: "solo", examIds: [b.id], start: start2, end: addDays(start2, d2 - 1), share: { [b.id]: 1 } });
      readyB = phases[phases.length - 1].end;
    } else readyB = readyA;
  } else {
    /* ① الأوّلُ وحده حتى يُنجز `SOLO_FRACTION` من عمله */
    const d1 = ceilDays((workA * SOLO_FRACTION) / p);
    phases.push({ kind: "solo", examIds: [a.id], start: i.today, end: addDays(i.today, d1 - 1), share: { [a.id]: 1 } });

    /* ② الفترةُ المشتركة: الأوّلُ يكمل بحصّته، والثاني يبدأ بحصّته */
    const d2 = ceilDays((workA * (1 - SOLO_FRACTION)) / (p * sh.a));
    phases.push({
      kind: "overlap", examIds: [a.id, b.id],
      start: addDays(i.today, d1), end: addDays(i.today, d1 + d2 - 1),
      share: { [a.id]: sh.a, [b.id]: sh.b },
    });
    readyA = addDays(i.today, d1 + d2 - 1);

    /* ③ الثاني وحده: بعد المشتركة (أو بعد موعد اختبار الأوّل إن حُدّد وكان بعدها
          — فالطالبُ لا يترك اختباراً قبل أن يؤدّيه). */
    const doneB = p * sh.b * d2;
    const restB = Math.max(0, workB - doneB);
    const soloBStart = a.examDate && a.examDate > readyA ? addDays(a.examDate, 1) : addDays(i.today, d1 + d2);
    const d3 = restB > 0 ? ceilDays(restB / p) : 0;
    if (d3 > 0) {
      phases.push({ kind: "solo", examIds: [b.id], start: soloBStart, end: addDays(soloBStart, d3 - 1), share: { [b.id]: 1 } });
      readyB = phases[phases.length - 1].end;
    } else readyB = phases[1].end;
  }

  const lastEnd = phases[phases.length - 1].end;
  return {
    ok: true,
    phases,
    readyBy: { [a.id]: readyA, [b.id]: readyB },
    minsPerDay: p,
    totalDays: daysBetween(i.today, lastEnd) + 1,
  };
}

/** النمطُ المتداخل — غلافٌ على `buildExamPlan` يبقى للمستدعين القدامى. */
export const buildStagedPlan = (i: {
  exams: PlanExamInput[]; pace: PlanPace; split: OverlapSplit; today: string;
}): StagedPlan => buildExamPlan({ ...i, mode: "staged" });

/** كم يوماً بقي قبل أن نستطيع التقدير؟ */
export const daysUntilForecast = (pace: PlanPace): number =>
  Math.max(0, PLAN_MIN_DAYS - pace.daysMeasured);

/** أيَّ فترةٍ يقع فيها هذا اليوم؟ — يستعمله التقويم لتلوين الفترة المشتركة. */
export function phaseOn(plan: StagedPlan, date: string): PlanPhase | null {
  if (!plan.ok) return null;
  return plan.phases.find((ph) => date >= ph.start && date <= ph.end) ?? null;
}

/** وصفٌ عربيٌّ لفترة — يُعرض في بطاقة الخطة وفي ورقة اليوم. */
export function phaseLabel(ph: PlanPhase, labelOf: (id: string) => string): string {
  if (ph.kind === "solo") return labelOf(ph.examIds[0]);
  return ph.examIds.map(labelOf).join(" + ");
}
