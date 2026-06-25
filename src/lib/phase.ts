/* ─── Phase Engine: الفصل المنطقي بين مراحل الطالب ───
   مصدر القرار الواحد — لا تتحقق من studyLevel مباشرة في المكوّنات أو المحركات.
   كل نظام (دويرب، اللوحة، المسار الذهبي، التوصيات) يستهلك computeStudentPhase.

   المراحل الثلاث:
   • secondary  — ثانوي (أول/ثاني/ثالث): عالمه قدرات/تحصيلي/موزونة/قبول.
   • graduate   — خريج ثانوي/جامعة: مرحلة انتقالية (استدراك أو قبول).
   • university — جامعي: عالمه معدل/تخرج/تدريب/مشاريع/شهادات/سوق عمل.

   قاعدة أساسية:
   - الجامعي لا يرى أبداً: قدرات/تحصيلي/الموزونة/قبول الجامعات/حساب فرص القبول.
   - الثانوي لا يرى أبداً: المعدل الجامعي/الساعات/التدريب التعاوني/مشاريع التخرج. */
import type { DarbUser } from "./storage";

export type StudentPhase = "secondary" | "university" | "graduate";

/* ════════ الحساب الأساسي ════════ */
export function computeStudentPhase(u: DarbUser | null | undefined): StudentPhase {
  if (!u) return "secondary";
  if (u.studyLevel === "جامعي") return "university";
  if (u.studyLevel === "خريج") return "graduate";
  return "secondary"; // ثانوي أو غير محدد
}

/* اختصارات للاستهلاك السريع */
export const isSecondaryPhase  = (u?: DarbUser | null) => computeStudentPhase(u) === "secondary";
export const isUniversityPhase = (u?: DarbUser | null) => computeStudentPhase(u) === "university";
export const isGraduatePhase   = (u?: DarbUser | null) => computeStudentPhase(u) === "graduate";

/* ════════ SSoT: ما يُحظر على كل مرحلة ════════ */
export const UNIVERSITY_HIDDEN_CONCEPTS = [
  "قدرات", "تحصيلي", "موزونة", "قبول جامعي", "قياس", "معدل الثانوية",
  "نسبة الثانوية", "تحصيلي الدراسي",
] as const;

export const SECONDARY_HIDDEN_CONCEPTS = [
  "معدل جامعي", "ساعات معتمدة", "تدريب تعاوني", "تدريب صيفي",
  "مشروع تخرج", "سوق عمل", "دراسات عليا",
] as const;

/* ════════ التسمية العربية للمرحلة ════════ */
export function phaseLabel(phase: StudentPhase): string {
  switch (phase) {
    case "secondary":  return "ثانوي";
    case "university": return "جامعي";
    case "graduate":   return "خريج";
  }
}
