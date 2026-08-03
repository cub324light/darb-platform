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
  daysUntil: number;   // من اليوم (≥ 0)
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

/* ════════ دليلُ الجهات الرسمية — روابطُ مصادر، لا أخبار ════════
   ▓ كان اسمُها «آخر التحديثات» ولكلِّ جهةٍ حقلُ `updatedAt` يُعرض في الواجهة —
   وقيمتُه **واحدةٌ مكتوبةٌ بأيدينا لخمستها** (2026-07-01). فكانت الصفحةُ تخبر
   الطالبَ أنّ قياس ووزارة التعليم وأرامكو حدّثت شيئاً في ذلك اليوم، ونحن لم
   نتحقّق قطّ. وقاعدةُ درب: **لا نعرض تاريخاً لم تُعلنه جهةٌ رسمية**.

   فحُذف الحقل. ولا يُعاد إلا بمصدرٍ يُقرأ آلياً — لا برقمٍ يُحدَّث يدوياً ثم
   يُنسى فيصير كذباً بالتقادم. وهذه القائمةُ ما كانت قطُّ إلا دليلَ روابط. */
export interface OfficialUpdate {
  id: string;
  entity: string;      // اسم الجهة
  title: string;       // ملخّص من سطرٍ واحد فقط (لا محتوى منسوخ)
  url: string;         // رابط المصدر الرسمي
}

export const OFFICIAL_UPDATES: OfficialUpdate[] = [
  { id: "qiyas",    entity: "قياس",           title: "مواعيد التسجيل والاختبارات والنتائج", url: "https://www.etec.gov.sa" },
  { id: "moe",      entity: "وزارة التعليم",  title: "بوابة القبول الموحّد وأخبار التعليم",   url: "https://moe.gov.sa" },
  { id: "aramco",   entity: "أرامكو",         title: "برامج CPC وITC والتوظيف",              url: "https://www.aramco.com" },
  { id: "scholar",  entity: "الابتعاث",       title: "برامج الابتعاث الخارجي وشروطها",        url: "https://moe.gov.sa" },
  { id: "military", entity: "القبول العسكري", title: "بوابات القبول العسكري الموحّد",         url: "https://www.moi.gov.sa" },
];

/** دليلُ الجهات الرسمية — بترتيبه المكتوب، فلا ترتيبَ زمنيَّ يُدّعى. */
export function officialUpdates(): OfficialUpdate[] {
  return OFFICIAL_UPDATES;
}
