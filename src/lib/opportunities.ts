/* ─── «وش تقدر تقدم عليه؟» — محرّك الفرص (نقي وحتمي، لا IO إطلاقاً) ───
   يصنّف فرص ما بعد الثانوية اعتماداً على بيانات الطالب المُمرَّرة:
   الجامعات (بالموزونة)، الكليات، الابتعاث، الدبلومات التقنية، المنح، والبرامج الحكومية.

   لا يكرّر أي معادلة أو قاعدة تعليمية — يستهلك محرّكات القبول في university.ts
   (computeWeighted/weightedVerdict/gapAnalysis/housingInfo) وقواعد الأهلية
   والنطاقات في darbKnowledge.ts (getStudentPhase، canTakeQudurat، getStepBand...).

   كل المحتوى إرشادي تعليمي — القبول الفعلي بيد الجامعات والجهات الرسمية. */

import type { DarbUser } from "./storage";
import {
  getStudentPhase,
  canTakeQudurat,
  canTakeEarlyTahsili,
  canApplyUniversity,
  getQuduratBand,
  getStepBand,
  type StudentPhase,
} from "./darbKnowledge";
import {
  UNIVERSITIES,
  findUniversity,
  findMajor,
  computeWeighted,
  weightedVerdict,
  requirementsText,
  gapAnalysis,
  housingInfo,
  type UniversityOption,
  type WeightedFormula,
  type AdmissionTrack,
} from "./university";

/* التنويه الثابت — يُعرض أعلى الصفحة ويُعاد استخدامه حيث يلزم */
export const OPPORTUNITIES_DISCLAIMER =
  "كل النتائج استرشادية تعليمية — القبول الفعلي بيد الجامعات والجهات الرسمية.";

/* ════════ الأنواع ════════ */
export interface OpportunityInputs {
  studyLevel?: string;          // ثانوي / جامعي / خريج
  grade?: string;               // أول/ثاني/ثالث ثانوي
  gradStage?: string;           // خريج ثانوي / خريج جامعة
  trackType?: string;           // صحي/هندسي/حاسب/إداري/قانوني/عام
  region?: string;
  highschoolPct?: number | null;
  qudurat?: number | null;
  tahsili?: number | null;
  step?: number | null;
  universityId?: string;        // الوجهة من darb_goals
  majorId?: string;
}

export type OpportunityStatus = "متاح" | "قريب" | "يحتاج شرط";

export interface OpportunityItem {
  id: string;
  title: string;
  status: OpportunityStatus;
  detail: string;
  hint?: string;
  score?: number;                                        // الموزونة المقدّرة (إن حُسبت)
  verdict?: { icon: "🟢" | "🟡" | "🔴"; label: string };  // حكم weightedVerdict
  linkTo?: string;                                       // مسار داخلي ثابت
}

export type OpportunityGroupId =
  | "universities" | "colleges" | "scholarships-abroad"
  | "technical" | "grants" | "gov-programs";

export interface OpportunityGroup {
  id: OpportunityGroupId;
  title: string;
  icon: string;
  note?: string;                // سياق/تنويه أعلى المجموعة
  items: OpportunityItem[];     // دائماً غير فارغة (لا قسم فارغ صامت)
}

/* عدد الجامعات المعروضة في القمة (٨–١٠ حسب المواصفة) */
const TOP_UNIS = 8;

/* ════════ مساعدات نقية ════════ */

/* مستخدم زائف للمحرّكات التي تستهلك DarbUser (الحقول التعليمية فقط تُقرأ) */
const asUser = (inp: OpportunityInputs): DarbUser =>
  ({ studyLevel: inp.studyLevel, grade: inp.grade, gradStage: inp.gradStage } as DarbUser);

/* أيقونة الحكم → حالة الفرصة (اتساق دلالي واحد في كل المجموعات) */
const iconStatus = (icon: "🟢" | "🟡" | "🔴"): OpportunityStatus =>
  icon === "🟢" ? "متاح" : icon === "🟡" ? "قريب" : "يحتاج شرط";

/* المعادلة الأنسب: مسارات إنسانية → إنساني، وإلا علمي إن توفّر تحصيلي وإلا إنساني */
function pickFormula(u: UniversityOption, inp: OpportunityInputs): WeightedFormula | undefined {
  if (!u.formulas?.length) return undefined;
  const humanities =
    inp.trackType === "إداري" || inp.trackType === "قانوني" || inp.trackType === "عام";
  const want: AdmissionTrack = humanities || inp.tahsili == null ? "إنساني" : "علمي";
  return u.formulas.find((f) => f.track === want) ?? u.formulas[0];
}

/* ما ينقص الطالب لحساب الموزونة — لصياغة عنصر «أدخل درجاتك أولاً» */
function missingInputs(inp: OpportunityInputs): string {
  const need: string[] = [];
  if (inp.highschoolPct == null) need.push("نسبة الثانوية");
  if (inp.qudurat == null) need.push("درجة القدرات");
  if (inp.tahsili == null) need.push("درجة التحصيلي (للمعادلات العلمية)");
  return need.length ? need.join("، ") : "درجاتك";
}

/* ════════ ١) الجامعات المناسبة ════════ */
function universitiesGroup(
  inp: OpportunityInputs,
  user: DarbUser,
  phase: StudentPhase,
): { group: OpportunityGroup; topUniId?: string } {
  const base = { id: "universities" as const, title: "الجامعات المناسبة لك", icon: "🏛️" };

  /* الجامعي تجاوز مرحلة القبول — نخبره بلطف بدل إظهار موزونة لا تخصّه */
  if (phase === "university") {
    return {
      group: {
        ...base,
        note: "بصفتك جامعياً تجاوزت مرحلة القبول — هذا القسم مرجع لطلاب الثانوية والخريجين.",
        items: [{
          id: "uni-university-phase",
          title: "القبول الجامعي لمرحلة الثانوية والخريجين",
          status: "يحتاج شرط",
          detail: "حاسبة الموزونة وترتيب الجامعات مخصّصة لمن هم على أعتاب القبول. ركّز الآن على معدلك الجامعي ومهاراتك وفرص التدريب.",
          linkTo: "/dashboard",
        }],
      },
    };
  }

  /* نحسب موزونة كل جامعة حكومية لها معادلات ونرتّب تنازلياً */
  const scored: OpportunityItem[] = [];
  for (const u of UNIVERSITIES) {
    if (u.kind !== "حكومية" || !u.formulas?.length) continue;
    const f = pickFormula(u, inp);
    if (!f) continue;
    const r = computeWeighted(f, {
      highschool: inp.highschoolPct,
      qudurat: inp.qudurat,
      tahsili: inp.tahsili,
    });
    if (r.score == null) continue;
    const v = weightedVerdict(r.score);
    scored.push({
      id: `uni-${u.id}`,
      title: u.name,
      status: iconStatus(v.icon),
      detail: `${u.region ?? "—"} · ${housingInfo(u)}`,
      hint: `موزونة «${f.label}» (${f.highschool}/${f.qudurat}/${f.tahsili})${f.note ? ` — ${f.note}` : ""}`,
      score: r.score,
      verdict: v,
      linkTo: "/university",
    });
  }
  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const top = scored.slice(0, TOP_UNIS);

  /* رسالة المرحلة: ثالث ثانوي/خريج جاهزون للقبول؛ أول/ثاني ثانوي وقت البناء */
  const note = canApplyUniversity(user)
    ? "مرتّبة تنازلياً حسب موزونتك المقدّرة بمعادلة كل جامعة — كل النسب إرشادية وتتغيّر سنوياً."
    : `القبول قدامك — الحين وقت بناء الدرجات. متاح لك فعلاً: ${[
        canTakeQudurat(user) ? "اختبار القدرات" : "",
        canTakeEarlyTahsili(user) ? "التحصيلي المبكر" : "",
      ].filter(Boolean).join(" و") || "مواد المدرسة"}.`;

  /* غياب الدرجات: عنصر يشرح المطلوب بدل الإخفاء الصامت */
  if (top.length === 0) {
    return {
      group: {
        ...base,
        note,
        items: [{
          id: "uni-need-scores",
          title: "أدخل درجاتك أولاً",
          status: "يحتاج شرط",
          detail: `لحساب موزونتك وترتيب الجامعات نحتاج: ${missingInputs(inp)}.`,
          hint: "أضف درجاتك من «خطتي»، وحدّد وجهتك من «مستقبلي الجامعي» في القبول الجامعي، وارجع هنا.",
          linkTo: "/plan",
        }],
      },
    };
  }

  return { group: { ...base, note, items: top }, topUniId: top[0].id.slice(4) };
}

/* ════════ ٢) الكليات ════════ */
function collegesGroup(
  inp: OpportunityInputs,
  phase: StudentPhase,
  topUniId?: string,
): OpportunityGroup {
  const base = { id: "colleges" as const, title: "الكليات والتخصصات", icon: "🎓" };

  if (phase === "university") {
    return {
      ...base,
      items: [{
        id: "colleges-university-phase",
        title: "استكشاف الكليات لمرحلة القبول",
        status: "يحتاج شرط",
        detail: "أنت التحقت فعلاً — تغيير الكلية أو التخصص له ضوابط داخلية في جامعتك، راجع قنواتها الرسمية.",
      }],
    };
  }

  /* الجامعة المستهدفة من الأهداف، وإلا أعلى جامعة ملاءمةً، وإلا مثال حكومي أول */
  const chosen = findUniversity(inp.universityId);
  const fromTop = topUniId ? findUniversity(topUniId) : undefined;
  const target = chosen?.colleges?.length
    ? chosen
    : fromTop?.colleges?.length
    ? fromTop
    : UNIVERSITIES.find((u) => u.kind === "حكومية" && u.colleges?.length);

  const items: OpportunityItem[] = [];
  if (target?.colleges?.length) {
    const shown = target.colleges.slice(0, 10);
    const more = target.colleges.length - shown.length;
    items.push({
      id: `colleges-${target.id}`,
      title: `كليات ${target.name}`,
      status: "متاح",
      detail: shown.join("، ") + (more > 0 ? ` وغيرها (+${more})` : ""),
      hint: chosen?.colleges?.length
        ? "جامعتك المستهدفة — قارنها بغيرها في لوحة القبول."
        : fromTop?.colleges?.length
        ? "أعلى جامعة ملاءمةً لدرجاتك حالياً."
        : "مثال — حدّد جامعتك المستهدفة من «مستقبلي الجامعي» ليصير العرض أدق.",
      linkTo: "/university",
    });
  }

  /* متطلبات التخصص المستهدف + تحليل الفجوة إن توفّرت درجات */
  const major = findMajor(inp.majorId);
  if (major && major.id !== "other") {
    const reqText = requirementsText(major.requirements);
    const gap = gapAnalysis(major.requirements, {
      qudurat: inp.qudurat, tahsili: inp.tahsili, step: inp.step, gpa: inp.highschoolPct,
    });
    const hasScores = gap.items.some((i) => i.current != null);
    if (!gap.hasData) {
      items.push({
        id: `major-${major.id}`,
        title: `متطلبات ${major.name}`,
        status: "قريب",
        detail: "لا تتوفّر متطلبات مُقدّرة لهذا التخصص — راجع جهة القبول مباشرة.",
        linkTo: "/university",
      });
    } else if (!hasScores) {
      items.push({
        id: `major-${major.id}`,
        title: `متطلبات ${major.name}`,
        status: "قريب",
        detail: reqText,
        hint: "أضف نتائجك من «خطتي» ليتحوّل هذا إلى تحليل فجوة فعلي.",
        linkTo: "/plan",
      });
    } else {
      items.push({
        id: `major-${major.id}`,
        title: `متطلبات ${major.name}`,
        status: gap.allMet ? "متاح" : "يحتاج شرط",
        detail: reqText,
        hint: gap.allMet
          ? "درجاتك تلبّي المطلوب التقديري — ركّز على إتمام التقديم."
          : `ينقص ≈ ${gap.remainingTotal} نقطة إجمالاً — التفصيل في لوحة القبول.`,
        linkTo: "/university",
      });
    }
  } else {
    items.push({
      id: "colleges-pick-major",
      title: "حدّد تخصصك المستهدف",
      status: "قريب",
      detail: "اختر تخصصاً من قسم «مستقبلي الجامعي» في القبول الجامعي ليظهر لك المطلوب له وتحليل الفجوة بدقة.",
      linkTo: "/university",
    });
  }

  return { ...base, items };
}

/* ════════ ٣) برامج الابتعاث ════════ */
function abroadGroup(inp: OpportunityInputs, user: DarbUser, phase: StudentPhase): OpportunityGroup {
  const applyNow = canApplyUniversity(user);
  const emdad: OpportunityItem = {
    id: "abroad-emdad",
    title: "مسار إمداد للابتعاث (عبر منصة قبول)",
    status: phase === "university" || applyNow ? "يحتاج شرط" : "قريب",
    detail: phase === "university"
      ? "دورات الابتعاث للدراسة الجامعية تستهدف خريجي الثانوية — للجامعيين والخريجين تُعلن مسارات أخرى رسمياً بين فترة وأخرى."
      : "مسار ابتعاث حكومي يُعلن عبر منصة قبول الرسمية — الشروط والتخصصات والمقاعد تتغيّر كل دورة.",
    hint: applyNow
      ? "غالباً يتطلب درجات عالية وإثبات لغة إنجليزية — لا تعتمد إلا الإعلان الرسمي."
      : "يفتح لخريجي الثانوية — وقتك الآن لبناء الدرجات واللغة.",
    linkTo: "/guide",
  };

  /* جاهزية اللغة من نطاقات STEP (بلا عتبات مخترعة) */
  const stepBand = getStepBand(inp.step);
  const lang: OpportunityItem = {
    id: "abroad-language",
    title: "جاهزية اللغة الإنجليزية",
    status: stepBand ? iconStatus(stepBand.icon) : "يحتاج شرط",
    detail: stepBand
      ? `درجتك في ستيب ${inp.step} (${stepBand.label}) — ${stepBand.note}.`
      : "إثبات لغة (ستيب/آيلتس/توفل) يُطلب غالباً في برامج الابتعاث — ابدأ التحضير مبكراً.",
    hint: "كل جهة تحدّد اختبار اللغة والحدّ الأدنى الذي تقبله — تحقّق من إعلانها.",
  };

  return {
    id: "scholarships-abroad",
    title: "برامج الابتعاث",
    icon: "✈️",
    note: "إرشاد عام حذر — شروط الابتعاث تتغيّر كل دورة ولا مصدر لها إلا الإعلان الرسمي.",
    items: [emdad, lang],
  };
}

/* ════════ ٤) الدبلومات والتدريب التقني ════════ */
function technicalGroup(user: DarbUser, phase: StudentPhase): OpportunityGroup {
  const status: OpportunityStatus =
    phase === "university" ? "يحتاج شرط" : canApplyUniversity(user) ? "متاح" : "قريب";
  return {
    id: "technical",
    title: "الدبلومات والتدريب التقني",
    icon: "🛠️",
    items: [
      {
        id: "tvtc-colleges",
        title: "الكليات التقنية (TVTC)",
        status,
        detail: phase === "university"
          ? "برامج الدبلوم التقني موجّهة غالباً لخريجي الثانوية — بعض البرامج المسائية والقصيرة تقبل فئات أوسع."
          : "دبلومات تقنية في تخصصات متعددة، متاحة لخريجي الثانوي عموماً بشروط أخف من الجامعات.",
        hint: "الشروط والتخصصات تختلف بين الكليات والفصول — تحقّق من قنوات المؤسسة العامة للتدريب التقني والمهني الرسمية.",
      },
      {
        id: "tvtc-institutes",
        title: "المعاهد والبرامج التدريبية",
        status,
        detail: "معاهد تدريب حكومية وأهلية تقدّم دبلومات مهنية وبرامج قصيرة — مدة البرنامج ونوع شهادته يختلفان من جهة لأخرى.",
        hint: "تأكّد من اعتماد الجهة والشهادة رسمياً قبل التسجيل.",
      },
    ],
  };
}

/* ════════ ٥) منح الجامعات الأهلية ════════ */
function grantsGroup(inp: OpportunityInputs, phase: StudentPhase): OpportunityGroup {
  const base = { id: "grants" as const, title: "منح الجامعات الأهلية", icon: "🎁" };

  if (phase === "university") {
    return {
      ...base,
      items: [{
        id: "grants-university-phase",
        title: "منح التفوق للمستجدين غالباً",
        status: "يحتاج شرط",
        detail: "منح الجامعات الأهلية تستهدف غالباً الطلبة المستجدين من خريجي الثانوية — إن فكّرت بالتحويل فراجع سياسات القبول التحويلي لكل جامعة.",
      }],
    };
  }

  /* التفوق يقرّب المنح — نستدل بنطاق القدرات (لا أرقام مخترعة) */
  const strong = getQuduratBand(inp.qudurat)?.icon === "🟢";
  const items: OpportunityItem[] = UNIVERSITIES
    .filter((u) => u.kind === "أهلية")
    .map((u) => ({
      id: `grant-${u.id}`,
      title: u.name,
      status: (strong ? "متاح" : "يحتاج شرط") as OpportunityStatus,
      detail: `${u.region ? `${u.region} · ` : ""}${u.admissionNote ?? "معايير القبول تختلف — راجع موقع الجامعة."}`,
      hint: "منح التفوق تختلف تفاصيلها من سنة لسنة — تحقّق من الجامعة مباشرة.",
      linkTo: "/university",
    }));

  return {
    ...base,
    note: "الجامعات الأهلية تقدّم غالباً منح تفوق ودعماً للمتميزين — لا يُعتمد إلا إعلان الجامعة نفسها.",
    items,
  };
}

/* ════════ ٦) البرامج الحكومية ════════ */
function govGroup(): OpportunityGroup {
  return {
    id: "gov-programs",
    title: "البرامج الحكومية",
    icon: "🏢",
    note: "بلا أسماء تتقادم — البرامج الحكومية تُعلن موسمياً وتتغيّر شروطها.",
    items: [
      {
        id: "gov-seasonal",
        title: "برامج تدريب وابتعاث حكومية موسمية",
        status: "قريب",
        detail: "جهات حكومية تعلن دورياً برامج تدريب وتأهيل وابتعاث بشروط تختلف كل دورة — لا تُبنى خطة عليها قبل صدور الإعلان الرسمي.",
      },
      {
        id: "gov-follow",
        title: "تابع القنوات الرسمية",
        status: "متاح",
        detail: "أفضل مصدر هو المنصات والحسابات الرسمية للجهات الحكومية والجامعات — فعّل التنبيهات وتحقق من كل خبر قبل تداوله.",
      },
    ],
  };
}

/* ════════ نقطة الدخول: يبني المجموعات الست بترتيب ثابت ════════ */
export function buildOpportunities(inp: OpportunityInputs): OpportunityGroup[] {
  const user = asUser(inp);
  const phase = getStudentPhase(user);
  const { group: unis, topUniId } = universitiesGroup(inp, user, phase);
  return [
    unis,
    collegesGroup(inp, phase, topUniId),
    abroadGroup(inp, user, phase),
    technicalGroup(user, phase),
    grantsGroup(inp, phase),
    govGroup(),
  ];
}
