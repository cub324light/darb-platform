/* ─── الهوية الدراسية (Student Persona) — من هو المستخدم فعلاً ───
   الصفحة الرئيسية تُبنى على الهوية لا المرحلة فقط: أول ثانوي ≠ ثالث ≠ جامعي مستجد
   ≠ متخرّج. دالة نقيّة حتمية تشتقّ الهوية من حقولٍ حقيقية موجودة (لا اختراع):
   - المرحلة الدقيقة: صفوف الثانوي (stageOf) · سنة الجامعي (uniStage) · نوع الخريج (gradStage).
   - التوجّه (tilt): جامعة (goals.university/major) · شركة/أرامكو (cpcTarget/itcTarget · مسارات CPC/ITC).
   لا تكرّر قواعد المراحل — تستهلك computeStudentPhase/stageOf/uniStage القائمة.

   تنبيه صدق: «التوجّه» tilt لا هويةٌ حصرية — لأن cpcTarget/itcTarget مجرّد درجاتٍ
   مستهدفة، والطالب قد يكون جامعيّ-التوجّه وأرامكو-التوجّه معاً. الهوية الحصرية
   «شركة مستهدفة» تحتاج حقل onboarding صريحاً (غير موجود بعد). */
import type { DarbUser, DarbGoals } from "./storage";
import { computeStudentPhase, type StudentPhase } from "./phase";
import { stageOf } from "./darbKnowledge";
import { uniStage } from "./uniJourney";
import type { TrackId } from "./tracks";

export type PersonaKey =
  | "hs-first" | "hs-second" | "hs-third"
  | "uni-fresh" | "uni-mid" | "uni-senior"
  | "grad-hs" | "grad-uni";

/* التوجّه الغالب — للانحياز (tilt) لا للاستبدال الحصري */
export type Orientation = "university" | "company" | "exam" | "none";

export interface StudentPersona {
  key: PersonaKey;
  label: string;
  phase: StudentPhase;
  orientation: Orientation;
  /** إشارة أرامكو/CPC-ITC — تُضيف مسار الشركة بجانب القبول (لا تُلغيه) */
  companyFocus: boolean;
}

const LABEL: Record<PersonaKey, string> = {
  "hs-first": "أول ثانوي",
  "hs-second": "ثاني ثانوي",
  "hs-third": "ثالث ثانوي",
  "uni-fresh": "جامعي مستجدّ",
  "uni-mid": "جامعي",
  "uni-senior": "جامعي قرب التخرّج",
  "grad-hs": "خريج ثانوي",
  "grad-uni": "خريج جامعة",
};

export function studentPersona(user?: DarbUser | null, goals?: DarbGoals | null): StudentPersona {
  const phase = computeStudentPhase(user);
  const g = goals ?? {};
  const tracks: TrackId[] = user?.activeTracks?.length ? user.activeTracks : (user?.track ? [user.track] : []);
  const studyGoals = user?.goals ?? [];

  const companyFocus =
    g.cpcTarget != null || g.itcTarget != null ||
    tracks.includes("CPC") || tracks.includes("ITC");
  const uniFocus =
    !!(g.university || g.major || g.majorId || g.universityId) ||
    studyGoals.includes("university") || studyGoals.includes("major");
  const examFocus =
    g.quduratTarget != null || g.tahsiliTarget != null || g.stepTarget != null;

  const orientation: Orientation =
    uniFocus ? "university" : companyFocus ? "company" : examFocus ? "exam" : "none";

  let key: PersonaKey;
  if (phase === "university") {
    const s = uniStage(user?.universityYear, user?.creditHoursCompleted);
    key = s === "senior" ? "uni-senior" : s === "mid" ? "uni-mid" : "uni-fresh";
  } else if (phase === "graduate") {
    key = user?.gradStage === "خريج جامعة" ? "grad-uni" : "grad-hs";
  } else {
    const st = stageOf(user);
    key = st === "ثالث ثانوي" ? "hs-third" : st === "ثاني ثانوي" ? "hs-second" : "hs-first";
  }

  return { key, label: LABEL[key], phase, orientation, companyFocus };
}
