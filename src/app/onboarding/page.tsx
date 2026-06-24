"use client";
import { useState, useEffect } from "react";
import {
  TRACKS, basicTracksFor, STUDY_GOALS, scoreRangeForTitle, validateScore,
  type StudyGoalType,
} from "@/lib/tracks";
import { UNIVERSITIES, MAJORS, findUniversity, findMajor } from "@/lib/university";
import { saveUser, saveExamDate, saveResults, saveTrackExamDates, loadGoals, saveGoals } from "@/lib/storage";
/* registerUser, pushBackup, currentUser مُستورَدة ديناميكياً أسفل */
import { trackEvent } from "@/lib/events";
import { redeemPendingRef } from "@/lib/referral";
import Dome from "@/components/Dome";
import Logo from "@/components/Logo";

const STATUSES = ["ثانوي", "جامعي", "خريج"] as const;
type Status = (typeof STATUSES)[number];
const GRADES = ["أول ثانوي", "ثاني ثانوي", "ثالث ثانوي"];
const TRACK_TYPES = ["عام", "صحي", "هندسي", "حاسب", "إداري"] as const;
const GRAD_STAGES = ["خريج ثانوي", "خريج جامعة"];
const UNI_YEARS = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة+"];
/* اختبارات النتائج السابقة للخريج — العناوين تطابق سُلّم الدرجات في tracks.ts */
const PREV_EXAMS = ["القدرات", "التحصيلي", "ستيب STEP"];
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
  const [age, setAge] = useState("");
  const [status, setStatus] = useState<Status | "">("");

  /* ── تفاصيل المرحلة ── */
  const [grade, setGrade] = useState("");                 // ثانوي
  const [trackType, setTrackType] = useState("");         // ثانوي: المسار
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

  const [gapYear, setGapYear] = useState<"" | "yes" | "no">(""); // خريج: إعادة الاختبارات؟

  /* ── الهدف + إضافات ── */
  const [goal, setGoal] = useState<StudyGoalType | "">("");
  const [studyHours, setStudyHours] = useState("");
  const [examDate, setExamDate] = useState("");
  const [school, setSchool] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  /* المسارات المُفعّلة تلقائياً من الحالة + الصف + الهدف + سنة الاستدراك */
  const computedTracks = basicTracksFor({
    status: status || undefined, grade, goal: goal || undefined, gapYear: gapYear === "yes",
  });

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
    if (!goal) return;
    const tracks = computedTracks;
    if (!tracks.length) return;
    const primaryTrack = tracks[0];

    /* تحقّق درجات الخريج السابقة */
    for (const exam of PREV_EXAMS) {
      const r = prevResults[exam];
      if (!r?.tested) continue;
      const err = validateScore(exam, r.score);
      if (err) { setPrevErr(`${exam}: ${err}`); return; }
    }
    setPrevErr("");

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
      activeTracks: tracks,
      onboarded: true,
      age: age ? parseInt(age) : undefined,
      studyLevel: status || undefined,
      grade: status === "ثانوي" && grade ? grade : undefined,
      gradStage: status === "خريج" && gradStage ? gradStage : undefined,
      universityYear: status === "جامعي" && universityYear ? universityYear : undefined,
      goal: goal || undefined,
      gapYear: status === "خريج" ? gapYear === "yes" : undefined,
      studyHours: studyHours ? parseInt(studyHours) : undefined,
      trackType: resolvedTrackType,
      ...extras,
    });

    /* حفظ الوجهة الجامعية في الأهداف (SSoT لدويرب) */
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
    trackEvent("onboarding_completed", { track: primaryTrack, tracks: tracks.length, goal, status });
    import("@/lib/cloud").then(({ pushBackup }) => { pushBackup().catch(() => {}); });
    await redeemPendingRef().catch(() => 0);
    window.location.href = "/dashboard";
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
            <span className="font-bold text-[15px] flex-1" style={{ color: "var(--accent-light)" }}>
              {universityId === "other" ? (otherUni.trim() || "أخرى") : universityName}
            </span>
            <button onClick={() => { setUniversityId(""); setUniversityName(""); }}
              className="text-[13px] font-bold px-2" style={{ color: "var(--text-muted)" }}>تغيير ✕</button>
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
                  className="px-3 py-2 rounded-full text-[13px] font-bold transition active:scale-95"
                  style={{ background: "var(--surface2)", color: "var(--text)", border: "1.5px solid var(--border)" }}>
                  {u.name}
                </button>
              ))}
              {filteredUnis.length === 0 && (
                <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>لا نتائج — اختر «أخرى».</p>
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
                className="px-3 py-2 rounded-full text-[13px] font-bold transition active:scale-95"
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
          <p className="label mb-3">عمرك؟ <span className="text-[12px] font-normal" style={{ color: "var(--text-muted)" }}>(اختياري)</span></p>
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
            placeholder="مثال: 18" min={13} max={60}
            className="w-full rounded-2xl px-5 py-4 text-lg text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
        </div>

        <div>
          <p className="label mb-3">مرحلتك الدراسية؟</p>
          <div className="grid grid-cols-3 gap-2.5">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => setStatus(status === s ? "" : s)}
                className="rounded-2xl py-3.5 font-bold text-[16px] transition active:scale-[0.98]"
                style={chipStyle(status === s)}>
                {s}
              </button>
            ))}
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
              <div>
                <p className="label mb-3">أي صف أنت؟</p>
                <div className="grid grid-cols-3 gap-2">
                  {GRADES.map((g) => (
                    <button key={g} onClick={() => setGrade(grade === g ? "" : g)}
                      className="rounded-2xl py-3 font-bold text-[14px] transition active:scale-[0.98]"
                      style={chipStyle(grade === g)}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="label mb-1">مسارك الدراسي؟</p>
                <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>يساعدنا نرتّب أولوياتك تلقائياً</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {TRACK_TYPES.map((t) => (
                    <button key={t} onClick={() => setTrackType(trackType === t ? "" : t)}
                      className="rounded-2xl py-3 font-bold text-[14px] transition active:scale-[0.98]"
                      style={chipStyle(trackType === t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl px-4 py-3"
                style={{ background: "color-mix(in srgb, var(--accent) 7%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>
                <p className="text-[13px] font-bold" style={{ color: "var(--accent-light)" }}>
                  🎯 نفعّل لك تلقائياً اختبارات قياس المناسبة لمرحلتك — تقدر تضيف غيرها لاحقاً.
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
                      className="rounded-2xl py-3 font-bold text-[14px] transition active:scale-[0.98]"
                      style={chipStyle(universityYear === y)}>
                      {y}
                    </button>
                  ))}
                </div>
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
                      className="rounded-2xl py-3.5 font-bold text-[15px] transition active:scale-[0.98]"
                      style={chipStyle(gradStage === g)}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="label mb-1">تنوي تعيد القدرات أو التحصيلي؟</p>
                <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>إذا خلّصت اختباراتك وبتركّز على القبول، اختر «خلصتها»</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button onClick={() => setGapYear(gapYear === "yes" ? "" : "yes")}
                    className="rounded-2xl py-3.5 px-3 font-bold text-[14px] transition active:scale-[0.98] text-center leading-snug"
                    style={chipStyle(gapYear === "yes")}>
                    نعم، سنة استدراك 📈
                  </button>
                  <button onClick={() => setGapYear(gapYear === "no" ? "" : "no")}
                    className="rounded-2xl py-3.5 px-3 font-bold text-[14px] transition active:scale-[0.98] text-center leading-snug"
                    style={chipStyle(gapYear === "no")}>
                    لا، خلّصتها 🎓
                  </button>
                </div>
              </div>
              <div>
                <p className="label mb-1">نتائجك السابقة؟</p>
                <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>
                  {gapYear === "no"
                    ? "ندخلها لحساب نسبتك الموزونة ومقارنة الجامعات — مهمة لخطة القبول"
                    : "نستخدمها لحساب جاهزيتك وتخصيص خطتك"}
                </p>
                <div className="flex flex-col gap-2.5">
                  {PREV_EXAMS.map((exam) => {
                    const r = prevResults[exam];
                    const range = scoreRangeForTitle(exam);
                    return (
                      <div key={exam} className="rounded-2xl px-4 py-3"
                        style={{ background: "var(--surface)", border: "2px solid var(--border)" }}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPrevResults((p) => ({ ...p, [exam]: { ...p[exam], tested: !p[exam].tested } }))}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-[13px] font-black flex-shrink-0 transition"
                            style={{
                              background: r.tested ? "var(--accent)" : "var(--surface2)",
                              border: `1.5px solid ${r.tested ? "var(--accent)" : "var(--border)"}`,
                              color: r.tested ? "#fff" : "transparent",
                            }}>✓</button>
                          <span className="font-bold text-[15px] flex-1" style={{ color: "var(--text)" }}>{exam}</span>
                          <input value={r.score} inputMode="decimal" disabled={!r.tested}
                            onChange={(e) => { setPrevErr(""); setPrevResults((p) => ({ ...p, [exam]: { ...p[exam], score: e.target.value } })); }}
                            placeholder="الدرجة" maxLength={6}
                            className="w-20 rounded-xl px-3 py-2 text-base text-center text-[var(--text)] placeholder-[var(--text-muted)] outline-none disabled:opacity-30"
                            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }} />
                        </div>
                        {r.tested && range && (
                          <p className="text-[11px] mt-1.5 px-1" style={{ color: "var(--text-muted)" }}>الدرجة: {range.hint}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {prevErr && <p className="text-[12px] mt-2 font-bold" style={{ color: "var(--danger)" }}>{prevErr}</p>}
              </div>
            </>
          )}

          <button className="btn-primary glow-blue" onClick={() => { if (canProceed) setStep(2); }}
            disabled={!canProceed} style={{ opacity: canProceed ? 1 : 0.4 }}>
            التالي ←
          </button>
          <button onClick={() => setStep(0)} className="text-[15px] font-semibold w-full text-center py-1"
            style={{ color: "var(--text-muted)" }}>← رجوع</button>
        </div>
      </div>
    );
  }

  /* ════════ الخطوة 2 — الهدف + إضافات ════════ */
  const needsUniPicker = (goal === "university" && !universityId) || (goal === "major" && !majorId);
  const primaryTrack = computedTracks[0];

  return (
    <div className="min-h-dvh flex flex-col app-col">
      {header}
      <div className="flex-1 px-6 py-8 max-w-sm mx-auto w-full flex flex-col gap-6">
        {stepDots}

        <div>
          <p className="label mb-1">ما هدفك الحالي؟</p>
          <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>نبني خطتك وجدولك وأولوياتك حوله تلقائياً</p>
          <div className="flex flex-col gap-2.5">
            {STUDY_GOALS.map((g) => {
              const on = goal === g.id;
              return (
                <button key={g.id} onClick={() => setGoal(on ? "" : g.id)}
                  className="rounded-2xl px-4 py-3.5 flex items-center gap-3 text-right transition active:scale-[0.98]"
                  style={chipStyle(on)}>
                  <span className="text-[20px]">{g.icon}</span>
                  <span className="font-bold text-[15px] flex-1">{g.label}</span>
                  {on && <span className="text-[16px] font-black" style={{ color: "var(--accent-light)" }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* منتقي الجامعة/التخصص عند الحاجة */}
        {needsUniPicker && (
          <div className="rounded-2xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            {uniMajorPicker}
          </div>
        )}

        {/* الاختبارات المُفعّلة تلقائياً — شفافية */}
        {goal && computedTracks.length > 0 && (
          <div>
            <p className="label mb-2.5">فعّلنا لك هذه الاختبارات</p>
            <div className="flex flex-wrap gap-2">
              {computedTracks.map((id) => {
                const t = TRACKS.find((tr) => tr.id === id)!;
                return (
                  <span key={id} className="px-3 py-2 rounded-full text-[13px] font-black flex items-center gap-1.5"
                    style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)", border: "1.5px solid color-mix(in srgb, var(--accent) 28%, transparent)" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    {t.title}
                  </span>
                );
              })}
            </div>
            <p className="text-[11.5px] mt-2" style={{ color: "var(--text-muted)" }}>
              تقدر تضيف اختبارات أخرى (مثل آيلتس أو توفل) لاحقاً من ملفك الشخصي.
            </p>
          </div>
        )}

        {/* موعد الاختبار القادم (اختياري) */}
        {goal && primaryTrack && (
          <div>
            <p className="label mb-3">📅 موعد اختبارك القادم؟ <span className="text-[12px] font-normal" style={{ color: "var(--text-muted)" }}>(اختياري)</span></p>
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

        {/* معلومات إضافية (اختياري) */}
        <div className="flex flex-col gap-4">
          <p className="label">معلومات إضافية <span className="text-[12px] font-normal" style={{ color: "var(--text-muted)" }}>(اختياري)</span></p>
          {[
            { label: "اسم المدرسة / الجامعة", value: school, setter: setSchool, placeholder: "مثال: ثانوية الملك فهد", type: "text" as const },
            { label: "المدينة", value: city, setter: setCity, placeholder: "مثال: الرياض، جدة...", type: "text" as const },
            { label: "رقم الجوال", value: phone, setter: setPhone, placeholder: "05xxxxxxxx", type: "tel" as const },
          ].map(({ label, value, setter, placeholder, type }) => (
            <input key={label} type={type} value={value} onChange={(e) => setter(e.target.value)}
              placeholder={placeholder} aria-label={label}
              className="w-full rounded-2xl px-5 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
          ))}
          <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="المنطقة"
            className="w-full rounded-2xl px-5 py-3.5 text-base text-[var(--text)] outline-none"
            style={inputStyle}>
            <option value="">المنطقة</option>
            {SAUDI_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <button className="btn-primary glow-blue" onClick={finish}
          disabled={!goal || !studyHours || needsUniPicker}
          style={{ opacity: goal && studyHours && !needsUniPicker ? 1 : 0.4 }}>
          يلا نبدأ ←
        </button>
        <button onClick={() => setStep(1)} className="text-[15px] font-semibold w-full text-center py-1"
          style={{ color: "var(--text-muted)" }}>← رجوع</button>
      </div>
    </div>
  );
}
