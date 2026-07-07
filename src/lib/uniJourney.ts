/* ─── «عالم الطالب الجامعي» — طبقة رحلة نقية (لا تقرأ التخزين ولا الشبكة) ───
   ترجم واقع الطالب الجامعي (فصله + أسبوعه + رحلته حتى الوظيفة) إلى بيانات
   حتمية قابلة للاختبار، فوق محرّكين قائمين لا تكرّرهما:
   ▸ التقويم الدراسي  → resolveCalendar (academicCalendar.ts): الفصل الحالي والفاينل.
   ▸ عالم التخصص      → getMajorWorld (majors.ts): البرامج/الشهادات/الجهات/المسارات.
   كل الأرقام مشتقّة من هذين المصدرين — لا قائمة أدوات جامدة ولا تاريخ مكرَّر. */

import { resolveCalendar } from "./academicCalendar";
import { getMajorWorld } from "./majors";

/* ════════ أدوات تاريخ محلية (تطابق اصطلاح التقويم: منتصف اليوم لثبات الحدود) ════════ */
const DAY = 86_400_000;
function ts(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getTime();
}
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ════════ ١) الفصل الحالي: أين أنا في فصلي الآن؟ ════════ */
export interface SemesterInfo {
  termLabel: string;            // اسم الفصل الحالي
  weekNumber: number;           // رقم الأسبوع داخل الفصل (≥ 1)
  weeksLeft: number;            // الأسابيع المتبقية حتى نهاية الفصل (≥ 0)
  daysToFinals: number | null;  // الأيام لأقرب اختبارات نهائية (null إن لا يوجد قادم)
  finalsLabel: string | null;   // اسم تلك الاختبارات (null إن لا يوجد قادم)
}

/* يعيد معلومات الفصل الحالي، أو null خارج الفصل (إجازة/صيف/بلا بيانات) —
   والمكوّن يعرض حالة الإجازة بدل الأسبوع. المصدر: activePeriods من نوع term. */
export function semesterInfo(now: Date): SemesterInfo | null {
  const snap = resolveCalendar(now);
  if (!snap.hasData) return null;
  const term = snap.activePeriods.find((p) => p.kind === "term");
  if (!term) return null; // خارج الفصل: إجازة أو صيف

  const todayTs = ts(ymd(now));
  const daysElapsed = Math.round((todayTs - ts(term.start)) / DAY);
  const daysToEnd = Math.round((ts(term.end) - todayTs) / DAY);

  return {
    termLabel: term.label,
    weekNumber: Math.max(1, Math.ceil(daysElapsed / 7)),
    weeksLeft: Math.max(0, Math.ceil(daysToEnd / 7)),
    daysToFinals: snap.nextSchoolFinals ? snap.nextSchoolFinals.daysUntil : null,
    finalsLabel: snap.nextSchoolFinals ? snap.nextSchoolFinals.label : null,
  };
}

/* ════════ ٢) التقدّم نحو التخرّج ════════ */
/* إجمالي ساعات تقريبي لخطة البكالوريوس (موسوم «تقريبي» في العرض) */
export const GRAD_TOTAL_HOURS = 132;

export interface GradProgress {
  done: number;      // الساعات المنجزة (مقصوصة إلى [0, total])
  total: number;     // الإجمالي التقريبي
  remaining: number; // المتبقّي (≥ 0)
  pct: number;       // النسبة المئوية مقصوصة إلى [0, 100]
}

export function gradProgress(completed?: number): GradProgress {
  const total = GRAD_TOTAL_HOURS;
  const done = Math.max(0, Math.min(total, Math.round(completed ?? 0)));
  const remaining = total - done;
  const pct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
  return { done, total, remaining, pct };
}

/* ════════ ٣) رحلة «مستقبلك» — ٦ محطات ثابتة مُثراة بعالم التخصص ════════ */
export type JourneyState = "done" | "current" | "upcoming";

export interface JourneyStep {
  year: string;        // عنوان المحطة على الخط الزمني
  title: string;       // ماذا تفعل في هذه المحطة
  detail: string;      // تفصيل سطر واحد (مُثرى من عالم التخصص)
  icon: string;        // أيقونة تضيف معنى
  state: JourneyState; // مشتقّة من السنة الحالية
}

/* ترتيب السنوات الجامعية (universityYear) لاشتقاق حالة كل محطة */
const YEAR_ORDER: Record<string, number> = {
  "الأولى": 1, "الثانية": 2, "الثالثة": 3, "الرابعة": 4, "الخامسة+": 5,
};

/* حالة المحطة: قبل الحالية done · الحالية current · بعدها upcoming.
   سنة مجهولة/غائبة → 0 فلا محطة «حالية» (كل المحطات upcoming) بلا تلفيق. */
function stateFor(order: number, currentOrder: number): JourneyState {
  if (currentOrder === 0) return "upcoming";
  if (order < currentOrder) return "done";
  if (order === currentOrder) return "current";
  return "upcoming";
}

/* أول اسمين من قائمة برامج (لإثراء محطة الأساسيات بلا إطالة) */
function topPrograms(names: { name: string }[], n = 2): string {
  return names.slice(0, n).map((p) => p.name).join("، ");
}

export function buildUniJourney(majorId: string | undefined, currentYear?: string): JourneyStep[] {
  const w = getMajorWorld(majorId);
  const c = currentYear ? (YEAR_ORDER[currentYear] ?? 0) : 0;

  const cert = w.certs[0]?.name ?? "شهادة احترافية معتمدة";
  const company = w.companies[0] ?? "جهة في مجال تخصصك";
  const project = w.projects[0] ?? "مشروع تطبيقي في تخصصك";
  const path = w.careerPaths[0] ?? "أول وظيفة في مجال تخصصك";
  const salary = w.salary ? ` · ${w.salary.entrySar}` : "";

  return [
    { year: "السنة الأولى", title: "تعلّم أساسيات تخصصك", icon: "📚",
      detail: topPrograms(w.programs), state: stateFor(1, c) },
    { year: "السنة الثانية", title: "شهادة احترافية", icon: "📜",
      detail: `ابدأ بـ ${cert}`, state: stateFor(2, c) },
    { year: "السنة الثالثة", title: "تدريب تعاوني", icon: "🤝",
      detail: `تدرّب في ${company}`, state: stateFor(3, c) },
    { year: "السنة الرابعة", title: "مشروع التخرّج", icon: "🛠️",
      detail: project, state: stateFor(4, c) },
    { year: "التخرّج", title: "التخرّج", icon: "🎓",
      detail: "أكملت رحلتك الجامعية — بالتوفيق", state: stateFor(5, c) },
    { year: "أول وظيفة", title: "أول وظيفة", icon: "💼",
      detail: `${path}${salary}`, state: stateFor(6, c) },
  ];
}

/* ════════ ٤) «يساعدك هذا الأسبوع» — مهام سياقية مشتقّة من عالم التخصص ════════ */
export interface WeekTask {
  task: string; // بماذا يساعدك
  via: string;  // الأداة/الطريقة
}

/* تنويه نزاهة موجز يرافق مساعدة الأسبوع — الذكاء للفهم لا للغش */
export const AI_INTEGRITY_NOTE = "استعن بالذكاء للفهم والتنظيم — لا لإنجاز واجبك بدلاً عنك";

/* ٣–٤ عناصر: مهام جامعية عامة + أبرز برنامج تقني للتخصص (لا قائمة أدوات جامدة) */
export function aiThisWeek(majorId: string | undefined): WeekTask[] {
  const w = getMajorWorld(majorId);
  const topProgram = w.programs[0]?.name ?? "أدوات تخصصك";
  const aiTool = w.aiTools[0]?.name ?? "شرح خطوة بخطوة";
  return [
    { task: "تقرير مختبر أو واجب", via: "تنظيم الأفكار والصياغة" },
    { task: "عرض تقديمي (PowerPoint)", via: "بناء الشرائح وتلخيص المحتوى" },
    { task: `فهم ${topProgram}`, via: aiTool },
    { task: "كتابة سيرتك الذاتية", via: "صياغة وتنسيق احترافي" },
  ];
}

/* ════════ ٥) المرحلة الجامعية — اللوحة تتحوّل تلقائياً حسبها ════════
   بداية (سنة أولى/ساعات قليلة) · منتصف (٢-٣) · قرب التخرّج (٤+ أو ساعات عالية).
   لكل مرحلة «خطوتك القادمة» مختلفة، وكل إجراء يقود إلى قسمه في عالم الطالب
   (سيرة→career، STEP→عُدّتك، شركات→عالم تخصصك) — لا معلومة معزولة. */
export type UniStage = "start" | "mid" | "senior";

/* عتبة الساعات التي تُدخِل الطالب مرحلة «قرب التخرّج» ولو تأخّرت سنته المسجّلة */
const SENIOR_HOURS = 100;

export function uniStage(year?: string, completedHours?: number): UniStage {
  const y = year ? (YEAR_ORDER[year] ?? 0) : 0;
  if (y >= 4 || (completedHours ?? 0) >= SENIOR_HOURS) return "senior";
  if (y >= 2) return "mid";
  return "start"; // سنة أولى أو غير محدّدة
}

/* ملاحظة: قرار «أولويات الطالب» صار في العقل المركزي (lifeEngine.ts) الذي تقرأ
   منه كل الصفحات. uniStage يبقى هنا لأنه من إشارات ذلك العقل. */
