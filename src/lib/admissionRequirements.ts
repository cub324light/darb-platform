/* ─── شروط جميع الفرص (Admission Requirements) — مصدر الحقيقة الوحيد ───
   ملفٌ واحد يحوي الحد الأدنى المطلوب لكل فرصة. «يفتح لك» يعتمد عليه بالكامل، فلا تتكرّر
   أي أرقام في المشروع. الحكم يعتمد على شرط كل فرصة — لا على التقدير العام (S/A):
   قد يحصل الطالب على درجةٍ عالية عموماً ويبقى CPC أحمر لأنه لم يبلغ ٩٠.

   نوع البوابة:
   • hard = بوابةُ أهلية (برامج كأرامكو CPC/ITC): مستوفٍ 🟢 أو غير مستوفٍ 🔴 — لا «قريب».
   • soft = قبولٌ تنافسي (تخصصات/جامعات/ابتعاث): 🟢 مستوفٍ · 🟡 قريب (فارقٌ بسيط) · 🔴 بعيد.

   الأرقام إرشادية تقريبية — القبول الفعلي وحدوده تُعلن سنوياً عبر الجهات الرسمية. */

import { n } from "./format";

export type ReqExam = "qudurat" | "tahsili" | "step";
export type GateType = "hard" | "soft";

export interface OppRequirement {
  id: string;
  label: string;
  gate: GateType;
  reqs: Partial<Record<ReqExam, number>>; // الحد الأدنى لكل اختبارٍ يحكم الفرصة
}

/* الفارق الذي يُعتبر «قريباً» (أصفر) للبوابات التنافسية فقط. */
export const NEAR_MARGIN = 3;

export const ADMISSION_REQUIREMENTS_DISCLAIMER =
  "الشروط إرشادية تقريبية — القبول الفعلي وحدوده تُعلن سنوياً عبر الجهات الرسمية.";

/* ── مصدر الحقيقة الوحيد لكل الشروط ── */
export const ADMISSION_REQUIREMENTS: OppRequirement[] = [
  { id: "university",     label: "الجامعات",          gate: "soft", reqs: { qudurat: 70 } },
  { id: "kfupm",          label: "جامعة البترول",     gate: "hard", reqs: { qudurat: 85, step: 50 } },
  { id: "major-health",   label: "التخصصات الصحية",   gate: "soft", reqs: { tahsili: 90 } },
  { id: "major-eng",      label: "الهندسة",           gate: "soft", reqs: { qudurat: 85 } },
  { id: "major-cs",       label: "الحاسب",            gate: "soft", reqs: { qudurat: 85 } },
  { id: "major-business", label: "إدارة الأعمال",     gate: "soft", reqs: { qudurat: 75 } },
  { id: "cpc",            label: "أرامكو (CPC)",      gate: "hard", reqs: { qudurat: 90 } },
  { id: "itc",            label: "مسار ITC",          gate: "hard", reqs: { qudurat: 72 } },
  { id: "military",       label: "الكليات العسكرية",  gate: "soft", reqs: { qudurat: 75 } },
  { id: "scholarship",    label: "الابتعاث",          gate: "soft", reqs: { step: 80 } },
];

const BY_ID = new Map(ADMISSION_REQUIREMENTS.map((r) => [r.id, r]));
export const requirementById = (id: string): OppRequirement | undefined => BY_ID.get(id);

const EXAM_LABEL: Record<ReqExam, string> = { qudurat: "القدرات", tahsili: "التحصيلي", step: "STEP" };

export type OppStatus = "met" | "near" | "unmet" | "unknown";
export type OppIcon = "🟢" | "🟡" | "🔴" | "⚪";
export interface OppOutcome { status: OppStatus; icon: OppIcon; reason: string; needs?: ReqExam[]; }

const ICON: Record<OppStatus, OppIcon> = { met: "🟢", near: "🟡", unmet: "🔴", unknown: "⚪" };
const RANK: Record<"met" | "near" | "unmet", number> = { met: 0, near: 1, unmet: 2 }; // الأسوأ يغلب

const pointsWord = (d: number): string => (d === 1 ? "درجة واحدة" : d === 2 ? "درجتان" : `${n(d)} درجات`);

export type Scores = Partial<Record<ReqExam, number | null>>;

/** يقيّم فرصةً على درجات الطالب حسب شرطها — لا حسب التقدير العام. */
export function evaluate(req: OppRequirement, scores: Scores): OppOutcome {
  const reqExams = Object.keys(req.reqs) as ReqExam[];
  const scored = reqExams.filter((e) => scores[e] != null && !Number.isNaN(scores[e] as number));
  if (scored.length === 0) {
    return { status: "unknown", icon: "⚪", reason: `أدخل درجة ${reqExams.map((e) => EXAM_LABEL[e]).join(" و")} لتقييم فرصتك.`, needs: reqExams };
  }

  /* حالة كل اختبارٍ محكوم؛ الأسوأ يقود اللون. */
  let worst: "met" | "near" | "unmet" = "met";
  let worstExam: ReqExam = scored[0];
  let worstShortfall = 0;
  for (const e of scored) {
    const need = req.reqs[e]!;
    const got = scores[e] as number;
    let st: "met" | "near" | "unmet";
    if (got >= need) st = "met";
    else {
      const shortfall = need - got;
      st = req.gate === "hard" ? "unmet" : (shortfall <= NEAR_MARGIN ? "near" : "unmet");
    }
    if (st !== "met" && RANK[st] >= RANK[worst]) { worst = st; worstExam = e; worstShortfall = need - got; }
    else if (worst === "met" && st !== "met") { worst = st; worstExam = e; worstShortfall = need - got; }
  }

  if (worst === "met") {
    const parts = scored.map((e) => `${EXAM_LABEL[e]} (${n(req.reqs[e]!)}+)`);
    return { status: "met", icon: ICON.met, reason: `استوفيت ${scored.length > 1 ? "شروط" : "شرط"} ${parts.join(" و")}` };
  }
  if (worst === "near") {
    return { status: "near", icon: ICON.near, reason: `ينقصك ${pointsWord(worstShortfall)} تقريباً في ${EXAM_LABEL[worstExam]}` };
  }
  return { status: "unmet", icon: ICON.unmet, reason: `تحتاج رفع ${EXAM_LABEL[worstExam]} إلى ${n(req.reqs[worstExam]!)}+` };
}
