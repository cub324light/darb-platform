/* ─── «يفتح لك» — فرص القبول الاسترشادية لكل هدف من درجات الطالب ───
   لخطوة الدرجات في التسجيل والتقرير الشخصي. لا يخترع أرقاماً: يشتقّ الحكم من بنوك
   الدرجات القائمة (darbKnowledge) — أدنى طبقةٍ بين الاختبارات الحاكمة للهدف — ثم يطبّق
   «صرامة» الهدف (CPC/طب/ابتعاث أصعب من الجامعة العامة/ITC). كل النتائج إرشادية تعليمية.
   نقيّ وحتمي — لا واجهة، لا IO. */

import {
  getQuduratBand, getTahsiliBand, getStepBand, type BandTier,
} from "../darbKnowledge";

export const OUTLOOK_DISCLAIMER =
  "فرصٌ إرشادية تقريبية — القبول الفعلي بيد الجهات الرسمية وحدوده تُعلن سنوياً.";

export type OutlookIcon = "🟢" | "🟡" | "🔴" | "⚪";

export interface OutlookItem {
  id: string;
  label: string;
  icon: OutlookIcon;        // ⚪ = تحتاج درجةً لتقييمه
  note: string;
  needs?: string[];         // أسماء الاختبارات الناقصة لحساب الفرصة (إن ⚪)
}

export interface OutlookInput {
  targets: string[];              // من resolveGoals (university/aramco/itc/military/scholarship)
  trackType?: string;             // ميل التخصص (صحي/هندسي/حاسب/إداري/عام)
  qudurat?: number | null;
  tahsili?: number | null;
  step?: number | null;           // درجة اللغة (STEP) — وكيل شرط اللغة للابتعاث
}

/* رتبة الطبقة (الأعلى أقوى) — لأخذ الأدنى بين اختبارات الهدف. */
const TIER_RANK: Record<BandTier, number> = { excellent: 4, high: 3, good: 2, fair: 1, low: 0 };

type Exam = "qudurat" | "tahsili" | "step";
type Strictness = "lenient" | "normal" | "strict";

/* عتبات الأيقونة حسب صرامة الهدف: أدنى رتبةٍ لكل لون. */
const THRESHOLD: Record<Strictness, { green: number; yellow: number }> = {
  lenient: { green: TIER_RANK.good, yellow: TIER_RANK.fair }, // جيد+→🟢، مقبول→🟡
  normal:  { green: TIER_RANK.high, yellow: TIER_RANK.good }, // مرتفع+→🟢، جيد→🟡
  strict:  { green: TIER_RANK.excellent, yellow: TIER_RANK.high }, // ممتاز→🟢، مرتفع→🟡
};

const EXAM_LABEL: Record<Exam, string> = { qudurat: "القدرات", tahsili: "التحصيلي", step: "اللغة (STEP)" };

function tierOf(exam: Exam, inp: OutlookInput): BandTier | null {
  const band =
    exam === "qudurat" ? getQuduratBand(inp.qudurat) :
    exam === "tahsili" ? getTahsiliBand(inp.tahsili) :
    getStepBand(inp.step);
  return band?.tier ?? null;
}

/* هدفٌ استرشادي: اسمه، اختباراته الحاكمة، وصرامته. */
interface OutlookTarget { id: string; label: string; exams: Exam[]; strictness: Strictness; }

const LEAN_TARGET: Record<string, OutlookTarget> = {
  "صحي":  { id: "major-health", label: "التخصصات الصحية", exams: ["tahsili", "qudurat"], strictness: "strict" },
  "هندسي": { id: "major-eng", label: "الهندسة", exams: ["qudurat", "tahsili"], strictness: "normal" },
  "حاسب": { id: "major-cs", label: "الحاسب", exams: ["qudurat", "tahsili"], strictness: "normal" },
  "إداري": { id: "major-business", label: "إدارة الأعمال", exams: ["qudurat"], strictness: "lenient" },
  "عام":  { id: "major-arts", label: "التخصصات الأدبية", exams: ["qudurat"], strictness: "lenient" },
};

/* يبني قائمة الأهداف الاسترشادية من الوجهات + ميل التخصص. */
function targetsToOutlook(inp: OutlookInput): OutlookTarget[] {
  const out: OutlookTarget[] = [];
  const t = new Set(inp.targets);
  if (t.has("university")) {
    out.push({ id: "university", label: "الجامعات", exams: ["qudurat"], strictness: "normal" });
    const lean = inp.trackType ? LEAN_TARGET[inp.trackType] : undefined;
    if (lean) out.push(lean);
  }
  if (t.has("aramco")) out.push({ id: "aramco-cpc", label: "أرامكو (CPC)", exams: ["qudurat"], strictness: "strict" });
  if (t.has("itc")) out.push({ id: "aramco-itc", label: "مسار ITC", exams: ["qudurat"], strictness: "lenient" });
  if (t.has("military")) out.push({ id: "military", label: "الكليات العسكرية", exams: ["qudurat"], strictness: "normal" });
  if (t.has("scholarship")) out.push({ id: "scholarship", label: "الابتعاث", exams: ["tahsili", "step"], strictness: "strict" });
  return out;
}

/** فرص القبول الاسترشادية لكل هدف من درجات الطالب. */
export function admissionOutlook(inp: OutlookInput): OutlookItem[] {
  return targetsToOutlook(inp).map((tg) => {
    /* أدنى طبقةٍ بين اختبارات الهدف الحاكمة؛ أي اختبارٍ بلا درجة = ناقص. */
    const missing: string[] = [];
    let minRank = Infinity;
    for (const ex of tg.exams) {
      const tier = tierOf(ex, inp);
      if (tier == null) { missing.push(EXAM_LABEL[ex]); continue; }
      minRank = Math.min(minRank, TIER_RANK[tier]);
    }
    if (missing.length) {
      return { id: tg.id, label: tg.label, icon: "⚪", note: `أدخل درجة ${missing.join(" و")} لتقييم فرصتك.`, needs: missing };
    }
    const th = THRESHOLD[tg.strictness];
    const icon: OutlookIcon = minRank >= th.green ? "🟢" : minRank >= th.yellow ? "🟡" : "🔴";
    const note = icon === "🟢" ? "فرصتك قوية" : icon === "🟡" ? "فرصتك متوسطة — رفع درجتك يقرّبك" : "تحتاج رفع درجتك لهذا الهدف";
    return { id: tg.id, label: tg.label, icon, note };
  });
}
