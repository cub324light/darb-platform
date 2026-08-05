/* ═══════════ واجهةُ المرحلة للواجهات — الصفحةُ تسأل ولا تقرّر ═══════════
   ▓ القاعدة التي تُثبَّت هنا: **لا صفحةَ ولا مكوّنَ يشتقّ المرحلةَ بنفسه.** لا
     `studyLevel === …` ولا `gradStage === …` ولا `computeStudentPhase` ولا
     `phaseExperience` ولا `isUniversityPhase`. كلُّ إظهارٍ أو إخفاءٍ أو ترتيبٍ
     يأتي من هنا — ومحرّكُ الانتقال هو مصدرُ الحقيقة الوحيد. يحرسها اختبارُ
     مصدرٍ يفحص `src/app` و`src/components` سطراً سطراً.

   ▓ ولماذا **القدرات** لا أسماءُ المراحل؟ لأن الطالب لا يبقى في مرحلته: ثاني
     ثانويّ يصير ثالثاً، وثالثٌ يصير خرّيجاً، وخرّيجٌ يصير جامعياً. فترتيبُ
     الصفحة مبنيٌّ على ما **تمنحه** المرحلةُ من قدرات، فإذا تغيّرت المرحلة تغيّر
     الترتيبُ من نفسه — وإضافةُ مرحلةٍ جديدةٍ لا تُلزم بلمس صفحةٍ واحدة.

   ▓ ولا يعرف هذا الملفُّ من الواجهات شيئاً: يستهلك `experience` (نصُّ اقتراح
     دويرب ومرحلةُ الإعادة) ويشتقّ `navMid` من القدرات — والاتّجاهُ في اتّجاهٍ
     واحدٍ دائماً: الواجهةُ ← المحرّك ← `experience`، فلا دائرة. */

import type { DarbUser } from "../storage";
import { loadUser } from "../storage";
import { phaseExperience, type Stage } from "../experience";
import type { StudentPhase } from "../phase";
import { phaseIdOf, phaseAllows, declarableFrom } from "./engine";
import { phaseDef, type PhaseId, type PhaseCapability } from "./registry";

/** العنصرُ الأوسط في التنقّل — **مشتقٌّ من القدرات** لا من اسم المرحلة. */
export type NavMid = "roadmap" | "admission" | "uni-tools" | "skills";

export interface PhaseView {
  /** معرّفُ المرحلة، أو `null` حين لا تكفي بياناتُ الطالب (لا نخمّن). */
  id: PhaseId | null;
  /** اسمُها كما يراه الطالب. */
  label: string;
  /** السؤالُ الوحيد الذي تسأله الصفحة. */
  allows: (cap: PhaseCapability) => boolean;
  /** المراحلُ التي يجوز للطالب إعلانُ انتقاله إليها الآن. */
  declarable: PhaseId[];
  /** العنصرُ الأوسط في الشريطين — مصدرٌ واحدٌ يقرؤه الاثنان. */
  navMid: NavMid;
  /** اقتراحُ دويرب الافتتاحيّ لهذه المرحلة (نصٌّ من `experience`). */
  duwairbHint: string;
  /** مرحلةُ الإعادة/الأهلية التي تستهلكها لوحةُ الأهداف. */
  stage: Stage;
  /** المرحلةُ الخشنة — تحتاجها إشاراتُ قوس الرحلة وحدَها. */
  phase: StudentPhase;
}

/* القدرةُ تحدّد العنصرَ الأوسط — الأخصُّ أوّلاً. مرحلةٌ جديدةٌ لا تحتاج سطراً
   هنا ما دامت قدراتُها معرَّفةً في السجلّ. */
function navMidFor(allows: (c: PhaseCapability) => boolean): NavMid {
  if (allows("uni-life")) return "uni-tools";
  if (allows("career")) return "skills";
  if (allows("admission")) return "admission";
  return "roadmap";
}

/** يبني عرضَ المرحلة من ملفّ الطالب — نقيٌّ (لا تخزين). */
export function phaseView(u?: DarbUser | null): PhaseView {
  const id = phaseIdOf(u);
  const allows = (cap: PhaseCapability) => phaseAllows(id, cap);
  const exp = phaseExperience(u);
  return {
    id,
    label: (id ? phaseDef(id)?.label : undefined) ?? exp.stageLabel,
    allows,
    declarable: declarableFrom(u),
    navMid: navMidFor(allows),
    duwairbHint: exp.duwairbHint,
    stage: exp.stage,
    phase: exp.phase,
  };
}

/** عرضُ المرحلة للمستخدم الحاليّ — نقطةُ الدخول الوحيدة للواجهات. */
export function currentPhase(): PhaseView {
  return phaseView(typeof window === "undefined" ? null : loadUser());
}
