/* ─── «يفتح لك» — فرص القبول من شروط كل فرصة (لا من التقدير العام) ───
   محوّلٌ رفيع: يحوّل وجهات الطالب + ميل تخصصه إلى فرصٍ، ويقيّم كلاً منها على درجاته عبر
   المصدر الوحيد للشروط (admissionRequirements). لا أرقام هنا — كلها في ذلك الملف.
   يضيف طبقة عرضٍ خفيفة: ترتيبٌ بالأهمية، «ماذا لو رفعت درجتك؟»، ومستوى الجاهزية. */

import {
  evaluate, requirementById, ADMISSION_REQUIREMENTS_DISCLAIMER,
  type Scores, type OppIcon, type ReqExam, type OppRequirement,
} from "../admissionRequirements";
import { n } from "../format";

export const OUTLOOK_DISCLAIMER = ADMISSION_REQUIREMENTS_DISCLAIMER;

export type OutlookIcon = OppIcon;
export interface OutlookItem { id: string; label: string; icon: OutlookIcon; note: string; }

export interface OutlookInput {
  targets: string[];              // من resolveGoals (university/aramco/itc/military/scholarship)
  trackType?: string;             // ميل التخصص (صحي/هندسي/حاسب/إداري/عام)
  qudurat?: number | null;
  tahsili?: number | null;
  step?: number | null;
}

/* ميل التخصص (trackType) → فرصة التخصص في ملف الشروط. «عام» بلا فرصةٍ محدّدة. */
const TRACK_MAJOR: Record<string, string> = {
  "صحي": "major-health", "هندسي": "major-eng", "حاسب": "major-cs", "إداري": "major-business",
};

/* وزن الأهمية للطالب (الأعلى أولاً ضمن نفس اللون): الأوسع فالأخصّ.
   الترتيب الكلّي = اللون أولاً (🟢→🟡→🔴) ثم هذا الوزن. */
const IMPORTANCE: Record<string, number> = {
  university: 100, itc: 90, "major-eng": 80, "major-cs": 78, "major-health": 76, "major-business": 74,
  kfupm: 60, military: 55, scholarship: 50, cpc: 40,
};
const STATUS_RANK: Record<OutlookIcon, number> = { "🟢": 0, "🟡": 1, "🔴": 2, "⚪": 3 };

/** ترتيب الفرص بالأهمية للطالب: اللون أولاً ثم الوزن — لا أبجدياً ولا بترتيب الإدخال. */
export function orderOutlook(items: OutlookItem[]): OutlookItem[] {
  return [...items].sort((a, b) =>
    (STATUS_RANK[a.icon] - STATUS_RANK[b.icon]) ||
    ((IMPORTANCE[b.id] ?? 0) - (IMPORTANCE[a.id] ?? 0)));
}

/* الوجهات + ميل التخصص → معرّفات الفرص المعروضة. */
function outlookReqIds(inp: OutlookInput): string[] {
  const ids: string[] = [];
  const t = new Set(inp.targets);
  if (t.has("university")) {
    ids.push("university");
    const m = inp.trackType ? TRACK_MAJOR[inp.trackType] : undefined;
    if (m) ids.push(m);
  }
  if (t.has("aramco")) ids.push("cpc");
  if (t.has("itc")) ids.push("itc");
  if (t.has("military")) ids.push("military");
  if (t.has("scholarship")) ids.push("scholarship");
  return ids;
}

const toScores = (inp: OutlookInput): Scores =>
  ({ qudurat: inp.qudurat ?? null, tahsili: inp.tahsili ?? null, step: inp.step ?? null });

/** فرص القبول لكل هدفٍ من درجات الطالب — الحكم من شرط كل فرصة، مرتّبةً بالأهمية. */
export function admissionOutlook(inp: OutlookInput): OutlookItem[] {
  const scores = toScores(inp);
  const out: OutlookItem[] = [];
  for (const id of outlookReqIds(inp)) {
    const req = requirementById(id);
    if (!req) continue;
    const o = evaluate(req, scores);
    out.push({ id, label: req.label, icon: o.icon, note: o.reason });
  }
  return orderOutlook(out);
}

/* ════════ «ماذا لو رفعت درجتك؟» — من شروط الفرص الفعلية ════════ */
export interface WhatIf { exam: ReqExam; target: number; unlocks: { id: string; label: string }[]; }

/** أقرب عتبةٍ فوق درجة الطالب في اختبارٍ تفتح فرصاً جديدة — بلا أرقامٍ مخترعة (كلها شروط). */
export function whatIfRaise(inp: OutlookInput, exam: ReqExam): WhatIf | null {
  const scores = toScores(inp);
  const current = scores[exam];
  if (current == null || Number.isNaN(current)) return null;

  const ids = outlookReqIds(inp);
  const reqs = ids.map(requirementById).filter((r): r is OppRequirement => !!r);

  /* عتبات هذا الاختبار التي تعلو درجة الطالب حالياً بين فرصه. */
  const higher = reqs
    .map((r) => r.reqs[exam])
    .filter((v): v is number => v != null && v > current);
  if (higher.length === 0) return null;

  const target = Math.min(...higher);            // أقرب عتبةٍ نافعة
  const raised: Scores = { ...scores, [exam]: target };
  const unlocks: { id: string; label: string }[] = [];
  for (const r of reqs) {
    const before = evaluate(r, scores).status;
    const after = evaluate(r, raised).status;
    if (after === "met" && before !== "met") unlocks.push({ id: r.id, label: r.label });
  }
  if (unlocks.length === 0) return null;
  return { exam, target, unlocks };
}

/* ════════ مستوى الجاهزية — بطاقةٌ واحدة في نهاية التقرير ════════ */
export type ReadinessLevel = "ready" | "improve" | "focus";
export interface Readiness { level: ReadinessLevel; icon: "🟢" | "🟡" | "🔴"; title: string; reason: string; }

/** جاهزية الطالب من فرصه المقيَّمة: جاهزٌ (فرصةٌ مستوفاة) · تحسينٌ بسيط (قريب) · تركيز (بعيد). */
export function readiness(items: OutlookItem[]): Readiness | null {
  const scored = items.filter((i) => i.icon !== "⚪");
  if (scored.length === 0) return null;              // بلا درجاتٍ لا نقيّم الجاهزية
  const met = scored.filter((i) => i.icon === "🟢");
  const near = scored.filter((i) => i.icon === "🟡");

  if (met.length >= 1) {
    const reason = met.length === scored.length
      ? "استوفيت شروط كل فرصك الحالية — قدّم بثقة."
      : `جاهزٌ لـ${n(met.length)} من فرصك: ${met.slice(0, 2).map((m) => m.label).join(" و")}${met.length > 2 ? " وغيرها" : ""}.`;
    return { level: "ready", icon: "🟢", title: "جاهز للتقديم", reason };
  }
  if (near.length >= 1) {
    return { level: "improve", icon: "🟡", title: "يحتاج تحسين بسيط", reason: `أنت قريبٌ من ${near[0].label} — رفعٌ بسيط يفتحها لك.` };
  }
  return { level: "focus", icon: "🔴", title: "ركّز أولاً على رفع درجاتك", reason: "درجاتك الحالية دون شروط فرصك — ابدأ برفعها خطوةً خطوة." };
}
