/* ─── «يفتح لك» — فرص القبول من شروط كل فرصة (لا من التقدير العام) ───
   محوّلٌ رفيع: يحوّل وجهات الطالب + ميل تخصصه إلى فرصٍ، ويقيّم كلاً منها على درجاته عبر
   المصدر الوحيد للشروط (admissionRequirements). لا أرقام هنا — كلها في ذلك الملف. */

import {
  evaluate, requirementById, ADMISSION_REQUIREMENTS_DISCLAIMER, type Scores, type OppIcon,
} from "../admissionRequirements";

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

/* الوجهات + ميل التخصص → معرّفات الفرص المعروضة (بالترتيب). */
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

/** فرص القبول لكل هدفٍ من درجات الطالب — الحكم من شرط كل فرصة (admissionRequirements). */
export function admissionOutlook(inp: OutlookInput): OutlookItem[] {
  const scores: Scores = { qudurat: inp.qudurat ?? null, tahsili: inp.tahsili ?? null, step: inp.step ?? null };
  const out: OutlookItem[] = [];
  for (const id of outlookReqIds(inp)) {
    const req = requirementById(id);
    if (!req) continue;
    const o = evaluate(req, scores);
    out.push({ id, label: req.label, icon: o.icon, note: o.reason });
  }
  return out;
}
