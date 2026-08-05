/* ═══════════ سجلُّ المراحل — المصدر الوحيد للحقيقة ═══════════
   ▸ العطل الذي أُغلق: لم يكن في المشروع محرّكُ انتقالٍ إطلاقاً. كان السُّلّمُ
     الثانويُّ وحدَه يترقّى (`gradeProgression`)، وما عداه إمّا **مستحيلٌ في
     الواجهة** (خريج ← جامعي: لا سبيلَ إلا `resetAll()` الذي يمحو كلَّ شيء)
     وإمّا غيرُ موجود. وحدثان مسجَّلان (`UniversityPhaseEntered` ·
     `CareerPhaseEntered`) بمُتفاعِلاتٍ كاملةٍ في الذاكرة — ولا مُطلِقَ لهما.

   ▸ هذا الملفُّ هو **المكان الواحد**. كلُّ ما يعرفه النظامُ عن مرحلةٍ مكتوبٌ في
     مدخلها: كيف تُحفَظ في ملفّ الطالب · إلى أين يجوز الانتقال منها · أتلقائيّةٌ
     هي بالتقويم أم بإعلانٍ من الطالب · أيّ حدثِ مَعلَمٍ ترافقها · جسرُها إلى
     وحدات المسار والذاكرة · وما تسمح به من قدرات.

   ▸ إضافةُ مرحلةٍ مستقبلاً (مبتعث · دبلوم · ماجستير · دكتوراه · موظّف …)
     **مدخلٌ واحدٌ في `PHASE_REGISTRY` ولا شيء غيره**. و`PhaseId` يشتقّ نفسَه من
     المصفوفة، فلا قائمةَ ثانيةٌ تُنسى.

   ▓ حدُّ الصدق: هذا مكانٌ واحدٌ **للانتقال والصلاحيات**. وفي المشروع تصنيفاتٌ
     أخرى للمرحلة سبقت هذا المحرّك (`Stage` في `experience` · `PersonaKey` ·
     `BoardStage` · `EduStage`)، ومرحلةٌ جديدةٌ قد تحتاج مدخلاً فيها إن أردتَ لها
     شخصيةً أو منهجاً. توحيدُها إعادةُ هيكلةٍ خارج نطاق هذا المحرّك، وهي مسجَّلةٌ
     دَيناً. ويحرس اختبارُ اتّساقٍ ألّا يتفرّق هذا السجلُّ عن `phaseExperience`. */

import type { BoardStage } from "../examEligibility";
import type { EduStage } from "../memory/types";

/** ما تسمح به المرحلة — البوابةُ الواحدة بدل شروطٍ مكرّرةٍ في الصفحات. */
export type PhaseCapability =
  | "school"            // مقعدُ المدرسة: المنهجُ والواجباتُ والجدولُ المدرسيّ
  | "secondary-study"   // خطّةُ الثانوية: قدرات/تحصيلي وجلساتُهما
  | "admission"         // عالمُ القبول: الموزونة والمقارنة والتقديم
  | "uni-life"          // الحياةُ الجامعية: المعدّل والساعات والفصل
  | "career";           // ما بعد التخرّج: السيرة والتدريب والوظيفة

/** كيف تُكتب المرحلةُ في `DarbUser` — الحقولُ الثلاثةُ وحدَها لا غير. */
export interface PhaseProfile {
  studyLevel?: "ثانوي" | "جامعي" | "خريج";
  grade?: string;
  gradStage?: string;
}

export interface PhaseDef {
  readonly id: string;
  readonly label: string;
  /** ما يُكتب في الملفّ. والغائبُ هنا **يُمسَح** من الملفّ عند الانتقال. */
  readonly profile: PhaseProfile;
  /** المراحلُ التي يجوز الانتقالُ إليها — وما عداها مرفوض. */
  readonly next: readonly string[];
  /** `calendar`: يترقّى بالتقويم الدراسيّ · `declare`: بإعلانٍ صريحٍ من الطالب. */
  readonly advance: "calendar" | "declare";
  /** حدثُ المَعلَم القائم الذي يُطلَق عند **الدخول** إلى هذه المرحلة (إن وُجد). */
  readonly milestone?: "UniversityPhaseEntered" | "CareerPhaseEntered";
  /** الجسرُ إلى وحدات المسار (`coreModulesForStage`) — `null` حين لا تقابلها مرحلة. */
  readonly boardStage: BoardStage | null;
  /** الجسرُ إلى الذاكرة (`educationalStage`). */
  readonly eduStage: EduStage;
  readonly allows: readonly PhaseCapability[];
}

/* ─── المراحلُ الستّ اليوم. إضافةُ سابعةٍ: مدخلٌ هنا ولا شيء غيره. ───
   `as const` ليشتقّ `PhaseId` نفسَه من المصفوفة، ثم تُصدَّر موسَّعةً للقراءة
   (`as const` وحدَه يضيّق `next`/`profile` تضييقاً يمنع القراءة العامّة). */
const REGISTRY = [
  {
    id: "hs-1", label: "أول ثانوي",
    profile: { studyLevel: "ثانوي", grade: "أول ثانوي" },
    next: ["hs-2"], advance: "calendar",
    boardStage: "first", eduStage: "secondary",
    allows: ["school", "secondary-study"],
  },
  {
    id: "hs-2", label: "ثاني ثانوي",
    profile: { studyLevel: "ثانوي", grade: "ثاني ثانوي" },
    next: ["hs-3"], advance: "calendar",
    boardStage: "second", eduStage: "secondary",
    allows: ["school", "secondary-study"],
  },
  {
    id: "hs-3", label: "ثالث ثانوي",
    profile: { studyLevel: "ثانوي", grade: "ثالث ثانوي" },
    /* الترقيةُ بالتقويم تُخرجه خرّيجاً؛ والقبولُ قد يصله وهو في ثالثٍ بعدُ،
       فيُعلن انتقالَه بنفسه. الطريقان مسموحان — والقرارُ له في كليهما. */
    next: ["grad-hs", "university"], advance: "calendar",
    boardStage: "third", eduStage: "secondary",
    allows: ["school", "secondary-study", "admission"],
  },
  {
    id: "grad-hs", label: "خريج ثانوي",
    profile: { studyLevel: "خريج", gradStage: "خريج ثانوي" },
    next: ["university"], advance: "calendar",
    boardStage: "graduate", eduStage: "general",
    allows: ["secondary-study", "admission"],
  },
  {
    id: "university", label: "طالب جامعي",
    profile: { studyLevel: "جامعي" },
    next: ["grad-uni"], advance: "declare",
    milestone: "UniversityPhaseEntered",
    boardStage: "university", eduStage: "university",
    allows: ["uni-life"],
  },
  {
    id: "grad-uni", label: "خريج جامعة",
    profile: { studyLevel: "خريج", gradStage: "خريج جامعة" },
    /* ▓ «موظّف» مرحلةٌ لم تُضَف: لا يوجد في المشروع حقلُ توظيفٍ ولا سؤالٌ عنه،
       فإضافتُها الآن اختلاقُ إشارةٍ لا نملكها. والبنيةُ جاهزةٌ لها: `EduStage`
       فيها `career`، و`CareerPhaseEntered` يُطلَق هنا فعلاً (وهو حرفياً «دخل
       مرحلة العمل» في سجلّ الأحداث). فمتى وُجد الحقلُ صار المدخلُ سطراً. */
    next: [], advance: "declare",
    milestone: "CareerPhaseEntered",
    boardStage: "graduate", eduStage: "career",
    allows: ["career"],
  },
] as const satisfies readonly PhaseDef[];

/** معرّفُ المرحلة — يشتقّ نفسَه من السجلّ، فلا قائمةَ ثانيةٌ تُنسى. */
export type PhaseId = (typeof REGISTRY)[number]["id"];

/** السجلُّ للقراءة — قائمةٌ واحدةٌ أعلاه، وهذا وجهُها العامّ. */
export const PHASE_REGISTRY: readonly PhaseDef[] = REGISTRY;

const BY_ID = new Map<string, PhaseDef>(PHASE_REGISTRY.map((p) => [p.id, p]));

export function phaseDef(id: string): PhaseDef | undefined {
  return BY_ID.get(id);
}

export const ALL_PHASE_IDS: readonly PhaseId[] = REGISTRY.map((p) => p.id);
