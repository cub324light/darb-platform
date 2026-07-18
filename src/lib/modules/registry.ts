/* ─── سجل الوحدات (Registry) — التعريف الثابت للوحدات العليا وأعضائها ───
   مصدر الحقيقة لِـ«ما هي البطاقات، أيّها Core، أيّها مجموعة، وكيف تُربط بالأهلية».
   لا حالة هنا — الحالة في نسخ Workspace. نقيّ وحتمي. */

import type { BoardStage, ExamBoardId } from "../examEligibility";
import type { ModuleId, ExamMemberId, ModuleKind, ModuleShape, ModuleCategory } from "./types";

export interface ModuleDef {
  id: ModuleId;
  kind: ModuleKind;
  shape: ModuleShape;
  category: ModuleCategory;
  label: string;
  icon: string;
  color: string;
  coreForStages?: BoardStage[]; // المراحل التي تكون فيها Core (تُنشأ تلقائياً)
  boardIds?: ExamBoardId[];     // للقياس المفرد فقط — جسر examEligibility
  memberIds?: ExamMemberId[];   // للمجموعة فقط — كتالوج الأعضاء
}

export interface MemberDef {
  id: ExamMemberId;
  parent: ModuleId;             // الوحدة المجموعة التي ينتمي إليها
  category: ModuleCategory;     // language | program
  label: string;
  color: string;
}

/* الوحدات العليا (بطاقات الصفحة الرئيسية). */
export const MODULE_DEFS: ModuleDef[] = [
  /* Core — تلقائية بالمرحلة، لا تُحذف ولا تظهر في «+ إضافة». (المدرسة أُخرجت من مساري
     نهائياً — قسمها الخاص /school، والمواد تُجلب من نظام المنهج.) */
  { id: "university", kind: "core", shape: "single", category: "university", label: "الجامعة", icon: "🎓", color: "#2563EB", coreForStages: ["university"] },

  /* Optional مفردة — قياس القبول (أهليتها من examEligibility) */
  { id: "qudurat", kind: "optional", shape: "single", category: "qiyas", label: "القدرات",  icon: "🧠", color: "#8B5CF6", boardIds: ["qudurat"] },
  { id: "tahsili", kind: "optional", shape: "single", category: "qiyas", label: "التحصيلي", icon: "🧪", color: "#3B82F6", boardIds: ["tahsiliEarly", "tahsiliRegular"] },

  /* Optional مجموعة — بطاقة واحدة تحوي أعضاءً (فلا تكبر الصفحة) */
  { id: "english",  kind: "optional", shape: "group", category: "language", label: "اللغة الإنجليزية", icon: "🇬🇧", color: "#10B981", memberIds: ["step", "ielts", "toefl", "duolingo"] },
  { id: "programs", kind: "optional", shape: "group", category: "program",  label: "برامج القبول",     icon: "🏢", color: "#F97316", memberIds: ["aramco", "itc"] },
];

/* أعضاء الوحدات المجموعة. */
export const MEMBER_DEFS: MemberDef[] = [
  { id: "step",     parent: "english", category: "language", label: "STEP",     color: "#10B981" },
  { id: "ielts",    parent: "english", category: "language", label: "IELTS",    color: "#EF4444" },
  { id: "toefl",    parent: "english", category: "language", label: "TOEFL",    color: "#F59E0B" },
  { id: "duolingo", parent: "english", category: "language", label: "Duolingo", color: "#EC4899" },
  { id: "aramco",   parent: "programs", category: "program", label: "أرامكو",   color: "#06B6D4" },
  { id: "itc",      parent: "programs", category: "program", label: "ITC",      color: "#F97316" },
];

const MODULE_BY_ID = new Map(MODULE_DEFS.map((d) => [d.id, d]));
const MEMBER_BY_ID = new Map(MEMBER_DEFS.map((d) => [d.id, d]));

export function moduleDef(id: ModuleId): ModuleDef {
  const d = MODULE_BY_ID.get(id);
  if (!d) throw new Error(`وحدة غير معروفة: ${id}`);
  return d;
}

export function memberDef(id: ExamMemberId): MemberDef {
  const d = MEMBER_BY_ID.get(id);
  if (!d) throw new Error(`عضو غير معروف: ${id}`);
  return d;
}

export const isCore = (id: ModuleId): boolean => moduleDef(id).kind === "core";
export const isGroup = (id: ModuleId): boolean => moduleDef(id).shape === "group";

/* الوحدة المجموعة الأمّ لعضوٍ ما (english/programs). */
export const parentModuleOf = (member: ExamMemberId): ModuleId => memberDef(member).parent;

/* وحدات Core لمرحلة معيّنة — تُنشأ تلقائياً. */
export function coreModulesForStage(stage: BoardStage): ModuleId[] {
  return MODULE_DEFS.filter((d) => d.kind === "core" && d.coreForStages?.includes(stage)).map((d) => d.id);
}

/* كتالوج الوحدات العليا الاختيارية (قدرات/تحصيلي/english/programs). */
export const OPTIONAL_MODULES: ModuleId[] = MODULE_DEFS.filter((d) => d.kind === "optional").map((d) => d.id);
