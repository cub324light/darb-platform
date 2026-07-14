"use client";
import { useState, useEffect } from "react";
import {
  TRACKS, basicTracksFor, STUDY_GOALS, goalLabelFor, scoreRangeForTitle, validateScore,
  trackEligibilityFor, LANGUAGE_TESTS, primaryGoal,
  type StudyGoalType, type TrackId,
} from "@/lib/tracks";
import { UNIVERSITIES, MAJORS, findUniversity, findMajor } from "@/lib/university";
import { saveUser, saveExamDate, saveResults, saveTrackExamDates, loadGoals, saveGoals } from "@/lib/storage";
import { ADMISSION_TARGETS } from "@/lib/targets";
import { currentAcademicYearId, currentTermGuess, type TermGuess } from "@/lib/academicCalendar";
import { currentRegistrationStatus } from "@/lib/examProvider";
import { examBoard, type BoardStage, type ExamBoardId, type ExamMode } from "@/lib/examEligibility";
/* registerUser, pushBackup, currentUser مُستورَدة ديناميكياً أسفل */
import { trackEvent } from "@/lib/analytics";
import { redeemPendingRef } from "@/lib/referral";
import Dome from "@/components/Dome";
import Logo from "@/components/Logo";

type Status = "ثانوي" | "جامعي" | "خريج";
/* مرحلة واحدة بخمسة خيارات صريحة (تحلّ محل «الحالة» ثم قائمة المواضع) — أبسط وأقل
   نقرات، ويشتقّ منها studyLevel + grade مباشرةً. الصف القياسي يبقى مصدر الأهلية. */
const STAGES: { key: string; label: string; status: Status; grade: string }[] = [
  { key: "g1",   label: "أول ثانوي",   status: "ثانوي", grade: "أول ثانوي" },
  { key: "g2",   label: "ثاني ثانوي",  status: "ثانوي", grade: "ثاني ثانوي" },
  { key: "g3",   label: "ثالث ثانوي",  status: "ثانوي", grade: "ثالث ثانوي" },
  { key: "uni",  label: "طالب جامعي",  status: "جامعي", grade: "" },
  { key: "grad", label: "خريج",        status: "خريج",  grade: "" },
];
/* المسار = ميول تحدّد المواد والاهتمامات (المعرّف يبقى فئة منطقية؛ العرض أوضح).
   الهندسة والحاسب مدموجان في خيارٍ واحد (المعرّف «هندسي»، ويُنقّحه التخصص لاحقاً). */
const TRACK_TYPES: { id: string; label: string }[] = [
  { id: "عام",   label: "المسار العام" },
  { id: "صحي",   label: "مسار الصحة والحياة" },
  { id: "هندسي", label: "مسار الهندسة والحاسب" },
  { id: "إداري", label: "مسار إدارة الأعمال" },
];
const GRAD_STAGES = ["خريج ثانوي", "خريج جامعة"];
const UNI_YEARS = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة+"];
/* اختبارات النتائج السابقة — العناوين تطابق سُلّم الدرجات في tracks.ts */
const PREV_EXAMS = ["القدرات", "التحصيلي", "ستيب STEP"];

/* «اختبرت من قبل؟» حسب المرحلة — لا نسأل أول ثانوي عن القدرات/التحصيلي (ليست له)،
   ولا ثاني ثانوي عن التحصيلي. الخريج وثالث ثانوي: الكل. */
function visiblePrevExamsFor(status: string, grade: string): string[] {
  if (status === "خريج") return PREV_EXAMS;
  if (status !== "ثانوي") return [];
  if (grade === "أول ثانوي") return ["ستيب STEP"];
  if (grade === "ثاني ثانوي") return ["القدرات", "ستيب STEP"];
  return PREV_EXAMS; // ثالث ثانوي
}

/* بطاقة اختبار القياس تُقرأ من مصدر الحقيقة examEligibility: الاسم (مبكر/عادي) وحالته
   والظهور — لا اسم ثابت في الواجهة. المخفي لا يظهر أصلاً. */
const EXAM_TRACK: Record<ExamBoardId, TrackId> = {
  qudurat: "قدرات", tahsiliEarly: "تحصيلي مبكر", tahsiliRegular: "تحصيلي",
};
const MODE_COLOR: Record<ExamMode, string> = {
  "register-open": "var(--success)",
  "register-upcoming": "var(--gold)",
  "prepare": "var(--text-muted)",
  "pending": "var(--text-muted)",
};
/* هدف الاختبار → عنوان نتيجته السابقة (لصياغة «تحسين» بدل «الاستعداد» إن كان له درجة) */
const GOAL_PREV_EXAM: Partial<Record<StudyGoalType, string>> = {
  qudurat: "القدرات", tahsili: "التحصيلي", step: "ستيب STEP",
};
const SAUDI_REGIONS = [
  "الرياض", "مكة المكرمة", "المدينة المنورة", "القصيم", "المنطقة الشرقية",
  "عسير", "تبوك", "حائل", "الحدود الشمالية", "جازان", "نجران", "الباحة", "الجوف",
];

export default function OnboardingPage() {
  const [step, setStep] = useState<0 | 1 | 2>(0);

  /* ── الأساسيات ── */
  const [name, setName] = useState("");
  useEffect(() => {
    import("@/lib/cloud").then(({ currentUser }) => {
      const dn = currentUser()?.displayName;
      if (dn) setName((prev) => prev || dn.split(" ")[0]);
    });
  }, []);
  const [status, setStatus] = useState<Status | "">("");

  /* ── تفاصيل المرحلة ── */
  const [grade, setGrade] = useState("");                 // ثانوي (مشتق من خيار المرحلة)
  const [trackType, setTrackType] = useState("");         // ثانوي: المسار
  /* الفصل الدراسي الحالي — يحكم إتاحة التحصيلي المبكر. افتراضٌ من التقويم يؤكّده الطالب. */
  const [term, setTerm] = useState<TermGuess>(() => (typeof window !== "undefined" ? currentTermGuess() : "first"));
  const [gradStage, setGradStage] = useState("");         // خريج
  const [universityYear, setUniversityYear] = useState(""); // جامعي
  /* الجامعة/التخصص (جامعي + هدف الجامعة/التخصص) */
  const [universityId, setUniversityId] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [majorId, setMajorId] = useState("");
  const [uniQuery, setUniQuery] = useState("");
  const [otherUni, setOtherUni] = useState("");
  /* نتائج سابقة للخريج: { exam: { tested, score } } */
  const [prevResults, setPrevResults] = useState<Record<string, { tested: boolean; score: string }>>(
    Object.fromEntries(PREV_EXAMS.map((e) => [e, { tested: false, score: "" }]))
  );
  const [prevErr, setPrevErr] = useState("");
  /* H1: قفل ضغط مزدوج + رسالة فشل واضحة على آخر خطوة */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  const [gapYear, setGapYear] = useState<"" | "yes" | "no">(""); // خريج: إعادة الاختبارات؟
  /* ── حقول الجامعي (Phase Engine) — المعدل فقط في التسجيل؛ التدريب/الدراسات العليا
     تُضبط لاحقاً من المنصة لا هنا (أقل أسئلة، لا سؤال قياس للجامعي إطلاقاً) ── */
  const [universityGpa, setUniversityGpa] = useState("");

  /* ── الأهداف (متعدد بلا حد) — للخريج (الجامعي بلا أهداف قياس؛ الثانوي مشتقّ من نواته) ── */
  const [goals, setGoals] = useState<StudyGoalType[]>([]);
  /* أهداف ما بعد الثانوية (متعدّد) — لثالث ثانوي وخريج الثانوي؛ الرئيسية ترتّب بطاقاتها حولها */
  const [targets, setTargets] = useState<string[]>([]);
  /* ── اختبارات اللغة الإضافية (متعدد بلا حد) — للثانوي والخريج ── */
  const [selectedLanguages, setSelectedLanguages] = useState<TrackId[]>([]);
  const [seedGrade, setSeedGrade] = useState("");   // آخر صف ضُبط له فتح «الوجهة الجامعية» — لا نعيد ضبطه عند الرجوع بلا تغيير
  const [uniOpen, setUniOpen] = useState(false);    // «عندك وجهة جامعية؟» — بارز لثالث، مطوي لغيره
  const [extrasOpen, setExtrasOpen] = useState(false); // «معلومات إضافية» مطوية افتراضياً
  const [studyHours, setStudyHours] = useState("3"); // قيمة افتراضية — يعدّلها لاحقاً، لا تحجب الإكمال
  const [examDate, setExamDate] = useState("");
  const [school, setSchool] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [highschoolPct, setHighschoolPct] = useState("");

  /* المسارات المُفعّلة تلقائياً (الجامعي/الخريج) من الحالة + الهدف الأساسي + سنة الاستدراك */
  const computedTracks = basicTracksFor({
    status: status || undefined, grade, goal: primaryGoal(goals), gapYear: gapYear === "yes",
  });

  /* لوحة أهلية الاختبارات للثانوي — النجمة «مهم لمرحلتك» فقط (الظهور من examBoard) */
  const eligibility = status === "ثانوي" ? trackEligibilityFor({ status, grade }) : [];
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();

  /* ── جدول اختبارات القياس من مصدر الحقيقة examEligibility (المرحلة+الفصل+النافذة+الاستهداف) ──
     اللوحة والمسارات المفعّلة تقرآن منه معاً، فلا تناقض بين المعروض والمُفعَّل. */
  const boardStage: BoardStage | null =
    status === "ثانوي" ? (grade === "أول ثانوي" ? "first" : grade === "ثاني ثانوي" ? "second" : grade === "ثالث ثانوي" ? "third" : null)
    : status === "خريج" ? "graduate"
    : status === "جامعي" ? "university" : null;
  /* مُستهدَف للتحصيلي المبكر: له وجهة قبول أو اختار التحصيلي/الجامعة/التخصص هدفاً */
  const isTargeted = targets.length > 0 || goals.includes("tahsili") || goals.includes("university") || goals.includes("major");
  const examB = boardStage ? examBoard({
    stage: boardStage,
    isUniGrad: gradStage === "خريج جامعة",
    afterFirstTerm: term !== "first",
    isTargeted,
    windows: {
      qudurat: currentRegistrationStatus("قدرات", today),
      tahsiliEarly: currentRegistrationStatus("تحصيلي مبكر", today),
      tahsiliRegular: currentRegistrationStatus("تحصيلي", today),
    },
  }) : [];
  const qiyasTracks = examB.map((e) => EXAM_TRACK[e.id]);

  /* المسارات النهائية — اختبارات فقط (المدرسة قسمٌ مستقل، ليست اختباراً ولا تُحسب):
     - الثانوي: اختبارات القياس من examBoard + اللغات المختارة
     - الخريج: الحزمة التلقائية + اختبارات اللغة · الجامعي: الحزمة التلقائية فقط */
  const finalTracks =
    status === "ثانوي" ? [...new Set<TrackId>([...qiyasTracks, ...LANGUAGE_TESTS.filter((id) => selectedLanguages.includes(id))])] :
    status === "خريج"  ? [...new Set([...computedTracks, ...selectedLanguages])] :
    computedTracks;

  const pickUni = (id: string) => {
    const u = findUniversity(id);
    if (!u) return;
    setUniversityId(id);
    setUniversityName(id === "other" ? (otherUni.trim() || "أخرى") : u.name);
    setUniQuery("");
  };
  const pickMajor = (id: string) => {
    const m = findMajor(id);
    if (!m) return;
    setMajorId(majorId === id ? "" : id);
  };

  const filteredUnis = (() => {
    const q = uniQuery.trim();
    if (!q) return UNIVERSITIES;
    return UNIVERSITIES.filter((u) => u.name.includes(q) || (u.region ?? "").includes(q));
  })();

  /* ── الإنهاء ── */
  const finish = async () => {
    /* H1: امنع الدخول المتزامن/المكرر */
    if (isSubmitting) return;
    /* الثانوي: أهدافه اختيار صريح متعدد (غير حاجز — نواته تكفي).
       الجامعي: بلا هدف قياس إطلاقاً (goal محايد = undefined).
       الخريج: هدف واحد على الأقل إلزامي (قائمة الأهداف المتعددة). */
    const isSecondary = status === "ثانوي";
    const isUniversity = status === "جامعي";
    /* الأهداف المحفوظة: الثانوي والخريج قائمتهما المتعددة الصريحة كما اختاراها،
       الجامعي بلا أهداف قياس. الأساسي (goal) دائماً = goals[0]. */
    const goalsToSave: StudyGoalType[] = isUniversity ? [] : goals;
    const effectiveGoal: StudyGoalType | "" = goalsToSave[0] ?? "";
    /* الأهداف غير حاجزة للثانوي (نواته تكفي)؛ الخريج يلزمه هدف واحد على الأقل */
    if (!isSecondary && !isUniversity && !goals.length) return;
    const tracks = finalTracks;
    /* قد لا يكون للطالب أي اختبار (أول ثانوي · خريج ركّز على القبول) — والمدرسة
       قسمٌ مستقل. المسار الأساسي (حقل إلزامي) يبقى «مدرسه» كأساسٍ يومي غير محسوب. */
    const primaryTrack: TrackId = tracks[0] ?? "مدرسه";

    /* تحقّق درجات الخريج السابقة */
    for (const exam of PREV_EXAMS) {
      const r = prevResults[exam];
      if (!r?.tested) continue;
      const err = validateScore(exam, r.score);
      if (err) { setPrevErr(`${exam}: ${err}`); return; }
    }
    setPrevErr("");

    /* H3: تحقّق برمجي من الحقول الرقمية (لا نعتمد على min/max المتصفح) */
    const numErr = (() => {
      if (studyHours) { const h = parseInt(studyHours); if (!Number.isFinite(h) || h < 1 || h > 16) return "ساعات المذاكرة بين ١ و١٦"; }
      if (status === "جامعي" && universityGpa) { const g = parseFloat(universityGpa); if (!Number.isFinite(g) || g < 0 || g > 5) return "المعدل الجامعي بين ٠ و٥"; }
      const showsHs = (status === "ثانوي" && grade === "ثالث ثانوي") || status === "خريج";
      if (showsHs && highschoolPct) { const p = parseFloat(highschoolPct); if (!Number.isFinite(p) || p < 0 || p > 100) return "نسبة الثانوية بين ٠ و١٠٠"; }
      return "";
    })();
    if (numErr) { setSubmitErr(numErr); return; }

    setSubmitErr("");
    setIsSubmitting(true);
    try {

    const trimmedName = name.trim();
    /* نوع المسار: ثانوي → الاختيار، جامعي → تصنيف التخصص المختار */
    const resolvedTrackType =
      status === "جامعي" && majorId ? findMajor(majorId)?.category :
      (trackType || undefined);

    const extras = {
      school: school.trim() || undefined,
      region: region        || undefined,
      city:   city.trim()   || undefined,
      phone:  phone.trim()  || undefined,
    };
    saveUser({
      name: trimmedName,
      track: primaryTrack,
      activeTracks: tracks.length ? tracks : undefined,
      onboarded: true,
      studyLevel: status || undefined,
      grade: status === "ثانوي" && grade ? grade : undefined,
      /* مرساة الترقية التلقائية: العام الدراسي الحالي وقت ضبط الصف (للثانوي فقط) */
      gradeYearId: status === "ثانوي" && grade ? (currentAcademicYearId() ?? undefined) : undefined,
      academicTerm: status === "ثانوي" ? term : undefined,
      gradStage: status === "خريج" && gradStage ? gradStage : undefined,
      universityYear: status === "جامعي" && universityYear ? universityYear : undefined,
      goal: effectiveGoal || undefined,
      goals: goalsToSave.length ? goalsToSave : undefined,
      targets: targets.length ? targets : undefined,
      gapYear: status === "خريج" ? gapYear === "yes" : undefined,
      studyHours: studyHours ? parseInt(studyHours) : undefined,
      trackType: resolvedTrackType,
      /* حقول الجامعي — المعدل فقط (التدريب/الدراسات العليا تُضاف لاحقاً من المنصة) */
      universityGpa: status === "جامعي" && universityGpa ? parseFloat(universityGpa) : undefined,
      ...extras,
    });

    /* حفظ الأهداف: الوجهة الجامعية + درجة الثانوية (كتابة واحدة) */
    const showsHighschool = (status === "ثانوي" && grade === "ثالث ثانوي") || status === "خريج";
    if (universityId || majorId || (showsHighschool && highschoolPct)) {
      const g = loadGoals();
      const next = { ...g };
      if (universityId) {
        next.universityId = universityId;
        next.university = universityId === "other" ? (otherUni.trim() || "أخرى") : (universityName || findUniversity(universityId)?.name);
      }
      if (majorId) { next.majorId = majorId; next.major = findMajor(majorId)?.name; }
      if (showsHighschool && highschoolPct) next.highschoolPct = parseFloat(highschoolPct);
      saveGoals(next);
    }

    /* موعد الاختبار القادم للمسار الأساسي */
    if (examDate) {
      saveExamDate(examDate);
      saveTrackExamDates({ [primaryTrack]: examDate });
    }

    /* نتائج الخريج السابقة → «نتائجي» */
    const validPrev = PREV_EXAMS.filter((e) => prevResults[e]?.tested && prevResults[e].score.trim());
    if (validPrev.length) {
      saveResults(validPrev.map((exam, i) => ({
        id: `${Date.now()}-${i}`,
        exam,
        score: prevResults[exam].score.trim(),
      })));
    }

    import("@/lib/firestore").then(({ registerUser }) => { registerUser(trimmedName, primaryTrack, extras); });
    trackEvent("onboarding_completed", { track: primaryTrack, tracks: tracks.length, goal: effectiveGoal || null, goals: goalsToSave.length, status });
    import("@/lib/cloud").then(({ pushBackup }) => { pushBackup().catch(() => {}); });
    await redeemPendingRef().catch(() => 0);
    window.location.assign("/dashboard");
    } catch {
      /* فشل الحفظ المحلي (مثلاً مساحة ممتلئة/وضع خاص) — لا نترك المستخدم عالقاً */
      setIsSubmitting(false);
      setSubmitErr("تعذّر حفظ بياناتك — تأكد من توفّر مساحة في المتصفح ثم حاول مجدداً");
    }
  };

  const header = (
    <Dome hideControls>
      <div className="text-center py-5">
        <Logo className="font-black text-5xl mb-1 block" />
      </div>
    </Dome>
  );

  const stepDots = (
    <div className="flex items-center justify-center gap-2 mb-7">
      {[0, 1, 2].map((s) => (
        <div key={s} className="h-1.5 rounded-full transition-all duration-300"
          style={{ width: s === step ? "32px" : "8px", background: s <= step ? "var(--accent)" : "var(--surface2)" }} />
      ))}
    </div>
  );

  const inputStyle = { background: "var(--surface)", border: "2px solid var(--border)" };
  const chipStyle = (active: boolean) => ({
    background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
    color: active ? "var(--accent-light)" : "var(--text)",
  });

  /* منتقي الجامعة + التخصص (مشترك بين الجامعي وهدف الجامعة/التخصص) */
  const uniMajorPicker = (
    <div className="flex flex-col gap-5">
      <div>
        <p className="label mb-3">🏛️ جامعتك المستهدفة</p>
        {universityId ? (
          <div className="rounded-2xl px-4 py-3 flex items-center gap-2"
            style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid color-mix(in srgb, var(--accent) 28%, transparent)" }}>
            <span className="font-bold text-[17px] flex-1" style={{ color: "var(--accent-light)" }}>
              {universityId === "other" ? (otherUni.trim() || "أخرى") : universityName}
            </span>
            <button onClick={() => { setUniversityId(""); setUniversityName(""); }}
              className="text-[15px] font-bold px-2" style={{ color: "var(--text-muted)" }}>تغيير ✕</button>
          </div>
        ) : (
          <>
            <input value={uniQuery} onChange={(e) => setUniQuery(e.target.value)}
              placeholder="🔎 ابحث عن جامعتك..."
              className="w-full rounded-2xl px-4 py-3 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none mb-2.5"
              style={inputStyle} />
            <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">
              {filteredUnis.map((u) => (
                <button key={u.id} onClick={() => pickUni(u.id)}
                  className="px-3 py-2 rounded-full text-[15px] font-bold transition active:scale-95"
                  style={{ background: "var(--surface2)", color: "var(--text)", border: "1.5px solid var(--border)" }}>
                  {u.name}
                </button>
              ))}
              {filteredUnis.length === 0 && (
                <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>لا نتائج — اختر «أخرى».</p>
              )}
            </div>
          </>
        )}
        {universityId === "other" && (
          <input value={otherUni} onChange={(e) => { setOtherUni(e.target.value); setUniversityName(e.target.value.trim() || "أخرى"); }}
            placeholder="اكتب اسم جامعتك" maxLength={60}
            className="w-full mt-2.5 rounded-2xl px-4 py-3 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
            style={inputStyle} />
        )}
      </div>

      <div>
        <p className="label mb-3">📚 تخصصك المستهدف</p>
        <div className="flex flex-wrap gap-2">
          {MAJORS.map((m) => {
            const on = majorId === m.id;
            return (
              <button key={m.id} onClick={() => pickMajor(m.id)} aria-pressed={on}
                className="px-3 py-2 rounded-full text-[15px] font-bold transition active:scale-95"
                style={{
                  background: on ? "var(--accent)" : "var(--surface2)",
                  color: on ? "#fff" : "var(--text)",
                  border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                }}>
                {m.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ════════ الخطوة 0 — الأساسيات + الحالة ════════ */
  if (step === 0) return (
    <div className="min-h-dvh flex flex-col app-col">
      {header}
      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-sm mx-auto w-full gap-6">
        {stepDots}

        <div>
          <p className="label mb-3">وش اسمك؟</p>
          <input autoFocus type="text" value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: فهد، سارة، خالد..." maxLength={20}
            className="w-full rounded-2xl px-5 py-4 text-lg text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
        </div>

        <div>
          <p className="label mb-3">وش مرحلتك؟</p>
          <div className="grid grid-cols-2 gap-2.5">
            {STAGES.map((s) => {
              const on = status === s.status && (s.status !== "ثانوي" || grade === s.grade);
              return (
                <button key={s.key}
                  onClick={() => {
                    if (on) { setStatus(""); setGrade(""); return; }
                    setStatus(s.status);
                    setGrade(s.grade);
                  }}
                  className={`rounded-2xl py-3.5 font-bold text-[17px] transition active:scale-[0.98] ${s.key === "grad" ? "col-span-2" : ""}`}
                  style={chipStyle(on)}>
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <button className="btn-primary glow-blue" onClick={() => { if (name.trim() && status) setStep(1); }}
          disabled={!name.trim() || !status} style={{ opacity: name.trim() && status ? 1 : 0.4 }}>
          التالي ←
        </button>
      </div>
    </div>
  );

  /* ════════ الخطوة 1 — تفاصيل المرحلة ════════ */
  if (step === 1) {
    const canProceed =
      status === "ثانوي" ? (!!grade && !!trackType) :
      status === "خريج"  ? (!!gradStage && !!gapYear) :
      status === "جامعي" ? (!!universityId && !!majorId && !!universityYear) :
      false;

    /* قائمة «اختبرت من قبل؟» — مشتركة بين الثانوي والخريج (تُحفَظ عبر saveResults في finish) */
    const prevExamsList = (
      <>
        <div className="flex flex-col gap-2.5">
          {visiblePrevExamsFor(status, grade).map((exam) => {
            const r = prevResults[exam];
            const range = scoreRangeForTitle(exam);
            return (
              <div key={exam} className="rounded-2xl px-4 py-3"
                style={{ background: "var(--surface)", border: "2px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrevResults((p) => ({ ...p, [exam]: { ...p[exam], tested: !p[exam].tested } }))}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[15px] font-black flex-shrink-0 transition"
                    style={{
                      background: r.tested ? "var(--accent)" : "var(--surface2)",
                      border: `1.5px solid ${r.tested ? "var(--accent)" : "var(--border)"}`,
                      color: r.tested ? "#fff" : "transparent",
                    }}>✓</button>
                  <span className="font-bold text-[17px] flex-1" style={{ color: "var(--text)" }}>{exam}</span>
                  <input value={r.score} inputMode="decimal" disabled={!r.tested}
                    onChange={(e) => { setPrevErr(""); setPrevResults((p) => ({ ...p, [exam]: { ...p[exam], score: e.target.value } })); }}
                    placeholder="الدرجة" maxLength={6}
                    className="w-20 rounded-xl px-3 py-2 text-base text-center text-[var(--text)] placeholder-[var(--text-muted)] outline-none disabled:opacity-30"
                    style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }} />
                </div>
                {r.tested && range && (
                  <p className="text-[12px] mt-1.5 px-1" style={{ color: "var(--text-muted)" }}>الدرجة: {range.hint}</p>
                )}
              </div>
            );
          })}
        </div>
        {prevErr && <p className="text-[14px] mt-2 font-bold" style={{ color: "var(--danger)" }}>{prevErr}</p>}
      </>
    );

    return (
      <div className="min-h-dvh flex flex-col app-col">
        {header}
        <div className="flex-1 px-6 py-8 max-w-sm mx-auto w-full flex flex-col gap-6">
          {stepDots}

          {/* ── ثانوي ── */}
          {status === "ثانوي" && (
            <>
              {/* أول ثانوي: التحصيلي يبدأ من ثاني ثانوي — نطمئنه على ما نفعّله له */}
              {grade === "أول ثانوي" && (
                <div className="rounded-2xl px-4 py-3"
                  style={{ background: "color-mix(in srgb, var(--accent) 7%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>
                  <p className="text-[15px] font-bold" style={{ color: "var(--accent-light)" }}>
                    🌱 القدرات والتحصيلي يبدآن من ثاني ثانوي — الآن نفعّل لك مواد المدرسة لتأسيسٍ قويّ، ونجهّزك للقدرات في وقتها.
                  </p>
                </div>
              )}
              <div>
                <p className="label mb-1">مسارك الدراسي؟</p>
                <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>يساعدنا نرتّب أولوياتك تلقائياً</p>
                <div className="grid grid-cols-2 gap-2">
                  {TRACK_TYPES.map((t) => (
                    <button key={t.id} onClick={() => setTrackType(trackType === t.id ? "" : t.id)}
                      className="rounded-2xl py-3 px-2 font-bold text-[15px] leading-snug transition active:scale-[0.98]"
                      style={chipStyle(trackType === t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* الفصل الدراسي الحالي — يحكم إتاحة التحصيلي المبكر وتنبيهات دويرب (افتراضٌ من التقويم) */}
              <div>
                <p className="label mb-1">أنت الآن في أي فصل؟</p>
                <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>يحدّد ما يناسبك من الاختبارات ومواعيدها</p>
                <div className="grid grid-cols-3 gap-2">
                  {([["first", "الفصل الأول"], ["second", "الفصل الثاني"], ["summer", "الإجازة الصيفية"]] as [TermGuess, string][]).map(([v, label]) => (
                    <button key={v} onClick={() => setTerm(v)}
                      className="rounded-2xl py-3 px-2 font-bold text-[14px] leading-snug transition active:scale-[0.98]"
                      style={chipStyle(term === v)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl px-4 py-3"
                style={{ background: "color-mix(in srgb, var(--accent) 7%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>
                <p className="text-[15px] font-bold" style={{ color: "var(--accent-light)" }}>
                  🗺️ بالخطوة الجاية: نقترح لك اختباراتك المناسبة — تقبل أو تحذف، بلا فرض.
                </p>
              </div>
              {/* نتائج سابقة للثانوي — اختيارية، لا تمنع التقدم */}
              <div>
                <p className="label mb-1">اختبرت من قبل؟ <span className="text-[14px] font-normal" style={{ color: "var(--text-muted)" }}>(اختياري)</span></p>
                <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>لو دخلت أياً منها سابقاً، أدخل درجتك — نستخدمها لتخصيص خطتك وجاهزيتك</p>
                {prevExamsList}
              </div>
            </>
          )}

          {/* ── جامعي ── */}
          {status === "جامعي" && (
            <>
              {uniMajorPicker}
              <div>
                <p className="label mb-3">سنتك الدراسية؟</p>
                <div className="grid grid-cols-3 gap-2">
                  {UNI_YEARS.map((y) => (
                    <button key={y} onClick={() => setUniversityYear(universityYear === y ? "" : y)}
                      className="rounded-2xl py-3 font-bold text-[16px] transition active:scale-[0.98]"
                      style={chipStyle(universityYear === y)}>
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* المعدل الجامعي — اختياري (السؤال الوحيد بعد الجامعة/التخصص/السنة).
                 لا سؤال قياس/تحصيلي/step للجامعي؛ التدريب والدراسات العليا تُضبط
                 لاحقاً من المنصة لا في التسجيل (أقل أسئلة). */}
              <div>
                <p className="label mb-1">معدلك الجامعي الحالي؟ <span className="text-[14px] font-normal" style={{ color: "var(--text-muted)" }}>(اختياري)</span></p>
                <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>من 5 — يساعدنا نخصّص توصياتك وأولوياتك</p>
                <input type="number" value={universityGpa} onChange={(e) => setUniversityGpa(e.target.value)}
                  placeholder="مثال: 3.75" min={0} max={5} step={0.01}
                  className="w-full rounded-2xl px-5 py-4 text-lg text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
              </div>
            </>
          )}

          {/* ── خريج ── */}
          {status === "خريج" && (
            <>
              <div>
                <p className="label mb-3">نوع تخرّجك؟</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {GRAD_STAGES.map((g) => (
                    <button key={g} onClick={() => setGradStage(gradStage === g ? "" : g)}
                      className="rounded-2xl py-3.5 font-bold text-[17px] transition active:scale-[0.98]"
                      style={chipStyle(gradStage === g)}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="label mb-1">هل تنوي تحسين درجات القدرات أو التحصيلي؟</p>
                <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>اختر «لا» لو خلّصت اختباراتك وتريد التركيز على القبول الجامعي فقط</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button onClick={() => setGapYear(gapYear === "yes" ? "" : "yes")}
                    className="rounded-2xl py-3.5 px-3 font-bold text-[16px] transition active:scale-[0.98] text-center leading-snug"
                    style={chipStyle(gapYear === "yes")}>
                    نعم، أبي أحسّنها 📈
                  </button>
                  <button onClick={() => setGapYear(gapYear === "no" ? "" : "no")}
                    className="rounded-2xl py-3.5 px-3 font-bold text-[16px] transition active:scale-[0.98] text-center leading-snug"
                    style={chipStyle(gapYear === "no")}>
                    لا، ركّز على القبول 🎓
                  </button>
                </div>
              </div>
              <div>
                <p className="label mb-1">نتائجك السابقة؟</p>
                <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>
                  {gapYear === "no"
                    ? "ندخلها لحساب نسبتك الموزونة ومقارنة الجامعات — مهمة لخطة القبول"
                    : "نستخدمها لحساب جاهزيتك وتخصيص خطتك"}
                </p>
                {prevExamsList}
              </div>
            </>
          )}

          <button className="btn-primary glow-blue" onClick={() => {
            if (!canProceed) return;
            /* الثانوي: افتح «الوجهة الجامعية» تلقائياً لثالث ثانوي مرة لكل صف — لا نعيد ضبطه عند الرجوع بلا تغيير.
               النواة ثابتة ومفعّلة تلقائياً فلا حاجة لبذر اختيارات (فقط اختبارات اللغة اختيارية). */
            if (status === "ثانوي" && grade !== seedGrade) {
              setUniOpen(grade === "ثالث ثانوي");
              setSeedGrade(grade);
            }
            setStep(2);
          }}
            disabled={!canProceed} style={{ opacity: canProceed ? 1 : 0.4 }}>
            التالي ←
          </button>
          <button onClick={() => setStep(0)} className="text-[17px] font-semibold w-full text-center py-1"
            style={{ color: "var(--text-muted)" }}>← رجوع</button>
        </div>
      </div>
    );
  }

  /* ════════ الخطوة 2 — لوحة اختبارات الثانوي / ملخّص الجامعي / هدف الخريج ════════ */
  const isSecondary = status === "ثانوي";
  const isUniversity = status === "جامعي";
  /* هدف الجامعة/التخصص مختار (ثانوي أو خريج) → نُظهر منتقي الوجهة الجامعية (غير حاجز — اختياري) */
  const goalsIncludeUni = goals.includes("university") || goals.includes("major");
  const showsGoalUniPicker = !isUniversity && goalsIncludeUni;
  const primaryTrack = finalTracks[0];

  /* اختبارات اللغة: إضافة/إزالة متعددة بلا أي حد */
  const toggleLanguage = (id: TrackId) => {
    setSelectedLanguages((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };

  /* هدف اختبار لا يُعرَض إلا إذا كان اختباره من مرحلة الطالب (examBoard = مصدر الحقيقة).
     أول ثانوي لا يرى «الاستعداد للقدرات/التحصيلي/STEP» — ليست مرحلته. الجامعة/التخصص
     نيّة عليا تُعرَض دائماً. */
  const examGoalOk = (id: StudyGoalType): boolean => {
    if (id === "qudurat") return examB.some((e) => e.id === "qudurat");
    if (id === "tahsili") return examB.some((e) => e.id === "tahsiliEarly" || e.id === "tahsiliRegular");
    if (id === "step") return boardStage !== null && boardStage !== "first" && boardStage !== "university";
    return true; // university / major
  };

  /* قسم الأهداف المتعدد المشترك (الثانوي والخريج) — نية عليا صريحة بلا حد، لا تغيّر
     الاختبارات. عند اختيار «جامعة/تخصص» يظهر منتقي الوجهة أدناه (غير حاجز). */
  const goalsSection = (
    <div>
      <p className="label mb-1">وش أهدافك؟ <span className="text-[14px] font-normal" style={{ color: "var(--text-muted)" }}>(تقدر تختار أكثر من واحد)</span></p>
      <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>
        نبني خطتك وأولوياتك حولها — والأهداف نية عليا مستقلة لا تغيّر اختباراتك
      </p>
      <div className="flex flex-col gap-2.5">
        {STUDY_GOALS.filter((g) => examGoalOk(g.id)).map((g) => {
          const on = goals.includes(g.id);
          /* «تحسين درجة X» إذا أدخل درجةً سابقة لهذا الاختبار، وإلا «الاستعداد» */
          const prevTitle = GOAL_PREV_EXAM[g.id];
          const hasScore = !!(prevTitle && prevResults[prevTitle]?.tested && prevResults[prevTitle].score.trim());
          const label = goalLabelFor(g.id, hasScore) ?? g.label;
          return (
            <button key={g.id} onClick={() => setGoals((prev) => prev.includes(g.id) ? prev.filter((x) => x !== g.id) : [...prev, g.id])}
              aria-pressed={on}
              className="rounded-2xl px-4 py-3.5 flex items-center gap-3 text-right transition active:scale-[0.98]"
              style={chipStyle(on)}>
              <span className="w-5 h-5 rounded-md flex items-center justify-center text-[14px] font-black flex-shrink-0"
                style={{
                  background: on ? "var(--accent)" : "var(--surface2)",
                  border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                  color: on ? "#fff" : "transparent",
                }}>✓</span>
              <span className="text-[23px]">{g.icon}</span>
              <span className="font-bold text-[17px] flex-1">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* أهداف ما بعد الثانوية (متعدّد، غير حاجز) — ثالث ثانوي وخريج الثانوي فقط.
     الطالب يقدّم غالباً على عدّة جهات معاً؛ الرئيسية ترتّب بطاقاته حول اختياره. */
  const targetsSection = (
    <div>
      <p className="label mb-1">وش أهدافك بعد الثانوية؟ <span className="text-[14px] font-normal" style={{ color: "var(--text-muted)" }}>(تقدر تختار أكثر من واحد)</span></p>
      <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>
        نرتّب لك صفحتك الرئيسية حول هذي الجهات — تقدر تعدّلها لاحقاً من ملفك
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {ADMISSION_TARGETS.map((t) => {
          const on = targets.includes(t.id);
          return (
            <button key={t.id} onClick={() => setTargets((prev) => prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id])}
              aria-pressed={on}
              className="rounded-2xl px-3.5 py-3 flex items-center gap-2 text-right transition active:scale-[0.98]"
              style={chipStyle(on)}>
              <span className="w-5 h-5 rounded-md flex items-center justify-center text-[12px] font-black flex-shrink-0"
                style={{
                  background: on ? "var(--accent)" : "var(--surface2)",
                  border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                  color: on ? "#fff" : "transparent",
                }}>✓</span>
              <span className="text-[20px]">{t.icon}</span>
              <span className="font-bold text-[16px] flex-1 leading-tight">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* شروط الإكمال: ساعات المذاكرة افتراضية (٣) غير حاجزة. الثانوي/الجامعي بلا حاجز
     إضافي (تحقّق الخطوة ١ يكفي)؛ الخريج يلزمه وجهةٌ واحدة على الأقل. */
  const canFinish = isSecondary || isUniversity ? true : goals.length > 0;

  /* قسم اختبارات اللغة المشترك (الثانوي والخريج) — متعدد بلا حد، اختياري بالكامل */
  const languageSection = (
    <div>
      <p className="label mb-1">🗣️ اختبارات اللغة <span className="text-[14px] font-normal" style={{ color: "var(--text-muted)" }}>(اختياري)</span></p>
      <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>
        تقدر تضيف أكثر من اختبار بنفس الوقت — كلها اختيارية وبلا حد
      </p>
      <div className="flex flex-col gap-2.5">
        {LANGUAGE_TESTS.map((id) => {
          const t = TRACKS.find((tr) => tr.id === id)!;
          const on = selectedLanguages.includes(id);
          return (
            <button key={id} onClick={() => toggleLanguage(id)} aria-pressed={on}
              className="rounded-2xl px-4 py-3 text-right transition active:scale-[0.98]"
              style={chipStyle(on)}>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-[14px] font-black flex-shrink-0"
                  style={{
                    background: on ? "var(--accent)" : "var(--surface2)",
                    border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                    color: on ? "#fff" : "transparent",
                  }}>✓</span>
                <span className="font-bold text-[17px] flex-1">{t.title}</span>
              </div>
              <p className="text-[14px] mt-1 pr-7" style={{ color: on ? "var(--accent-light)" : "var(--text-muted)" }}>{t.sub}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col app-col">
      {header}
      <div className="flex-1 px-6 py-8 max-w-sm mx-auto w-full flex flex-col gap-6">
        {stepDots}

        {/* ── الثانوي: أهداف صريحة متعددة + نواة ثابتة (مفعّلة تلقائياً) + قسم لغة اختياري ── */}
        {isSecondary ? (
          <>
            {goalsSection}
            {grade === "ثالث ثانوي" && targetsSection}
            {/* ── اختبارات القبول (قياس) — من examBoard فقط. المدرسة ليست هنا. ── */}
            <div>
              <p className="label mb-1">اختبارات القبول</p>
              <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>
                {examB.length
                  ? "نفعّلها لك تلقائياً حسب صفّك وحالة التسجيل الرسمية"
                  : "لا اختبارات قبول في مرحلتك الآن — القدرات والتحصيلي يبدآن من ثاني ثانوي"}
              </p>
              {examB.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  {/* اسم الاختبار وحالته وظهوره من مصدر الحقيقة examBoard (لا نص ثابت) */}
                  {examB.map((be) => {
                    const id = EXAM_TRACK[be.id];
                    const t = TRACKS.find((tr) => tr.id === id)!;
                    const important = eligibility.find((x) => x.id === id)?.important;
                    return (
                      <div key={be.id} className="rounded-2xl px-4 py-3" style={chipStyle(true)}>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md flex items-center justify-center text-[14px] font-black flex-shrink-0"
                            style={{ background: "var(--accent)", border: "1.5px solid var(--accent)", color: "#fff" }}>✓</span>
                          <span className="font-bold text-[17px] flex-1">{be.label}</span>
                          {important && (
                            <span className="text-[12px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)", color: "var(--gold)" }}>
                              ⭐ مهم لمرحلتك
                            </span>
                          )}
                        </div>
                        <p className="text-[14px] mt-1 pr-7" style={{ color: "var(--accent-light)" }}>{t.sub}</p>
                        <p className="text-[13px] font-bold mt-1 pr-7" style={{ color: MODE_COLOR[be.mode] }}>{be.hint}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── المدرسة: قسم مستقل، ليست اختباراً ── */}
            <div className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
              style={{ background: "color-mix(in srgb, var(--accent) 7%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>
              <span className="text-[22px] flex-shrink-0">🏫</span>
              <div>
                <p className="font-bold text-[16px]" style={{ color: "var(--text)" }}>المدرسة — قسمك اليومي المستقل</p>
                <p className="text-[14px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  موادك وواجباتك وجدولك وتقويم الوزارة في «المدرسة» — دائمة معك، وليست اختباراً.
                </p>
              </div>
            </div>
            {languageSection}
          </>
        ) : isUniversity ? (
          /* ── الجامعي: بلا سؤال قياس/هدف — ملخّص تأكيدي فقط ثم ساعات المذاكرة ── */
          <div>
            <p className="label mb-1">جاهز يا طالب الجامعة 🎓</p>
            <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>
              ركّزنا لك على عالمك الجامعي — معدلك وتدريبك ومهاراتك وسوق العمل. بلا قدرات ولا تحصيلي ولا قبول.
            </p>
            <div className="rounded-2xl px-4 py-3 flex flex-wrap gap-2"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              {([universityName, findMajor(majorId)?.name, universityYear ? `السنة ${universityYear}` : ""]
                .filter(Boolean) as string[])
                .map((chip) => (
                  <span key={chip} className="px-3 py-1.5 rounded-full text-[15px] font-bold"
                    style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)", border: "1.5px solid color-mix(in srgb, var(--accent) 28%, transparent)" }}>
                    {chip}
                  </span>
                ))}
            </div>
          </div>
        ) : (
          <>
            {goalsSection}
            {gradStage === "خريج ثانوي" && targetsSection}
            {languageSection}
          </>
        )}

        {/* منتقي الوجهة الجامعية عند اختيار هدف الجامعة/التخصص (الثانوي والخريج) — اختياري غير حاجز */}
        {showsGoalUniPicker && (
          <div className="rounded-2xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <p className="label mb-3">وجهتك الجامعية <span className="text-[14px] font-normal" style={{ color: "var(--text-muted)" }}>(اختياري)</span></p>
            {uniMajorPicker}
          </div>
        )}

        {/* الثانوي بلا هدف جامعة/تخصص: وجهة جامعية اختيارية مطوية — لا تُكرَّر مع منتقي الهدف أعلاه */}
        {isSecondary && !goalsIncludeUni && (
          uniOpen ? (
            <div className="rounded-2xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <p className="label flex-1">عندك وجهة جامعية؟ <span className="text-[14px] font-normal" style={{ color: "var(--text-muted)" }}>(اختياري)</span></p>
                <button onClick={() => setUniOpen(false)} className="text-[15px] font-bold px-1" style={{ color: "var(--text-muted)" }}>إخفاء ▴</button>
              </div>
              {grade === "ثالث ثانوي" && (
                <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>
                  سنة القبول — تحديد وجهتك يخلينا نحسب موزونتك ونرسم طريقك لها
                </p>
              )}
              {uniMajorPicker}
            </div>
          ) : (
            <button onClick={() => setUniOpen(true)}
              className="rounded-2xl px-4 py-3.5 w-full flex items-center gap-2 text-right transition active:scale-[0.98]"
              style={inputStyle}>
              <span className="text-[18px]">🏛️</span>
              <span className="font-bold text-[16px] flex-1" style={{ color: "var(--text)" }}>
                عندك وجهة جامعية؟ <span className="text-[14px] font-normal" style={{ color: "var(--text-muted)" }}>(اختياري)</span>
              </span>
              <span className="text-[15px] font-bold" style={{ color: "var(--text-muted)" }}>▾</span>
            </button>
          )
        )}

        {/* الاختبارات المُفعّلة تلقائياً — شفافية (الخريج) */}
        {!isSecondary && !isUniversity && goals.length > 0 && computedTracks.length > 0 && (
          <div>
            <p className="label mb-2.5">فعّلنا لك هذه الاختبارات</p>
            <div className="flex flex-wrap gap-2">
              {computedTracks.map((id) => {
                const t = TRACKS.find((tr) => tr.id === id)!;
                return (
                  <span key={id} className="px-3 py-2 rounded-full text-[15px] font-black flex items-center gap-1.5"
                    style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)", border: "1.5px solid color-mix(in srgb, var(--accent) 28%, transparent)" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    {t.title}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* موعد الاختبار القادم (اختياري) */}
        {(isSecondary ? finalTracks.length > 0 : (goals.length > 0 && primaryTrack)) && (
          <div>
            <p className="label mb-3">📅 موعد اختبارك القادم؟ <span className="text-[14px] font-normal" style={{ color: "var(--text-muted)" }}>(اختياري)</span></p>
            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-2xl px-4 py-3 text-base text-[var(--text)] outline-none"
              style={{ background: "var(--surface)", border: "2px solid var(--border)", colorScheme: "dark" }} />
          </div>
        )}

        {/* ساعات المذاكرة (إلزامي — يقود حساب الخطة والجدول) */}
        <div>
          <p className="label mb-3">كم ساعة تقدر تذاكر باليوم؟</p>
          <input type="number" value={studyHours} onChange={(e) => setStudyHours(e.target.value)}
            placeholder="مثال: 3" min={1} max={16}
            className="w-full rounded-2xl px-5 py-4 text-lg text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
        </div>

        {/* درجة الثانوية — لطالب ثالث ثانوي أو خريج (مهمة لحساب الموزونة والقبول) */}
        {((status === "ثانوي" && grade === "ثالث ثانوي") || status === "خريج") && (
          <div>
            <p className="label mb-1">📊 درجة الثانوية العامة (النسبة المئوية) <span className="text-[14px] font-normal" style={{ color: "var(--text-muted)" }}>(اختياري)</span></p>
            <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>ننصح بإدخالها — مهمة لحساب الموزونة ومقارنة فرص القبول</p>
            <input type="number" value={highschoolPct} onChange={(e) => setHighschoolPct(e.target.value)}
              placeholder="مثال: 94.5" min={50} max={100} step={0.1}
              className="w-full rounded-2xl px-5 py-4 text-lg text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
          </div>
        )}

        {/* معلومات إضافية — كلها اختيارية، مطوية افتراضياً لتقليل الزحام */}
        <div className="flex flex-col gap-4">
          <button onClick={() => setExtrasOpen((o) => !o)}
            className="flex items-center gap-2 w-full text-right"
            aria-expanded={extrasOpen}>
            <span className="label flex-1">معلومات إضافية <span className="text-[14px] font-normal" style={{ color: "var(--text-muted)" }}>(اختياري)</span></span>
            <span className="text-[15px] font-bold" style={{ color: "var(--text-muted)" }}>{extrasOpen ? "▴" : "▾"}</span>
          </button>
          {extrasOpen && (<>
          <div>
            <p className="text-[15px] font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>اسم المدرسة / الجامعة (اختياري)</p>
            <input type="text" value={school} onChange={(e) => setSchool(e.target.value)}
              placeholder="مثال: ثانوية الملك فهد"
              className="w-full rounded-2xl px-5 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
          </div>
          <div>
            <p className="text-[15px] font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>المدينة (اختياري)</p>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
              placeholder="مثال: الرياض، جدة..."
              className="w-full rounded-2xl px-5 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
          </div>
          <div>
            <p className="text-[15px] font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>رقم الجوال (اختياري)</p>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="05xxxxxxxx"
              className="w-full rounded-2xl px-5 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
          </div>
          <div>
            <p className="text-[15px] font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>المنطقة (اختياري)</p>
            <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="المنطقة"
              className="w-full rounded-2xl px-5 py-3.5 text-base text-[var(--text)] outline-none"
              style={inputStyle}>
              <option value="">اختر منطقتك</option>
              {SAUDI_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          </>)}
        </div>

        {/* الإلزامي فقط: الثانوي → ساعات · الجامعي → ساعات · الخريج → هدف + ساعات */}
        {!canFinish && (
          <p className="text-[14px] text-center" style={{ color: "var(--text-muted)" }}>
            {isSecondary ? "حدّد ساعات مذاكرتك للمتابعة"
              : isUniversity ? "حدّد ساعات مذاكرتك للمتابعة"
              : "اختر هدفاً واحداً على الأقل وحدّد ساعات مذاكرتك للمتابعة"}
          </p>
        )}

        {prevErr && (
          <p className="text-[15px] text-center font-bold" style={{ color: "var(--danger)" }}>{prevErr}</p>
        )}
        {submitErr && (
          <p className="text-[15px] text-center font-bold" style={{ color: "var(--danger)" }}>{submitErr}</p>
        )}

        <button className="btn-primary glow-blue" onClick={finish}
          disabled={isSubmitting || !canFinish}
          style={{ opacity: !isSubmitting && canFinish ? 1 : 0.4 }}>
          {isSubmitting ? "جارٍ الحفظ…" : "يلا نبدأ ←"}
        </button>
        <button onClick={() => setStep(1)} className="text-[17px] font-semibold w-full text-center py-1"
          style={{ color: "var(--text-muted)" }}>← رجوع</button>
      </div>
    </div>
  );
}
