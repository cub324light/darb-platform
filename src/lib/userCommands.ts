/* ═══════════ أوامرُ الطالب — البابُ الوحيد الذي تكتب منه الواجهة ═══════════
   ▸ العطل الذي أُغلق: كانت ستُّ شاشاتٍ تستدعي `saveUser` بيدها. فلا موضعَ واحدٌ
     يعرف «متى تغيّر الطالب»، ولا قاعدةَ تمنع شاشةً من كتابة حقلٍ ليس لها.

   ▸ الطريقُ من الآن: **واجهة ← أمر ← محرّك ← تخزين**. لا `saveUser` في `src/app`
     ولا في `src/components` — يحرسه اختبارُ مصدرٍ يمسح الاثنين.
     (يُستثنى `/onboarding`: **ينشئ** الملفَّ ولا يعدّله — كما استُثني في حدّ المرحلة.)

   ▸ وحقولُ المرحلة (`studyLevel` · `grade` · `gradStage` · `gradeYearId`) **محجوبةٌ
     بالنوع** عن أمر تعديل الملفّ العاديّ: مَن أرادها فله أمرُها الخاصّ، ومحرّكُ
     الانتقال يبقى صاحبَ الانتقال نفسِه. */
"use client";
import { loadUser, saveUser, ensureWorkspace, type DarbUser } from "./storage";

/** حقولُ المرحلة — يملكها محرّكُ الانتقال وأمرُ الصفّ، لا تعديلُ الملفّ العامّ. */
export type PhaseField = "studyLevel" | "grade" | "gradStage" | "gradeYearId";

/** ما يجوز لشاشةٍ أن تعدّله في ملفّ الطالب. */
export type ProfilePatch = Omit<Partial<DarbUser>, PhaseField>;

/**
 * تعديلٌ على ملفّ الطالب — قراءةُ الأحدث ثم دمجٌ ثم حفظ.
 * يقرأ من التخزين لا من لقطة الشاشة، فلا تطمس شاشةٌ ما كتبته أخرى في نفس اللحظة.
 * يعيد الملفَّ بعد التعديل، أو `null` إن لم يكن هناك ملفٌّ بعد.
 */
export function updateProfile(patch: ProfilePatch): DarbUser | null {
  const u = loadUser();
  if (!u) return null;
  const next = { ...u, ...patch } as DarbUser;
  saveUser(next);
  return next;
}

/**
 * تصحيحُ الصفّ المدرسيّ من «ملفي» — `null` يمسحه.
 * ▓ حدُّ صدق: هذا **تصحيحُ بيانات** لا انتقالُ مرحلة. الانتقالُ (بالتقويم أو
 *   بإعلان الطالب) يبقى في `transition/` وحدَه بأحداثه ووحداته. وأثرُ هذا
 *   التصحيح على ذاكرة دويرب وعلى وحدات المرحلة مسجَّلٌ ديناً في `backlog §٣٥`
 *   ولم يُلمَس هنا: المرحلةُ السادسة توحيدُ مصادرَ لا تغييرُ سلوك.
 */
export function setSchoolGrade(grade: string | null): DarbUser | null {
  const u = loadUser();
  if (!u) return null;
  const next: DarbUser = { ...u, grade: grade ?? undefined, studyLevel: "ثانوي" };
  saveUser(next);
  return next;
}

/** يضمن أن للطالب `Workspace` محفوظاً (ترحيلُ النظام القديم) — بلا تعديلٍ آخر. */
export function ensureWorkspaceSaved(): DarbUser | null {
  const u = loadUser();
  if (!u) return null;
  const ensured = ensureWorkspace(u);
  if (!u.workspace && ensured.workspace) saveUser(ensured);
  return ensured;
}
