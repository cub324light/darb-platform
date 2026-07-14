/* ─── نظام الوحدات (Modules) — أنواع أساسية ───
   العمود الفقري للنظام الجديد: مساري = مساحة عملٍ يجمّعها الطالب من وحداتٍ مستقلة،
   لا «Track» واحد. كل وحدةٍ كيانٌ قائمٌ بذاته له حالةٌ وتقدّمٌ مستقلّان.
   نقيّ تماماً — لا اعتماد على TrackId/activeTracks. */

/* معرّف الوحدة — ثابتٌ مستقل عن TrackId. */
export type ModuleId =
  | "school" | "university"                     // Core — تأتي تلقائياً بالمرحلة
  | "qudurat" | "tahsili"                        // Optional — قياس القبول
  | "step" | "ielts" | "toefl" | "duolingo"      // Optional — اختبارات اللغة
  | "aramco" | "itc" | "niti";                   // Optional — برامج القبول

/* نوع الوحدة: Core (أساسية، تلقائية، لا تُحذف) · Optional (يضيفها الطالب). */
export type ModuleKind = "core" | "optional";

/* فئة الوحدة — لتجميع «+ إضافة» ولقواعد الأهلية (examEligibility). */
export type ModuleCategory = "school" | "university" | "qiyas" | "language" | "program";

/* ─── طبقة Module State — القيم الستّ (قرار المالك #6) ───
   «غير مضاف» حالةُ الكتالوج فقط (لا نسخة في مساري)؛ نسخُ مساري تحمل واحدةً من الخمس الباقية. */
export type ModuleState =
  | "not-added"     // غير مضاف — ليست في مساري
  | "added"         // مضاف — أُنشئت النسخة ولم تبدأ
  | "active"        // نشط — قيد التقدّم
  | "paused"        // متوقف
  | "completed"     // مكتمل
  | "needs-retake"; // يحتاج إعادة

/* أسماء الحالات بالعربية — للعرض في لوحة العمل. */
export const MODULE_STATE_LABEL: Record<ModuleState, string> = {
  "not-added": "غير مضاف",
  "added": "مضاف",
  "active": "نشط",
  "paused": "متوقف",
  "completed": "مكتمل",
  "needs-retake": "يحتاج إعادة",
};

/* نسخة وحدة داخل مساري — الحالة + التقدّم + بيانات لوحة العمل اليومية. */
export interface ModuleInstance {
  id: ModuleId;
  kind: ModuleKind;
  state: ModuleState;      // ليست «not-added» أبداً (وجود النسخة = مضافة على الأقل)
  progress: number;        // 0..100 — يقرؤه Life Engine (لم يبدأ/بدأ/40%/…/انتهى)
  order: number;           // ترتيب العرض في لوحة العمل
  hidden: boolean;         // إخفاء اختياري (Core لا يُخفى)
  priority?: boolean;      // ثبّته الطالب كأولوية (يعلو في الترتيب)
  lastActivityAt?: number; // آخر نشاط (ms) — لعرض «آخر نشاط» وترتيبه
  score?: string;          // آخر درجة مسجّلة (قياس/لغة) — نصّ خام كما يدخله الطالب
}
