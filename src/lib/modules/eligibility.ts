/* ─── جسر الأهلية — examEligibility هو القيد الوحيد (قرار المالك #4 و #8) ───
   دورُه فقط: يسمح/يمنع الإضافة ويشرح السبب. لا يُنشئ وحدةً أبداً — الإنشاء في
   Workspace وحده عند ضغط الطالب «+». يجسر examBoard (جدول القياس) بنوافذ examProvider
   بلا تكرار للجدول، ويُطبّق قواعد اللغة/البرامج. نقيّ وحتمي (today نصّي). */

import { examBoard, type BoardStage, type ExamBoardEntry, type ExamMode } from "../examEligibility";
import { currentRegistrationStatus } from "../examProvider";
import { moduleDef } from "./registry";
import type { ModuleId } from "./types";

/* سياق الأهلية — مشتقٌّ من الملف + اليوم. */
export interface EligibilityContext {
  stage: BoardStage;
  isUniGrad?: boolean;      // خريج جامعة — لا قياس إطلاقاً
  afterFirstTerm?: boolean; // تجاوزنا الفصل الأول؟ (قاعدة تحصيلي ثاني ثانوي المبكر)
  isTargeted?: boolean;     // له وجهة قبول/تجهيز مبكر
  today: string;            // YYYY-MM-DD
}

/* جدول القياس للطالب — examBoard مغذّىً بنوافذ examProvider (لا تكرار للجدول).
   أسماء الاختبارات حرفيّةٌ (تطابق أسماء examProvider) لإبقاء هذه الطبقة بلا أي رمز Track. */
export function boardEntries(ctx: EligibilityContext): ExamBoardEntry[] {
  return examBoard({
    stage: ctx.stage,
    isUniGrad: ctx.isUniGrad,
    afterFirstTerm: ctx.afterFirstTerm,
    isTargeted: ctx.isTargeted,
    windows: {
      qudurat: currentRegistrationStatus("قدرات", ctx.today),
      tahsiliEarly: currentRegistrationStatus("تحصيلي مبكر", ctx.today),
      tahsiliRegular: currentRegistrationStatus("تحصيلي", ctx.today),
    },
  });
}

/* قرار الإضافة — يسمح/يمنع + السبب + (للقياس) الاسم المعروض وحالة النافذة. */
export interface AddDecision {
  allowed: boolean;
  reason?: string;   // سبب المنع (عربي) — يُعرَض للطالب
  label?: string;    // الاسم المعروض عند الإتاحة (قياس: «التحصيلي المبكر»/«التحصيلي»)
  mode?: ExamMode;   // حالة نافذة القياس عند الإتاحة
}

/* سبب منع اختبار القياس — رسائل مقتضبة مؤرّضة بجدول examEligibility. */
function qiyasDenyReason(id: ModuleId, ctx: EligibilityContext): string {
  if (ctx.stage === "university" || ctx.isUniGrad) return "خارج مرحلة اختبارات القياس";
  if (id === "qudurat" && ctx.stage === "first") return "تبدأ من ثاني ثانوي — ابنِ أساسك المدرسي الآن";
  if (id === "tahsili" && ctx.stage === "first") return "يبدأ من ثالث ثانوي (والمبكر من ثاني ثانوي إن كنت مستهدَفاً)";
  if (id === "tahsili" && ctx.stage === "second") return "التحصيلي المبكر يظهر بعد الفصل الأول إن كنت مستهدَفاً ونافذته مفتوحة";
  return "بانتظار فتح النافذة أو خارج مرحلتك الآن";
}

/* القرار الوحيد: هل يجوز إضافة هذه الوحدة الآن؟ ولماذا لا. لا يُنشئ شيئاً. */
export function canAddModule(id: ModuleId, ctx: EligibilityContext): AddDecision {
  const def = moduleDef(id);

  // Core لا يُضاف يدوياً — جزءٌ أصيل من المرحلة
  if (def.kind === "core") return { allowed: false, reason: "وحدة أساسية — مضافة تلقائياً لمرحلتك" };

  switch (def.category) {
    case "qiyas": {
      const match = boardEntries(ctx).find((e) => def.boardIds?.includes(e.id));
      if (match) return { allowed: true, label: match.label, mode: match.mode };
      return { allowed: false, reason: qiyasDenyReason(id, ctx) };
    }
    case "language":
      // اللغة بلا تقييد صفّي وبلا حدّ (قرار المالك) — متاحة لكل المراحل
      return { allowed: true };
    case "program":
      // برامج القبول (أرامكو/ITC/NITI): لمرحلة القبول فقط — ثالث ثانوي أو خريج ثانوي
      if ((ctx.stage === "third" || ctx.stage === "graduate") && !ctx.isUniGrad) return { allowed: true };
      return { allowed: false, reason: "لمرحلة القبول (ثالث ثانوي أو خريج)" };
    default:
      return { allowed: false, reason: "غير متاحة" };
  }
}
