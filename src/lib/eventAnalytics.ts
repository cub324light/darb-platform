/* ─── تجميع أحداث المنتج للوحة الأدمن (دالة نقية، قابلة للاختبار) ───
   تأخذ صفوف أحداث اليوم من Firestore `events` وتُعيد تجميعات صادقة:
   إكمال الدروس/الاختبارات، معدّل إكمال الدرس (Drop-off)، وقمع الرحلة (Funnel).

   مبدأ الصدق: الأرقام «عدد مستخدمين فريدين لكل خطوة اليوم» (لا متابعة نفس
   الشخص عبر الأيام — ذلك يحتاج تتبّعاً مُعرّفاً لم نوسّعه). البطاقات الفارغة
   تُترك فارغة ليكتب سطح العرض «لا توجد بيانات كافية بعد» بلا رقم مخترع. */

export interface EventRow {
  name: string;
  props: Record<string, unknown>;
  uid: string | null;
}

export interface LessonAgg { key: string; name: string; count: number }
export interface ExamAgg { exam: string; count: number }
export interface FunnelStep { key: string; label: string; count: number }

export interface EventAggregates {
  lessonsStarted: number;
  lessonsCompleted: number;
  /** نسبة مئوية (اكتمل ÷ بدأ)، أو null إن لم يبدأ أحد اليوم */
  lessonCompletionRate: number | null;
  topLessons: LessonAgg[];
  examsCompleted: number;
  topExams: ExamAgg[];
  funnel: FunnelStep[];
}

/* خطوات القمع بالترتيب — كل خطوة = حدثها المميّز.
   «الزيارة» تُعدّ بمعرّف الزائر المجهول؛ البقية بمعرّف المستخدم الموثّق. */
const FUNNEL_STEPS: { key: string; label: string; event: string }[] = [
  { key: "visit",     label: "زيارة",       event: "page_view" },
  { key: "signup",    label: "تسجيل",       event: "onboarding_completed" },
  { key: "plan",      label: "خطة",         event: "ai_plan_generated" },
  { key: "session",   label: "أول جلسة",    event: "session_completed" },
  { key: "lesson",    label: "أول درس",     event: "lesson_completed" },
  { key: "exam",      label: "أول اختبار",  event: "exam_completed" },
  { key: "milestone", label: "أول إنجاز",   event: "milestone_reached" },
];

export function eventAggregates(rows: EventRow[]): EventAggregates {
  let lessonsStarted = 0, lessonsCompleted = 0, examsCompleted = 0;
  const lessonMap = new Map<string, { name: string; count: number }>();
  const examMap = new Map<string, number>();
  /* مجموعات المستخدمين الفريدين لكل حدث في القمع */
  const funnelSets: Record<string, Set<string>> = {};
  for (const s of FUNNEL_STEPS) funnelSets[s.event] = new Set<string>();

  for (const r of rows) {
    if (r.name === "lesson_started") lessonsStarted++;
    else if (r.name === "lesson_completed") {
      lessonsCompleted++;
      const key = String(r.props.lessonKey ?? "").trim();
      if (key) {
        const cur = lessonMap.get(key);
        if (cur) cur.count++;
        else lessonMap.set(key, { name: String(r.props.lessonName ?? key), count: 1 });
      }
    } else if (r.name === "exam_completed") {
      examsCompleted++;
      const exam = String(r.props.exam ?? "").trim();
      if (exam) examMap.set(exam, (examMap.get(exam) ?? 0) + 1);
    }

    /* عدّ القمع بالمستخدم الفريد */
    const set = funnelSets[r.name];
    if (set) {
      const actor = r.name === "page_view"
        ? String(r.props.visitorId ?? r.uid ?? "")
        : String(r.uid ?? "");
      if (actor) set.add(actor);
    }
  }

  const topLessons = [...lessonMap.entries()]
    .map(([key, v]) => ({ key, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topExams = [...examMap.entries()]
    .map(([exam, count]) => ({ exam, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const funnel = FUNNEL_STEPS.map((s) => ({ key: s.key, label: s.label, count: funnelSets[s.event].size }));

  const lessonCompletionRate = lessonsStarted > 0
    ? Math.round((lessonsCompleted / lessonsStarted) * 100)
    : null;

  return { lessonsStarted, lessonsCompleted, lessonCompletionRate, topLessons, examsCompleted, topExams, funnel };
}
