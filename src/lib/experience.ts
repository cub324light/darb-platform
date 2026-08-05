/* ─── تجربة المرحلة: مصدر الحقيقة الواحد لما يراه الطالب حسب مرحلته ───
   دالة نقيّة حتمية واحدة phaseExperience(u) تُجمّع كل قرارات «ما يظهر لهذه
   المرحلة» في مخرَج واحد يستهلكه أي نظام (التسجيل/التنقل/دويرب/اللوحة) بدل
   تكرار شروط studyLevel/grade المتناثرة في المكوّنات.

   القاعدة: لا نعرّف قواعد صفوف جديدة هنا — نستهلك أهلية darbKnowledge
   (canTakeQudurat/…/canTakeStep/canApplyUniversity/stageOf) ومرحلة phase.ts
   (computeStudentPhase/isUniversityPhase). أي تغيير في القواعد يبقى في مصدره. */
import type { DarbUser } from "./storage";
import { computeStudentPhase, isUniversityPhase, isUniversityGraduate, type StudentPhase } from "./phase";
import { canApplyUniversity, stageOf } from "./darbKnowledge";

/* مرحلة الطالب الدقيقة: صفوف الثانوي الثلاثة + جامعي + خريج */
export type Stage = "first" | "second" | "third" | "university" | "graduate";

export interface PhaseExperience {
  stage: Stage;
  stageLabel: string;                 // التسمية العربية للمرحلة (من الصف + المرحلة)
  phase: StudentPhase;                 // secondary | university | graduate (من phase.ts)
  /* القبول: أول/ثاني ثانوي → استكشاف تعريفي · ثالث/خريج → مفاضلة وتقديم · جامعي → مخفي */
  admission: "hidden" | "explore" | "full";
  showsUniLife: boolean;              // الجامعي فقط: جدول/معدل/مواد/مهنة
  /** العنصر الأوسط في التنقل — **المصدر الوحيد** الذي يقرؤه الشريطان معاً. */
  navMid: "roadmap" | "admission" | "uni-tools" | "skills";
  duwairbHint: string;                // اقتراح دويرب الافتتاحي — مختلف لكل مرحلة
}

const STAGE_LABEL: Record<Stage, string> = {
  first: "أول ثانوي",
  second: "ثاني ثانوي",
  third: "ثالث ثانوي",
  university: "طالب جامعي",
  graduate: "خريج",
};

/* الصف الثانوي → مفتاح المرحلة (يستهلك stageOf من darbKnowledge — لا يكرّر قواعد الصفوف).
   ثانوي بلا صف محدّد يُعامَل كأول ثانوي: الأكثر تحفّظاً (لا تحصيلي، القبول استكشافي). */
function stageKey(u: DarbUser | null | undefined, phase: StudentPhase): Stage {
  if (phase === "university") return "university";
  if (phase === "graduate") return "graduate";
  switch (stageOf(u)) {
    case "ثاني ثانوي": return "second";
    case "ثالث ثانوي": return "third";
    default: return "first";
  }
}

/* اقتراح دويرب الافتتاحي لكل مرحلة (أمثلة المالك الحرفية) — الخريج حسب استدراكه */
function hintFor(stage: Stage, u?: DarbUser | null): string {
  switch (stage) {
    case "first":  return "ابنِ أساسك المدرسي وعاداتك الدراسية من الآن — القدرات تبدأ من ثاني ثانوي.";
    case "second": return "القدرات والتحصيلي المبكر يخلّونك تسبق دفعتك.";
    case "third":  return "نحسب نسبتك الموزونة ونرتّب رغباتك للقبول.";
    case "university": return "جهّز سيرتك الذاتية وقدّم على التدريب الصيفي.";
    case "graduate":
      return u?.gapYear
        ? "سنة استدراكك فرصة لرفع القدرات والتحصيلي قبل القبول."
        : "نرتّب أوراقك ونقارن فرص قبولك في الجامعات.";
  }
}

/** يبني تجربة المرحلة الكاملة للطالب — نقطة الدخول الموحّدة لكل واجهة/نظام. */
export function phaseExperience(u?: DarbUser | null): PhaseExperience {
  const phase = computeStudentPhase(u);
  const stage = stageKey(u, phase);

  /* القبول: الجامعي وخريج الجامعة خرجا منه · ثالث/خريج ثانوي مفاضلة كاملة ·
     أول/ثاني استكشاف تعريفي. canApplyUniversity يطابق منطق showsUniversityUI. */
  const admission: PhaseExperience["admission"] =
    phase === "university" || isUniversityGraduate(u) ? "hidden"
    : canApplyUniversity(u) ? "full"
    : "explore";

  /* ▓ العنصرُ الأوسط — كان معرَّفاً هنا **ولا يقرؤه أحد**، بينما يكتب كلُّ شريطٍ
     منطقَه بيده. فتفرّقا: ثالثُ ثانويّ يرى «مساري» على جواله و«القبول الجامعي»
     على حاسبه — الشريطُ الجانبيّ يوافق هذا التعريف والشريطُ السفليّ يخالفه.
     صار هذا هو المصدر الوحيد، ويقرؤه الشريطان معاً (يحرسه اختبار).
     وأُكمل: خريجُ الجامعة كان يسقط إلى «مساري» هنا وكلا الشريطين يعطيه
     «مهاراتي» — فصار التعريفُ يقول ما يفعله المنتجُ فعلاً. */
  const navMid: PhaseExperience["navMid"] =
    isUniversityPhase(u) ? "uni-tools"
    : isUniversityGraduate(u) ? "skills"
    : canApplyUniversity(u) ? "admission"
    : "roadmap";

  return {
    stage,
    stageLabel: STAGE_LABEL[stage],
    phase,
    admission,
    showsUniLife: phase === "university",
    navMid,
    duwairbHint: hintFor(stage, u),
  };
}
