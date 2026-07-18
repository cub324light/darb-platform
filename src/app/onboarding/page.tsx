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
  loadTrackExamDates, saveTrackExamDates, type DarbUser } from "@/lib/storage";
import { currentAcademicYearId, currentTermGuess, type TermGuess } from "@/lib/academicCalendar";
import { toBoardStage } from "@/lib/examEligibility";
import { recommendedExams, type RecommendedExam } from "@/lib/recommendedExams";
import { resolveGoals, type PrimaryGoal, type AramcoSub, type MajorLean } from "@/lib/onboarding/goals";
import { admissionOutlook, OUTLOOK_DISCLAIMER } from "@/lib/onboarding/outlook";
import { recExamRank, UNDECIDED_EXAM_CARDS } from "@/lib/onboarding/examCatalog";
import { getQuduratBand, getTahsiliBand } from "@/lib/darbKnowledge";
import { SA_REGIONS, nearestUniversity } from "@/lib/saRegions";
import { n } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { redeemPendingRef } from "@/lib/referral";
import Dome from "@/components/Dome";
import Logo from "@/components/Logo";

/* ── نموذج المراحل ── */
type Status = "ثانوي" | "جامعي" | "خريج";
const STAGES: { key: string; label: string; status: Status; grade: string }[] = [
  { key: "g1",   label: "أول ثانوي",   status: "ثانوي", grade: "أول ثانوي" },
  { key: "g2",   label: "ثاني ثانوي",  status: "ثانوي", grade: "ثاني ثانوي" },
  { key: "g3",   label: "ثالث ثانوي",  status: "ثانوي", grade: "ثالث ثانوي" },
  { key: "grad", label: "خريج",        status: "خريج",  grade: "" },
  { key: "uni",  label: "طالب جامعي",  status: "جامعي", grade: "" },
];
const UNI_YEARS = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة+"];

/* ── نموذج الخطوات (يُبنى حسب المرحلة) ── */
type StepKey =
  | "welcome" | "stage" | "region" | "goal" | "exams" | "scores"
  | "dates" | "style" | "time" | "summary" | "uni";
const SECONDARY_STEPS: StepKey[] = ["welcome", "stage", "region", "goal", "exams", "scores", "style", "time", "summary"];
const UNI_STEPS: StepKey[] = ["welcome", "stage", "uni", "style", "time", "summary"];
/* «ما أدري»: نعرض له أوسع فرصٍ ممكنة بدل إخفاء الاختبارات. */
const ALL_TARGETS = ["university", "aramco", "itc", "military", "scholarship"];
/* اختبارات القياس/اللغة العامّة — للطالب غير المحدّد هدفه (يُدخل درجاته ويرى مستواه). */
const UNIVERSAL_SCORABLE: RecommendedExam[] = [
  { kind: "qudurat", boardId: "qudurat", label: "القدرات", reason: "أساس القبول الجامعي والبرامج", state: "available", priority: 1 },
  { kind: "tahsili", boardId: "tahsiliRegular", label: "التحصيلي", reason: "مطلوب للتخصصات العلمية والصحية", state: "available", priority: 2 },
  { kind: "language", label: "STEP", reason: "لوجهات الابتعاث/الوظيفة/تطوير الإنجليزية", state: "available", priority: 3 },
];

/* ── الهدف الهرمي ── */
const GOAL_OPTIONS: { id: PrimaryGoal; icon: string; label: string }[] = [
  { id: "university",  icon: "🎓", label: "الجامعة" },
  { id: "aramco",      icon: "🏭", label: "أرامكو وبرامجها" },
  { id: "military",    icon: "🪖", label: "الكليات العسكرية" },
  { id: "scholarship", icon: "✈️", label: "الابتعاث" },
  { id: "undecided",   icon: "⭐", label: "ما أدري — درب يحدّدها لي" },
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
const scoreKeyOf = (e: RecommendedExam): ScoreKey | null =>
  e.kind === "qudurat" ? "qudurat" : e.kind === "tahsili" ? "tahsili" : e.kind === "language" ? "step" : null;

/* recommendedExams → TrackId قديم (لبذر مساري عبر ensureWorkspace). */
function tracksFromRec(rec: RecommendedExam[]): TrackId[] {
  const t = new Set<TrackId>();
  for (const e of rec) {
    if (e.kind === "qudurat") t.add("قدرات");
    else if (e.kind === "tahsili") t.add(e.boardId === "tahsiliEarly" ? "تحصيلي مبكر" : "تحصيلي");
    else if (e.kind === "aramco") t.add("CPC");
    else if (e.kind === "itc") t.add("ITC");
    else if (e.kind === "language") t.add("ستيب");
  }
  return [...t];
}

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
  const [grade, setGrade] = useState("");
  const [term, setTerm] = useState<TermGuess>(() => (typeof window !== "undefined" ? currentTermGuess() : "first"));
  const [gradStage, setGradStage] = useState("");

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
  const boardStage = toBoardStage({ studyLevel: status || undefined, grade });
  const recExams: RecommendedExam[] = boardStage ? recommendedExams({
    destinations: goal.targets, stage: boardStage,
    isUniGrad: gradStage === "خريج جامعة",
    afterFirstTerm: status === "ثانوي" ? term !== "first" : false,
    today,
  }) : [];
  /* الترتيب الرسمي للعرض (قرار المالك) — لا فرز عشوائي. */
  const orderedRec = [...recExams].sort((a, b) => recExamRank(a) - recExamRank(b));
  const displayExams = orderedRec; // كل الاختبارات المطلوبة (تشمل CPC/ITC) مرتّبة
  /* «ما أدري» → اختبارات عامّة لإدخال الدرجة؛ وإلا القابلة للتقييم من المُوصى بها. */
  const scorableExams = (goal.undecided ? UNIVERSAL_SCORABLE : orderedRec.filter((e) => scoreKeyOf(e) !== null))
    .sort((a, b) => recExamRank(a) - recExamRank(b));
  /* أول خطوة موصى بها: أول اختبارٍ مطلوب، وإلا القدرات (للطالب غير المحدّد هدفه). */
  const firstExamLabel = displayExams[0]?.label ?? scorableExams[0]?.label;

  const num = (v: string) => { const x = parseFloat(v); return Number.isFinite(x) ? x : null; };
  /* «ما أدري» → أوسع فرصٍ ممكنة (كل الوجهات) حتى لا يفوّت الطالب فرصة. */
  const outlookTargets = goal.undecided ? ALL_TARGETS : goal.targets;
  const outlookItems = admissionOutlook({
    targets: outlookTargets, trackType: goal.trackType,
    qudurat: scores.qudurat.state === "scored" ? num(scores.qudurat.value) : null,
    tahsili: scores.tahsili.state === "scored" ? num(scores.tahsili.value) : null,
    step: scores.step.state === "scored" ? num(scores.step.value) : null,
  });

  /* ── قائمة الخطوات (متكيّفة) ── */
  const steps = status === "جامعي" ? UNI_STEPS : SECONDARY_STEPS;
  const idx = Math.max(0, steps.indexOf(current));
  const total = steps.length - 1; // الترحيب = ٠

  const filteredUnis = (() => { const q = uniQuery.trim(); return q ? UNIVERSITIES.filter((u) => u.name.includes(q) || (u.region ?? "").includes(q)) : UNIVERSITIES; })();
  const pickUni = (id: string) => { const u = findUniversity(id); if (!u) return; setUniversityId(id); setUniversityName(id === "other" ? (otherUni.trim() || "أخرى") : u.name); setUniQuery(""); };

  /* ── التحقّق لكل خطوة ── */
  const canProceed = (): boolean => {
    switch (current) {
      case "welcome": return name.trim().length > 0;
      case "stage":   return !!status && (status !== "ثانوي" || !!grade);
      case "region":  return !!region;
      case "goal":    return primaryGoals.length > 0;
      case "uni":     return !!universityId && !!majorId && !!universityYear;
      default:        return true; // exams/scores/dates/style/time — غير حاجزة
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
      const tracks = status === "جامعي" ? [] : tracksFromRec(recExams);
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
        universityYear: status === "جامعي" && universityYear ? universityYear : undefined,
        targets: goal.targets.length ? goal.targets : undefined,
        goalUndecided: goal.undecided || undefined,
        retakeExams: (() => { const r = Object.keys(retakeIntent).filter((k) => retakeIntent[k]); return r.length ? r : undefined; })(),
        studyHours,
        studyStyle: studyStyle || undefined,
        trackType: resolvedTrackType,
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
    firstStep={firstExamLabel} region={region} />;

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

      /* ── الصف الدراسي ── */
      case "stage": return (
        <div>
          <p className="label mb-1">وش صفّك الدراسي؟</p>
          <p className="t-caption mb-4" style={{ color: "var(--text-muted)" }}>نبني رحلتك حسب مرحلتك بالضبط</p>
          <div className="grid grid-cols-2 gap-2.5">
            {STAGES.map((s) => {
              const on = status === s.status && (s.status !== "ثانوي" || grade === s.grade);
              return (
                <button key={s.key}
                  onClick={() => { if (on) { setStatus(""); setGrade(""); return; } setStatus(s.status); setGrade(s.grade); }}
                  className={`rounded-2xl py-3.5 font-bold t-body transition active:scale-[0.98] ${s.key === "uni" ? "col-span-2" : ""}`}
                  style={chipStyle(on)}>{s.label}</button>
              );
            })}
          </div>
          {status === "ثانوي" && (
            <div className="mt-5">
              <p className="label mb-1">أنت الآن في أي فصل؟</p>
              <p className="t-caption mb-3" style={{ color: "var(--text-muted)" }}>يحدّد ما يناسبك من الاختبارات ومواعيدها</p>
              <div className="grid grid-cols-3 gap-2">
                {([["first", "الأول"], ["second", "الثاني"], ["summer", "الصيفية"]] as [TermGuess, string][]).map(([v, label]) => (
                  <button key={v} onClick={() => setTerm(v)} className="rounded-2xl py-3 px-2 font-bold t-small leading-snug transition active:scale-[0.98]" style={chipStyle(term === v)}>{label}</button>
                ))}
              </div>
            </div>
          )}
          {status === "خريج" && (
            <div className="mt-5">
              <p className="label mb-3">نوع تخرّجك؟</p>
              <div className="grid grid-cols-2 gap-2.5">
                {["خريج ثانوي", "خريج جامعة"].map((g) => (
                  <button key={g} onClick={() => setGradStage(gradStage === g ? "" : g)} className="rounded-2xl py-3.5 font-bold t-body transition active:scale-[0.98]" style={chipStyle(gradStage === g)}>{g}</button>
                ))}
              </div>
            </div>
          )}
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
                <p className="label mb-1">وش التخصص اللي يميل له قلبك؟ <span className="t-caption font-normal" style={{ color: "var(--text-muted)" }}>(اختياري)</span></p>
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

      /* ── الاختبارات المطلوبة (مشتقّة) / كل الفرص («ما أدري») ── */
      case "exams": return goal.undecided ? (
        <div>
          <p className="label mb-1">كل الاختبارات وفُرصها</p>
          <p className="t-body mb-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>بما أنك لم تحدّد هدفك بعد، هذه جميع الاختبارات التي قد تفتح لك فرصاً مستقبلية.</p>
          <div className="flex flex-col gap-2.5">
            {UNDECIDED_EXAM_CARDS.map((c) => (
              <div key={c.id} className="rounded-2xl px-4 py-3.5" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
                <p className="font-black t-title" style={{ color: "var(--text)" }}>{c.label}</p>
                <p className="t-caption font-bold mt-1.5 mb-1" style={{ color: "var(--accent-light)" }}>يفتح لك:</p>
                <ul className="flex flex-col gap-1">
                  {c.opens.map((o) => (
                    <li key={o} className="t-body flex items-start gap-2" style={{ color: "var(--text-muted)" }}>
                      <span className="flex-shrink-0 mt-2 w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                      <span className="leading-relaxed">{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="t-body font-bold text-center mt-4" style={{ color: "var(--text)" }}>لا تقلق، يمكنك تغيير هدفك لاحقاً في أي وقت.</p>
        </div>
      ) : (
        <div>
          <p className="label mb-1">اختباراتك المطلوبة</p>
          <p className="t-caption mb-4" style={{ color: "var(--text-muted)" }}>مشتقّة تلقائياً من هدفك ومرحلتك</p>
          {displayExams.length === 0 ? (
            <div className="rounded-2xl px-4 py-4 flex items-start gap-3" style={{ background: "color-mix(in srgb, var(--accent) 7%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>
              <span className="text-[22px]">🌱</span>
              <p className="t-body" style={{ color: "var(--text)" }}>لا اختبارات قبولٍ في مرحلتك الآن — ركّز على أساسك المدرسي، ودرب يجهّزك للاختبارات في وقتها.</p>
            </div>
          ) : (
            <>
              <p className="t-body font-bold mb-2.5" style={{ color: "var(--text)" }}>ستحتاج إلى:</p>
              <div className="flex flex-col gap-2.5">
                {displayExams.map((e) => (
                  <div key={e.boardId ?? e.kind} className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--surface)", border: "1.5px solid color-mix(in srgb, var(--accent) 25%, var(--border))" }}>
                    <span className="text-[18px]">🟢</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold t-body" style={{ color: "var(--text)" }}>{e.label}</p>
                      <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{e.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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
            const k = scoreKeyOf(e)!;
            const s = scores[k];
            const range = scoreRangeForTitle(SCORE_META[k].rangeTitle);
            const band = k === "qudurat" ? getQuduratBand(num(s.value)) : k === "tahsili" ? getTahsiliBand(num(s.value)) : null;
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
                    {band && s.value.trim() && (
                      <>
                        <p className="t-body font-bold mt-2" style={{ color: "var(--text)" }}>التقييم: {band.icon} {band.label}</p>
                        <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{band.note}</p>
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
            <p className="label mb-3">سنتك الدراسية؟</p>
            <div className="grid grid-cols-3 gap-2">
              {UNI_YEARS.map((y) => (<button key={y} onClick={() => setUniversityYear(universityYear === y ? "" : y)} className="rounded-2xl py-3 font-bold t-body transition active:scale-[0.98]" style={chipStyle(universityYear === y)}>{y}</button>))}
            </div>
          </div>
          <div>
            <p className="label mb-1">معدلك الجامعي؟ <span className="t-caption font-normal" style={{ color: "var(--text-muted)" }}>(اختياري، من ٥)</span></p>
            <input type="number" value={universityGpa} onChange={(e) => setUniversityGpa(e.target.value)} placeholder="مثال: 3.75" min={0} max={5} step={0.01} className="w-full rounded-2xl px-5 py-4 t-body-lg text-[var(--text)] placeholder-[var(--text-muted)] outline-none" style={inputStyle} />
          </div>
        </div>
      );

      /* ── الملخّص ── */
      case "summary": return <SummaryStep name={name.trim()} status={status} goal={goal} recExams={displayExams} firstStep={firstExamLabel}
        scores={scores} region={region} uni={{ name: universityName || (universityId === "other" ? otherUni.trim() : ""), major: findMajor(majorId)?.name, year: universityYear }} />;

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
function SummaryStep({ name, status, goal, recExams, firstStep, scores, region, uni }: {
  name: string; status: Status | ""; goal: ReturnType<typeof resolveGoals>; recExams: RecommendedExam[]; firstStep?: string;
  scores: Record<ScoreKey, { state: "none" | "waiting" | "scored"; value: string }>;
  region: string; uni: { name?: string; major?: string; year?: string };
}) {
  const near = nearestUniversity(region);
  const goalLabels = goal.undecided ? ["درب يحدّدها لك"] : goal.targets.map((t) =>
    ({ university: "الجامعة", aramco: "أرامكو CPC", itc: "ITC", military: "الكليات العسكرية", scholarship: "الابتعاث" } as Record<string, string>)[t] ?? t);
  const examState = (e: RecommendedExam): string => {
    const k = scoreKeyOf(e);
    if (!k) return "⏳";
    return scores[k].state === "scored" ? "✅" : scores[k].state === "waiting" ? "⏳" : "❌";
  };
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
          {recExams.length > 0 && (
            <SummaryRow icon="📝" title="اختباراتك">
              <div className="flex flex-col gap-1 mt-1">
                {recExams.map((e) => <span key={e.boardId ?? e.kind} className="t-body">{examState(e)} {e.label}</span>)}
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
function ReportScreen({ name, scores, outlook, firstStep, region }: {
  name: string;
  scores: Record<ScoreKey, { state: "none" | "waiting" | "scored"; value: string }>;
  outlook: ReturnType<typeof admissionOutlook>; firstStep?: string; region: string;
}) {
  const val = (k: ScoreKey) => (scores[k].state === "scored" ? parseFloat(scores[k].value) : null);
  const qBand = getQuduratBand(val("qudurat"));
  const tBand = getTahsiliBand(val("tahsili"));
  const level = qBand ?? tBand;
  const near = nearestUniversity(region);
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-10 app-col text-center page-enter">
      <div className="max-w-sm w-full flex flex-col gap-5">
        <p className="t-caption font-bold" style={{ color: "var(--accent-light)" }}>درب فهمك 👇</p>
        <p className="t-h1 font-black" style={{ color: "var(--text)" }}>جاهزٌ يا {name}</p>

        {level && (
          <div className="rounded-2xl px-4 py-4" style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--accent) 25%, var(--border))" }}>
            <p className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>مستواك الحالي</p>
            <p className="t-h2 font-black mt-1" style={{ color: "var(--text)" }}>{level.icon} {level.label}</p>
          </div>
        )}

        {outlook.some((o) => o.icon !== "⚪") && (
          <div className="rounded-2xl px-4 py-4 text-right" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
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

        <div className="rounded-2xl px-4 py-3 text-right" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
          <p className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>أول خطوة ننصح بها</p>
          <p className="t-body font-bold mt-0.5" style={{ color: "var(--text)" }}>{firstStep ? `ابدأ بـ${firstStep}` : "ابدأ ببناء أساسك المدرسي"}{near ? ` · أقرب جامعة: ${near.name}` : ""}</p>
        </div>

        <p className="t-caption" style={{ color: "var(--text-muted)" }}>نجهّز لوحتك…</p>
      </div>
    </div>
  );
}
