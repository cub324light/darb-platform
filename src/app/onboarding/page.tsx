"use client";
/* ═══════════════ التسجيل — رحلة متدرّجة متكيّفة بالمرحلة ═══════════════
   معالجٌ من خطواتٍ مركّزة (شاشة واحدة لكل خطوة) + شريط تقدّم. يتكيّف بالمرحلة:
   الثانوي/الخريج يمرّ بالرحلة الكاملة (منطقة→هدف→اختبارات→درجات→مواعيد→أسلوب→وقت→
   ملخّص→تقرير)؛ الجامعي يأخذ مساراً مختصراً (الجامعة/التخصص/السنة→أسلوب→وقت→ملخّص).
   يبني «ملف الطالب» فقط: الوجهة (targets) تقود recommendedExams ومساري (لا goal اختبار).
   يعيد استخدام المحرّكات القائمة (recommendedExams/darbKnowledge/outlook/saRegions). */
import { useState, useEffect, type ReactNode } from "react";
import { validateScore, scoreRangeForTitle, type TrackId } from "@/lib/tracks";
import { MAJORS, findUniversity, findMajor, UNIVERSITIES } from "@/lib/university";
import { saveUser, saveResults, loadGoals, saveGoals, ensureWorkspace,
  loadTrackExamDates, saveTrackExamDates, currentScoreMap, type DarbUser } from "@/lib/storage";
import { currentAcademicYearId, currentTermGuess, type TermGuess } from "@/lib/academicCalendar";
import { requirementsOf } from "@/lib/recommendedExams";
import { resolveGoals, type PrimaryGoal, type AramcoSub, type MajorLean } from "@/lib/onboarding/goals";
import { admissionOutlook, OUTLOOK_DISCLAIMER, whatIfRaise, readiness } from "@/lib/onboarding/outlook";
import { EXAM_ORDER } from "@/lib/onboarding/examCatalog";
import { stageExams, examLabelOf, EXAM_TO_TRACK, EXAM_SCORE_KEY, MAX_EXAMS, STAGE_LOCK_REASON, type OnbStage } from "@/lib/onboarding/stageExams";
import { ACADEMIC_TRACKS, type AcademicTrack } from "@/lib/curriculum";
import { evalBand, percentileText, evalBarPct, scoreOutOf } from "@/lib/scoreEvaluation";
import { SA_REGIONS, nearestUniversity } from "@/lib/saRegions";
import { n } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { redeemPendingRef } from "@/lib/referral";
import Dome from "@/components/Dome";
import Logo from "@/components/Logo";

/* ── نموذج المراحل ── */
type Status = "ثانوي" | "جامعي" | "خريج";
/* المرحلة هرمية: الصف أولاً، ثم مرحلةٌ فرعية (فصل/إجازة/سنة/تخرّج) — واجهةٌ أنظف. */
const PRIMARY_STAGES: { key: string; label: string; status: Status; grade: string }[] = [
  { key: "g1",   label: "أول ثانوي",   status: "ثانوي", grade: "أول ثانوي" },
  { key: "g2",   label: "ثاني ثانوي",  status: "ثانوي", grade: "ثاني ثانوي" },
  { key: "g3",   label: "ثالث ثانوي",  status: "ثانوي", grade: "ثالث ثانوي" },
  { key: "grad", label: "خريج",        status: "خريج",  grade: "" },
  { key: "uni",  label: "طالب جامعي",  status: "جامعي", grade: "" },
];
interface SubStage { key: string; label: string; term?: TermGuess; onb: OnbStage; gradStage?: string; recency?: "this-year" | "earlier"; uniYear?: string; }
const SUB_STAGES: Record<string, SubStage[]> = {
  g1: [
    { key: "first",  label: "الفصل الأول",  term: "first",  onb: "first" },
    { key: "second", label: "الفصل الثاني", term: "second", onb: "first" },
    { key: "summer", label: "الإجازة (مقبل على ثاني)", term: "summer", onb: "summer2" },
  ],
  g2: [
    { key: "first",  label: "الفصل الأول",  term: "first",  onb: "second" },
    { key: "second", label: "الفصل الثاني", term: "second", onb: "second" },
    { key: "summer", label: "الإجازة (مقبل على ثالث)", term: "summer", onb: "summer3" },
  ],
  g3: [
    { key: "first",  label: "الفصل الأول",  term: "first",  onb: "third" },
    { key: "second", label: "الفصل الثاني", term: "second", onb: "third" },
  ],
  grad: [
    { key: "this-year", label: "هذه السنة",   onb: "graduate", gradStage: "خريج ثانوي", recency: "this-year" },
    { key: "earlier",   label: "سنوات سابقة", onb: "graduate", gradStage: "خريج ثانوي", recency: "earlier" },
  ],
  uni: [
    { key: "الأولى",   label: "السنة الأولى", onb: "university", uniYear: "الأولى" },
    { key: "الثانية",  label: "الثانية",      onb: "university", uniYear: "الثانية" },
    { key: "الثالثة",  label: "الثالثة",      onb: "university", uniYear: "الثالثة" },
    { key: "الرابعة",  label: "الرابعة",      onb: "university", uniYear: "الرابعة" },
    { key: "الخامسة+", label: "الخامسة+",     onb: "university", uniYear: "الخامسة+" },
  ],
};
const SUB_STAGE_PROMPT: Record<string, string> = {
  g1: "أنت في أي فصل؟", g2: "أنت في أي فصل؟", g3: "أنت في أي فصل؟",
  grad: "متى تخرّجت؟", uni: "سنتك الدراسية؟",
};

/* ── نموذج الخطوات (يُبنى حسب المرحلة) ── */
type StepKey =
  | "welcome" | "stage" | "track" | "region" | "goal" | "exams" | "scores"
  | "style" | "time" | "summary" | "uni";
const UNI_STEPS: StepKey[] = ["welcome", "stage", "uni", "style", "time", "summary"];
/* المسار الدراسي يظهر لثاني/ثالث ثانوي فقط (أول ثانوي لم يختر مساره بعد). */
const secondarySteps = (needsTrack: boolean): StepKey[] =>
  ["welcome", "stage", ...(needsTrack ? ["track" as const] : []), "region", "goal", "exams", "scores", "style", "time", "summary"];
/* «ما أدري»: نعرض له أوسع فرصٍ ممكنة بدل إخفاء الاختبارات. */
const ALL_TARGETS = ["university", "aramco", "itc", "military", "scholarship"];

/* ── الهدف الهرمي ── */
const GOAL_OPTIONS: { id: PrimaryGoal; icon: string; label: string }[] = [
  { id: "undecided",   icon: "✨", label: "درب يحدد لي (مقترح)" },
  { id: "university",  icon: "🎓", label: "الجامعة" },
  { id: "aramco",      icon: "🏭", label: "أرامكو وبرامجها" },
  { id: "military",    icon: "🪖", label: "الكليات العسكرية" },
  { id: "scholarship", icon: "✈️", label: "الابتعاث" },
];
const MAJOR_LEANS: { id: MajorLean; icon: string; label: string }[] = [
  { id: "صحي",       icon: "🩺", label: "صحي" },
  { id: "هندسة",     icon: "⚙️", label: "هندسة" },
  { id: "حاسب",      icon: "💻", label: "حاسب" },
  { id: "إدارة",     icon: "📊", label: "إدارة" },
  { id: "أدبي",      icon: "📚", label: "أدبي" },
  { id: "undecided", icon: "⭐", label: "ما أدري" },
];
const ARAMCO_SUBS: { id: AramcoSub; label: string }[] = [
  { id: "cpc",  label: "CPC (ابتعاث ووظيفة)" },
  { id: "itc",  label: "ITC (تدرّج مهني)" },
  { id: "both", label: "الاثنين" },
];

/* اختبار قياس/لغة قابلٌ لإدخال درجة — نوعه ومفاتيح عرضه وحفظه. */
type ScoreKey = "qudurat" | "tahsili" | "step";
const SCORE_META: Record<ScoreKey, { rangeTitle: string; resultTitle: string }> = {
  qudurat: { rangeTitle: "قدرات",  resultTitle: "القدرات" },
  tahsili: { rangeTitle: "تحصيلي", resultTitle: "التحصيلي" },
  step:    { rangeTitle: "ستيب",   resultTitle: "STEP" },
};

/* لون مؤشّر التقييم (🟢/🟡/🔴) — من رموز واحدة موحّدة عبر المشروع. */
const bandColor = (icon: string): string =>
  icon === "🟢" ? "var(--success)" : icon === "🟡" ? "var(--gold)" : "var(--danger)";

export default function OnboardingPage() {
  const [current, setCurrent] = useState<StepKey>("welcome");
  const [showReport, setShowReport] = useState(false);

  /* ── الأساسيات ── */
  const [name, setName] = useState("");
  useEffect(() => {
    import("@/lib/cloud").then(({ currentUser }) => {
      const dn = currentUser()?.displayName;
      if (dn) setName((prev) => prev || dn.split(" ")[0]);
    });
  }, []);
  const [status, setStatus] = useState<Status | "">("");
  const [primaryStage, setPrimaryStage] = useState("");
  const [subStage, setSubStage] = useState("");
  const [grade, setGrade] = useState("");
  const [term, setTerm] = useState<TermGuess>(() => (typeof window !== "undefined" ? currentTermGuess() : "first"));
  const [gradStage, setGradStage] = useState("");
  const [gradRecency, setGradRecency] = useState<"this-year" | "earlier" | "">("");
  const [academicTrack, setAcademicTrack] = useState<AcademicTrack | "">("");

  /* ── اختيار الاختبارات (منتقٍ حسب المرحلة، حدّ ٣) ── */
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [examsInit, setExamsInit] = useState(false);
  const [capHint, setCapHint] = useState(false);

  /* ── المنطقة ── */
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [willingToRelocate, setWillingToRelocate] = useState<boolean | null>(null);
  const [regionsInterested, setRegionsInterested] = useState<string[]>([]);
  const [addRegionOpen, setAddRegionOpen] = useState(false);

  /* ── الهدف الهرمي ── */
  const [primaryGoals, setPrimaryGoals] = useState<PrimaryGoal[]>([]);
  const [aramcoSub, setAramcoSub] = useState<AramcoSub>("cpc");
  const [majorLean, setMajorLean] = useState<MajorLean | "">("");

  /* ── الدرجات + الرضا ── */
  const [scores, setScores] = useState<Record<ScoreKey, { state: "none" | "waiting" | "scored"; value: string }>>({
    qudurat: { state: "none", value: "" }, tahsili: { state: "none", value: "" }, step: { state: "none", value: "" },
  });
  const [scoreErr, setScoreErr] = useState("");
  const [retakeIntent, setRetakeIntent] = useState<Record<string, boolean>>({});
  /* أعلى درجةٍ سابقة لكل اختبار (لمقارنة الطالب بنفسه) — تُقرأ مرّة على العميل. */
  const [priorScores] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    const out: Record<string, number> = {};
    for (const [title, v] of Object.entries(currentScoreMap())) out[title] = v.score;
    return out;
  });

  /* ── المواعيد (تُحفظ حيّة في trackExamDates) ── */
  const [examDates, setExamDates] = useState<Record<string, string>>(() => (typeof window !== "undefined" ? loadTrackExamDates() : {}));

  /* ── الجامعي ── */
  const [universityId, setUniversityId] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [majorId, setMajorId] = useState("");
  const [uniQuery, setUniQuery] = useState("");
  const [otherUni, setOtherUni] = useState("");
  const [universityYear, setUniversityYear] = useState("");
  const [universityGpa, setUniversityGpa] = useState("");

  /* ── الأسلوب والوقت ── */
  const [studyStyle, setStudyStyle] = useState<"book" | "video" | "both" | "">("");
  const [studyHours, setStudyHours] = useState<number>(3);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();

  /* ── المشتقّات (المصدر الوحيد: الوجهة → recommendedExams) ── */
  const goal = resolveGoals({ primary: primaryGoals, aramcoSub, majorLean: (majorLean || undefined) as MajorLean | undefined });
  const subObj = primaryStage ? SUB_STAGES[primaryStage]?.find((s) => s.key === subStage) : undefined;
  const onbStage: OnbStage = subObj?.onb ?? "graduate";
  const stageList = stageExams(onbStage);                 // التسعة بحالاتها (مفتوح/مقفل)
  const openIds = stageList.filter((e) => e.state === "open").map((e) => e.id);

  /* اقتراح درب: «درب يحدد لي» → الأساسية المفتوحة (قدرات ثم تحصيلي)؛ وإلا اختبارات الهدف
     المفتوحة — كلاهما بحدّ ٣. المرحلة أولاً ثم الهدف (لا نقترح مقفلاً). */
  const suggestedExamIds = (() => {
    if (goal.undecided) return ["qudurat", "tahsili"].filter((id) => openIds.includes(id)).slice(0, MAX_EXAMS);
    const kinds = requirementsOf(goal.targets);
    const ids: string[] = [];
    if (kinds.has("qudurat")) ids.push("qudurat");
    if (kinds.has("tahsili")) ids.push("tahsili");
    if (kinds.has("language")) ids.push("step");
    if (kinds.has("itc")) ids.push("itc");
    if (kinds.has("aramco")) ids.push("cpc");
    return ids.filter((id) => openIds.includes(id)).slice(0, MAX_EXAMS);
  })();

  const orderedSelected = [...selectedExams].sort((a, b) => (EXAM_ORDER[a] ?? 99) - (EXAM_ORDER[b] ?? 99));
  /* اختبارات إدخال الدرجة من المختارة (قدرات/تحصيلي/step) بلا تكرار مفتاح. */
  const scorableExams = (() => {
    const seen = new Set<ScoreKey>(); const out: { id: string; key: ScoreKey }[] = [];
    for (const id of orderedSelected) { const k = EXAM_SCORE_KEY[id]; if (!k || seen.has(k)) continue; seen.add(k); out.push({ id, key: k }); }
    return out;
  })();
  const firstExamLabel = orderedSelected[0] ? examLabelOf(orderedSelected[0]) : undefined;

  const num = (v: string) => { const x = parseFloat(v); return Number.isFinite(x) ? x : null; };
  const scoreOf = (k: ScoreKey) => (scores[k].state === "scored" ? num(scores[k].value) : null);
  /* «درب يحدد لي» → أوسع فرصٍ ممكنة (كل الوجهات) حتى لا يفوّت الطالب فرصة. */
  const outlookTargets = goal.undecided ? ALL_TARGETS : goal.targets;
  const outlookInput = {
    targets: outlookTargets, trackType: goal.trackType,
    qudurat: scoreOf("qudurat"), tahsili: scoreOf("tahsili"), step: scoreOf("step"),
  };
  const outlookItems = admissionOutlook(outlookInput);

  /* اقتراح الاختبارات مرّة عند بلوغ الخطوة؛ يُعاد عند تغيّر المرحلة أو الهدف. */
  const goalKey = goal.undecided ? "undecided" : [...goal.targets].sort().join(",");
  useEffect(() => { setExamsInit(false); }, [onbStage, goalKey]);
  useEffect(() => {
    if (current === "exams" && !examsInit) { setSelectedExams(suggestedExamIds); setExamsInit(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, examsInit]);

  const toggleExam = (id: string) => {
    const ex = stageList.find((e) => e.id === id);
    if (!ex || ex.state !== "open") return;             // المقفل غير قابلٍ للاختيار
    setCapHint(false);
    setSelectedExams((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_EXAMS) { setCapHint(true); return prev; }
      return [...prev, id];
    });
  };

  /* ── قائمة الخطوات (متكيّفة) — المسار الدراسي لثاني/ثالث ثانوي فقط ── */
  const needsTrack = status === "ثانوي" && (grade === "ثاني ثانوي" || grade === "ثالث ثانوي");
  const steps = status === "جامعي" ? UNI_STEPS : secondarySteps(needsTrack);
  const idx = Math.max(0, steps.indexOf(current));
  const total = steps.length - 1; // الترحيب = ٠

  const filteredUnis = (() => { const q = uniQuery.trim(); return q ? UNIVERSITIES.filter((u) => u.name.includes(q) || (u.region ?? "").includes(q)) : UNIVERSITIES; })();
  const pickUni = (id: string) => { const u = findUniversity(id); if (!u) return; setUniversityId(id); setUniversityName(id === "other" ? (otherUni.trim() || "أخرى") : u.name); setUniQuery(""); };

  /* ── التحقّق لكل خطوة ── */
  const canProceed = (): boolean => {
    switch (current) {
      case "welcome": return name.trim().length > 0;
      case "stage":   return !!primaryStage && !!subStage;
      case "track":   return !!academicTrack;
      case "region":  return !!region && willingToRelocate !== null; // المدينة/الحي اختياريان فقط
      case "goal":    return primaryGoals.length > 0 && (!primaryGoals.includes("university") || !!majorLean);
      case "style":   return !!studyStyle;
      case "uni":     return !!universityId && !!majorId && !!universityGpa.trim();
      default:        return true; // exams/scores — غير حاجزة (اختياراتها إجابةٌ بذاتها)
    }
  };

  const goNext = () => { const nx = steps[idx + 1]; if (nx) setCurrent(nx); };
  const goBack = () => { const pv = steps[idx - 1]; if (pv) setCurrent(pv); };

  /* ── حفظ الدرجة داخل خطوة الدرجات ── */
  const setScore = (k: ScoreKey, patch: Partial<{ state: "none" | "waiting" | "scored"; value: string }>) =>
    setScores((s) => ({ ...s, [k]: { ...s[k], ...patch } }));

  /* ── تحديث موعد اختبار (حيّ) ── */
  const setExamDate = (examKey: string, v: string) => {
    const up = { ...examDates }; if (v) up[examKey] = v; else delete up[examKey];
    setExamDates(up); saveTrackExamDates(up);
  };

  /* ════════ الإنهاء ════════ */
  const finish = async () => {
    if (isSubmitting) return;
    /* تحقّق الدرجات المُدخَلة */
    for (const k of ["qudurat", "tahsili", "step"] as ScoreKey[]) {
      const s = scores[k];
      if (s.state !== "scored" || !s.value.trim()) continue;
      const err = validateScore(SCORE_META[k].rangeTitle, s.value.trim());
      if (err) { setScoreErr(`${SCORE_META[k].resultTitle}: ${err}`); setCurrent("scores"); return; }
    }
    setScoreErr("");
    if (studyHours < 1 || studyHours > 16) { setSubmitErr("ساعات المذاكرة بين ١ و١٦"); return; }
    if (status === "جامعي" && universityGpa) { const g = parseFloat(universityGpa); if (!Number.isFinite(g) || g < 0 || g > 5) { setSubmitErr("المعدل الجامعي بين ٠ و٥"); return; } }
    setSubmitErr("");
    setIsSubmitting(true);
    try {
      const trimmedName = name.trim();
      /* الاختبارات المختارة (≤٣) هي مسارات مساري — لا اشتقاق منفصل. */
      const tracks = status === "جامعي" ? [] : (orderedSelected.map((id) => EXAM_TO_TRACK[id]).filter(Boolean) as TrackId[]);
      const primaryTrack: TrackId = tracks[0] ?? "مدرسه";
      const resolvedTrackType = status === "جامعي" && majorId ? findMajor(majorId)?.category : (goal.trackType || undefined);

      const userData: DarbUser = {
        name: trimmedName,
        track: primaryTrack,
        activeTracks: tracks.length ? tracks : undefined,
        onboarded: true,
        studyLevel: status || undefined,
        grade: status === "ثانوي" && grade ? grade : undefined,
        gradeYearId: status === "ثانوي" && grade ? (currentAcademicYearId() ?? undefined) : undefined,
        academicTerm: status === "ثانوي" ? term : undefined,
        gradStage: status === "خريج" && gradStage ? gradStage : undefined,
        gradRecency: status === "خريج" && gradRecency ? gradRecency : undefined,
        universityYear: status === "جامعي" && universityYear ? universityYear : undefined,
        targets: goal.targets.length ? goal.targets : undefined,
        goalUndecided: goal.undecided || undefined,
        retakeExams: (() => { const r = Object.keys(retakeIntent).filter((k) => retakeIntent[k]); return r.length ? r : undefined; })(),
        studyHours,
        studyStyle: studyStyle || undefined,
        trackType: resolvedTrackType,
        academicTrack: needsTrack && academicTrack ? academicTrack : undefined,
        region: region || undefined,
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        willingToRelocate: willingToRelocate ?? undefined,
        regionsInterested: regionsInterested.length ? regionsInterested : undefined,
        universityGpa: status === "جامعي" && universityGpa ? parseFloat(universityGpa) : undefined,
      };
      saveUser(ensureWorkspace(userData));

      if (status === "جامعي" && (universityId || majorId)) {
        const g = loadGoals(); const next = { ...g };
        if (universityId) { next.universityId = universityId; next.university = universityId === "other" ? (otherUni.trim() || "أخرى") : (universityName || findUniversity(universityId)?.name); }
        if (majorId) { next.majorId = majorId; next.major = findMajor(majorId)?.name; }
        saveGoals(next);
      }

      /* الدرجات المُدخَلة → نتائجي */
      const entered = (["qudurat", "tahsili", "step"] as ScoreKey[]).filter((k) => scores[k].state === "scored" && scores[k].value.trim());
      if (entered.length) {
        saveResults(entered.map((k, i) => ({ id: `${Date.now()}-${i}`, exam: SCORE_META[k].resultTitle, score: scores[k].value.trim() })));
      }

      import("@/lib/firestore").then(({ registerUser }) => { registerUser(trimmedName, primaryTrack, {}); });
      trackEvent("onboarding_completed", { track: primaryTrack, tracks: tracks.length, targets: goal.targets.length, status });
      import("@/lib/cloud").then(({ pushBackup }) => { pushBackup().catch(() => {}); });
      await redeemPendingRef().catch(() => 0);

      /* الثانوي/الخريج: تقرير شخصي ٥ ثوانٍ ثم اللوحة. الجامعي: مباشرة للّوحة. */
      if (status === "جامعي") { window.location.assign("/dashboard"); return; }
      setShowReport(true);
      setTimeout(() => window.location.assign("/dashboard"), 5200);
    } catch {
      setIsSubmitting(false);
      setSubmitErr("تعذّر حفظ بياناتك — تأكد من توفّر مساحة في المتصفح ثم حاول مجدداً");
    }
  };

  /* ════════ عناصر واجهة مشتركة ════════ */
  const inputStyle = { background: "var(--surface)", border: "2px solid var(--border)" };
  const chipStyle = (active: boolean) => ({
    background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
    color: active ? "var(--accent-light)" : "var(--text)",
  });

  const header = (
    <Dome hideControls>
      <div className="text-center py-5"><Logo className="font-black text-5xl mb-1 block" /></div>
    </Dome>
  );

  const progress = current === "welcome" ? (
    <p className="t-caption text-center mb-6" style={{ color: "var(--text-muted)" }}>الخطوة {n(0)} من {n(total)}</p>
  ) : (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-2">
        <span className="t-caption font-bold" style={{ color: "var(--accent-light)" }}>الخطوة {n(idx)} من {n(total)}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(idx / total) * 100}%`, background: "var(--accent)" }} />
      </div>
    </div>
  );

  /* شاشة التقرير الشخصي (٥ ثوانٍ) */
  if (showReport) return <ReportScreen name={name.trim()} scores={scores} outlook={outlookItems}
    undecided={goal.undecided} firstStep={firstExamLabel} region={region} />;

  /* ════════ الخطوات ════════ */
  const stepBody = (() => {
    switch (current) {
      /* ── الترحيب ── */
      case "welcome": return (
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <p className="t-h1 font-black mb-2" style={{ color: "var(--text)" }}>مرحبًا بك في درب</p>
            <p className="t-body" style={{ color: "var(--text-muted)" }}>دقيقة واحدة فقط، ونبني رحلتك خطوةً بخطوة.</p>
          </div>
          <div>
            <p className="label mb-3">وش اسمك؟</p>
            <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="مثال: فهد، سارة، خالد..." maxLength={20}
              className="w-full rounded-2xl px-5 py-4 t-body-lg text-[var(--text)] placeholder-[var(--text-muted)] outline-none" style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
          </div>
        </div>
      );

      /* ── الصف الدراسي (هرمي: صف ← مرحلة فرعية) ── */
      case "stage": return (
        <div>
          <p className="label mb-1">وش صفّك الدراسي؟</p>
          <p className="t-caption mb-4" style={{ color: "var(--text-muted)" }}>نبني رحلتك حسب مرحلتك بالضبط</p>
          <div className="grid grid-cols-2 gap-2.5">
            {PRIMARY_STAGES.map((p) => {
              const on = primaryStage === p.key;
              return (
                <button key={p.key}
                  onClick={() => {
                    if (on) { setPrimaryStage(""); setSubStage(""); setStatus(""); setGrade(""); return; }
                    setPrimaryStage(p.key); setSubStage(""); setStatus(p.status); setGrade(p.grade);
                    setGradStage(""); setGradRecency(""); setUniversityYear(""); setAcademicTrack("");
                  }}
                  className={`rounded-2xl py-3.5 px-3 font-bold t-body transition active:scale-[0.98] ${p.key === "uni" ? "col-span-2" : ""}`}
                  style={chipStyle(on)}>{p.label}</button>
              );
            })}
          </div>
          {primaryStage && (
            <div className="mt-5">
              <p className="label mb-3">{SUB_STAGE_PROMPT[primaryStage]}</p>
              <div className={`grid gap-2 ${SUB_STAGES[primaryStage].length >= 5 ? "grid-cols-3" : SUB_STAGES[primaryStage].length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {SUB_STAGES[primaryStage].map((s) => (
                  <button key={s.key}
                    onClick={() => {
                      setSubStage(s.key);
                      if (s.term) setTerm(s.term);
                      setGradStage(s.gradStage ?? "");
                      setGradRecency(s.recency ?? "");
                      setUniversityYear(s.uniYear ?? "");
                    }}
                    className="rounded-2xl py-3 px-2 font-bold t-small leading-snug text-center transition active:scale-[0.98]"
                    style={chipStyle(subStage === s.key)}>{s.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      );

      /* ── المسار الدراسي (ثاني/ثالث ثانوي) ── */
      case "track": return (
        <div>
          <p className="label mb-1">ما هو مسارك الدراسي؟</p>
          <p className="t-caption mb-4" style={{ color: "var(--text-muted)" }}>نجلب مواد فصلك تلقائياً، ويركّز دويرب على ما يناسب مسارك</p>
          <div className="flex flex-col gap-3">
            {ACADEMIC_TRACKS.map((t) => {
              const on = academicTrack === t.id;
              return (
                <button key={t.id} onClick={() => setAcademicTrack(on ? "" : t.id)} aria-pressed={on}
                  className="rounded-2xl px-4 py-4 flex items-center gap-4 text-right transition active:scale-[0.97]"
                  style={{
                    background: on ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                    border: `2px solid ${on ? "var(--accent)" : "var(--border)"}`,
                    boxShadow: on ? "0 6px 22px color-mix(in srgb, var(--accent) 22%, transparent)" : "none",
                  }}>
                  <span className="text-[30px] flex-shrink-0" aria-hidden="true">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black t-title" style={{ color: on ? "var(--accent-light)" : "var(--text)" }}>{t.label}</p>
                      {t.recommended && <span className="t-caption font-bold px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent-light)" }}>موصى به</span>}
                    </div>
                    <p className="t-caption mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{t.desc}</p>
                  </div>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center t-caption font-black flex-shrink-0"
                    style={{ background: on ? "var(--accent)" : "var(--surface2)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`, color: on ? "#fff" : "transparent" }}>✓</span>
                </button>
              );
            })}
          </div>
        </div>
      );

      /* ── المنطقة ── */
      case "region": return (
        <div className="flex flex-col gap-5">
          <div>
            <p className="label mb-1">وش منطقتك؟</p>
            <p className="t-caption mb-3" style={{ color: "var(--text-muted)" }}>نقترح لك الجامعات الأقرب — وتقدر توسّع لاحقاً</p>
            <div className="flex flex-wrap gap-2">
              {SA_REGIONS.map((r) => (
                <button key={r} onClick={() => setRegion(region === r ? "" : r)} className="px-3 py-2 rounded-full font-bold t-small transition active:scale-95" style={chipStyle(region === r)}>{r}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="label mb-2">المدينة/المحافظة</p>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: جدة" maxLength={40}
                className="w-full rounded-2xl px-4 py-3 t-body text-[var(--text)] placeholder-[var(--text-muted)] outline-none" style={inputStyle} />
            </div>
            <div>
              <p className="label mb-2">الحي <span className="t-caption font-normal" style={{ color: "var(--text-muted)" }}>(اختياري)</span></p>
              <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="اختياري" maxLength={40}
                className="w-full rounded-2xl px-4 py-3 t-body text-[var(--text)] placeholder-[var(--text-muted)] outline-none" style={inputStyle} />
            </div>
          </div>
          <div>
            <p className="label mb-2">لو كانت أفضل جامعة بعيدة؟</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => setWillingToRelocate(true)} className="rounded-2xl py-3 px-3 font-bold t-small leading-snug transition active:scale-[0.98] text-center" style={chipStyle(willingToRelocate === true)}>✅ لا أمانع الغربة</button>
              <button onClick={() => setWillingToRelocate(false)} className="rounded-2xl py-3 px-3 font-bold t-small leading-snug transition active:scale-[0.98] text-center" style={chipStyle(willingToRelocate === false)}>📍 أفضّل القرب مني</button>
            </div>
          </div>
          <div>
            {!addRegionOpen ? (
              <button onClick={() => setAddRegionOpen(true)} className="t-small font-bold" style={{ color: "var(--accent-light)" }}>➕ مناطق أخرى مهتمّ فيها</button>
            ) : (
              <>
                <p className="label mb-2">مناطق أخرى مهتمّ فيها</p>
                <div className="flex flex-wrap gap-2">
                  {SA_REGIONS.filter((r) => r !== region).map((r) => {
                    const on = regionsInterested.includes(r);
                    return <button key={r} onClick={() => setRegionsInterested((p) => on ? p.filter((x) => x !== r) : [...p, r])} className="px-3 py-1.5 rounded-full font-bold t-caption transition active:scale-95" style={chipStyle(on)}>{r}</button>;
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      );

      /* ── الهدف الهرمي ── */
      case "goal": {
        const toggleGoal = (id: PrimaryGoal) => setPrimaryGoals((p) => {
          if (id === "undecided") return p.includes("undecided") ? [] : ["undecided"];
          const base = p.filter((x) => x !== "undecided");
          return base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
        });
        return (
          <div className="flex flex-col gap-5">
            <div>
              <p className="label mb-1">وش هدفك بعد الثانوية؟</p>
              <p className="t-caption mb-3" style={{ color: "var(--text-muted)" }}>تقدر تختار أكثر من هدف — ومنها نعرف اختباراتك المطلوبة</p>
              <div className="flex flex-col gap-2.5">
                {GOAL_OPTIONS.map((g) => {
                  const on = primaryGoals.includes(g.id);
                  return (
                    <button key={g.id} onClick={() => toggleGoal(g.id)} aria-pressed={on}
                      className="rounded-2xl px-4 py-3 flex items-center gap-3 text-right transition active:scale-[0.98]" style={chipStyle(on)}>
                      <span className="text-[22px]">{g.icon}</span>
                      <span className="font-bold t-body flex-1">{g.label}</span>
                      <span className="w-5 h-5 rounded-md flex items-center justify-center t-caption font-black flex-shrink-0" style={{ background: on ? "var(--accent)" : "var(--surface2)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`, color: on ? "#fff" : "transparent" }}>✓</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* فرع الجامعة: ميل التخصص (اختياري) */}
            {primaryGoals.includes("university") && (
              <div>
                <p className="label mb-1">وش التخصص اللي يميل له قلبك؟</p>
                <div className="flex flex-wrap gap-2">
                  {MAJOR_LEANS.map((m) => (
                    <button key={m.id} onClick={() => setMajorLean(majorLean === m.id ? "" : m.id)} className="px-3 py-2 rounded-full font-bold t-small transition active:scale-95" style={chipStyle(majorLean === m.id)}>{m.icon} {m.label}</button>
                  ))}
                </div>
              </div>
            )}
            {/* فرع أرامكو: CPC / ITC / الاثنين */}
            {primaryGoals.includes("aramco") && (
              <div>
                <p className="label mb-2">أي برنامج في أرامكو؟</p>
                <div className="grid grid-cols-3 gap-2">
                  {ARAMCO_SUBS.map((s) => (
                    <button key={s.id} onClick={() => setAramcoSub(s.id)} className="rounded-2xl py-2.5 px-2 font-bold t-caption leading-snug transition active:scale-[0.98] text-center" style={chipStyle(aramcoSub === s.id)}>{s.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      /* ── منتقي الاختبارات (حسب المرحلة، حدّ ٣، المقفل يظهر 🔒) ── */
      case "exams": return (
        <div>
          <p className="label mb-1">اختباراتك</p>
          {goal.undecided
            ? <p className="t-caption" style={{ color: "var(--text-muted)" }}>بناءً على مرحلتك الحالية، هذه الاختبارات التي يمكنك الاستعداد لها أو إضافتها لمسارك.</p>
            : <p className="t-caption" style={{ color: "var(--text-muted)" }}>اخترنا لك اختبارات هدفك — عدّلها كما تشاء.</p>}
          <p className="t-caption mt-2 mb-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            اختر حتى ثلاثة اختبارات فقط، وتقدر تضيف أو تحذف أي اختبار لاحقاً من مساري. المقفلة 🔒 تُفتح تلقائياً عند وصولك للمرحلة المناسبة.
          </p>
          <p className="t-caption font-bold mb-3" style={{ color: capHint ? "var(--danger)" : "var(--accent-light)" }}>
            {capHint ? `الحد الأقصى ${n(MAX_EXAMS)} اختبارات` : `اخترت ${n(selectedExams.length)} من ${n(MAX_EXAMS)}`}
          </p>
          <div className="flex flex-col gap-2.5">
            {stageList.map((e) => {
              const locked = e.state === "locked";
              const on = selectedExams.includes(e.id);
              return (
                <button key={e.id} onClick={() => toggleExam(e.id)} disabled={locked} aria-pressed={on}
                  className="rounded-2xl px-4 py-3 flex items-center gap-3 text-right transition active:scale-[0.98]"
                  style={{
                    background: on ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                    border: `2px solid ${on ? "var(--accent)" : "var(--border)"}`,
                    opacity: locked ? 0.55 : 1, cursor: locked ? "not-allowed" : "pointer",
                  }}>
                  <span className="w-6 h-6 rounded-md flex items-center justify-center t-caption font-black flex-shrink-0"
                    style={{ background: on ? "var(--accent)" : "var(--surface2)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`, color: on ? "#fff" : "var(--text-muted)" }}>
                    {locked ? "🔒" : on ? "✓" : "＋"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold t-body" style={{ color: on ? "var(--accent-light)" : "var(--text)" }}>{e.label}</p>
                    <p className="t-caption mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {locked ? STAGE_LOCK_REASON : `يفتح لك: ${e.opens.slice(0, 3).join(" · ")}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );

      /* ── الدرجات (تقييم + يفتح لك + رضا) ── */
      case "scores": return (
        <div className="flex flex-col gap-5">
          <div>
            <p className="label mb-1">درجاتك</p>
            <p className="t-caption" style={{ color: "var(--text-muted)" }}>سجّل ما اختبرته لنقيّم مستواك ونعرف ما يفتح لك — وتقدر تتخطّاها.</p>
          </div>
          {scorableExams.length === 0 ? (
            <p className="t-body" style={{ color: "var(--text-muted)" }}>لا اختبارات لإدخال درجتها الآن — تقدر تسجّل درجاتك لاحقاً من «نتائجي».</p>
          ) : scorableExams.map((e) => {
            const k = e.key;
            const s = scores[k];
            const range = scoreRangeForTitle(SCORE_META[k].rangeTitle);
            const scoreVal = s.state === "scored" ? num(s.value) : null;
            const band = evalBand(k, scoreVal);
            const pctText = percentileText(band);
            const prior = priorScores[SCORE_META[k].resultTitle];
            const delta = band && scoreVal != null && prior != null ? Math.round((scoreVal - prior) * 10) / 10 : null;
            const whatIf = band && scoreVal != null ? whatIfRaise(outlookInput, k) : null;
            return (
              <div key={k} className="rounded-2xl px-4 py-3.5 flex flex-col gap-2.5" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
                <p className="font-bold t-body" style={{ color: "var(--text)" }}>{SCORE_META[k].resultTitle}</p>
                <div className="grid grid-cols-3 gap-2">
                  {([["none", "لم أختبر"], ["waiting", "بانتظار النتيجة"], ["scored", "أدخل درجتي"]] as const).map(([st, label]) => (
                    <button key={st} onClick={() => { setScoreErr(""); setScore(k, { state: st, ...(st !== "scored" ? { value: "" } : {}) }); }}
                      className="rounded-xl py-2 px-1 font-bold t-caption leading-snug text-center transition"
                      style={s.state === st ? { background: "var(--accent)", color: "#fff", border: "none" } : { background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{label}</button>
                  ))}
                </div>
                {s.state === "scored" && (
                  <div>
                    <input value={s.value} inputMode="decimal" onChange={(ev) => { setScoreErr(""); setScore(k, { value: ev.target.value }); }}
                      placeholder="درجتك" maxLength={6}
                      className="w-full rounded-xl px-3 py-2.5 t-body text-center text-[var(--text)] placeholder-[var(--text-muted)] outline-none" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }} />
                    {range && <p className="t-caption mt-1 px-1" style={{ color: "var(--text-muted)" }}>{range.hint}</p>}
                    {band && scoreVal != null && s.value.trim() && (
                      <>
                        {/* بطاقة التقييم العام: درجة/١٠٠ + شريط + مستوى + نسبة مئوية رسمية */}
                        <div className="rounded-xl px-3.5 py-3 mt-2 rise" style={{ background: "var(--surface2)", border: "1.5px solid color-mix(in srgb, var(--accent) 20%, var(--border))" }}>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>التقييم العام</span>
                            <span className="t-h3 font-black font-mono-nums" style={{ color: "var(--text)" }}>{scoreOutOf(scoreVal)}</span>
                          </div>
                          <div className="mt-2 h-2.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--text-muted) 22%, transparent)" }}>
                            <div className="h-full rounded-full eval-bar-fill" style={{ width: `${evalBarPct(scoreVal)}%`, background: bandColor(band.icon) }} />
                          </div>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-[15px]">{band.icon}</span>
                            <span className="t-body font-bold" style={{ color: "var(--text)" }}>{band.label}</span>
                            {pctText && <span className="t-caption" style={{ color: "var(--text-muted)" }}>· {pctText}</span>}
                          </div>
                          {/* مقارنة الطالب بنفسه — تظهر فقط إن كانت له محاولةٌ سابقة */}
                          {delta != null && delta > 0 && (
                            <p className="t-caption font-bold mt-1.5" style={{ color: "var(--success)" }}>▲ أفضل من نتيجتك السابقة بـ +{n(delta)}</p>
                          )}
                          {delta != null && delta < 0 && (
                            <p className="t-caption mt-1.5" style={{ color: "var(--text-muted)" }}>▼ أقل من نتيجتك السابقة بـ {n(Math.abs(delta))}</p>
                          )}
                          {delta === 0 && (
                            <p className="t-caption mt-1.5" style={{ color: "var(--text-muted)" }}>= مثل نتيجتك السابقة</p>
                          )}
                        </div>
                        {/* ماذا لو رفعت درجتك؟ — من شروط الفرص الفعلية لا أرقامٍ مخترعة */}
                        {whatIf && (
                          <div className="rounded-xl px-3.5 py-3 mt-2.5 rise" style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface2))", border: "1px dashed color-mix(in srgb, var(--accent) 35%, transparent)" }}>
                            <p className="t-caption font-bold mb-1.5" style={{ color: "var(--accent-light)" }}>✨ لو رفعت درجتك إلى {n(whatIf.target)}</p>
                            <div className="flex flex-col gap-1">
                              {whatIf.unlocks.map((u) => (
                                <span key={u.id} className="t-caption font-bold" style={{ color: "var(--text)" }}>✅ يفتح لك: {u.label}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-2.5">
                          <p className="t-caption font-bold mb-1.5" style={{ color: "var(--text-dim)" }}>راضٍ عن درجتك؟</p>
                          <div className="flex gap-2">
                            <button onClick={() => setRetakeIntent((m) => ({ ...m, [SCORE_META[k].resultTitle]: false }))} className="flex-1 py-2 rounded-xl font-bold t-caption" style={retakeIntent[SCORE_META[k].resultTitle] === false ? { background: "var(--success)", color: "#04240f", border: "none" } : { background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>نعم، مناسبة</button>
                            <button onClick={() => setRetakeIntent((m) => ({ ...m, [SCORE_META[k].resultTitle]: true }))} className="flex-1 py-2 rounded-xl font-bold t-caption" style={retakeIntent[SCORE_META[k].resultTitle] === true ? { background: "var(--accent)", color: "#fff", border: "none" } : { background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>لا، سأعيد 📈</button>
                          </div>
                        </div>
                        {/* موعد الاختبار — يظهر فقط عند نيّة الإعادة (لا نسأل الراضي) */}
                        {retakeIntent[SCORE_META[k].resultTitle] === true && (
                          <div className="mt-2.5">
                            <p className="t-caption font-bold mb-1.5" style={{ color: "var(--text-dim)" }}>متى موعد اختبارك القادم؟ <span className="font-normal" style={{ color: "var(--text-muted)" }}>(لنبني خطتك)</span></p>
                            <input type="date" value={examDates[SCORE_META[k].rangeTitle] ?? ""} min={today}
                              onChange={(ev) => setExamDate(SCORE_META[k].rangeTitle, ev.target.value)}
                              className="w-full rounded-xl px-3 py-2.5 t-body outline-none" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {/* يفتح لك */}
          {outlookItems.some((o) => o.icon !== "⚪") && (
            <div className="rounded-2xl px-4 py-3.5" style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>
              <p className="eyebrow mb-2.5">يفتح لك</p>
              <div className="flex flex-col gap-1.5">
                {outlookItems.filter((o) => o.icon !== "⚪").map((o) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <span className="text-[16px]">{o.icon}</span>
                    <span className="font-bold t-body" style={{ color: "var(--text)" }}>{o.label}</span>
                    <span className="t-caption" style={{ color: "var(--text-muted)" }}>· {o.note}</span>
                  </div>
                ))}
              </div>
              <p className="t-caption mt-2.5" style={{ color: "var(--text-muted)" }}>{OUTLOOK_DISCLAIMER}</p>
            </div>
          )}
          {scoreErr && <p className="t-small text-center font-bold" style={{ color: "var(--danger)" }}>{scoreErr}</p>}
        </div>
      );

      /* ── أسلوب المذاكرة ── */
      case "style": return (
        <div>
          <p className="label mb-1">كيف تحبّ تذاكر؟</p>
          <p className="t-caption mb-4" style={{ color: "var(--text-muted)" }}>نرتّب لك المصادر على ذوقك</p>
          <div className="flex flex-col gap-2.5">
            {([["book", "📘 بالقراءة والكتب"], ["video", "🎬 بالفيديو والشرح"], ["both", "🧩 الاثنين معاً"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setStudyStyle(studyStyle === v ? "" : v)} className="rounded-2xl px-4 py-3.5 flex items-center gap-3 text-right font-bold t-body transition active:scale-[0.98]" style={chipStyle(studyStyle === v)}>{label}</button>
            ))}
          </div>
        </div>
      );

      /* ── الوقت اليومي (شريط ١–١٦) ── */
      case "time": return (
        <div>
          <p className="label mb-1">كم ساعة تستطيع المذاكرة يومياً؟</p>
          <p className="t-caption mb-6" style={{ color: "var(--text-muted)" }}>نبني خطتك على وقتك الحقيقي — تقدر تعدّلها لاحقاً</p>
          <div className="text-center mb-5">
            <span className="t-display font-black font-mono-nums" style={{ color: "var(--accent-light)" }}>{n(studyHours)}</span>
            <span className="t-body font-bold mr-2" style={{ color: "var(--text-muted)" }}>ساعة يومياً</span>
          </div>
          <input type="range" min={1} max={16} step={1} value={studyHours}
            onChange={(e) => setStudyHours(parseInt(e.target.value))}
            aria-label="ساعات المذاكرة اليومية"
            className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ accentColor: "var(--accent)", background: "var(--surface2)" }} />
          <div className="flex justify-between mt-2">
            <span className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{n(1)} ساعة</span>
            <span className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{n(16)} ساعة</span>
          </div>
        </div>
      );

      /* ── الجامعي (مختصر) ── */
      case "uni": return (
        <div className="flex flex-col gap-5">
          <div>
            <p className="label mb-3">🏛️ جامعتك</p>
            {universityId ? (
              <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid color-mix(in srgb, var(--accent) 28%, transparent)" }}>
                <span className="font-bold t-body-lg flex-1" style={{ color: "var(--accent-light)" }}>{universityId === "other" ? (otherUni.trim() || "أخرى") : universityName}</span>
                <button onClick={() => { setUniversityId(""); setUniversityName(""); }} className="t-small font-bold px-2" style={{ color: "var(--text-muted)" }}>تغيير ✕</button>
              </div>
            ) : (
              <>
                <input value={uniQuery} onChange={(e) => setUniQuery(e.target.value)} placeholder="🔎 ابحث عن جامعتك..." className="w-full rounded-2xl px-4 py-3 t-body text-[var(--text)] placeholder-[var(--text-muted)] outline-none mb-2.5" style={inputStyle} />
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {filteredUnis.map((u) => (<button key={u.id} onClick={() => pickUni(u.id)} className="px-3 py-2 rounded-full font-bold t-small transition active:scale-95" style={{ background: "var(--surface2)", color: "var(--text)", border: "1.5px solid var(--border)" }}>{u.name}</button>))}
                </div>
              </>
            )}
            {universityId === "other" && (
              <input value={otherUni} onChange={(e) => { setOtherUni(e.target.value); setUniversityName(e.target.value.trim() || "أخرى"); }} placeholder="اكتب اسم جامعتك" maxLength={60} className="w-full mt-2.5 rounded-2xl px-4 py-3 t-body text-[var(--text)] placeholder-[var(--text-muted)] outline-none" style={inputStyle} />
            )}
          </div>
          <div>
            <p className="label mb-3">📚 تخصصك</p>
            <div className="flex flex-wrap gap-2">
              {MAJORS.map((m) => { const on = majorId === m.id; return (<button key={m.id} onClick={() => setMajorId(on ? "" : m.id)} className="px-3 py-2 rounded-full font-bold t-small transition active:scale-95" style={{ background: on ? "var(--accent)" : "var(--surface2)", color: on ? "#fff" : "var(--text)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}` }}>{m.name}</button>); })}
            </div>
          </div>
          <div>
            <p className="label mb-1">معدلك الجامعي؟ <span className="t-caption font-normal" style={{ color: "var(--text-muted)" }}>(من ٥)</span></p>
            <input type="number" value={universityGpa} onChange={(e) => setUniversityGpa(e.target.value)} placeholder="مثال: 3.75" min={0} max={5} step={0.01} className="w-full rounded-2xl px-5 py-4 t-body-lg text-[var(--text)] placeholder-[var(--text-muted)] outline-none" style={inputStyle} />
          </div>
        </div>
      );

      /* ── الملخّص ── */
      case "summary": return <SummaryStep name={name.trim()} status={status} goal={goal} firstStep={firstExamLabel}
        examRows={orderedSelected.map((id) => {
          const key = EXAM_SCORE_KEY[id];
          const mark = key ? (scores[key].state === "scored" ? "✅" : scores[key].state === "waiting" ? "⏳" : "❌") : "•";
          return { label: examLabelOf(id), mark };
        })}
        region={region} uni={{ name: universityName || (universityId === "other" ? otherUni.trim() : ""), major: findMajor(majorId)?.name, year: universityYear }} />;

      default: return null;
    }
  })();

  const isLast = current === "summary";
  return (
    <div className="min-h-dvh flex flex-col app-col">
      {header}
      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full flex flex-col">
        {progress}
        <div className="flex-1">{stepBody}</div>
        {submitErr && <p className="t-small text-center font-bold mt-4" style={{ color: "var(--danger)" }}>{submitErr}</p>}
        <div className="flex flex-col gap-2 mt-7">
          {isLast ? (
            <button className="btn-primary glow-blue" onClick={finish} disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.5 : 1 }}>
              {isSubmitting ? "جارٍ الحفظ…" : "🚀 ابدأ رحلتك"}
            </button>
          ) : (
            <button className="btn-primary glow-blue" onClick={goNext} disabled={!canProceed()} style={{ opacity: canProceed() ? 1 : 0.4 }}>التالي ←</button>
          )}
          {current !== "welcome" && <button onClick={goBack} className="t-body font-semibold w-full text-center py-1" style={{ color: "var(--text-muted)" }}>← رجوع</button>}
        </div>
      </div>
    </div>
  );
}

/* ════════ الملخّص ════════ */
function SummaryStep({ name, status, goal, examRows, firstStep, region, uni }: {
  name: string; status: Status | ""; goal: ReturnType<typeof resolveGoals>;
  examRows: { label: string; mark: string }[]; firstStep?: string;
  region: string; uni: { name?: string; major?: string; year?: string };
}) {
  const near = nearestUniversity(region);
  const goalLabels = goal.undecided ? ["درب يحدّدها لك"] : goal.targets.map((t) =>
    ({ university: "الجامعة", aramco: "أرامكو CPC", itc: "ITC", military: "الكليات العسكرية", scholarship: "الابتعاث" } as Record<string, string>)[t] ?? t);
  return (
    <div className="flex flex-col gap-4">
      <p className="t-h2 font-black" style={{ color: "var(--text)" }}>أهلاً بك يا {name} 👋</p>
      {status === "جامعي" ? (
        <div className="rounded-2xl px-4 py-4 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
          <p className="t-body" style={{ color: "var(--text)" }}>🎓 {[uni.name, uni.major, uni.year ? `السنة ${uni.year}` : ""].filter(Boolean).join(" · ")}</p>
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>ركّزنا لك عالمك الجامعي — معدّلك وتدريبك ومهاراتك. بلا قدرات ولا تحصيلي.</p>
        </div>
      ) : (
        <>
          <SummaryRow icon="🎯" title="هدفك">{goalLabels.join(" · ")}</SummaryRow>
          {examRows.length > 0 && (
            <SummaryRow icon="📝" title="اختباراتك">
              <div className="flex flex-col gap-1 mt-1">
                {examRows.map((r) => <span key={r.label} className="t-body">{r.mark} {r.label}</span>)}
              </div>
            </SummaryRow>
          )}
          {near && <SummaryRow icon="🏛️" title="أقرب جامعة">{near.name}</SummaryRow>}
          <SummaryRow icon="🗺️" title="خطة درب">
            {firstStep ? `ابدأ بـ${firstStep}` : "ابدأ ببناء أساسك المدرسي"}
          </SummaryRow>
        </>
      )}
    </div>
  );
}
function SummaryRow({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl px-4 py-3 flex items-start gap-3" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
      <span className="text-[20px] flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>{title}</p>
        <div className="t-body font-bold" style={{ color: "var(--text)" }}>{children}</div>
      </div>
    </div>
  );
}

/* ════════ التقرير الشخصي (٥ ثوانٍ) ════════ */
function ReportScreen({ name, scores, outlook, undecided, firstStep, region }: {
  name: string;
  scores: Record<ScoreKey, { state: "none" | "waiting" | "scored"; value: string }>;
  outlook: ReturnType<typeof admissionOutlook>; undecided?: boolean; firstStep?: string; region: string;
}) {
  const val = (k: ScoreKey) => (scores[k].state === "scored" ? parseFloat(scores[k].value) : null);
  const level = evalBand("qudurat", val("qudurat")) ?? evalBand("tahsili", val("tahsili"));
  const levelPct = percentileText(level);
  const ready = readiness(outlook, undecided);
  const near = nearestUniversity(region);
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-10 app-col text-center page-enter">
      <div className="max-w-sm w-full flex flex-col gap-4">
        <p className="t-caption font-bold" style={{ color: "var(--accent-light)" }}>درب فهمك 👇</p>
        <p className="t-h1 font-black" style={{ color: "var(--text)" }}>جاهزٌ يا {name}</p>

        {level && (
          <div className="rounded-2xl px-4 py-4 rise rise-1" style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--accent) 25%, var(--border))" }}>
            <p className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>مستواك الحالي</p>
            <p className="t-h2 font-black mt-1" style={{ color: "var(--text)" }}>{level.icon} {level.label}</p>
            {levelPct && <p className="t-caption mt-1" style={{ color: "var(--text-muted)" }}>{levelPct}</p>}
          </div>
        )}

        {outlook.some((o) => o.icon !== "⚪") && (
          <div className="rounded-2xl px-4 py-4 text-right rise rise-2" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
            <p className="t-caption font-bold mb-2" style={{ color: "var(--text-muted)" }}>فرصك الحالية</p>
            <div className="flex flex-col gap-1.5">
              {outlook.filter((o) => o.icon !== "⚪").map((o) => (
                <div key={o.id} className="flex items-center gap-2">
                  <span className="text-[16px]">{o.icon}</span>
                  <span className="font-bold t-body" style={{ color: "var(--text)" }}>{o.label}</span>
                  <span className="t-caption" style={{ color: "var(--text-muted)" }}>· {o.note}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl px-4 py-3 text-right rise rise-3" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
          <p className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>أول خطوة ننصح بها</p>
          <p className="t-body font-bold mt-0.5" style={{ color: "var(--text)" }}>{firstStep ? `ابدأ بـ${firstStep}` : "ابدأ ببناء أساسك المدرسي"}{near ? ` · أقرب جامعة: ${near.name}` : ""}</p>
        </div>

        {/* مستوى الجاهزية — بطاقةٌ واحدة تلخّص أين يقف الطالب من فرصه */}
        {ready && (
          <div className="rounded-2xl px-4 py-4 text-right rise rise-4" style={{ background: `color-mix(in srgb, ${bandColor(ready.icon)} 10%, var(--surface))`, border: `1.5px solid color-mix(in srgb, ${bandColor(ready.icon)} 40%, var(--border))` }}>
            <div className="flex items-center gap-2">
              <span className="text-[20px]">{ready.icon}</span>
              <p className="t-title font-black" style={{ color: "var(--text)" }}>{ready.title}</p>
            </div>
            <p className="t-caption mt-1.5" style={{ color: "var(--text-muted)" }}>{ready.reason}</p>
          </div>
        )}

        {/* تنبيهٌ رسمي ثابت في نهاية التقرير */}
        <p className="t-caption rise rise-5" style={{ color: "var(--text-muted)" }}>هذا التقرير إرشادي فقط، وتعتمد الحدود النهائية للقبول على الجهات الرسمية التي تُحدّث شروطها سنوياً.</p>
        <p className="t-caption" style={{ color: "var(--text-dim)" }}>نجهّز لوحتك…</p>
      </div>
    </div>
  );
}
