/* ─── تحويل اختيار الهدف الهرمي (التسجيل) → وجهات + ميل تخصص ───
   تصميم المالك: «وش هدفك؟» (جامعة/أرامكو/عسكرية/ابتعاث/ما أدري) ثم أسئلة فرعية شرطية
   (ميل التخصص إن جامعة · CPC/ITC إن أرامكو). هذا الملف نقيّ: يحوّل الاختيار إلى
   المعرّفات التي تستهلكها المحرّكات القائمة (targets → recommendedExams، trackType → الفرص).
   لا واجهة هنا. «ما أدري» حصريّ: لا وجهات، ودرب يحدّدها لاحقاً. */

/* الأهداف الأساسية (متعدّد، عدا «ما أدري» فحصريّ). */
export type PrimaryGoal = "university" | "aramco" | "military" | "scholarship" | "undecided";

/* فرع أرامكو (يظهر عند اختيار أرامكو). */
export type AramcoSub = "cpc" | "itc" | "both";

/* ميل التخصص (يظهر عند اختيار الجامعة، اختياري). */
export type MajorLean = "صحي" | "هندسة" | "حاسب" | "إدارة" | "أدبي" | "undecided";

export interface GoalSelection {
  primary: PrimaryGoal[];
  aramcoSub?: AramcoSub;   // يُقرأ فقط إن كانت أرامكو ضمن primary
  majorLean?: MajorLean;   // يُقرأ فقط إن كانت الجامعة ضمن primary
}

export interface GoalResult {
  targets: string[];       // معرّفات وجهات recommendedExams (university/aramco/itc/military/scholarship)
  trackType?: string;      // نوع المسار (صحي/هندسي/حاسب/إداري/عام) من ميل التخصص
  undecided: boolean;      // اختار «ما أدري» — الوجهة تُحدَّد لاحقاً
}

/* ميل التخصص → trackType القائم (يطابق university.ts/darbKnowledge). أدبي = عام (إنساني). */
const LEAN_TO_TRACKTYPE: Record<Exclude<MajorLean, "undecided">, string> = {
  "صحي": "صحي",
  "هندسة": "هندسي",
  "حاسب": "حاسب",
  "إدارة": "إداري",
  "أدبي": "عام",
};

/** يحوّل اختيار الهدف الهرمي إلى وجهات + ميل تخصص. نقيّ وحتمي. */
export function resolveGoals(sel: GoalSelection): GoalResult {
  const primary = sel.primary ?? [];

  /* «ما أدري» حصريّ: يلغي أي وجهة (درب يحدّد لاحقاً). */
  if (primary.includes("undecided")) {
    return { targets: [], undecided: true };
  }

  const targets = new Set<string>();
  for (const g of primary) {
    if (g === "university") targets.add("university");
    else if (g === "military") targets.add("military");
    else if (g === "scholarship") targets.add("scholarship");
    else if (g === "aramco") {
      const sub = sel.aramcoSub ?? "cpc";
      if (sub === "cpc" || sub === "both") targets.add("aramco");
      if (sub === "itc" || sub === "both") targets.add("itc");
    }
  }

  const trackType =
    primary.includes("university") && sel.majorLean && sel.majorLean !== "undecided"
      ? LEAN_TO_TRACKTYPE[sel.majorLean]
      : undefined;

  return { targets: [...targets], trackType, undecided: false };
}
