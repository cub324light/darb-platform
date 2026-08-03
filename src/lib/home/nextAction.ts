/* ═══════════ «ماذا سأفعل اليوم؟» — الجوابُ نفسُه، لا السؤالُ فقط ═══════════
   كانت الرئيسيةُ تسأل السؤالَ بأكبر خطٍّ في الصفحة ثم تجيب بزرٍّ عامّ: «ابدأ
   جلسة تركيز الآن». وهذا ليس جواباً — الطالبُ يعرف أنّ عليه أن يذاكر، وإنّما
   يقف حائراً **بماذا يبدأ**. فصار الجوابُ يسمّي المادّة ويقول لماذا هي.

   ▓ نقيّ: لا تخزينَ ولا `Date` ولا عشوائية. المدخلاتُ تُقرأ في `TodayCard`،
   والقرارُ هنا وحده — فيُختبر بلا متصفّح.

   ▓ ولا نختلق: من لا خطّةَ له ولا مهامّ لا نرسله إلى مادّةٍ لم يخترها؛ نرسله
   ليبني خطّته. حالةُ الفراغ جوابٌ صادقٌ لا نقصٌ يُخفى. */

export interface NextActionInput {
  /** مهامُّ اليوم غيرُ المنجَزة (اليومُ والمتأخّر) — مرتّبةٌ كما تُعرض. */
  tasks: { title: string; subject?: string; priority: string }[];
  /** موادُّ خطّة الطالب — فارغةٌ ⇐ لم يبنِ خطّةً بعد. */
  subjects: { name: string }[];
  /** أقلُّ المواد إنجازاً (من `countRemaining`) — قد تكون `null`. */
  weakestSubject: string | null;
  /** دقائقُ ذاكرها اليوم، وهدفُه اليوميّ بالدقائق (صفرٌ ⇐ لم يحدّد). */
  doneMins: number;
  goalMins: number;
}

export type NextActionKind = "setup" | "task" | "weakest" | "done";

export interface NextAction {
  kind: NextActionKind;
  /** العنوانُ الكبير — جوابٌ لا سؤال. */
  title: string;
  /** سطرٌ يشرح **لماذا** هذا بالذات. */
  why: string;
  /** المادّةُ التي تبدأ بها الجلسة (تُمرَّر إلى `‎/orbit?subject=`). */
  subject: string | null;
  cta: string;
  href: string;
}

const PRIO_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** أهمُّ مهامّ اليوم: الأولويةُ أوّلاً ثم ترتيبُ العرض. */
export function topTask(tasks: NextActionInput["tasks"]): NextActionInput["tasks"][number] | null {
  if (!tasks.length) return null;
  return [...tasks].sort((a, b) => (PRIO_RANK[a.priority] ?? 3) - (PRIO_RANK[b.priority] ?? 3))[0];
}

export function nextAction(i: NextActionInput): NextAction {
  const goalMet = i.goalMins > 0 && i.doneMins >= i.goalMins;

  /* لا خطّةَ ولا مهامّ ⇒ لا نخترع مادّة. */
  if (i.subjects.length === 0 && i.tasks.length === 0) {
    return {
      kind: "setup",
      title: "ابنِ خطّتك أوّلاً",
      why: "اختر اختبارك ومواده، فتصير لك مهامُّ يومٍ بدل صفحةٍ فارغة.",
      subject: null,
      cta: "افتح مساري",
      href: "/roadmap",
    };
  }

  const top = topTask(i.tasks);
  if (top) {
    const subject = top.subject ?? i.weakestSubject ?? i.subjects[0]?.name ?? null;
    return {
      kind: "task",
      title: subject ? `ابدأ بـ${subject}` : "ابدأ بمهمّة اليوم",
      why: `«${top.title}» أولى مهامّ يومك.`,
      subject,
      cta: "ابدأ الجلسة",
      href: subject ? `/orbit?subject=${encodeURIComponent(subject)}` : "/orbit",
    };
  }

  /* بلغ هدفَه ولا مهامَّ ⇒ لا ندفعه دفعاً؛ نعترف بما أتمّ. */
  if (goalMet) {
    return {
      kind: "done",
      title: "أتممتَ هدفَ اليوم",
      why: "ما بعد الهدف زيادةٌ لك لا دَينٌ عليك — راجعْ أخطاءك أو أرِحْ.",
      subject: null,
      cta: "راجع أخطائي",
      href: "/vault",
    };
  }

  const subject = i.weakestSubject ?? i.subjects[0]?.name ?? null;
  return {
    kind: "weakest",
    title: subject ? `ابدأ بـ${subject}` : "ابدأ جلسة تركيز",
    why: subject ? "أقلُّ موادّك إنجازاً — تقديمُها يوازن خطّتك." : "لا مهامَّ اليوم؛ جلسةٌ واحدة تُبقي إيقاعك.",
    subject,
    cta: "ابدأ الجلسة",
    href: subject ? `/orbit?subject=${encodeURIComponent(subject)}` : "/orbit",
  };
}
