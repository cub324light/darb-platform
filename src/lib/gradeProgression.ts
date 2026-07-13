/* ─── الترقية التلقائية بين الصفوف حسب التقويم الدراسي ───
   قرار المالك: التقويم الدراسي هو المرجع الرسمي. مع بداية كل عام دراسي جديد يترقّى
   الطالب تلقائياً (أول → ثاني → ثالث → خريج ثانوي) دون أن يعدّل ملفه، مع حفظ كل
   بياناته وخطته. المرساة: gradeYearId (العام الدراسي وقت ضبط الصف) — نقارنه بالعام
   الحالي من academicCalendar، وعدد الأعوام المنقضية = عدد خطوات الترقية.

   جزءان: دالة نقيّة (advanceGradeByCalendar) قابلة للاختبار، وجسرٌ يقرأ/يحفظ التخزين
   (syncGradeWithCalendar) يُستدعى مرّة عند تحميل التطبيق. لا تخمين — كله من التقويم. */

import type { DarbUser } from "./storage";
import { loadUser, saveUser } from "./storage";
import { currentAcademicYearId } from "./academicCalendar";

const GRADE_ORDER = ["أول ثانوي", "ثاني ثانوي", "ثالث ثانوي"] as const;
type Grade = (typeof GRADE_ORDER)[number];

export interface GradeAdvance {
  advanced: boolean;
  steps: number;
  grade?: string;       // الصف الجديد (إن بقي ثانوياً)
  studyLevel?: string;  // "ثانوي" | "خريج"
  gradStage?: string;   // "خريج ثانوي" عند التخرّج
}

/** الحساب النقيّ: من (صف + عام المرساة + العام الحالي) → الترقية. الجامعي/الخريج لا يترقّى. */
export function advanceGradeByCalendar(input: {
  studyLevel?: string;
  grade?: string;
  anchorYearId?: string | null;
  currentYearId?: string | null;
}): GradeAdvance {
  const { studyLevel, grade } = input;
  const noop: GradeAdvance = { advanced: false, steps: 0, grade, studyLevel };
  if (studyLevel !== "ثانوي") return noop;                 // فقط الثانوي يترقّى هنا
  const idx = GRADE_ORDER.indexOf(grade as Grade);
  if (idx < 0) return noop;                                 // صف غير معروف — لا نلمسه
  const a = parseInt(input.anchorYearId ?? "", 10);
  const c = parseInt(input.currentYearId ?? "", 10);
  if (!Number.isFinite(a) || !Number.isFinite(c) || c <= a) return noop;
  const steps = c - a;
  const target = idx + steps;
  if (target >= GRADE_ORDER.length) {
    /* تجاوز ثالث ثانوي → خريج ثانوي (نحفظ كل البيانات، نمسح الصف فقط) */
    return { advanced: true, steps, studyLevel: "خريج", gradStage: "خريج ثانوي", grade: undefined };
  }
  return { advanced: true, steps, studyLevel: "ثانوي", grade: GRADE_ORDER[target] };
}

/** الجسر (عميل): يطبّق الترقية على ملف المستخدم مرّة، ويُحدِّث المرساة. يعيد true إن غيّر. */
export function syncGradeWithCalendar(now: Date = new Date()): boolean {
  if (typeof window === "undefined") return false;
  const u = loadUser();
  if (!u || !u.onboarded) return false;

  const currentYearId = currentAcademicYearId(now);
  if (!currentYearId) return false;

  /* بلا مرساة (مستخدم قديم قبل هذه الميزة): ثبّت المرساة على العام الحالي دون ترقية */
  if (!u.gradeYearId) {
    if (u.studyLevel === "ثانوي") saveUser({ ...u, gradeYearId: currentYearId });
    return false;
  }

  const adv = advanceGradeByCalendar({
    studyLevel: u.studyLevel,
    grade: u.grade,
    anchorYearId: u.gradeYearId,
    currentYearId,
  });
  if (!adv.advanced) return false;

  const next: DarbUser = {
    ...u,
    studyLevel: adv.studyLevel,
    grade: adv.grade,
    gradeYearId: currentYearId, // حدّث المرساة فلا يُعاد الترقّي
  };
  if (adv.gradStage) next.gradStage = adv.gradStage;
  saveUser(next);
  return true;
}
