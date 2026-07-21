/* ═══════════ محرّك جلسة المذاكرة (Session Engine) — نقيٌّ ١٠٠٪ ═══════════
   ▸ لماذا؟ «ابدأ المذاكرة» لا يدخل الدروس مباشرة؛ بل يولّد جلسةً لها هدفٌ واضح («ماذا ستفعل
     اليوم؟») كمدرّبٍ شخصيّ. ▸ المصدر: مواد الاختبار + المتبقّي (دروس/تدريب/أخطاء) + الوقت المتاح
     (من التقويم) + نمط المذاكرة — يجمّعها القارئ. ▸ الهدف: ٣ مهامّ كحدٍّ أقصى، كلٌّ بهدف، مع
     رسالةٍ تحفيزية. ▸ الصدق: وقتٌ غير كافٍ (إجازة/مشغول) ⇒ لا جلسة، بل رسالةٌ لطيفة. */
import { ROADMAP_TUNING } from "./config";
import type { StudyMode } from "./model";

export type SessionTaskKind = "review" | "drill" | "errors";
export interface SessionTask {
  kind: SessionTaskKind;
  subject?: string;
  label: string;
  goalMins?: number;    // للمراجعة/الأخطاء
  goalCount?: number;   // للتدريب (عدد الأسئلة)
}
export interface SessionPlan {
  available: boolean;
  totalMins: number;
  tasks: SessionTask[];
  motivation: string;
  hint: string;         // يُعرض حين لا جلسة
}

/* سجلّ جلسةٍ منتهية — يُخزَّن (sessionStore) ويغذّي الإحصائيات (أكثر ساعة/مادة/اختبار). */
export interface StudySessionLog {
  id: string;
  examId: string;
  subject?: string;
  taskKind: SessionTaskKind;
  startedAt: number;      // ms
  durationMins: number;
}

const clampInt = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, Math.round(x)));

/** يبني خطة جلسة اليوم من المتبقّي الحقيقيّ والوقت المتاح. */
export function buildSessionPlan(
  i: {
    subjects: string[];
    weakestSubject?: string | null;   // مادةٌ يُقترح البدء بها (من التقدّم/الأخطاء)
    remainingLessons: number;
    remainingDrills: number;
    activeErrors: number;
    availableMinutes: number;         // من availableStudyMinutes (التقويم)
    mode?: StudyMode;
  },
  cfg = ROADMAP_TUNING.session,
): SessionPlan {
  const mins = i.availableMinutes;
  if (mins < cfg.minTaskMins) {
    return { available: false, totalMins: 0, tasks: [], motivation: "",
      hint: "اليوم مشغولٌ أو إجازة — خذ راحتك، ونكمل غداً بإذن الله." };
  }

  const first = i.weakestSubject || i.subjects[0] || "الأساسيات";
  const second = i.subjects.find((s) => s !== first) || first;
  const tasks: SessionTask[] = [];

  /* مراجعة (نصف الوقت تقريباً) — إن بقيت دروس، وإلا تثبيتٌ خفيف */
  const reviewMins = clampInt(mins * 0.5, cfg.minTaskMins, mins);
  tasks.push({ kind: "review", subject: first, label: `مراجعة ${first}`, goalMins: reviewMins });

  /* تدريب (عدد أسئلة يتناسب مع بقيّة الوقت) — إن بقي تدريب */
  let used = reviewMins;
  if (i.remainingDrills > 0 && mins - used >= cfg.minTaskMins) {
    const drillMins = Math.max(cfg.minTaskMins, Math.round((mins - used) * 0.6));
    const count = clampInt(drillMins / Math.max(1, cfg.drillPerQuestionMins), 5, Math.max(5, i.remainingDrills));
    tasks.push({ kind: "drill", subject: second, label: `تدريب ${second}`, goalCount: count });
    used += count * cfg.drillPerQuestionMins;
  }

  /* مراجعة الأخطاء (ما تبقّى من الوقت) — إن وُجدت أخطاء */
  if (i.activeErrors > 0 && mins - used >= cfg.minTaskMins) {
    const errMins = clampInt(mins - used, cfg.minTaskMins, mins - used);
    const errCount = Math.min(i.activeErrors, Math.max(2, Math.round(errMins / cfg.minTaskMins)));
    tasks.push({ kind: "errors", label: `مراجعة ${errCount} من أخطائك السابقة`, goalMins: errMins });
    used += errMins;
  }

  const totalMins = tasks.reduce((a, t) => a + (t.goalMins ?? (t.goalCount ?? 0) * cfg.drillPerQuestionMins), 0);
  return { available: true, totalMins, tasks,
    motivation: "⭐ إذا أنهيت الجلسة اليوم سترتفع جاهزيتك.", hint: "" };
}
