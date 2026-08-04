/* ═══════════ لحظاتُ دويرب (Duwairb Moments) — محرّكٌ نقيٌّ ١٠٠٪ ═══════════
   ▸ لماذا؟ دويرب كان يتكلّم حين يُسأل فقط. والأخُ الأكبرُ لا يُسأل ليتكلّم: يتكلّم
     في اللحظة التي يعنيه فيها ما جرى — وفي غيرها يسكت.
   ▸ سبعُ لحظاتٍ لا غير (أقرّها المالك): بعد الجلسة · بعد التخطّي · عند انخفاض
     الالتزام · عند قرب الاختبار · بعد إضافة خطأ · بعد رفع ملف · بعد تغيير الخطة.
     «بعد رفع ملف» موجودةٌ أصلاً (تحليلُ دويرب الكامل في `FileAnalyzer`) فلا تتكرّر هنا.
   ▸ الصدق قبل الكلام: **بلا إشارةٍ حقيقيةٍ لا تدخّل**. كلُّ فرعٍ هنا إمّا أن يجد
     رقماً/حالةً مصدرُها المشروعُ نفسُه، وإمّا يُعيد `null`. لا افتراض ولا تعبئةُ فراغ.
   ▸ ومع كلِّ كلمةٍ **سببُها** (`why`) — هذا هو الـExplainability: لا يقول دويرب
     شيئاً دون أن يقول من أين عرفه.
   ▸ نقاءٌ تام: لا تخزينَ ولا `Date` ولا `window`. الإشاراتُ تصل جاهزةً من القارئ. */
import { ROADMAP_TUNING } from "../roadmap/config";
import { arCount, remainingSteps } from "../roadmap/remainingSteps";
import type { PriorityFactor } from "../roadmap/session";
import { pct, days as daysWord, tasks as tasksWord } from "../format";

export type MomentKind =
  | "session-finished"
  | "task-skipped"
  | "commitment-drop"
  | "exam-near"
  | "error-added"
  | "goal-changed"
  | "plan-explained";

export type SkipReason = "cant-now" | "swap" | "later";

/** ما يقوله دويرب — جملةٌ واحدة، وسببُها، ومعرّفٌ ثابتٌ للحالة (لِمَن أغلقها). */
export interface Intervention {
  id: string;
  kind: MomentKind;
  text: string;
  why: string;
}

/* اللحظةُ وإشاراتُها — اتّحادٌ مميَّز: كلُّ لحظةٍ تطلب ما تحتاجه وحده. */
export type Moment =
  | {
      kind: "session-finished";
      minutes: number;                  // المدّة الفعليّة التي سجّلها «التركيز»
      streakDays?: number;
      daysUntilExam?: number | null;
      remainingCount?: number;          // طولُ `remainingSteps` بعد الجلسة
    }
  | {
      kind: "task-skipped";
      reason: SkipReason;
      reasonLabel: string;              // نصُّ الخيار كما قرأه الطالب (لا نكرّره هنا)
      label: string;                    // اسمُ المهمّة المتخطّاة
      swappedTo?: string | null;        // المادّةُ البديلة إن تمّ الاستبدال فعلاً
      remainingTasks: number;
    }
  | {
      kind: "commitment-drop";
      commitmentPct: number | null;
      /* أسبوعٌ بلا محتوىً لا يُحكَم عليه — والمحتوى ساعاتٌ **أو** جلسات، تماماً
         كما تقرّر لوحةُ «هذا الأسبوع» متى تُظهر أرقامها. */
      weekHours: number;
      weekSessions: number;
    }
  | {
      kind: "exam-near";
      daysUntilExam: number | null;
      remainingLessons: number;
      remainingDrills: number;
      activeErrors: number;
    }
  | {
      kind: "error-added";
      subject: string;
      inSubject: number;                // عددُ أخطاء هذه المادّة بعد الإضافة
    }
  | {
      kind: "goal-changed";
      field: "university" | "major";
      value: string;
    };

/* العتبات — مكانٌ واحدٌ لا أرقامٌ مبثوثةٌ في المنطق (قاعدةُ `roadmap/config`). */
export const MOMENT_TUNING = {
  /** «قريب» — نفسُ أفق رسالة اليوم (`dailyMessage`) فلا تتناقض نافذتان. */
  examNearDays: 15,
  /** سلسلةٌ تستحقّ الذِّكر */
  strongStreakDays: 3,
  /** دون هذه النسبة يصير الالتزامُ ملاحظةً — نفسُ عتبة «تحت المراقبة» في الجاهزية. */
  lowCommitmentPct: Math.round(ROADMAP_TUNING.readiness.watchAt * 100),
  /** تكرارٌ في مادّةٍ واحدة يصير نمطاً لا صدفة. */
  subjectErrorPattern: 3,
} as const;

const T = MOMENT_TUNING;

const note = (kind: MomentKind, tag: string, text: string, why: string): Intervention =>
  ({ id: `duwairb:${kind}:${tag}`, kind, text, why });

/* «خطأ واحد · خطآن · N أخطاء · N خطأً» — الرفعُ بعد «عندك» (مبتدأٌ مؤخّر). */
const mistakesNom = (c: number): string => arCount(c, "خطأ واحد", "خطآن", "أخطاء", "خطأً");

/** اللحظةُ ← جملةٌ واحدة، أو `null` حين لا إشارةَ تستحقّ الكلام. */
export function duwairbMoment(m: Moment): Intervention | null {
  switch (m.kind) {
    /* ① بعد إنهاء الجلسة — الشاشةُ تقول المدّةَ وما بقي، فلا نعيدهما. نضيف ما لا
       تقوله وحدَه: قربَ الاختبار، أو خلوَّ القائمة، أو السلسلة. والدقائقُ شرطُ
       الكلام لا موضوعَه: بلا جلسةٍ فعليّةٍ لا تدخّل. */
    case "session-finished": {
      if (!(m.minutes > 0)) return null;
      const d = m.daysUntilExam;
      if (d != null && Number.isFinite(d) && d >= 1 && d <= T.examNearDays) {
        return note("session-finished", "exam",
          `باقي ${daysWord(d)} على اختبارك.`,
          "لأن موعد اختبارك المسجَّل قريب، وقد أنهيت جلستك للتوّ.");
      }
      if (m.remainingCount === 0) {
        return note("session-finished", "clear",
          "لم يبقَ في قائمتك شيء.",
          "لأن دروسك وتدريباتك وأخطاءك كلَّها مُنجَزة الآن.");
      }
      const streak = m.streakDays ?? 0;
      if (streak >= T.strongStreakDays) {
        return note("session-finished", "streak",
          `سلسلتك ${daysWord(streak)} بلا انقطاع.`,
          "لأنك ذاكرت في كل يومٍ منها.");
      }
      return null;
    }

    /* ② بعد تخطّي مهمّة — ما الذي تغيّر في يومه الآن، وبأيّ سببٍ اختاره هو. */
    case "task-skipped": {
      const label = m.label.trim();
      if (!label) return null;
      const swapped = m.swappedTo?.trim();
      /* اسمُ المهمّة قد يطول («مراجعة ثلاثة أخطاء من أخطائك السابقة») فيلتبس
         بالجملة — القوسان يفصلانه عن الخبر. */
      if (m.reason === "swap" && swapped) {
        return note("task-skipped", `swap:${swapped}`,
          `بدّلتها بـ${swapped}. «${label}» ما زالت في مسارك.`,
          "لأنك طلبت استبدالها، والمهمّة الأصلية لم تُنجَز بعد.");
      }
      const text = m.remainingTasks > 0
        ? `«${label}» خرجت من خطة اليوم، وبقيت لك ${tasksWord(m.remainingTasks)}.`
        : `«${label}» خرجت من خطة اليوم.`;
      return note("task-skipped", m.reason, text, `لأنك اخترت «${m.reasonLabel}».`);
    }

    /* ③ عند انخفاض الالتزام — ولا حكمَ على أسبوعٍ لم يبدأ: «التزام ٠٪» لمن لم
       يذاكر بعدُ ليست معلومةً، هي حكمٌ على لا شيء. */
    case "commitment-drop": {
      const c = m.commitmentPct;
      if (c == null || !Number.isFinite(c)) return null;
      if (m.weekHours <= 0 && m.weekSessions <= 0) return null;
      if (c >= T.lowCommitmentPct) return null;
      return note("commitment-drop", `d${Math.floor(c / 10)}`,
        `التزامك هذا الأسبوع ${pct(c)} من خطّتك. جلسةٌ واحدة اليوم ترفعه.`,
        `لأنك ذاكرت أقلّ من ${pct(T.lowCommitmentPct)} ممّا خطّطت له هذا الأسبوع.`);
    }

    /* ④ عند قرب الاختبار — الأيامُ وحدها رقمٌ، والمفيدُ أن يراها مع ما بقي عليه. */
    case "exam-near": {
      const d = m.daysUntilExam;
      if (d == null || !Number.isFinite(d) || d < 0 || d > T.examNearDays) return null;
      const left = remainingSteps({
        remainingLessons: m.remainingLessons,
        remainingDrills: m.remainingDrills,
        unreviewedErrors: m.activeErrors,
      });
      const when = d === 0 ? "اختبارك اليوم" : `باقي ${daysWord(d)} على اختبارك`;
      return note("exam-near", `d${d}`,
        left.length > 0 ? `${when}، وأمامك ${left.join("، ")}.` : `${when}.`,
        "لأن موعد اختبارك المسجَّل قريب.");
    }

    /* ⑤ بعد إضافة خطأ — التكرارُ في مادّةٍ واحدة نمطٌ يستحقّ الذِّكر، وما دونه
       إرشادٌ إلى المحفوظات (وهي فعلاً تعيد عرضه في وقته). */
    case "error-added": {
      const s = m.subject.trim();
      if (!s || !(m.inSubject > 0)) return null;
      if (m.inSubject >= T.subjectErrorPattern) {
        return note("error-added", `pattern:${s}:${m.inSubject}`,
          `صار عندك ${mistakesNom(m.inSubject)} في ${s} — راجعها قبل أن تتكرّر في الاختبار.`,
          `لأنك سجّلت أخطاء متكرّرة في ${s}.`);
      }
      return note("error-added", `single:${s}`,
        `سجّلته في ${s}. حوّله إلى المحفوظات لتراجعه لاحقاً.`,
        "لأن المحفوظات تعيد عرضه عليك في وقته.");
    }

    /* ⑥ بعد تغيير الخطة (الهدف) — الهدفُ يدخل ملفَّ دويرب فعلاً (`buildDuwairbProfile`). */
    case "goal-changed": {
      const v = m.value.trim();
      if (!v) return null;
      const what = m.field === "major" ? "تخصّصك المستهدف" : "جامعتك المستهدفة";
      return note("goal-changed", `${m.field}:${v}`,
        `سجّلت ${what}: ${v}.`,
        "لأنه يدخل في كل ما أقترحه عليك من الآن.");
    }
  }
}

/* ═══ Explainability — «لماذا هذه الخطة اليوم؟» ═══
   محرّكُ الجلسة يُخرج لكل مهمّةٍ `topFactor` (أعلى عاملٍ مساهم). الطالبُ يرى سببَ
   كلِّ مهمّةٍ تحتها؛ وهذه الجملةُ تجمع الصورة: على أيِّ إشاراتٍ رُتّب اليومُ كلُّه.
   بلا عاملٍ واحدٍ حقيقيّ ⇒ لا جملة. */
const FACTOR_LABEL: Record<PriorityFactor, string> = {
  "exam-urgency": "قرب موعد اختبارك",
  "score-gap": "درجاتك المسجَّلة",
  "weak-subject": "أقلّ موادّك إنجازاً",
  "recent-mistakes": "أخطائك غير المراجَعة",
  "remaining-units": "ما تبقّى من دروسك",
  "remaining-drills": "ما تبقّى من تدريباتك",
  "commitment": "التزامك هذا الأسبوع",
  "readiness": "مستوى جاهزيتك",
};

export function explainSessionPlan(factors: (PriorityFactor | undefined)[]): Intervention | null {
  const seen: PriorityFactor[] = [];
  for (const f of factors) if (f && !seen.includes(f)) seen.push(f);
  const top = seen.slice(0, 2);
  if (top.length === 0) return null;
  return {
    id: `duwairb:plan-explained:${top.join("+")}`,
    kind: "plan-explained",
    text: `رتّبت خطّة اليوم على ${top.map((f) => FACTOR_LABEL[f]).join(" ثمّ ")}.`,
    why: "لأنها أقوى الإشارات التي عندي عنك اليوم.",
  };
}
