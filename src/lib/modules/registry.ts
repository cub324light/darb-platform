/* ─── سجل الوحدات (Registry) — التعريف الثابت لكل وحدة ───
   مصدر الحقيقة لِـ«ما هي الوحدات، أيّها Core، وكيف تُربط بأهلية القياس».
   لا حالة هنا — الحالة في نسخ Workspace فقط. نقيّ وحتمي. */

import type { BoardStage, ExamBoardId } from "../examEligibility";
import type { ModuleId, ModuleKind, ModuleCategory } from "./types";

export interface ModuleDef {
  id: ModuleId;
  kind: ModuleKind;
  category: ModuleCategory;
  label: string;    // الاسم المعروض (القياس قد يتبدّل وقت العرض: المبكر/العادي عبر examBoard)
  icon: string;
  color: string;    // لون الوحدة في لوحة العمل والبطاقات
  coreForStages?: BoardStage[]; // المراحل التي تكون فيها Core (تُنشأ تلقائياً)
  boardIds?: ExamBoardId[];     // للقياس فقط — جسر examEligibility (التحصيلي: مبكر+عادي)
}

/* التعريفات — Core أولاً، ثم Optional مجمّعةً بالفئة. */
export const MODULE_DEFS: ModuleDef[] = [
  /* ── Core: تأتي تلقائياً بالمرحلة، لا تُحذف ولا تظهر في «+ إضافة» ── */
  { id: "school",     kind: "core", category: "school",     label: "المدرسة", icon: "🏫", color: "#0EA5E9", coreForStages: ["first", "second", "third"] },
  { id: "university", kind: "core", category: "university", label: "الجامعة", icon: "🎓", color: "#2563EB", coreForStages: ["university"] },

  /* ── Optional / قياس القبول: أهليتها من examEligibility ── */
  { id: "qudurat", kind: "optional", category: "qiyas", label: "القدرات",  icon: "🧠", color: "#8B5CF6", boardIds: ["qudurat"] },
  { id: "tahsili", kind: "optional", category: "qiyas", label: "التحصيلي", icon: "🧪", color: "#3B82F6", boardIds: ["tahsiliEarly", "tahsiliRegular"] },

  /* ── Optional / اختبارات اللغة: بلا تقييد صفّي وبلا حدّ عددي ── */
  { id: "step",     kind: "optional", category: "language", label: "STEP",     icon: "🔤", color: "#10B981" },
  { id: "ielts",    kind: "optional", category: "language", label: "IELTS",    icon: "🌐", color: "#EF4444" },
  { id: "toefl",    kind: "optional", category: "language", label: "TOEFL",    icon: "📘", color: "#F59E0B" },
  { id: "duolingo", kind: "optional", category: "language", label: "Duolingo", icon: "🦉", color: "#EC4899" },

  /* ── Optional / برامج القبول: لمرحلة القبول (ثالث ثانوي أو خريج) ── */
  { id: "aramco", kind: "optional", category: "program", label: "أرامكو", icon: "⛽", color: "#06B6D4" },
  { id: "itc",    kind: "optional", category: "program", label: "ITC",    icon: "🖥️", color: "#F97316" },
  { id: "niti",   kind: "optional", category: "program", label: "NITI",   icon: "🛡️", color: "#14B8A6" },
];

const BY_ID = new Map(MODULE_DEFS.map((d) => [d.id, d]));

export function moduleDef(id: ModuleId): ModuleDef {
  const d = BY_ID.get(id);
  if (!d) throw new Error(`وحدة غير معروفة: ${id}`);
  return d;
}

export const isCore = (id: ModuleId): boolean => moduleDef(id).kind === "core";

/* وحدات Core لمرحلة معيّنة — تُنشأ تلقائياً (لا يضيفها الطالب). */
export function coreModulesForStage(stage: BoardStage): ModuleId[] {
  return MODULE_DEFS.filter((d) => d.kind === "core" && d.coreForStages?.includes(stage)).map((d) => d.id);
}

/* كتالوج الوحدات الاختيارية — الأهلية تُحسم لكلٍّ في canAddModule. */
export const OPTIONAL_MODULES: ModuleId[] = MODULE_DEFS.filter((d) => d.kind === "optional").map((d) => d.id);
