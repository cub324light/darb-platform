"use client";
import { useState } from "react";
import { TRACKS, TRACK_GROUPS, scoreRangeForTitle, validateScore, type TrackId } from "@/lib/tracks";
import { saveUser, saveExamDate, saveResults, saveTrackExamDates } from "@/lib/storage";
import { registerUser } from "@/lib/firestore";
import { currentUser, pushBackup } from "@/lib/cloud";
import { trackEvent } from "@/lib/events";
import Dome from "@/components/Dome";
import Logo from "@/components/Logo";

const STUDY_LEVELS = ["ثانوي", "جامعي", "خريج", "أخرى"];
const GRADES = ["أول ثانوي", "ثاني ثانوي", "ثالث ثانوي"];
const MAX_TRACKS = 3;
const SAUDI_REGIONS = [
  "الرياض", "مكة المكرمة", "المدينة المنورة", "القصيم", "المنطقة الشرقية",
  "عسير", "تبوك", "حائل", "الحدود الشمالية", "جازان", "نجران", "الباحة", "الجوف",
];

export default function OnboardingPage() {
  const [step, setStep] = useState<0 | 1 | 2>(0);

  const [name, setName] = useState(() => {
    const dn = typeof window !== "undefined" ? currentUser()?.displayName : undefined;
    return dn ? dn.split(" ")[0] : "";
  });
  const [age, setAge]               = useState("");
  const [studyLevel, setStudyLevel] = useState("");
  const [grade, setGrade]           = useState("");
  const [studyHours, setStudyHours] = useState("");
  const [school, setSchool]   = useState("");
  const [region, setRegion]   = useState("");
  const [city, setCity]       = useState("");
  const [phone, setPhone]     = useState("");

  const [activeTracks, setActiveTracks] = useState<TrackId[]>([]);
  /* تواريخ اختبار لكل مسار على حدة */
  const [trackDates, setTrackDates] = useState<Record<string, string>>({});
  /* نتائج اختبارات سابقة (اختياري) — تُحفظ في «نتائجي» */
  const [prevExams, setPrevExams] = useState<{ exam: string; score: string }[]>([]);
  const [prevErr, setPrevErr] = useState("");

  const toggleTrack = (id: TrackId) => {
    setActiveTracks((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : prev.length >= MAX_TRACKS ? prev : [...prev, id]
    );
  };

  const finish = async () => {
    if (!activeTracks.length) return;
    /* تحقق من درجات النتائج السابقة حسب سُلّم كل اختبار قبل المتابعة */
    for (const p of prevExams) {
      if (!p.exam.trim()) continue;
      const err = validateScore(p.exam, p.score);
      if (err) { setPrevErr(`${p.exam}: ${err}`); return; }
    }
    setPrevErr("");
    const trimmedName = name.trim();
    const primaryTrack = activeTracks[0];
    const extras = {
      school: school.trim() || undefined,
      region: region        || undefined,
      city:   city.trim()   || undefined,
      phone:  phone.trim()  || undefined,
    };
    saveUser({
      name: trimmedName,
      track: primaryTrack,
      activeTracks,
      onboarded: true,
      age: age ? parseInt(age) : undefined,
      studyLevel: studyLevel || undefined,
      grade: studyLevel === "ثانوي" && grade ? grade : undefined,
      studyHours: studyHours ? parseInt(studyHours) : undefined,
      ...extras,
    });
    /* حفظ تاريخ المسار الأساسي (للتوافق مع الكود الحالي) */
    const primaryDate = trackDates[primaryTrack];
    if (primaryDate) saveExamDate(primaryDate);
    /* حفظ تواريخ كل المسارات */
    const allDates: Record<string, string> = {};
    for (const id of activeTracks) { if (trackDates[id]) allDates[id] = trackDates[id]; }
    if (Object.keys(allDates).length) saveTrackExamDates(allDates);
    const validPrev = prevExams.filter((p) => p.exam.trim());
    if (validPrev.length) {
      saveResults(validPrev.map((p, i) => {
        // اختبار بلا درجة (CPC/ITC) → لا نحفظ درجة
        const noScore = scoreRangeForTitle(p.exam) === null;
        return {
          id: `${Date.now()}-${i}`,
          exam: p.exam.trim(),
          score: noScore ? undefined : (p.score.trim() || undefined),
        };
      }));
    }
    registerUser(trimmedName, primaryTrack, extras);
    trackEvent("onboarding_completed", { track: primaryTrack, tracks: activeTracks.length });
    pushBackup().catch(() => {});
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
            style={{ background: "var(--surface)", border: "2px solid var(--border)" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="label">عمرك؟</p>
          </div>
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
            placeholder="مثال: 18" min={13} max={60}
            className="w-full rounded-2xl px-5 py-4 text-lg text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
            style={{ background: "var(--surface)", border: "2px solid var(--border)" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="label">مرحلتك الدراسية؟</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {STUDY_LEVELS.map((lvl) => {
              const active = studyLevel === lvl;
              return (
                <button key={lvl} onClick={() => setStudyLevel(active ? "" : lvl)}
                  className="rounded-2xl py-3.5 font-bold text-[17px] transition active:scale-[0.98]"
                  style={{
                    background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    color: active ? "var(--accent-light)" : "var(--text)",
                  }}>
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>

        {studyLevel === "ثانوي" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="label">أي صف؟</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {GRADES.map((g) => {
                const active = grade === g;
                return (
                  <button key={g} onClick={() => setGrade(active ? "" : g)}
                    className="rounded-2xl py-3 font-bold text-[14px] transition active:scale-[0.98]"
                    style={{
                      background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                      border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      color: active ? "var(--accent-light)" : "var(--text)",
                    }}>
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="label">كم ساعة تقدر تذاكر باليوم؟</p>
          </div>
          <input type="number" value={studyHours} onChange={(e) => setStudyHours(e.target.value)}
            placeholder="مثال: 3" min={1} max={16}
            className="w-full rounded-2xl px-5 py-4 text-lg text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
            style={{ background: "var(--surface)", border: "2px solid var(--border)" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
        </div>

        {/* ─── المدرسة والموقع والجوال ─── */}
        <div className="flex flex-col gap-4">
          {[
            { label: "اسم المدرسة / الجامعة", value: school, setter: setSchool, placeholder: "مثال: ثانوية الملك فهد", type: "text" as const },
            { label: "المدينة أو المحافظة",   value: city,   setter: setCity,   placeholder: "مثال: الرياض، جدة، الدمام...", type: "text" as const },
            { label: "رقم الجوال",             value: phone,  setter: setPhone,  placeholder: "05xxxxxxxx", type: "tel" as const },
          ].map(({ label, value, setter, placeholder, type }) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-3">
                <p className="label">{label}</p>
              </div>
              <input type={type} value={value} onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-2xl px-5 py-4 text-lg text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
                style={{ background: "var(--surface)", border: "2px solid var(--border)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
            </div>
          ))}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="label">المنطقة</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SAUDI_REGIONS.map((r) => (
                <button key={r} onClick={() => setRegion(region === r ? "" : r)}
                  className="rounded-2xl py-2.5 px-3 font-bold text-[13px] text-right transition active:scale-[0.98]"
                  style={{
                    background: region === r ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                    border: `2px solid ${region === r ? "var(--accent)" : "var(--border)"}`,
                    color: region === r ? "var(--accent-light)" : "var(--text)",
                  }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button className="btn-primary glow-blue" onClick={() => { if (name.trim()) setStep(1); }}
          disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.4 }}>
          التالي ←
        </button>
      </div>
    </div>
  );

  if (step === 1) return (
    <div className="min-h-dvh flex flex-col app-col">
      {header}
      <div className="flex-1 px-6 py-8 max-w-sm mx-auto w-full">
        {stepDots}
        <div className="flex items-center gap-2 mb-5">
          <p className="label">اختر مساراتك</p>
          <span className="text-xs px-2 py-0.5 rounded-full font-black"
            style={{
              background: activeTracks.length >= MAX_TRACKS ? "color-mix(in srgb, var(--gold) 15%, transparent)" : "color-mix(in srgb, var(--accent) 12%, transparent)",
              color: activeTracks.length >= MAX_TRACKS ? "var(--gold)" : "var(--accent-light)",
            }}>
            {activeTracks.length}/{MAX_TRACKS}
          </span>
        </div>

        <div className="flex flex-col gap-5 mb-6">
          {TRACK_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-black tracking-widest mb-2.5 px-1" style={{ color: "var(--text-muted)" }}>
                ── {group.label} ──
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {group.ids.map((id) => {
                  const t = TRACKS.find((tr) => tr.id === id)!;
                  const selected = activeTracks.includes(id);
                  const disabled = !selected && activeTracks.length >= MAX_TRACKS;
                  return (
                    <button key={id} onClick={() => !disabled && toggleTrack(id)}
                      className="rounded-2xl p-4 text-right transition-all duration-200 active:scale-[0.98] relative"
                      style={{
                        background: selected ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                        border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                        opacity: disabled ? 0.38 : 1,
                      }}>
                      {selected && <span className="absolute top-2 left-2.5 text-base font-black text-[var(--accent-light)]">✓</span>}
                      <p className="font-black text-base text-[var(--text)]">{t.title}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1 leading-snug">{t.sub}</p>
                      {t.subjects.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {t.subjects.map((s) => (
                            <span key={s.name} className="w-2 h-2 rounded-full inline-block"
                              style={{ background: s.color }} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button className="btn-primary glow-blue mb-3" onClick={() => { if (activeTracks.length) setStep(2); }}
          disabled={activeTracks.length === 0} style={{ opacity: activeTracks.length > 0 ? 1 : 0.4 }}>
          التالي ←
        </button>
        <button onClick={() => setStep(0)} className="text-[15px] font-semibold w-full text-center py-2"
          style={{ color: "var(--text-muted)" }}>← رجوع</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col app-col">
      {header}
      <div className="flex-1 px-6 py-8 max-w-sm mx-auto w-full">
        {stepDots}

        <div className="mb-6">
          <p className="label mb-4">مساراتك المختارة</p>
          <div className="flex flex-col gap-2.5">
            {activeTracks.map((id) => {
              const t = TRACKS.find((tr) => tr.id === id)!;
              return (
                <div key={id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid color-mix(in srgb, var(--accent) 28%, transparent)" }}>
                  <div className="flex gap-1">
                    {t.subjects.map((s) => (
                      <span key={s.name} className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    ))}
                  </div>
                  <span className="font-bold text-[15px] flex-1" style={{ color: "var(--accent-light)" }}>{t.title}</span>
                  <button onClick={() => toggleTrack(id)} className="text-[var(--text-muted)] text-sm font-bold px-2 py-1">✕</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* تواريخ الاختبار لكل مسار */}
        <div className="mb-7 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <p className="label">متى اختباراتك؟</p>
          </div>
          {activeTracks.map((id) => {
            const t = TRACKS.find((tr) => tr.id === id)!;
            const d = trackDates[id] ?? "";
            const today = new Date().toISOString().slice(0, 10);
            const days = d ? Math.max(0, Math.round((new Date(d + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000)) : null;
            return (
              <div key={id} className="rounded-2xl px-4 py-3"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-1">
                    {t.subjects.map((s) => <span key={s.name} className="w-2 h-2 rounded-full" style={{ background: s.color }} />)}
                  </div>
                  <p className="font-bold text-[14px]" style={{ color: "var(--accent-light)" }}>📅 موعد اختبار {t.title}</p>
                </div>
                <input type="date" value={d} onChange={(e) => setTrackDates((p) => ({ ...p, [id]: e.target.value }))}
                  min={today}
                  className="w-full rounded-xl px-4 py-3 text-base text-[var(--text)] outline-none"
                  style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", colorScheme: "dark" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
                {days !== null && (
                  <p className="text-sm mt-1.5 font-semibold" style={{ color: "var(--gold)" }}>
                    {days} يوم على الاختبار
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <p className="label">اختبرت من قبل؟</p>
          </div>
          <div className="flex flex-col gap-2.5">
            {prevExams.map((p, i) => {
              const range = p.exam ? scoreRangeForTitle(p.exam) : undefined;
              const noScore = range === null;
              return (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    <select value={p.exam}
                      onChange={(e) => setPrevExams((prev) => prev.map((x, j) => j === i ? { exam: e.target.value, score: "" } : x))}
                      className="flex-1 min-w-0 rounded-2xl px-4 py-3 text-base text-[var(--text)] outline-none"
                      style={{ background: "var(--surface)", border: "2px solid var(--border)" }}>
                      <option value="">اختر الاختبار</option>
                      {TRACKS.map((t) => (
                        <option key={t.id} value={t.title}>{t.title}</option>
                      ))}
                    </select>
                    <input value={p.score} inputMode="decimal" disabled={noScore}
                      onChange={(e) => { setPrevErr(""); setPrevExams((prev) => prev.map((x, j) => j === i ? { ...x, score: e.target.value } : x)); }}
                      placeholder={noScore ? "بلا درجة" : "الدرجة"} maxLength={6}
                      className="w-24 rounded-2xl px-3 py-3 text-base text-center text-[var(--text)] placeholder-[var(--text-muted)] outline-none disabled:opacity-40"
                      style={{ background: "var(--surface)", border: "2px solid var(--border)" }} />
                    <button onClick={() => setPrevExams((prev) => prev.filter((_, j) => j !== i))}
                      className="px-3 rounded-2xl font-bold text-[var(--text-muted)]"
                      style={{ background: "var(--surface)", border: "2px solid var(--border)" }}>✕</button>
                  </div>
                  {p.exam && range && (
                    <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>الدرجة: {range.hint}</p>
                  )}
                  {noScore && (
                    <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>هذا الاختبار ما له درجة رقمية.</p>
                  )}
                </div>
              );
            })}
            <button onClick={() => setPrevExams((prev) => [...prev, { exam: "", score: "" }])}
              className="rounded-2xl py-3 font-bold text-[15px]"
              style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--accent-light)" }}>
              + أضف نتيجة سابقة
            </button>
          </div>
          {prevErr && <p className="text-xs mt-2 font-bold" style={{ color: "var(--danger)" }}>{prevErr}</p>}
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>تنحفظ في «نتائجي» وتقدر تعدّلها بعدين.</p>
        </div>

        <button className="btn-primary glow-blue mb-3" onClick={finish}
          disabled={activeTracks.length === 0} style={{ opacity: activeTracks.length > 0 ? 1 : 0.4 }}>
          يلا نبدأ ←
        </button>
        <button onClick={() => setStep(1)} className="text-[15px] font-semibold w-full text-center py-2"
          style={{ color: "var(--text-muted)" }}>← رجوع</button>
      </div>
    </div>
  );
}
