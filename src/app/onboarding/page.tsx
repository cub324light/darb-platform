"use client";
import { useState, useEffect } from "react";
import {
  TRACKS, scoreRangeForTitle, validateScore, LANGUAGE_TESTS, type TrackId,
} from "@/lib/tracks";
import { UNIVERSITIES, MAJORS, findUniversity, findMajor } from "@/lib/university";
import { saveUser, saveResults, loadGoals, saveGoals, ensureWorkspace, type DarbUser } from "@/lib/storage";
import { ADMISSION_TARGETS } from "@/lib/targets";
import { currentAcademicYearId, currentTermGuess, type TermGuess } from "@/lib/academicCalendar";
import { toBoardStage, type ExamBoardId, type ExamMode } from "@/lib/examEligibility";
import { recommendedExams } from "@/lib/recommendedExams";
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
/* اختبار القياس المقترَح → عنوان نتيجته السابقة (لإدخال الدرجة داخل بطاقة الاقتراح) */
const EXAM_PREV_KEY: Record<ExamBoardId, string> = {
  qudurat: "القدرات", tahsiliEarly: "التحصيلي", tahsiliRegular: "التحصيلي",
};
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
  /* قرار الطالب لكل اختبار قياس مقترَح: «ابدأ الآن» (start) أو «ليس الآن» (skip).
     لا يُحفظ في activeTracks إلا ما اختار له «ابدأ الآن» — الاقتراح ليس تفعيلاً. */
  const [examChoice, setExamChoice] = useState<Record<string, "start" | "skip">>({});
  /* نيّة الإعادة (ADR-0001 §2.6): بعد إدخال الدرجة، «راضٍ؟» — «لا» ⇒ true (لا Goal).
     المفتاح = عنوان نتيجة الاختبار (القدرات/التحصيلي/…) لمطابقة retakeExams. */
  const [retakeIntent, setRetakeIntent] = useState<Record<string, boolean>>({});
  /* التركيز الأول (ADR-0001 §2.6): يبني الخطة الأولى فقط، لا يغيّر الوجهة. */
  const [focus, setFocus] = useState("");
  /* H1: قفل ضغط مزدوج + رسالة فشل واضحة على آخر خطوة */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  const [gapYear, setGapYear] = useState<"" | "yes" | "no">(""); // خريج: إعادة الاختبارات؟
  /* ── حقول الجامعي (Phase Engine) — المعدل فقط في التسجيل؛ التدريب/الدراسات العليا
     تُضبط لاحقاً من المنصة لا هنا (أقل أسئلة، لا سؤال قياس للجامعي إطلاقاً) ── */
  const [universityGpa, setUniversityGpa] = useState("");

  /* الوجهات (متعدّد بلا حد) — الأهداف = وجهات فقط (ADR-0001)؛ منها تُشتق الاختبارات */
  const [targets, setTargets] = useState<string[]>([]);
  /* ── اختبارات اللغة الإضافية (متعدد بلا حد) — للثانوي والخريج ── */
  const [selectedLanguages, setSelectedLanguages] = useState<TrackId[]>([]);
  const [studyHours, setStudyHours] = useState("3"); // قيمة افتراضية — يعدّلها لاحقاً، لا تحجب الإكمال

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();

  /* ── المصدر الوحيد لاختبارات الطالب — ADR-0001 ──
     الوجهة (targets) → recommendedExams. لا goal اختبار، ولا examBoard/if يدوي في الواجهة.
     أول ثانوي: لا قياس مهما كانت الوجهة (المحرّك يصفّي بالمرحلة/الفصل/النافذة). */
  const boardStage = toBoardStage({ studyLevel: status || undefined, grade });
  const recExams = boardStage ? recommendedExams({
    destinations: targets,
    stage: boardStage,
    isUniGrad: gradStage === "خريج جامعة",
    afterFirstTerm: term !== "first",
    today,
  }) : [];
  /* اختبارات القياس المقترحة (قدرات/تحصيلي) — تُعرَض بطاقاتها في الخطوة ٢ */
  const recQiyas = recExams.filter((e) => e.kind === "qudurat" || e.kind === "tahsili");

  /* منظورٌ مُشتقّ من recommendedExams للمقبول (اختار «ابدأ الآن») كـ TrackId — للتوافق
     الانتقالي مع مساري الحالي فقط (المصدر recommendedExams، لا أهداف). يُزال مع Track. */
  const finalTracks: TrackId[] = [...new Set<TrackId>([
    ...recQiyas.filter((e) => e.boardId && examChoice[e.boardId] === "start").map((e) => EXAM_TRACK[e.boardId!]),
    ...LANGUAGE_TESTS.filter((id) => selectedLanguages.includes(id)),
  ])];

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
    /* الوجهة تقود المنطق (ADR-0001): الخريج يلزمه وجهةٌ واحدة على الأقل. */
    if (!isSecondary && !isUniversity && !targets.length) return;
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

    /* ADR-0001: التسجيل يبني «ملف الطالب» فقط — الوجهة (targets) + النتائج + البيانات
       الشخصية. لا goal اختبار. track/activeTracks هنا منظورٌ مُشتقّ من recommendedExams
       (توافق انتقالي مع مساري الحالي فقط، لا مصدر مستقل — يُزالان في مرحلة حذف Track).
       ensureWorkspace يشتق مساري من المرحلة + المقبول (مصدر واحد). */
    const userData: DarbUser = {
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
      targets: targets.length ? targets : undefined,
      /* التركيز + نيّة الإعادة (ADR-0001 §2.6) — يبنيان الخطة الأولى، لا يغيّران الوجهة */
      focus: focus || undefined,
      retakeExams: (() => { const r = Object.keys(retakeIntent).filter((k) => retakeIntent[k]); return r.length ? r : undefined; })(),
      gapYear: status === "خريج" ? gapYear === "yes" : undefined,
      studyHours: studyHours ? parseInt(studyHours) : undefined,
      trackType: resolvedTrackType,
      /* حقول الجامعي — المعدل فقط (التدريب/الدراسات العليا تُضاف لاحقاً من المنصة) */
      universityGpa: status === "جامعي" && universityGpa ? parseFloat(universityGpa) : undefined,
    };
    saveUser(ensureWorkspace(userData));

    /* الوجهة الجامعية/التخصص فقط (درجة الثانوية والموعد تُطلبان لاحقاً داخل المنصة) */
    if (universityId || majorId) {
      const g = loadGoals();
      const next = { ...g };
      if (universityId) {
        next.universityId = universityId;
        next.university = universityId === "other" ? (otherUni.trim() || "أخرى") : (universityName || findUniversity(universityId)?.name);
      }
      if (majorId) { next.majorId = majorId; next.major = findMajor(majorId)?.name; }
      saveGoals(next);
    }

    /* نتائج الاختبارات المُدخَلة (بطاقات الخطوة ٢) → «نتائجي» */
    const validPrev = PREV_EXAMS.filter((e) => prevResults[e]?.tested && prevResults[e].score.trim());
    if (validPrev.length) {
      saveResults(validPrev.map((exam, i) => ({
        id: `${Date.now()}-${i}`,
        exam,
        score: prevResults[exam].score.trim(),
      })));
    }

    import("@/lib/firestore").then(({ registerUser }) => { registerUser(trimmedName, primaryTrack, {}); });
    trackEvent("onboarding_completed", { track: primaryTrack, tracks: tracks.length, targets: targets.length, status });
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
              {/* المنطقة/المدرسة أُخرجت من التسجيل — تُطلب لاحقاً في «المدرسة»/الملف (ADR-0001 قاعدة ٣) */}
              <div className="rounded-2xl px-4 py-3"
                style={{ background: "color-mix(in srgb, var(--accent) 7%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>
                <p className="text-[15px] font-bold" style={{ color: "var(--accent-light)" }}>
                  🗺️ بالخطوة الجاية: نقترح لك اختباراتك المناسبة — تبدأ ما تريد، وتُدخل درجتك إن اختبرته. بلا فرض.
                </p>
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
              {/* درجات الخريج مصدرها الوحيد بطاقات «ابدأ الآن» في الخطوة ٢ (لا ازدواج إدخال) */}
            </>
          )}

          <button className="btn-primary glow-blue" onClick={() => { if (canProceed) setStep(2); }}
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
  /* اختبارات اللغة: إضافة/إزالة متعددة بلا أي حد */
  const toggleLanguage = (id: TrackId) => {
    setSelectedLanguages((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };
  /* ملاحظة (ADR-0001): لا «أهداف اختبارات» في التسجيل. الأهداف = وجهات فقط
     (targetsSection أدناه)، والاختبارات تُشتق منها عبر recommendedExams — لا goal. */

  /* أهداف ما بعد الثانوية (متعدّد، غير حاجز) — ثالث ثانوي وخريج الثانوي فقط.
     الطالب يقدّم غالباً على عدّة جهات معاً؛ الرئيسية ترتّب بطاقاته حول اختياره. */
  const targetsSection = (
    <div>
      <p className="label mb-1">🎯 وش وجهتك بعد الثانوية؟ <span className="text-[14px] font-normal" style={{ color: "var(--text-muted)" }}>(تقدر تختار أكثر من واحدة)</span></p>
      <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>
        منها نشتقّ اختباراتك المطلوبة ونرتّب خطتك — تقدر تعدّلها لاحقاً من ملفك
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
  const canFinish = isSecondary || isUniversity ? true : targets.length > 0;

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

  /* ── نقترح عليك البدء بـ… — من recommendedExams (المصدر الوحيد، ADR-0001).
     لا شيء يُضاف تلقائياً؛ «ابدأ الآن» فقط يُسجّل القبول. لا if يدوي يقرّر الظهور. ── */
  const examSuggestionSection = (
    <div>
      <p className="label mb-1">نقترح عليك البدء بـ…</p>
      <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>
        {recQiyas.length
          ? "مشتقّةٌ من وجهتك ومرحلتك — أنت من يقرّر ما يبدأ (لا شيء يُضاف تلقائياً)"
          : targets.length
            ? "لا اختبارات قبول في مرحلتك الآن — ركّز على أساسك المدرسي"
            : "اختر وجهتك فوق لنقترح لك اختباراتك المطلوبة"}
      </p>
      {recQiyas.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {recQiyas.map((e) => {
            const bid = e.boardId!;
            const id = EXAM_TRACK[bid];
            const t = TRACKS.find((tr) => tr.id === id)!;
            const choice = examChoice[bid];
            if (choice === "skip") return null;
            const prevKey = EXAM_PREV_KEY[bid];
            const r = prevResults[prevKey] ?? { tested: false, score: "" };
            const range = scoreRangeForTitle(prevKey);
            const c = "var(--accent)";

            /* بطاقة مُضافة (اختار «ابدأ الآن») — تتحوّل لسؤال الدرجة */
            if (choice === "start") return (
              <div key={bid} className="rounded-2xl px-4 py-3 flex flex-col gap-2.5"
                style={{ background: `color-mix(in srgb, ${c} 8%, var(--surface))`, border: `1.5px solid color-mix(in srgb, ${c} 34%, var(--border))` }}>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[14px] font-black flex-shrink-0"
                    style={{ background: c, border: `1.5px solid ${c}`, color: "#fff" }}>✓</span>
                  <span className="font-bold text-[17px] flex-1">{e.label}</span>
                  <button onClick={() => setExamChoice((m) => { const n = { ...m }; delete n[bid]; return n; })}
                    className="text-[13px] font-bold px-1" style={{ color: "var(--text-muted)" }}>إزالة ✕</button>
                </div>
                <p className="text-[14px] font-bold" style={{ color: "var(--text-dim)" }}>هل سبق أن اختبرته؟</p>
                <div className="flex gap-2">
                  <button onClick={() => setPrevResults((p) => ({ ...p, [prevKey]: { ...(p[prevKey] ?? { score: "" }), tested: true } }))}
                    className="flex-1 py-2 rounded-xl font-bold text-[14px]"
                    style={r.tested ? { background: c, color: "#fff", border: "none" } : { background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                    نعم، أدخل درجتي
                  </button>
                  <button onClick={() => { setPrevErr(""); setPrevResults((p) => ({ ...p, [prevKey]: { tested: false, score: "" } })); }}
                    className="flex-1 py-2 rounded-xl font-bold text-[14px]"
                    style={!r.tested ? { background: "var(--success)", color: "#04240f", border: "none" } : { background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                    لا، أضفه لخطتي
                  </button>
                </div>
                {r.tested && (
                  <div>
                    <input value={r.score} inputMode="decimal"
                      onChange={(ev) => { setPrevErr(""); setPrevResults((p) => ({ ...p, [prevKey]: { ...(p[prevKey] ?? { tested: true }), score: ev.target.value } })); }}
                      placeholder="درجتك" maxLength={6}
                      className="w-full rounded-xl px-3 py-2.5 text-[16px] text-center text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
                      style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }} />
                    {range && <p className="text-[12px] mt-1 px-1" style={{ color: "var(--text-muted)" }}>الدرجة: {range.hint}</p>}
                    {/* سؤال الرضا بعد الدرجة (ADR-0001 §2.6) — «لا» ⇒ نيّة إعادة (لا Goal) */}
                    {r.score.trim() && (
                      <div className="mt-2.5">
                        <p className="text-[13px] font-bold mb-1.5" style={{ color: "var(--text-dim)" }}>راضٍ عن درجتك؟</p>
                        <div className="flex gap-2">
                          <button onClick={() => setRetakeIntent((mm) => ({ ...mm, [prevKey]: false }))}
                            className="flex-1 py-2 rounded-xl font-bold text-[13px]"
                            style={retakeIntent[prevKey] === false ? { background: "var(--success)", color: "#04240f", border: "none" } : { background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                            نعم، مناسبة لي
                          </button>
                          <button onClick={() => setRetakeIntent((mm) => ({ ...mm, [prevKey]: true }))}
                            className="flex-1 py-2 rounded-xl font-bold text-[13px]"
                            style={retakeIntent[prevKey] === true ? { background: "var(--accent)", color: "#fff", border: "none" } : { background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                            لا، سأعيد الاختبار 📈
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );

            /* بطاقة اقتراح (مبدئية) — ابدأ الآن / ليس الآن */
            return (
              <div key={bid} className="rounded-2xl px-4 py-3 flex flex-col gap-2.5"
                style={{ background: "var(--surface)", border: "1.5px dashed color-mix(in srgb, var(--accent) 34%, var(--border))" }}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[17px] flex-1" style={{ color: "var(--text)" }}>{e.label}</span>
                </div>
                <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>{t.sub} · <span style={{ color: e.mode ? MODE_COLOR[e.mode] : "var(--text-muted)" }}>{e.hint}</span></p>
                <div className="flex gap-2">
                  <button onClick={() => setExamChoice((m) => ({ ...m, [bid]: "start" }))}
                    className="flex-1 py-2.5 rounded-xl font-bold text-[14px]" style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                    ابدأ الآن
                  </button>
                  <button onClick={() => setExamChoice((m) => ({ ...m, [bid]: "skip" }))}
                    className="flex-1 py-2.5 rounded-xl font-bold text-[14px]" style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                    ليس الآن
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  /* المدرسة: قسم مستقل، ليست اختباراً (Core بالمرحلة) */
  const schoolNoteSection = (
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
  );

  /* ── سؤال التركيز (ADR-0001 §2.6) — يبني الخطة الأولى فقط، لا يغيّر الوجهة ──
     خياراته حسب ما يخصّ الطالب (من recommendedExams + الوجهة). */
  const focusOptions = [
    { id: "qudurat",    label: "تحسين القدرات",    show: recQiyas.some((e) => e.kind === "qudurat") },
    { id: "tahsili",    label: "تحسين التحصيلي",   show: recQiyas.some((e) => e.kind === "tahsili") },
    { id: "english",    label: "اللغة الإنجليزية", show: true },
    { id: "university", label: "القبول الجامعي",   show: targets.includes("university") },
    { id: "programs",   label: "البرامج",          show: recExams.some((e) => e.kind === "aramco" || e.kind === "itc") },
  ].filter((o) => o.show);
  const focusSection = focusOptions.length > 0 ? (
    <div>
      <p className="label mb-1">🎯 وش تركيزك الأول؟ <span className="text-[14px] font-normal" style={{ color: "var(--text-muted)" }}>(نبني عليه خطتك الأولى)</span></p>
      <p className="text-[14px] mb-3" style={{ color: "var(--text-muted)" }}>يرتّب خطتك الأولى فقط — لا يغيّر وجهتك، وتقدر تعدّله لاحقاً</p>
      <div className="flex flex-col gap-2.5">
        {focusOptions.map((o) => {
          const on = focus === o.id;
          return (
            <button key={o.id} onClick={() => setFocus(on ? "" : o.id)} aria-pressed={on}
              className="rounded-2xl px-4 py-3 flex items-center gap-3 text-right transition active:scale-[0.98]"
              style={chipStyle(on)}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-black flex-shrink-0"
                style={{ background: on ? "var(--accent)" : "var(--surface2)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`, color: on ? "#fff" : "transparent" }}>●</span>
              <span className="font-bold text-[16px] flex-1">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-dvh flex flex-col app-col">
      {header}
      <div className="flex-1 px-6 py-8 max-w-sm mx-auto w-full flex flex-col gap-6">
        {stepDots}

        {/* ── الثانوي: أهداف صريحة متعددة + نواة ثابتة (مفعّلة تلقائياً) + قسم لغة اختياري ── */}
        {isSecondary ? (
          <>
            {targetsSection}
            {examSuggestionSection}
            {focusSection}
            {schoolNoteSection}
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
            {gradStage === "خريج ثانوي" && (
              <>
                {targetsSection}
                {examSuggestionSection}
                {focusSection}
              </>
            )}
            {languageSection}
          </>
        )}

        {/* منتقي الجامعة/التخصص المستهدف أُخرج من التسجيل (ADR-0001 §3): الوجهة العامة تكفي،
           والتفصيل (أي جامعة/تخصص/ترتيب الرغبات) ينتقل إلى «خطتي» عند تخطيط القبول. */}

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

        {/* درجة الثانوية · المدينة · الجوال · المنطقة/المدرسة · موعد الاختبار:
           أُخرجت من التسجيل (ADR-0001 قاعدة ٣ — تُطلب لاحقاً داخل المنصة). */}

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
