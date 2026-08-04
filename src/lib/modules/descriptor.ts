/* ─── واصف المحتوى (Content Descriptor) — كيف يُعرض فضاء كل وحدة ───
   القالب الواحد (Module Workspace) لا يعرف شيئاً عن وحدةٍ بعينها؛ يقرأ واصفها من هنا.
   إضافة وحدةٍ مستقبلاً = إضافة تعريفٍ في registry + مدخلٍ هنا، دون لمس القالب أو الصفحة.
   نقيّ تماماً — لا TrackId ولا activeTracks ولا goal. أسماء المواد تطابق نظام المواد
   القائم حرفياً حتى تبقى بيانات الطالب (الدروس/التمارين المخزّنة بالاسم) متّصلة. */

import type { ModuleId, ExamMemberId } from "./types";
import { moduleDef, memberDef, isGroup } from "./registry";
import {
  QUDURAT_GUIDE, TAHSILI_GUIDE, STEP_GUIDE, IELTS_GUIDE, TOEFL_GUIDE,
  DUOLINGO_GUIDE, CPC_GUIDE, ITC_GUIDE, type GuideSection,
} from "./guides";

export interface SubjectDef { name: string; color: string; }

/* شكل فضاء الوحدة داخل القالب:
   study = رحلة التأسيس/التدريب على موادها (اختبارات القياس/اللغة/البرامج).
   hub   = فضاء روابطٍ لعالمٍ قائم (المدرسة/الجامعة) — لا رحلة قياس. */
export type WorkspaceKind = "study" | "hub";

export interface HubLink { label: string; href: string; icon: string; desc?: string; }

export interface ModuleContent {
  kind: WorkspaceKind;
  intro: string;                // جملة تعريف الفضاء (رأس القالب)
  subjects?: SubjectDef[];      // study: المواد — أسماؤها تطابق التخزين لاستمرارية البيانات
  examKey?: string;             // study: مفتاح موعد الاختبار في trackExamDates (توافق مؤقّت مُصنَّف)
  hub?: HubLink[];              // hub: روابط العالم القائم
  guide?: GuideSection[];       // «ابدأ من هنا»: دليلٌ تعريفيٌّ يُعرَض أول تبويب في الوحدة
}

/* ── ألوان المواد (مطابقة لنظام المواد القائم — استمرارية بصرية وبيانات) ── */
const C = {
  verbal: "#8B5CF6", quant: "#10B981",
  bio: "#F59E0B", phys: "#8B5CF6", math: "#10B981", chem: "#EF4444",
  listen: "#8B5CF6", read: "#10B981", write: "#F59E0B", speak: "#EF4444", grammar: "#3B82F6",
  english: "#3B82F6", logic: "#A855F7",
} as const;

const QUDURAT_SUBJECTS: SubjectDef[] = [
  { name: "لفظي", color: C.verbal },
  { name: "كمي", color: C.quant },
];
const TAHSILI_SUBJECTS: SubjectDef[] = [
  { name: "أحياء", color: C.bio },
  { name: "فيزياء", color: C.phys },
  { name: "رياضيات", color: C.math },
  { name: "كيمياء", color: C.chem },
];

/* ── محتوى الوحدات العليا المفردة والمجموعات ──
   المجموعات (english/programs) حاويةٌ لأعضائها — القالب يعرض أعضاءها، لا فضاءً مباشراً. */
const MODULE_CONTENT: Record<ModuleId, ModuleContent> = {
  university: {
    kind: "hub",
    intro: "عالمك الجامعي — معدّلك وتدريبك ومسارك المهني. مرحلة القياس والقبول انتهت.",
    hub: [
      { label: "أدوات الجامعة", href: "/uni-tools", icon: "🎓", desc: "المعدّل والساعات والمواد" },
      { label: "مستقبلي المهني", href: "/future", icon: "🚀", desc: "السيرة والتدريب والشهادات" },
    ],
  },
  qudurat: {
    kind: "study",
    intro: "القدرات العامة — قِس مهارات التفكير الكمي واللفظي، أساس القبول الجامعي.",
    subjects: QUDURAT_SUBJECTS,
    examKey: "قدرات",
    guide: QUDURAT_GUIDE, // «ابدأ من هنا» — الدليل الكامل للقدرات
  },
  tahsili: {
    kind: "study",
    intro: "التحصيلي — يقيس فهمك لمواد الثانوي العلمية، مطلوبٌ للتخصصات العلمية والصحية.",
    subjects: TAHSILI_SUBJECTS,
    examKey: "تحصيلي",
    guide: TAHSILI_GUIDE, // «ابدأ من هنا» — يشمل قسم التحصيلي المبكر
  },
  english: {
    kind: "hub",
    intro: "اختبارات اللغة الإنجليزية — أضِف اختبارك (STEP/IELTS/TOEFL/Duolingo) وتابع تقدّمه.",
  },
  programs: {
    kind: "hub",
    intro: "برامج القبول — أضِف البرنامج (أرامكو/ITC) وتابع متطلباته.",
  },
};

/* ── محتوى أعضاء المجموعات — كلٌّ فضاءُ مذاكرةٍ مستقلٍّ بمواده ── */
const LANG_STEP: SubjectDef[] = [
  { name: "قراءة", color: C.read }, { name: "قواعد", color: C.grammar },
  { name: "استماع", color: C.listen }, { name: "كتابة", color: C.write },
];
const LANG_IELTS: SubjectDef[] = [
  { name: "استماع", color: C.listen }, { name: "قراءة", color: C.read },
  { name: "كتابة", color: C.write }, { name: "محادثة", color: C.speak },
];
const LANG_TOEFL: SubjectDef[] = [
  { name: "قراءة", color: C.read }, { name: "استماع", color: C.listen },
  { name: "محادثة", color: C.speak }, { name: "كتابة", color: C.write },
];
const LANG_DUO: SubjectDef[] = [
  { name: "قراءة", color: C.read }, { name: "كتابة", color: C.write },
  { name: "استماع", color: C.listen }, { name: "محادثة", color: C.speak },
];
const PROG_CPC: SubjectDef[] = [
  { name: "إنجليزي", color: C.english }, { name: "رياضيات", color: C.math },
];
const PROG_ITC: SubjectDef[] = [
  { name: "إنجليزي", color: C.english }, { name: "رياضيات", color: C.math }, { name: "منطق", color: C.logic },
];

const MEMBER_CONTENT: Record<ExamMemberId, ModuleContent> = {
  step:     { kind: "study", intro: "اختبار STEP — إثبات إنجليزي معياري.", subjects: LANG_STEP, examKey: "ستيب", guide: STEP_GUIDE },
  ielts:    { kind: "study", intro: "اختبار IELTS — إثبات إنجليزي دولي.", subjects: LANG_IELTS, examKey: "ايلتس", guide: IELTS_GUIDE },
  toefl:    { kind: "study", intro: "اختبار TOEFL — إثبات إنجليزي دولي.", subjects: LANG_TOEFL, examKey: "توفل", guide: TOEFL_GUIDE },
  duolingo: { kind: "study", intro: "اختبار Duolingo — إثبات إنجليزي سريع.", subjects: LANG_DUO, examKey: "دوليقو", guide: DUOLINGO_GUIDE },
  aramco:   { kind: "study", intro: "برنامج أرامكو (CPC) — تحضير الإنجليزي والرياضيات.", subjects: PROG_CPC, examKey: "CPC", guide: CPC_GUIDE },
  itc:      { kind: "study", intro: "مسار ITC — الإنجليزي والرياضيات والمنطق.", subjects: PROG_ITC, examKey: "ITC", guide: ITC_GUIDE },
};

/* واصف الوحدة العليا — يرمي إن كانت مجموعةً (المجموعة تُعرض بأعضائها، لا بفضاءٍ مباشر). */
export function moduleContent(id: ModuleId): ModuleContent {
  const c = MODULE_CONTENT[id];
  if (!c) throw new Error(`لا محتوى للوحدة: ${id}`);
  return c;
}

/* واصف العضو (اختبار لغة/برنامج). */
export function memberContent(id: ExamMemberId): ModuleContent {
  const c = MEMBER_CONTENT[id];
  if (!c) throw new Error(`لا محتوى للعضو: ${id}`);
  return c;
}

/* هل تفتح هذه الوحدة العليا فضاءً مباشراً (مفردة) أم تعرض أعضاءها (مجموعة)؟ */
export const opensDirectSpace = (id: ModuleId): boolean => !isGroup(id);

/* تجميعة عرضٍ موحّدة: عنوان/أيقونة/لون (من registry) + المحتوى — للقالب والبطاقة. */
export interface ModuleView {
  id: ModuleId;
  label: string;
  icon: string;
  color: string;
  content: ModuleContent;
}
export function moduleView(id: ModuleId): ModuleView {
  const d = moduleDef(id);
  return { id, label: d.label, icon: d.icon, color: d.color, content: moduleContent(id) };
}

export interface MemberView {
  id: ExamMemberId;
  label: string;
  color: string;
  content: ModuleContent;
}
export function memberView(id: ExamMemberId): MemberView {
  const d = memberDef(id);
  return { id, label: d.label, color: d.color, content: memberContent(id) };
}
