/* ═══════════ محرّك الانتقال — نقيٌّ ١٠٠٪ ═══════════
   ▸ مسؤوليةٌ واحدة: من (ملفِّ الطالب + مرحلةٍ مقصودة) ← ملفٌّ جديد + الأحداثُ
     التي يجب أن تُطلَق. لا تخزينَ ولا `Date` ولا `window` — الجسرُ في `index.ts`.

   ▸ **لا يخسر الطالبُ شيئاً**: الملفُّ يمرّ كما هو، ولا تُكتب إلا الحقولُ الأربعة
     (`studyLevel` · `grade` · `gradStage` · `gradeYearId`). ما عداها بالمرجع
     نفسِه — يحرسه اختبارٌ يقارن المفاتيحَ مفتاحاً مفتاحاً.

   ▸ **ولا يُحذف من `Workspace` شيء**: وحداتُ المرحلة الجديدة تُضاف، والقديمةُ
     تبقى مخزَّنةً وتُحجَب بالبوابة (`phaseAllows`). فقدراتُ الطالب وتحصيليُّه
     وتقدّمُهما باقيةٌ لو عاد يوماً — الاختفاءُ عرضٌ لا حذف. */

import type { DarbUser } from "../storage";
import { computeStudentPhase } from "../phase";
import { coreModulesForStage, isGroup, moduleDef } from "../modules/registry";
import type { Workspace } from "../modules/workspace";
import { phaseDef, type PhaseId, type PhaseCapability } from "./registry";

/* ─── أين يقف الطالبُ الآن؟ — اشتقاقٌ من القواعد القائمة لا قاعدةٌ سادسة ─── */
const GRADE_TO_PHASE: Record<string, PhaseId> = {
  "أول ثانوي": "hs-1",
  "ثاني ثانوي": "hs-2",
  "ثالث ثانوي": "hs-3",
};

/** مرحلةُ الطالب الحالية، أو `null` حين لا تكفي بياناتُه للحكم (لا نخمّن). */
export function phaseIdOf(u?: DarbUser | null): PhaseId | null {
  if (!u) return null;
  const phase = computeStudentPhase(u);
  if (phase === "university") return "university";
  if (phase === "graduate") return u.gradStage === "خريج جامعة" ? "grad-uni" : "grad-hs";
  return GRADE_TO_PHASE[u.grade ?? ""] ?? null;
}

/* ─── البوابة الواحدة ─── */

/** هل تسمح مرحلةُ الطالب بهذه القدرة؟
    مرحلةٌ مجهولة ⇒ **نسمح**: البوابةُ حارسٌ لا مانعٌ افتراضيّ، فلا يفقد مستخدمٌ
    ناقصُ البيانات ما كان يراه قبل هذا المحرّك. */
export function phaseAllows(phase: PhaseId | null, cap: PhaseCapability): boolean {
  if (!phase) return true;
  const def = phaseDef(phase);
  if (!def) return true;
  return def.allows.includes(cap);
}

/* ─── الانتقال ─── */

/** حدثٌ يجب إطلاقُه — يصفه المحرّكُ النقيّ ويُطلقه الجسر. */
export interface TransitionEvent {
  type: "StudentPhaseChanged" | "UniversityPhaseEntered" | "CareerPhaseEntered";
  from?: string;
  to?: string;
  studyLevel?: "ثانوي" | "جامعي" | "خريج";
  grade?: string;
  /** المرحلةُ المعرفية التي يُنسَب إليها الحدثُ في الذاكرة */
  eduStage: string;
  /** صار للطالب صفٌّ سابقٌ لم يعد صحيحاً (ثالث ← خريج) */
  clearedGrade: boolean;
}

export interface TransitionResult {
  user: DarbUser;
  from: PhaseId | null;
  to: PhaseId;
  events: TransitionEvent[];
}

/** هل يجوز الانتقالُ من هنا إلى هناك؟ من `next[]` في السجلّ وحدَه. */
export function canTransition(from: PhaseId | null, to: PhaseId): boolean {
  if (from === to) return false;
  if (!phaseDef(to)) return false;
  if (!from) return false;
  return phaseDef(from)?.next.includes(to) ?? false;
}

/** المراحلُ التي يجوز للطالب إعلانُ انتقاله إليها الآن (للواجهة). */
export function declarableFrom(u?: DarbUser | null): PhaseId[] {
  const from = phaseIdOf(u);
  if (!from) return [];
  return (phaseDef(from)?.next ?? [])
    .filter((id): id is PhaseId => phaseDef(id)?.advance === "declare");
}

/**
 * ينقل الطالبَ إلى مرحلةٍ مسموحة. `null` إن كان الانتقالُ غير مسموح.
 * `yearId` مرساةُ العام الدراسيّ الحالي — تُحدَّث فلا يتكرّر الترقّي.
 */
export function applyTransition(
  user: DarbUser,
  to: PhaseId,
  opts?: { yearId?: string | null },
): TransitionResult | null {
  const from = phaseIdOf(user);
  if (!canTransition(from, to)) return null;
  const def = phaseDef(to)!;

  /* الحقولُ الأربعةُ وحدَها. والغائبُ في `profile` يُمسَح عمداً: خرّيجٌ بلا صف،
     وجامعيٌّ بلا `gradStage`. وما عدا هذه المفاتيح يمرّ كما هو. */
  const next: DarbUser = {
    ...user,
    studyLevel: def.profile.studyLevel,
    grade: def.profile.grade,
    gradStage: def.profile.gradStage,
    ...(opts?.yearId ? { gradeYearId: opts.yearId } : {}),
  };

  const clearedGrade = !!user.grade && !def.profile.grade;
  const events: TransitionEvent[] = [{
    type: "StudentPhaseChanged",
    from: from ?? undefined,
    to,
    studyLevel: def.profile.studyLevel,
    grade: def.profile.grade,
    eduStage: def.eduStage,
    clearedGrade,
  }];
  /* حدثُ المَعلَم القائم — يُطلَق **إضافةً** لأنه حقيقةٌ أخرى: «تغيّرت المرحلة»
     شيءٌ، و«دخل المرحلة الجامعية» مَعلَمٌ يُحفظ في `relationship.milestone`. */
  if (def.milestone) {
    events.push({ type: def.milestone, from: from ?? undefined, eduStage: def.eduStage, clearedGrade: false });
  }

  return { user: next, from, to, events };
}

/**
 * وحداتُ المرحلة الجديدة تُضاف إلى `Workspace` — **ولا يُحذف منه شيء**.
 * (`syncCoreModules` القائمةُ تحذف ما لم يعد Core، فلا تصلح هنا: حذفُ وحدةٍ
 *  يذهب بتقدّم الطالب فيها. فنأخذ منها الإضافةَ ونردّ ما حذفته.)
 */
export function withCoreForPhase(ws: Workspace, to: PhaseId, now: number): Workspace {
  const def = phaseDef(to);
  if (!def?.boardStage) return ws;
  const want = coreModulesForStage(def.boardStage);
  const have = new Set(ws.modules.map((m) => m.id));
  const missing = want.filter((id) => !have.has(id));
  if (missing.length === 0) return ws;

  let order = ws.modules.reduce((mx, m) => Math.max(mx, m.order), -1);
  const added = missing.map((id) => {
    order += 1;
    const base = { id, kind: moduleDef(id).kind, state: "added" as const, progress: 0, order, hidden: false, lastActivityAt: now };
    return isGroup(id) ? { ...base, members: [] } : base;
  });
  return { modules: [...ws.modules, ...added], updatedAt: now };
}
