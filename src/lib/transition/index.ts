/* ═══════════ جسرُ الانتقال — طبقةُ IO رفيعة ═══════════
   المصدرُ الوحيد لتنفيذ أيّ انتقالٍ في المشروع. لا يكتب أحدٌ `studyLevel` أو
   `grade` أو `gradStage` بعد التسجيل إلا من هنا — لا الترقيةُ بالتقويم ولا
   إعلانُ الطالب. (كتابةُ التسجيل الأوّل تبقى في `onboarding`: ذاك إنشاءُ ملفٍّ
   لا انتقالُ مرحلة.)

   الترتيب: احسب ← احفظ ← أضِف وحدات المرحلة ← أطلق الأحداث. والأحداثُ آخرَ
   شيءٍ عمداً: مُتفاعِلُ الذاكرة يقرأ ملفاً محفوظاً لا نصفَ محفوظ. */

import { loadUser, saveUser } from "../storage";
import { currentAcademicYearId } from "../academicCalendar";
import { applyTransition, withCoreForPhase, phaseIdOf, phaseAllows } from "./engine";
import type { PhaseId } from "./registry";

export { PHASE_REGISTRY, ALL_PHASE_IDS, phaseDef } from "./registry";
export type { PhaseId, PhaseCapability, PhaseDef } from "./registry";
export {
  phaseIdOf, phaseAllows, canTransition, declarableFrom, applyTransition, withCoreForPhase,
} from "./engine";
export type { TransitionResult, TransitionEvent } from "./engine";
export { phaseView, currentPhase } from "./view";
export type { PhaseView, NavMid } from "./view";

/**
 * ينقل الطالبَ الحاليَّ إلى مرحلةٍ مسموحة. يعيد `true` إن تمّ.
 * لا يمسّ من بيانات الطالب شيئاً سوى حقول المرحلة — الأهدافُ والأخطاءُ
 * والإحصاءاتُ والجلساتُ والتقدّمُ والذاكرةُ و`Workspace` كلُّها كما هي.
 */
export function transitionTo(to: PhaseId, now: Date = new Date()): boolean {
  if (typeof window === "undefined") return false;
  const u = loadUser();
  if (!u) return false;

  const res = applyTransition(u, to, { yearId: currentAcademicYearId(now) });
  if (!res) return false;

  const ws = res.user.workspace
    ? withCoreForPhase(res.user.workspace, to, now.getTime())
    : undefined;
  saveUser(ws ? { ...res.user, workspace: ws } : res.user);

  /* استيرادٌ ديناميّ كما في بقية مُطلِقي الأحداث — يُبقي محرّكَ الذاكرة خارج
     حزمة كلِّ مستهلكٍ لهذا الملف. وفشلُ الإطلاق لا يُسقط الانتقالَ نفسه. */
  import("../events").then(({ emit }) => {
    for (const ev of res.events) {
      if (ev.type === "StudentPhaseChanged") {
        emit({
          eventType: "StudentPhaseChanged",
          metadata: { from: ev.from, to: ev.to!, studyLevel: ev.studyLevel, grade: ev.grade, clearedGrade: ev.clearedGrade },
          educationalStage: ev.eduStage as never,
          actor: { kind: "student" }, source: "engine",
        });
      } else {
        emit({
          eventType: ev.type,
          metadata: { from: ev.from },
          educationalStage: ev.eduStage as never,
          actor: { kind: "student" }, source: "engine",
        });
      }
    }
  }).catch(() => {});

  return true;
}

/** مرحلةُ المستخدم الحاليّ — اختصارٌ للواجهات. */
export function currentPhaseId(): PhaseId | null {
  return typeof window === "undefined" ? null : phaseIdOf(loadUser());
}

/** البوابةُ الواحدة على المستخدم الحاليّ. */
export function currentPhaseAllows(cap: Parameters<typeof phaseAllows>[1]): boolean {
  if (typeof window === "undefined") return true;
  return phaseAllows(phaseIdOf(loadUser()), cap);
}
