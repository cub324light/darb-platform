/* ═══════════════ مذكرة الواجبات — نظامٌ كامل (لا مجرّد To-Do) ═══════════════
   أفضل من المذكرة الورقية: إضافةٌ في أقل من 5 ثوانٍ، مادة، تاريخ تسليم، أولوية،
   إرفاق صورة/ملف، تكرار يومي، تذكير قبل الموعد، «تم»، وترتيبٌ تلقائي حسب التسليم.
   تُقرأ من Life Engine ودويرب ليعرفا ضغط الطالب الحقيقي — لا الاختبارات وحدها.

   تخزينٌ محلي (offline-first) كبقية بيانات درب. نقيّ قدر الإمكان: القراءة/الكتابة
   عبر loadList/saveList، والدوال المساعدة حتمية قابلة للاختبار. */
import { loadList, saveList, localDayKey } from "./storage";

export type HwPriority = "low" | "normal" | "high";
export type HwRepeat = "none" | "daily";

export interface HwAttachment { name: string; dataUrl: string; }

export interface Homework {
  id: string;
  title: string;
  subject?: string;
  due: string;              // YYYY-MM-DD (تاريخ التسليم)
  priority: HwPriority;
  done: boolean;
  createdAt: string;        // ISO
  doneAt?: string;          // ISO
  attachment?: HwAttachment;
  repeat: HwRepeat;         // تكرار الواجبات اليومية
  reminderLeadDays?: number; // تذكير قبل الموعد بـ n يوم
}

const KEY = "darb_homework";

export function loadHomework(): Homework[] {
  return loadList<Homework>(KEY);
}
export function saveHomework(list: Homework[]): void {
  saveList(KEY, list);
}

const uid = () => `hw_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* الحد الأدنى للإضافة السريعة: عنوان + تسليم — والباقي افتراضاتٌ معقولة */
export interface HwInput {
  title: string;
  subject?: string;
  due?: string;
  priority?: HwPriority;
  attachment?: HwAttachment;
  repeat?: HwRepeat;
  reminderLeadDays?: number;
}

export function makeHomework(input: HwInput, todayKey = localDayKey(new Date())): Homework {
  return {
    id: uid(),
    title: input.title.trim(),
    subject: input.subject?.trim() || undefined,
    due: input.due || todayKey,
    priority: input.priority ?? "normal",
    done: false,
    createdAt: new Date().toISOString(),
    attachment: input.attachment,
    repeat: input.repeat ?? "none",
    reminderLeadDays: input.reminderLeadDays,
  };
}

/* إضافة (تُعيد القائمة الجديدة) — إضافةٌ في أقل من 5 ثوانٍ من الواجهة */
export function addHomework(list: Homework[], input: HwInput): Homework[] {
  if (!input.title.trim()) return list;
  return [...list, makeHomework(input)];
}

export function removeHomework(list: Homework[], id: string): Homework[] {
  return list.filter((h) => h.id !== id);
}

/* «تم الإنجاز» — واجبٌ يوميّ متكرّر يتولّد له نسخةٌ للغد بدل أن يختفي */
export function toggleDone(list: Homework[], id: string, todayKey = localDayKey(new Date())): Homework[] {
  const target = list.find((h) => h.id === id);
  if (!target) return list;
  const nowDone = !target.done;
  let next = list.map((h) => (h.id === id ? { ...h, done: nowDone, doneAt: nowDone ? new Date().toISOString() : undefined } : h));
  if (nowDone && target.repeat === "daily") {
    const tomorrow = addDaysKey(todayKey, 1);
    const exists = next.some((h) => h.repeat === "daily" && h.title === target.title && h.due === tomorrow && !h.done);
    if (!exists) next = [...next, makeHomework({ title: target.title, subject: target.subject, due: tomorrow, priority: target.priority, repeat: "daily", reminderLeadDays: target.reminderLeadDays }, todayKey)];
  }
  return next;
}

/* ── مساعدات التواريخ (مفاتيح YYYY-MM-DD تُقارَن نصّياً) ── */
export function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return localDayKey(dt);
}
const PRIORITY_RANK: Record<HwPriority, number> = { high: 0, normal: 1, low: 2 };

/* ترتيبٌ تلقائي: غير المنجز أولاً، ثم الأقرب تسليماً، ثم الأعلى أولوية */
export function sortHomework(list: Homework[]): Homework[] {
  return [...list].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due !== b.due) return a.due < b.due ? -1 : 1;
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  });
}

export type HwBucket = "overdue" | "today" | "tomorrow" | "upcoming" | "done";
export function bucketOf(h: Homework, todayKey = localDayKey(new Date())): HwBucket {
  if (h.done) return "done";
  const tomorrow = addDaysKey(todayKey, 1);
  if (h.due < todayKey) return "overdue";
  if (h.due === todayKey) return "today";
  if (h.due === tomorrow) return "tomorrow";
  return "upcoming";
}

export interface HwGroup { bucket: HwBucket; label: string; items: Homework[]; }
const BUCKET_LABEL: Record<HwBucket, string> = {
  overdue: "متأخّرة", today: "اليوم", tomorrow: "غداً", upcoming: "قادمة", done: "منجزة",
};
const BUCKET_ORDER: HwBucket[] = ["overdue", "today", "tomorrow", "upcoming", "done"];

export function groupHomework(list: Homework[], todayKey = localDayKey(new Date())): HwGroup[] {
  const sorted = sortHomework(list);
  return BUCKET_ORDER.map((bucket) => ({
    bucket, label: BUCKET_LABEL[bucket],
    items: sorted.filter((h) => bucketOf(h, todayKey) === bucket),
  })).filter((g) => g.items.length > 0);
}

/* واجبات يومٍ محدّد (للربط بالجدول الدراسي: واجبات كل يوم) */
export function dueOn(list: Homework[], dateKey: string): Homework[] {
  return sortHomework(list.filter((h) => !h.done && h.due === dateKey));
}

/* ملخّص الضغط — يقرؤه Life Engine ودويرب (الضغط الحقيقي لا الاختبارات وحدها) */
export interface HwPressure {
  pending: number;
  overdue: number;
  dueToday: number;
  dueTomorrow: number;
  dueSoon: number;       // خلال 3 أيام (غير المتأخّر)
  highPriorityPending: number;
  nextDue: string | null; // أقرب تاريخ تسليمٍ غير منجز
}
export function homeworkPressure(list: Homework[], todayKey = localDayKey(new Date())): HwPressure {
  const pending = list.filter((h) => !h.done);
  const soonEnd = addDaysKey(todayKey, 3);
  const dueSoon = pending.filter((h) => h.due >= todayKey && h.due <= soonEnd).length;
  const nextDue = pending.length ? sortHomework(pending)[0].due : null;
  return {
    pending: pending.length,
    overdue: pending.filter((h) => h.due < todayKey).length,
    dueToday: pending.filter((h) => h.due === todayKey).length,
    dueTomorrow: pending.filter((h) => h.due === addDaysKey(todayKey, 1)).length,
    dueSoon,
    highPriorityPending: pending.filter((h) => h.priority === "high").length,
    nextDue,
  };
}
