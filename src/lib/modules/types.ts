/* ─── نظام الوحدات (Modules) — أنواع أساسية ───
   مساري = مساحة عملٍ يجمّعها الطالب من وحداتٍ مستقلة. كل وحدةٍ مساحةُ عملٍ كاملة
   (تقدّم/خطة/ملاحظات/درجات/ملفات/إحصائيات/آخر نشاط)؛ البطاقة في الصفحة الرئيسية
   مجرّد مدخلٍ إليها. الوحدات الكبيرة (اللغة/البرامج) بطاقةٌ واحدة تحوي أعضاءً
   بتقدّمٍ مستقل — فالصفحة لا تكبر. نقيّ تماماً — لا اعتماد على TrackId/activeTracks. */

/* الوحدات العليا (بطاقات الصفحة الرئيسية). لا تكبر: اللغة والبرامج مجموعتان. */
export type ModuleId =
  | "school" | "university"  // Core — تلقائية بالمرحلة
  | "qudurat" | "tahsili"    // Optional مفردة — قياس القبول
  | "english"                // Optional مجموعة — أعضاؤها اختبارات اللغة
  | "programs";              // Optional مجموعة — أعضاؤها برامج القبول

/* أعضاء الوحدات المجموعة — اختباراتٌ داخل بطاقةٍ واحدة، لكلٍّ تقدّمه. */
export type ExamMemberId =
  | "step" | "ielts" | "toefl" | "duolingo" // أعضاء اللغة الإنجليزية
  | "aramco" | "itc" | "niti";              // أعضاء برامج القبول

export type ModuleKind = "core" | "optional";

/* شكل الوحدة: مفردة (مساحتها الخاصة) · مجموعة (تحوي أعضاءً كلٌّ بتقدّمه). */
export type ModuleShape = "single" | "group";

/* فئة الوحدة — لبناء «+ إضافة» الهرمي ولقواعد الأهلية. */
export type ModuleCategory = "school" | "university" | "qiyas" | "language" | "program";

/* ─── طبقة Module State — القيم الستّ (قرار المالك) ───
   «غير مضاف» حالةُ الكتالوج فقط؛ ما في مساري يحمل واحدةً من الخمس الباقية. */
export type ModuleState =
  | "not-added" | "added" | "active" | "paused" | "completed" | "needs-retake";

export const MODULE_STATE_LABEL: Record<ModuleState, string> = {
  "not-added": "غير مضاف",
  "added": "مضاف",
  "active": "نشط",
  "paused": "متوقف",
  "completed": "مكتمل",
  "needs-retake": "يحتاج إعادة",
};

/* عضو داخل وحدة مجموعة (اختبار لغة/برنامج) — حالةٌ وتقدّمٌ مستقلّان. */
export interface ModuleMember {
  id: ExamMemberId;
  state: ModuleState;      // ليست «not-added» (وجوده = مضاف على الأقل)
  progress: number;        // 0..100
  score?: string;          // آخر درجة (نصّ خام)
  lastActivityAt?: number;
}

/* نسخة وحدة عليا داخل مساري. المجموعة تحمل members؛ المفردة تحمل progress/score. */
export interface ModuleInstance {
  id: ModuleId;
  kind: ModuleKind;
  state: ModuleState;      // ليست «not-added»
  progress: number;        // المفردة: تقدّمها · المجموعة: مشتقٌّ من الأعضاء
  order: number;           // ترتيب البطاقة في الصفحة الرئيسية
  hidden: boolean;         // إخفاء اختياري (Core لا يُخفى)
  priority?: boolean;      // ثبّته الطالب كأولوية
  lastActivityAt?: number; // آخر نشاط (ms)
  score?: string;          // المفردة فقط — آخر درجة مسجّلة
  members?: ModuleMember[]; // المجموعة فقط — الأعضاء المُضافون
}
