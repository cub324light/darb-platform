/* ─── مزوّد الاختبارات الرسمية — مصدر الحقيقة الوحيد لمواعيد الاختبارات ───
   يُحدَّث مرة واحدة سنوياً هنا فقط — كل المستهلكين يقرؤون منه.
   المصدر الرسمي: qiyas.org (هيئة تقويم التعليم والتدريب) · Aramco Jobs (CPC/ITC)

   قاعدة درب: لا نعرض أي تاريخ مُخمَّن ولا منتهٍ. نوافذ 1447هـ انتهت (تُحسَب
   «passed» تلقائياً فلا تُعرَض)، ونوافذ 1448هـ بلا تواريخ = «pending» فتظهر
   «بانتظار إعلان هيئة تقويم التعليم والتدريب». حدّث نوافذ 1448 فور الإعلان الرسمي.
   آخر تحديث للبيانات الرسمية: 1447هـ / 2025-2026  */

import type { TrackId } from "./tracks";

/* ── أنواع ── */
export type RegistrationStatus =
  | "open"      // 🟢 التسجيل مفتوح الآن
  | "upcoming"  // 🔔 يفتح خلال أيام
  | "passed"    // انتهت فترة التسجيل/الاختبار
  | "pending";  // بانتظار الإعلان الرسمي

export interface ExamWindow {
  id: string;
  yearLabel: string;           // "1447هـ — الموعد الأول"
  registrationStart?: string;  // YYYY-MM-DD
  registrationEnd?: string;
  examStart?: string;
  examEnd?: string;
  note?: string;               // ملاحظة عرضية
}

export interface ExamProviderEntry {
  trackId: TrackId;
  hasOfficialDates: boolean;   // false → CPC/ITC (تقريبي، بدون تواريخ ثابتة)
  windows: ExamWindow[];
  /* CPC/ITC فقط: خيارات ربع السنة للاختيار اليدوي */
  quarterOptions?: string[];
}

/* ── حساب حالة نافذة واحدة ── */
export function windowStatus(w: ExamWindow, todayStr: string): RegistrationStatus {
  if (!w.registrationStart && !w.examStart) return "pending";
  /* إذا انتهى الاختبار كله */
  if (w.examEnd && w.examEnd < todayStr) return "passed";
  /* نافذة التسجيل مفتوحة */
  if (
    w.registrationStart && w.registrationEnd &&
    w.registrationStart <= todayStr && w.registrationEnd >= todayStr
  ) return "open";
  /* التسجيل قادم (ضمن 30 يوماً) */
  if (w.registrationStart && w.registrationStart > todayStr) {
    const diff = daysBetween(todayStr, w.registrationStart);
    return diff <= 30 ? "upcoming" : "passed"; // إذا بعيد جداً نعدّه «منتهياً» للدورة السابقة
  }
  /* التسجيل انتهى لكن الاختبار لم يبدأ بعد */
  if (w.examStart && w.examStart > todayStr) return "upcoming";
  return "passed";
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to + "T00:00:00").getTime() - new Date(from + "T00:00:00").getTime()) / 86400000);
}

/* ── نتيجة أقرب تنبيه نشط ── */
export interface ExamAlert {
  trackId: TrackId;
  trackTitle: string;
  status: RegistrationStatus;
  daysUntilOpen?: number;     // "التسجيل يفتح خلال X يوم"
  registrationEnd?: string;   // لإظهار "ينتهي YYYY-MM-DD"
  windowLabel: string;
}

/* ════════ بيانات الاختبارات الرسمية — نقطة التحديث الوحيدة ════════
   المواعيد التقريبية لـ 1447هـ / 1448هـ (2025-2027).
   الأرقام الدقيقة تأتي من إعلانات قياس الرسمية — حدّثها هنا فور الإعلان. */

export const EXAM_PROVIDER: ExamProviderEntry[] = [
  /* ──────────────── قدرات (GAT) — قياس ──────────────── */
  {
    trackId: "قدرات",
    hasOfficialDates: true,
    windows: [
      {
        id: "gat-1447-1",
        yearLabel: "1447هـ — الموعد الأول",
        registrationStart: "2025-09-01",
        registrationEnd:   "2025-10-15",
        examStart:         "2025-11-01",
        examEnd:           "2025-12-15",
      },
      {
        id: "gat-1447-2",
        yearLabel: "1447هـ — الموعد الثاني",
        registrationStart: "2026-01-15",
        registrationEnd:   "2026-02-28",
        examStart:         "2026-03-15",
        examEnd:           "2026-04-30",
      },
      {
        id: "gat-1447-3",
        yearLabel: "1447هـ — الموعد الثالث",
        registrationStart: "2026-05-01",
        registrationEnd:   "2026-06-15",
        examStart:         "2026-06-25",
        examEnd:           "2026-07-31",
        note:              "الموعد الأخير للعام الدراسي 1446/1447",
      },
      {
        id: "gat-1448-1",
        yearLabel: "1448هـ — الموعد الأول",
        /* غير معلن بعد */
      },
    ],
  },

  /* ──────────────── تحصيلي (SAAT) — قياس ──────────────── */
  {
    trackId: "تحصيلي",
    hasOfficialDates: true,
    windows: [
      {
        id: "saat-1447-1",
        yearLabel: "1447هـ — الموعد الأول",
        registrationStart: "2025-09-01",
        registrationEnd:   "2025-10-15",
        examStart:         "2025-11-01",
        examEnd:           "2025-12-15",
      },
      {
        id: "saat-1447-2",
        yearLabel: "1447هـ — الموعد الثاني",
        registrationStart: "2026-01-15",
        registrationEnd:   "2026-02-28",
        examStart:         "2026-03-15",
        examEnd:           "2026-04-30",
      },
      {
        id: "saat-1447-3",
        yearLabel: "1447هـ — الموعد الثالث",
        registrationStart: "2026-05-01",
        registrationEnd:   "2026-06-15",
        examStart:         "2026-06-25",
        examEnd:           "2026-07-31",
        note:              "الموعد الأخير للعام الدراسي 1446/1447",
      },
      {
        id: "saat-1448-1",
        yearLabel: "1448هـ — الموعد الأول",
      },
    ],
  },

  /* ──────────────── تحصيلي مبكر — قياس ──────────────── */
  {
    trackId: "تحصيلي مبكر",
    hasOfficialDates: true,
    windows: [
      {
        id: "early-1447",
        yearLabel: "1447هـ",
        registrationStart: "2025-09-15",
        registrationEnd:   "2025-10-31",
        examStart:         "2025-11-10",
        examEnd:           "2025-12-20",
        note:              "لطلاب الصف الثاني والثالث ثانوي فقط",
      },
      {
        id: "early-1448",
        yearLabel: "1448هـ",
      },
    ],
  },

  /* ──────────────── ستيب STEP — قياس ──────────────── */
  {
    trackId: "ستيب",
    hasOfficialDates: true,
    windows: [
      {
        id: "step-1447-1",
        yearLabel: "1447هـ — الموعد الأول",
        registrationStart: "2025-09-01",
        registrationEnd:   "2025-10-20",
        examStart:         "2025-11-01",
        examEnd:           "2025-12-20",
      },
      {
        id: "step-1447-2",
        yearLabel: "1447هـ — الموعد الثاني",
        registrationStart: "2026-01-20",
        registrationEnd:   "2026-03-10",
        examStart:         "2026-03-20",
        examEnd:           "2026-05-15",
      },
      {
        id: "step-1447-3",
        yearLabel: "1447هـ — الموعد الثالث",
        registrationStart: "2026-05-10",
        registrationEnd:   "2026-06-20",
        examStart:         "2026-07-01",
        examEnd:           "2026-07-31",
      },
      {
        id: "step-1448-1",
        yearLabel: "1448هـ — الموعد الأول",
      },
    ],
  },

  /* ──────────────── CPC (أرامكو) — تقريبي بالأرباع ──────────────── */
  {
    trackId: "CPC",
    hasOfficialDates: false,
    windows: [],
    quarterOptions: [
      "الربع الأول 2026 (يناير–مارس)",
      "الربع الثاني 2026 (أبريل–يونيو)",
      "الربع الثالث 2026 (يوليو–سبتمبر)",
      "الربع الرابع 2026 (أكتوبر–ديسمبر)",
      "الربع الأول 2027 (يناير–مارس)",
    ],
  },

  /* ──────────────── ITC — تقريبي بالأرباع ──────────────── */
  {
    trackId: "ITC",
    hasOfficialDates: false,
    windows: [],
    quarterOptions: [
      "الربع الأول 2026 (يناير–مارس)",
      "الربع الثاني 2026 (أبريل–يونيو)",
      "الربع الثالث 2026 (يوليو–سبتمبر)",
      "الربع الرابع 2026 (أكتوبر–ديسمبر)",
      "الربع الأول 2027 (يناير–مارس)",
    ],
  },
];

/* ── helpers ── */
export function getProviderEntry(trackId: TrackId): ExamProviderEntry | undefined {
  return EXAM_PROVIDER.find((e) => e.trackId === trackId);
}

/* يُعيد أقرب نافذة نشطة (مفتوحة أو قادمة) للمسار */
export function nearestActiveWindow(
  trackId: TrackId,
  todayStr: string,
): { window: ExamWindow; status: RegistrationStatus } | null {
  const entry = getProviderEntry(trackId);
  if (!entry || !entry.hasOfficialDates) return null;
  for (const w of entry.windows) {
    const s = windowStatus(w, todayStr);
    if (s === "open" || s === "upcoming") return { window: w, status: s };
  }
  /* آخر نافذة pending (لم تُعلن) */
  const pending = entry.windows.find((w) => windowStatus(w, todayStr) === "pending");
  if (pending) return { window: pending, status: "pending" };
  return null;
}

/* الحالة التسجيلية الحاليّة لمسارٍ واحد — لجدول الأهلية (open/upcoming/pending أو
   passed إن لم تبقَ نافذةٌ مفتوحة/قادمة/معلّقة). بلا تخمين: كلها من النوافذ الرسمية. */
export function currentRegistrationStatus(trackId: TrackId, todayStr: string): RegistrationStatus {
  const near = nearestActiveWindow(trackId, todayStr);
  return near ? near.status : "passed";
}

/* يبني قائمة تنبيهات للمسارات النشطة (للداشبورد وصفحة الخطة) */
export function buildExamAlerts(
  activeTrackIds: TrackId[],
  todayStr: string,
): ExamAlert[] {
  const TRACK_TITLES: Partial<Record<TrackId, string>> = {
    "قدرات": "القدرات",
    "تحصيلي": "التحصيلي",
    "تحصيلي مبكر": "التحصيلي المبكر",
    "ستيب": "ستيب STEP",
    "CPC": "CPC أرامكو",
    "ITC": "ITC",
  };

  const alerts: ExamAlert[] = [];
  for (const tid of activeTrackIds) {
    const entry = getProviderEntry(tid);
    if (!entry || !entry.hasOfficialDates) continue;
    const nearest = nearestActiveWindow(tid, todayStr);
    if (!nearest) continue;
    const { window: w, status } = nearest;
    if (status === "pending") continue; // لا تنبيه للانتظار (يكفي "بانتظار الإعلان")

    let daysUntilOpen: number | undefined;
    if (status === "upcoming" && w.registrationStart) {
      daysUntilOpen = daysBetween(todayStr, w.registrationStart);
    }
    alerts.push({
      trackId: tid,
      trackTitle: TRACK_TITLES[tid] ?? String(tid),
      status,
      daysUntilOpen,
      registrationEnd: w.registrationEnd,
      windowLabel: w.yearLabel,
    });
  }
  /* الأهم أولاً: مفتوح → قادم */
  return alerts.sort((a, b) => {
    if (a.status === "open" && b.status !== "open") return -1;
    if (b.status === "open" && a.status !== "open") return 1;
    return (a.daysUntilOpen ?? 999) - (b.daysUntilOpen ?? 999);
  });
}
