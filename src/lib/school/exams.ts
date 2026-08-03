/* ═══════════ اختباراتُك المدرسية — المحرّك النقيّ ═══════════
   كانت البطاقة تعرض مواعيدَ قياس (قدرات/تحصيلي) وتسمّيها «الاختبارات القادمة»،
   والطالبُ في المدرسة سؤالُه غيرُ ذلك تماماً: **اختبار الرياضيات الأحد، والتحديد
   من الفصل الثالث إلى الخامس، والأستاذ قال إنه من الكتاب لا من الملزمة.**

   فهذه اختباراتُ المدرسة: مادّةٌ وموعدٌ و**تحديد** (ما الذي يدخل) واسمُ المدرّس
   وما قاله. لا يخترع النظامُ شيئاً منها — كلُّها من فم الطالب.

   ▓ نقيّ: مُدخلاتٌ داخلة ونتيجةٌ خارجة. لا تخزين ولا نافذة ولا وقت. */

export interface SchoolExam {
  id: string;
  subject: string;        // رياضيات · فيزياء …
  date: string;           // YYYY-MM-DD
  /** التحديد: ما الذي يدخل في الاختبار (فصولٌ · صفحات · دروس). */
  scope?: string;
  teacherId?: string;     // ربطٌ بدليل المدرّسين إن اختاره
  teacherName?: string;   // أو اسمٌ كتبه مباشرةً
  /** ما قاله المدرّس عن الاختبار. */
  teacherSaid?: string;
  createdAt: number;
}

export const LIMITS = {
  maxExams: 40,
  maxTextLen: 400,
} as const;

const clean = (s: string | undefined, max: number = LIMITS.maxTextLen): string | undefined => {
  const v = (s ?? "").trim().slice(0, max);
  return v || undefined;
};

export type AddResult = { ok: true; exams: SchoolExam[] } | { ok: false; reason: "empty" | "full" | "bad-date" };

const isDate = (d: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(d);

export function addExam(all: SchoolExam[], i: Omit<SchoolExam, "createdAt"> & { at: number }): AddResult {
  const subject = clean(i.subject, 60);
  if (!subject) return { ok: false, reason: "empty" };
  if (!isDate(i.date)) return { ok: false, reason: "bad-date" };
  if (all.length >= LIMITS.maxExams) return { ok: false, reason: "full" };
  return {
    ok: true,
    exams: [...all, {
      id: i.id, subject, date: i.date,
      scope: clean(i.scope), teacherId: i.teacherId,
      teacherName: clean(i.teacherName, 60), teacherSaid: clean(i.teacherSaid),
      createdAt: i.at,
    }],
  };
}

export function updateExam(all: SchoolExam[], id: string, patch: Partial<Omit<SchoolExam, "id" | "createdAt">>): SchoolExam[] {
  return all.map((e) => {
    if (e.id !== id) return e;
    const subject = patch.subject !== undefined ? (clean(patch.subject, 60) ?? e.subject) : e.subject;
    const date = patch.date !== undefined && isDate(patch.date) ? patch.date : e.date;
    return {
      ...e, subject, date,
      scope: patch.scope !== undefined ? clean(patch.scope) : e.scope,
      teacherId: patch.teacherId !== undefined ? patch.teacherId : e.teacherId,
      teacherName: patch.teacherName !== undefined ? clean(patch.teacherName, 60) : e.teacherName,
      teacherSaid: patch.teacherSaid !== undefined ? clean(patch.teacherSaid) : e.teacherSaid,
    };
  });
}

export const removeExam = (all: SchoolExam[], id: string): SchoolExam[] => all.filter((e) => e.id !== id);

/* ── القراءة ── */

/** القادمةُ اليومَ فما بعد — الأقربُ أوّلاً. */
export const upcomingExams = (all: SchoolExam[], today: string): SchoolExam[] =>
  all.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));

/** ما مضى — الأحدثُ أوّلاً. */
export const pastExams = (all: SchoolExam[], today: string): SchoolExam[] =>
  all.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));

export const examsOn = (all: SchoolExam[], date: string): SchoolExam[] =>
  all.filter((e) => e.date === date);

/** كم يوماً بقي؟ (سالبٌ لما مضى) */
export function daysTo(today: string, date: string): number {
  const a = Date.parse(`${today}T00:00:00Z`), b = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

/** عبارةُ القرب — «اليوم» و«غداً» أوضحُ من رقمٍ في هذين اليومين. */
export function whenLabel(today: string, date: string): string {
  const d = daysTo(today, date);
  if (d === 0) return "اليوم";
  if (d === 1) return "غداً";
  if (d === 2) return "بعد غد";
  if (d < 0) return "مضى";
  return `بعد ${d} ${d >= 3 && d <= 10 ? "أيام" : "يوماً"}`;
}

/** هل يستحقّ التنبيه؟ — ثلاثةُ أيامٍ أو أقلّ. */
export const isSoon = (today: string, date: string): boolean => {
  const d = daysTo(today, date);
  return d >= 0 && d <= 3;
};
