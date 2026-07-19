/* ─── إشارات الصفحة الرئيسية — منطقٌ نقيّ (قراءةٌ فقط، لا يغيّر أي محرّك) ───
   يجمع «قريباً» (مواعيد رسمية قادمة) و«آخر التحديثات» (روابط الجهات الرسمية) من مصادر
   حقيقية: تقويم الاختبارات (examProvider) + نتائج الطالب المنتظَرة (examResultStatus).
   لا عناوين مختلقة ولا محتوى منسوخ — روابطٌ للمصدر الرسمي وملخّصٌ من سطرٍ واحد. */

import { EXAM_PROVIDER } from "../examProvider";
import { estimateResult, daysBetween, type EstimableExam } from "../onboarding/examResultStatus";

/* ════════ «قريباً» — مواعيد رسمية قادمة فقط ════════ */
export type MilestoneKind = "reg-open" | "reg-close" | "exam" | "result";
export interface Milestone {
  id: string;
  kind: MilestoneKind;
  title: string;       // «فتح تسجيل القدرات» ...
  track: string;       // اسم الاختبار
  date: string;        // YYYY-MM-DD
  daysUntil: number;   // من اليوم (≥ ٠)
}

const KIND_LABEL: Record<MilestoneKind, string> = {
  "reg-open": "فتح التسجيل",
  "reg-close": "إغلاق التسجيل",
  "exam": "موعد الاختبار",
  "result": "إعلان النتيجة",
};
const KIND_ICON: Record<MilestoneKind, string> = { "reg-open": "🟢", "reg-close": "🔴", "exam": "📝", "result": "📣" };
export const milestoneIcon = (k: MilestoneKind): string => KIND_ICON[k];

/* نتيجة الطالب المنتظَرة (من examResultStatus) لبطاقة «إعلان النتيجة المتوقّع». */
export interface PendingLike { exam: "qudurat" | "tahsili" | "step"; mode: "computer" | "paper"; testDate: string; }
const PENDING_TITLE: Record<string, string> = { qudurat: "القدرات", tahsili: "التحصيلي", step: "STEP" };

/** مواعيد رسمية قادمة (خلال الأفق) مرتّبةً بالأقرب — من التقويم + نتائج الطالب المنتظَرة. */
export function upcomingMilestones(input: {
  today: string; horizonDays?: number; pending?: PendingLike[]; limit?: number;
}): Milestone[] {
  const { today, horizonDays = 120, pending = [], limit = 6 } = input;
  const out: Milestone[] = [];

  const push = (kind: MilestoneKind, track: string, date: string | undefined, id: string) => {
    if (!date || date <= today) return;
    const d = daysBetween(today, date);
    if (d < 0 || d > horizonDays) return;
    out.push({ id, kind, title: `${KIND_LABEL[kind]} · ${track}`, track, date, daysUntil: d });
  };

  for (const e of EXAM_PROVIDER) {
    for (const w of e.windows) {
      push("reg-open", e.trackId, w.registrationStart, `${w.id}-ro`);
      push("reg-close", e.trackId, w.registrationEnd, `${w.id}-rc`);
      push("exam", e.trackId, w.examStart, `${w.id}-ex`);
    }
  }
  /* نتائج الطالب المنتظَرة → «إعلان النتيجة المتوقّع» (القدرات/التحصيلي فقط) */
  for (const p of pending) {
    if (p.exam === "step" || !p.testDate) continue;
    const est = estimateResult(p.exam as EstimableExam, p.mode, p.testDate);
    push("result", PENDING_TITLE[p.exam], est.expectedDate, `res-${p.exam}`);
  }

  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out.slice(0, limit);
}

/* ════════ «آخر التحديثات» — روابط الجهات الرسمية المعتمدة فقط ════════
   ليست أخباراً منسوخة: اسم الجهة + ملخّص سطرٍ واحد + تاريخ آخر مراجعة + رابط المصدر الرسمي.
   نقطة التحديث الوحيدة — حدّثها فور تغيّر مصدرٍ رسمي. مرتّبةٌ بالأحدث. */
export interface OfficialUpdate {
  id: string;
  entity: string;      // اسم الجهة
  title: string;       // ملخّص من سطرٍ واحد فقط (لا محتوى منسوخ)
  url: string;         // رابط المصدر الرسمي
  updatedAt: string;   // YYYY-MM-DD — تاريخ آخر مراجعة
}

export const OFFICIAL_UPDATES: OfficialUpdate[] = [
  { id: "qiyas",    entity: "هيئة تقويم التعليم والتدريب (قياس)", title: "مواعيد التسجيل والاختبارات والنتائج", url: "https://www.etec.gov.sa", updatedAt: "2026-07-01" },
  { id: "moe",      entity: "وزارة التعليم",                     title: "بوابة القبول الموحّد وأخبار التعليم",   url: "https://moe.gov.sa",        updatedAt: "2026-07-01" },
  { id: "aramco",   entity: "أرامكو السعودية",                   title: "برامج CPC وITC والتوظيف",              url: "https://www.aramco.com",    updatedAt: "2026-07-01" },
  { id: "scholar",  entity: "الابتعاث (وزارة التعليم)",          title: "برامج الابتعاث الخارجي وشروطها",        url: "https://moe.gov.sa",        updatedAt: "2026-07-01" },
  { id: "military", entity: "الجهات العسكرية",                   title: "بوابات القبول العسكري الموحّد",         url: "https://www.moi.gov.sa",    updatedAt: "2026-07-01" },
];

/** الجهات الرسمية مرتّبةً بالأحدث تحديثاً (فارغةٌ ⇐ «لا توجد تحديثات جديدة حالياً»). */
export function officialUpdates(): OfficialUpdate[] {
  return [...OFFICIAL_UPDATES].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
}
