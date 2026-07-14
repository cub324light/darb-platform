/* ─── جسر الأهلية — examEligibility هو القيد الوحيد ───
   يسمح/يمنع الإضافة ويشرح السبب فقط. لا يُنشئ وحدةً ولا عضواً. يبني قائمة «+ إضافة»
   الهرمية (فئة ← عناصرها) التي تستهلكها الواجهة. يجسر examBoard بنوافذ examProvider
   بلا تكرار. نقيّ وحتمي (today نصّي). */

import { examBoard, type BoardStage, type ExamBoardEntry, type ExamMode } from "../examEligibility";
import { currentRegistrationStatus } from "../examProvider";
import { moduleDef, memberDef, MEMBER_DEFS } from "./registry";
import { hasModule, hasMember, type Workspace } from "./workspace";
import type { ModuleId, ExamMemberId } from "./types";

export interface EligibilityContext {
  stage: BoardStage;
  isUniGrad?: boolean;
  afterFirstTerm?: boolean;
  isTargeted?: boolean;
  today: string; // YYYY-MM-DD
}

/* جدول القياس للطالب — examBoard مغذّىً بنوافذ examProvider. أسماء الاختبارات حرفيّة
   (تطابق examProvider) لإبقاء هذه الطبقة بلا أي رمز Track. */
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

export interface AddDecision {
  allowed: boolean;
  reason?: string;  // سبب المنع (عربي)
  label?: string;   // الاسم عند الإتاحة (قياس: المبكر/العادي)
  mode?: ExamMode;  // حالة النافذة عند الإتاحة
  hint?: string;    // نصّ حالة النافذة (🟢/🔔/⏳)
}

function qiyasDenyReason(id: ModuleId, ctx: EligibilityContext): string {
  if (ctx.stage === "university" || ctx.isUniGrad) return "خارج مرحلة اختبارات القياس";
  if (id === "qudurat" && ctx.stage === "first") return "تبدأ من ثاني ثانوي — ابنِ أساسك المدرسي الآن";
  if (id === "tahsili" && ctx.stage === "first") return "يبدأ من ثالث ثانوي (والمبكر من ثاني ثانوي إن كنت مستهدَفاً)";
  if (id === "tahsili" && ctx.stage === "second") return "التحصيلي المبكر يظهر بعد الفصل الأول إن كنت مستهدَفاً ونافذته مفتوحة";
  return "بانتظار فتح النافذة أو خارج مرحلتك الآن";
}

/* قرار إضافة وحدة عليا مفردة (قدرات/تحصيلي). Core والمجموعات لا تُضاف مباشرةً. */
export function canAddModule(id: ModuleId, ctx: EligibilityContext): AddDecision {
  const def = moduleDef(id);
  if (def.kind === "core") return { allowed: false, reason: "وحدة أساسية — مضافة تلقائياً لمرحلتك" };
  if (def.category === "qiyas") {
    const match = boardEntries(ctx).find((e) => def.boardIds?.includes(e.id));
    if (match) return { allowed: true, label: match.label, mode: match.mode, hint: match.hint };
    return { allowed: false, reason: qiyasDenyReason(id, ctx) };
  }
  // english/programs: تُضاف باختيار عضوٍ من داخلها، لا كوحدةٍ مباشرة
  return { allowed: false, reason: "أضِف اختباراً من داخل الوحدة" };
}

/* قرار إضافة عضو (اختبار لغة/برنامج). اللغة بلا قيد؛ البرامج لمرحلة القبول. */
export function canAddMember(id: ExamMemberId, ctx: EligibilityContext): AddDecision {
  const def = memberDef(id);
  if (def.category === "language") return { allowed: true }; // بلا حدّ ولا تقييد صفّي
  if ((ctx.stage === "third" || ctx.stage === "graduate") && !ctx.isUniGrad) return { allowed: true };
  return { allowed: false, reason: "لمرحلة القبول (ثالث ثانوي أو خريج)" };
}

/* ─── قائمة «+ إضافة» الهرمية: فئة ← عناصرها (لا قائمة طويلة) ─── */
export type AddTarget = { kind: "module"; id: ModuleId } | { kind: "member"; id: ExamMemberId };
export interface AddMenuItem {
  target: AddTarget;
  label: string;
  allowed: boolean;
  reason?: string;      // سبب المنع
  hint?: string;        // حالة النافذة (قياس)
  alreadyAdded: boolean; // موجود في مساري أصلاً
}
export interface AddMenuCategory {
  id: "qiyas" | "language" | "program";
  label: string;
  items: AddMenuItem[];
}

function memberItem(id: ExamMemberId, ws: Workspace, ctx: EligibilityContext): AddMenuItem {
  const d = canAddMember(id, ctx);
  return { target: { kind: "member", id }, label: memberDef(id).label, allowed: d.allowed, reason: d.reason, alreadyAdded: hasMember(ws, id) };
}

/* يبني القائمة الهرمية كاملةً — تستهلكها الواجهة مباشرةً. */
export function buildAddMenu(ws: Workspace, ctx: EligibilityContext): AddMenuCategory[] {
  const qiyasItems: AddMenuItem[] = (["qudurat", "tahsili"] as ModuleId[]).map((id) => {
    const d = canAddModule(id, ctx);
    return { target: { kind: "module", id }, label: d.label ?? moduleDef(id).label, allowed: d.allowed, reason: d.reason, hint: d.hint, alreadyAdded: hasModule(ws, id) };
  });
  const langItems = MEMBER_DEFS.filter((m) => m.category === "language").map((m) => memberItem(m.id, ws, ctx));
  const progItems = MEMBER_DEFS.filter((m) => m.category === "program").map((m) => memberItem(m.id, ws, ctx));
  return [
    { id: "qiyas", label: "اختبارات القبول", items: qiyasItems },
    { id: "language", label: "اختبارات اللغة", items: langItems },
    { id: "program", label: "برامج القبول", items: progItems },
  ];
}
