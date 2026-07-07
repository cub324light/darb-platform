/* ─── شبكة القرارات (Decision layer) — «أفضل معلومة لهذا الطالب الآن» ───
   الشبكة لا تعرض المعلومة الأفضل عموماً، بل الأنسب لهذا الطالب في هذه اللحظة.
   هنا الطبقة التي تعيد ترتيب كل شيء حسب إشاراته الحقيقية:

   • الأولوية (Priority): المعدّل + المرحلة + التدريب تحدّد ما يهمّ الآن — طالب
     متعثّر أولويّته رفع المعدّل لا الشهادات؛ ومتميّز أولويّته البحث والدراسات
     العليا لا رفع المعدّل. (إشارات حقيقية: universityGpa / uniStage / coopDone.)
   • التاريخ (History): ما ضغطه الطالب كثيراً يهبط — نتوقّف عن تكرار ما رآه.
     (سلوك الطالب نفسه، لا تخمين.)

   الطبقات القادمة (أوزان صريحة لكل طالب، وثقة من مهارات مُعلَنة، وتنبّؤ) تُبنى
   فوق هذه الإشارات نفسها حين تتوفّر مصادرها. دالّات نقيّة بلا أي IO. */
import type { UniStage } from "./uniJourney";

export interface StudentSignals {
  stage: UniStage | null; // null = غير جامعي (لا تنطبق أولوية المعدّل)
  gpa: number | null;     // المعدّل من ٥ (إن أُدخِل)
  coopDone: boolean;      // أنجز التدريب التعاوني
  gradInterest: boolean;  // مهتمّ بالدراسات العليا
}

export type PriorityKey = "gpa" | "training" | "certs" | "research" | "market" | "foundation";

export interface AcademicPriority {
  key: PriorityKey;
  title: string; // العنوان الذي تتحوّل له الشبكة
  why: string;   // سببٌ مختصر بلغة الطالب
}

/* عتبات المعدّل (من ٥) — متعثّر تحت ٢٫٧٥، متميّز من ٤٫٥ فأعلى */
const GPA_STRUGGLING = 2.75;
const GPA_HONORS = 4.5;

/* الأولوية الأكاديمية الواحدة — تعيد ترتيب القرار حسب حالة الطالب (جامعي فقط).
   نقيّة وحتمية: نفس الإشارات ⇒ نفس الأولوية. */
export function academicPriority(s: StudentSignals): AcademicPriority {
  const { stage, gpa, coopDone } = s;

  /* ١) متعثّر → رفع المعدّل يتقدّم على كل شيء (لا شهادات قبل الأساس) */
  if (gpa != null && gpa < GPA_STRUGGLING) {
    return { key: "gpa", title: "ارفع معدّلك أولاً", why: "معدّلك تحت المتوسط — رفعه الآن يفتح لك التدريب والقبول والوظائف لاحقاً." };
  }

  /* ٢) متميّز في منتصف/قرب التخرّج → البحث والدراسات العليا والمنح (لا رفع المعدّل) */
  if (gpa != null && gpa >= GPA_HONORS && (stage === "mid" || stage === "senior")) {
    return { key: "research", title: "ابدأ البحث والدراسات العليا", why: "معدّلك ممتاز — استثمره في بحثٍ ومؤتمرات وتبادل ومنح ودراسات عليا." };
  }

  /* ٣) قرب التخرّج → السوق: السيرة والتقديم */
  if (stage === "senior") {
    return { key: "market", title: "جهّز سيرتك وابدأ التقديم", why: "أنت قريب من التخرّج — السوق يبدأ قبل الشهادة بأشهر." };
  }

  /* ٤) المنتصف → التدريب إن لم يُنجَز، وإلا أول شهادة */
  if (stage === "mid") {
    return coopDone
      ? { key: "certs", title: "ابدأ أول شهادة احترافية", why: "أنجزت تدريبك — الشهادة تثبّت مهارتك وتميّز سيرتك." }
      : { key: "training", title: "قدّم على التدريب التعاوني", why: "المنتصف وقت الخبرة الحقيقية — التدريب يسبق الشهادة." };
  }

  /* ٥) البداية (أو مرحلة غير محدّدة) → الأساس: المعدّل والتنظيم */
  return { key: "foundation", title: "ابنِ أساسك: معدّلك وتنظيمك", why: "أول سنتين تحدّدان فرصك — ابدأ منظّماً وارفع معدّلك من الآن." };
}

/* ── طبقة التاريخ: ما رآه الطالب كثيراً يهبط ── */

/* ترتيب مستقرّ يُنزِل الأكثر مشاهدةً (فرزٌ ثابت لا يقلب المتساويين). عمليٌّ لأي
   عناصر تحمل label. لا يحذف شيئاً — يعيد الترتيب فقط (يبقى كل شيء متاحاً). */
export function rankBySeen<T extends { label: string }>(
  items: T[],
  visits: Record<string, number>,
): T[] {
  return items
    .map((item, i) => ({ item, i, seen: visits[item.label] ?? 0 }))
    .sort((a, b) => a.seen - b.seen || a.i - b.i) // الأقلّ مشاهدةً أولاً، ثم ترتيبها الأصلي
    .map((x) => x.item);
}

/* هل رأى الطالب هذه العقدة كثيراً؟ (عتبة بسيطة لإبراز «تعرفها؟») */
export const SEEN_FAMILIAR = 3;
export function isFamiliar(label: string, visits: Record<string, number>): boolean {
  return (visits[label] ?? 0) >= SEEN_FAMILIAR;
}
