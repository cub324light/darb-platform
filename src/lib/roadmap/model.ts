/* ═══════════ نموذج بيانات مساري (Roadmap Model) — مرنٌ ومفتوحٌ للتوسعة ═══════════
   مصدر حقيقةٍ واحد لبيانات تخطيط الاختبارات. كل اختبارٍ يملك بياناتٍ مستقلّة، والبنية
   مفتوحة (meta) فأيّ خاصيةٍ مستقبلية (XP · مستويات · تشخيصي · دراسة جماعية · توقّعات AI ·
   توصيات دويرب) تُضاف بلا إعادة تصميم.

   قواعد معمارية:
   - منطقٌ نقيٌّ فقط هنا (لا localStorage، لا واجهة). القراءة/الحفظ في store.ts.
   - لا تكرار: «مجموعة الاختبارات» تبقى في Workspace، و«تاريخ الاختبار» في trackExamDates؛
     هنا نخزّن الميتاداتا الجديدة فقط (هدف/درجة مستهدفة/أولوية/تسجيل/بداية-نهاية الخطة).
   - «حالة الاختبار» تُشتقّ من الحقائق (examStatus) ولا تُخزَّن — فلا تتقادم ولا تتعارض.
   - لا رقمٌ ثابت: الحدود (max ٣ · قفل ٧ أيام) من config.ts (مصدرٌ واحد للأرقام). */
import { ROADMAP_TUNING } from "./config";

/** نمط المذاكرة (اختيارٌ واحدٌ لمساري الآن؛ per-exam مستقبلاً عبر meta بلا إعادة تصميم). */
export type StudyMode = "focus" | "distribute" | "smart";

/** وضع الإجازة — توقّفٌ مؤقّتٌ معلنٌ للمذاكرة. حين يكون نشطاً لا يُحاسَب الطالب على قلّة
    الالتزام ولا تُطلق إنذارات الخطر (الطبقات الأعلى تقرأ isOnVacation فتُهدّئ نبرتها).
    since = بداية الإجازة، until = تاريخ عودةٍ اختياريّ (تنتهي الإجازة تلقائياً بعده). */
export interface VacationState { since: string; until?: string; }

/** وجهتي — الجامعة/التخصص الهدف. مستقبلاً تُربط بمتطلبات القبول فتضبط الدرجة المستهدفة
    تلقائياً (معلّقٌ على ملف الجامعات). الآن: تخزين الاختيار فقط. */
export interface Destination { university?: string; major?: string; }

/** ميتاداتا اختبارٍ مستقلّة — الحقول الجديدة فقط. مفتوحةٌ للتوسعة عبر meta. */
export interface ExamPlanMeta {
  goal?: string;              // الهدف/الفرصة التي يخدمها هذا الاختبار
  targetScore?: number;       // الدرجة المستهدفة
  priority?: number;          // رتبة الأولوية (١..N؛ الأصغر أعلى)
  registrationDate?: string;  // تاريخ التسجيل YYYY-MM-DD
  planStart?: string;         // بداية خطة هذا الاختبار (يملؤها محرّك الـTimeline لاحقاً)
  planEnd?: string;           // نهاية خطة هذا الاختبار
  meta?: Record<string, unknown>; // مفتوح: XP · تشخيصي · توقّعات AI · توصيات دويرب...
}

/** إعداد مساري — مفتوحٌ للتوسعة (meta). لا يخزّن مجموعة الاختبارات (مصدرها Workspace). */
export interface RoadmapConfig {
  examMeta?: Record<string, ExamPlanMeta>; // ميتاداتا لكل اختبار (مفتاحها examId)
  priorityLockedAt?: number;               // ms — قفل الأولوية (٧ أيام)
  studyMode?: StudyMode;                    // نمط المذاكرة
  vacation?: VacationState;                 // وضع الإجازة (توقّفٌ مؤقّت معلن)
  destination?: Destination;                // وجهتي (الجامعة/التخصص الهدف)
  meta?: Record<string, unknown>;           // مفتوح: دراسة جماعية · توصيات دويرب · ...
}

/** حالة الاختبار — مشتقّةٌ من الحقائق (لا تُخزَّن). */
export type ExamStatus = "not-started" | "studying" | "registered" | "taken" | "waiting-result" | "done";

export const MAX_EXAMS = ROADMAP_TUNING.maxExams;
export const PRIORITY_LOCK_DAYS = ROADMAP_TUNING.priorityLockDays;
const DAY_MS = 86_400_000;

/** أسباب حذف اختبارٍ — تُلتقط للتحليلات (لا تُخزَّن في النموذج؛ تُرسَل حدثاً). */
export const DELETE_REASONS = [
  { id: "not-needed", label: "لم أعد أحتاجه" },
  { id: "changed-goal", label: "غيّرت وجهتي" },
  { id: "by-mistake", label: "أضفته بالخطأ" },
  { id: "postponed", label: "أجّلته لوقتٍ لاحق" },
] as const;
export type DeleteReasonId = (typeof DELETE_REASONS)[number]["id"] | "other";

/* ── حدود الإضافة (max ٣) — نقيّة، تأخذ العدد الحاليّ صراحةً ── */
export const remainingSlots = (count: number): number => Math.max(0, MAX_EXAMS - count);
export const atMax = (count: number): boolean => count >= MAX_EXAMS;

/* ── قراءة/تعديل الميتاداتا (غير قابلة للتغيير — تُعيد نسخةً جديدة) ── */
const cloneMeta = (c: RoadmapConfig): Record<string, ExamPlanMeta> => ({ ...(c.examMeta ?? {}) });

export function getExamMeta(c: RoadmapConfig, examId: string): ExamPlanMeta {
  return c.examMeta?.[examId] ?? {};
}

export function setExamMeta(c: RoadmapConfig, examId: string, patch: Partial<ExamPlanMeta>): RoadmapConfig {
  const examMeta = cloneMeta(c);
  examMeta[examId] = { ...(examMeta[examId] ?? {}), ...patch };
  return { ...c, examMeta };
}

/** يزيل ميتاداتا اختبارٍ ويُلغي قفل الأولوية (تغيّر المجموعة يسمح بإعادة الترتيب). */
export function onExamRemoved(c: RoadmapConfig, examId: string): RoadmapConfig {
  const examMeta = cloneMeta(c);
  delete examMeta[examId];
  return { ...c, examMeta, priorityLockedAt: undefined };
}

/** يضمن وجود مدخلٍ للاختبار الجديد ويُلغي قفل الأولوية (يسمح بإعادة الترتيب بعد الإضافة). */
export function onExamAdded(c: RoadmapConfig, examId: string): RoadmapConfig {
  const examMeta = cloneMeta(c);
  if (!examMeta[examId]) examMeta[examId] = {};
  return { ...c, examMeta, priorityLockedAt: undefined };
}

/* ── الأولوية + القفل (٧ أيام) ── */
/** يضبط رتب الأولوية (١..N بترتيب orderedIds) ويقفلها بختمٍ زمنيّ. */
export function setPriorityOrder(c: RoadmapConfig, orderedIds: string[], now: number = Date.now()): RoadmapConfig {
  const examMeta = cloneMeta(c);
  orderedIds.forEach((id, i) => { examMeta[id] = { ...(examMeta[id] ?? {}), priority: i + 1 }; });
  return { ...c, examMeta, priorityLockedAt: now };
}

export interface PriorityLockState { locked: boolean; daysLeft: number; unlockAt: number | null; }
export function priorityLock(c: RoadmapConfig, now: number = Date.now()): PriorityLockState {
  if (!c.priorityLockedAt) return { locked: false, daysLeft: 0, unlockAt: null };
  const unlockAt = c.priorityLockedAt + PRIORITY_LOCK_DAYS * DAY_MS;
  const remainingMs = unlockAt - now;
  if (remainingMs <= 0) return { locked: false, daysLeft: 0, unlockAt };
  return { locked: true, daysLeft: Math.ceil(remainingMs / DAY_MS), unlockAt };
}

/** يرتّب معرّفات الاختبارات حسب الأولوية المخزّنة (غير المرتّب في الآخر، ثباتٌ في التعادل). */
export function orderByPriority(c: RoadmapConfig, ids: string[]): string[] {
  return ids
    .map((id, i) => ({ id, i, p: c.examMeta?.[id]?.priority }))
    .sort((a, b) => {
      if (a.p != null && b.p != null) return a.p - b.p || a.i - b.i;
      if (a.p != null) return -1;
      if (b.p != null) return 1;
      return a.i - b.i;
    })
    .map((x) => x.id);
}

export function setStudyMode(c: RoadmapConfig, mode: StudyMode): RoadmapConfig {
  return { ...c, studyMode: mode };
}

/* ── وجهتي (نقيّ) ── */
export function setDestination(c: RoadmapConfig, dest: Destination): RoadmapConfig {
  return { ...c, destination: dest };
}

/* ── وضع الإجازة (نقيّ) — إعلانٌ صريحٌ بالتوقّف المؤقّت ── */
export function setVacation(c: RoadmapConfig, since: string, until?: string): RoadmapConfig {
  return { ...c, vacation: until ? { since, until } : { since } };
}
export function clearVacation(c: RoadmapConfig): RoadmapConfig {
  const { vacation: _drop, ...rest } = c; void _drop;
  return rest;
}

export interface VacationView { active: boolean; since: string | null; until: string | null; daysLeft: number | null; }
/** حالة الإجازة اليوم — تنتهي تلقائياً بعد until (إن وُجد) بلا كتابةٍ للتخزين. */
export function vacationState(c: RoadmapConfig, today: string): VacationView {
  const v = c.vacation;
  if (!v) return { active: false, since: null, until: null, daysLeft: null };
  const active = !v.until || today <= v.until;
  const daysLeft = v.until && active
    ? Math.max(0, Math.round((Date.parse(v.until + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000))
    : null;
  return { active, since: v.since, until: v.until ?? null, daysLeft };
}
/** اختصارٌ منطقيّ: هل الطالب في إجازةٍ اليوم؟ (تقرؤه الطبقات الأعلى لتهدئة النبرة). */
export function isOnVacation(c: RoadmapConfig, today: string): boolean {
  return vacationState(c, today).active;
}

/* ── حالة الاختبار المشتقّة (نقيّة) ── */
export interface ExamStatusFacts {
  progress: number;         // ٠..١٠٠ (تقدّم المذاكرة)
  registered: boolean;      // سجّل في الاختبار (له تاريخ تسجيل)
  examPassed: boolean;      // مضى تاريخ الاختبار
  hasResult: boolean;       // سجّل درجةً
  waitingResult: boolean;   // بانتظار النتيجة
}
export function examStatus(f: ExamStatusFacts): ExamStatus {
  if (f.hasResult) return "done";
  if (f.waitingResult) return "waiting-result";
  if (f.examPassed) return "taken";
  if (f.registered) return "registered";
  if (f.progress > 0) return "studying";
  return "not-started";
}

export const EXAM_STATUS_LABEL: Record<ExamStatus, string> = {
  "not-started": "لم يبدأ", studying: "تذاكر", registered: "مسجّل",
  taken: "اختبرت", "waiting-result": "بانتظار النتيجة", done: "مكتمل",
};
