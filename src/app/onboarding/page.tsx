"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRACKS, TRACK_GROUPS, SUBJECT_GROUPS, getTrack, type TrackId, type SubjectInfo } from "@/lib/tracks";
import { saveUser, saveExamDate } from "@/lib/storage";
import { registerUser } from "@/lib/firestore";
import Dome from "@/components/Dome";

const STUDY_LEVELS = ["ثانوي", "جامعي", "خريج", "أخرى"];
const MAX_SUBJECTS = 3;

function defaultSubjectsForTrack(trackId: TrackId): string[] {
  return getTrack(trackId).subjects.slice(0, MAX_SUBJECTS).map((s) => s.name);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);

  // Step 0
  const [name, setName]           = useState("");
  const [age, setAge]             = useState("");
  const [studyLevel, setStudyLevel] = useState("");

  // Step 1
  const [track, setTrack] = useState<TrackId | null>(null);

  // Step 2
  const [subjects, setSubjects] = useState<string[]>([]);
  const [examDate, setExamDate] = useState("");

  const goStep1 = () => { if (name.trim()) setStep(1); };

  const goStep2 = (trackId: TrackId) => {
    setTrack(trackId);
    setSubjects(defaultSubjectsForTrack(trackId));
    setStep(2);
  };

  const toggleSubject = (subName: string) => {
    setSubjects((prev) => {
      if (prev.includes(subName)) return prev.filter((s) => s !== subName);
      if (prev.length >= MAX_SUBJECTS) return prev;
      return [...prev, subName];
    });
  };

  const finish = () => {
    if (!track || subjects.length === 0) return;
    const trimmedName = name.trim();
    saveUser({
      name: trimmedName,
      track,
      onboarded: true,
      age: age ? parseInt(age) : undefined,
      studyLevel: studyLevel || undefined,
      subjects,
    });
    if (examDate) saveExamDate(examDate);
    registerUser(trimmedName, track);
    router.push("/dashboard");
  };

  /* ── رأس الصفحة ثابت لكل الخطوات ── */
  const header = (
    <Dome hideControls>
      <div className="text-center py-5">
        <p className="font-black text-5xl mb-1"
          style={{ color: "var(--text)", filter: "drop-shadow(0 0 22px color-mix(in srgb, var(--accent) 45%, transparent))" }}>
          درب
        </p>
        <p className="eyebrow" style={{ color: "var(--text-dim)" }}>YOUR PATH TO EXCELLENCE</p>
      </div>
    </Dome>
  );

  /* ── مؤشر الخطوات ── */
  const stepDots = (
    <div className="flex items-center justify-center gap-2 mb-7">
      {[0, 1, 2].map((s) => (
        <div key={s} className="h-1.5 rounded-full transition-all duration-300"
          style={{ width: s === step ? "32px" : "8px", background: s <= step ? "var(--accent)" : "var(--surface2)" }} />
      ))}
    </div>
  );

  /* ═══ الخطوة 0: الاسم + العمر + المرحلة ═══ */
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
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "color-mix(in srgb, var(--text-muted) 15%, transparent)", color: "var(--text-muted)" }}>
              اختياري
            </span>
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
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "color-mix(in srgb, var(--text-muted) 15%, transparent)", color: "var(--text-muted)" }}>
              اختياري
            </span>
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

        <button className="btn-primary glow-blue" onClick={goStep1}
          disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.4 }}>
          التالي ←
        </button>
      </div>
    </div>
  );

  /* ═══ الخطوة 1: اختيار المسار ═══ */
  if (step === 1) return (
    <div className="min-h-dvh flex flex-col app-col">
      {header}
      <div className="flex-1 px-6 py-8 max-w-sm mx-auto w-full">
        {stepDots}
        <p className="label mb-5">وش تستعد له؟</p>

        <div className="flex flex-col gap-5 mb-6">
          {TRACK_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-black tracking-widest mb-2.5 px-1"
                style={{ color: "var(--text-muted)" }}>
                ── {group.label} ──
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {group.ids.map((id) => {
                  const t = TRACKS.find((tr) => tr.id === id)!;
                  const active = track === id;
                  return (
                    <button key={id} onClick={() => goStep2(id)}
                      className="rounded-2xl p-4 text-right transition-all duration-200 active:scale-[0.98] relative"
                      style={{
                        background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                        border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      }}>
                      {active && <span className="absolute top-2 left-2.5 text-base font-black text-[var(--accent-light)]">✓</span>}
                      <p className="font-black text-base text-[var(--text)]">{t.title}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1 leading-snug">{t.sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => setStep(0)} className="text-[15px] font-semibold w-full text-center py-2"
          style={{ color: "var(--text-muted)" }}>
          ← رجوع
        </button>
      </div>
    </div>
  );

  /* ═══ الخطوة 2: المواد + تاريخ الاختبار ═══ */
  return (
    <div className="min-h-dvh flex flex-col app-col">
      {header}
      <div className="flex-1 px-6 py-8 max-w-sm mx-auto w-full">
        {stepDots}

        {/* اختيار المواد */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <p className="label">اختر مواضيعك</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-black"
              style={{ background: subjects.length >= MAX_SUBJECTS ? "color-mix(in srgb, var(--gold) 15%, transparent)" : "color-mix(in srgb, var(--accent) 12%, transparent)", color: subjects.length >= MAX_SUBJECTS ? "var(--gold)" : "var(--accent-light)" }}>
              {subjects.length}/{MAX_SUBJECTS}
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {SUBJECT_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[11px] font-black tracking-widest mb-2 px-1"
                  style={{ color: "var(--text-muted)" }}>
                  ── {group.label} ──
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {group.subjects.map((sub: SubjectInfo) => {
                    const selected = subjects.includes(sub.name);
                    const disabled = !selected && subjects.length >= MAX_SUBJECTS;
                    return (
                      <button key={sub.name}
                        onClick={() => !disabled && toggleSubject(sub.name)}
                        className="rounded-2xl p-3.5 text-right transition-all duration-200 active:scale-[0.97]"
                        style={{
                          background: selected ? `color-mix(in srgb, ${sub.color} 15%, transparent)` : "var(--surface)",
                          border: `2px solid ${selected ? sub.color : "var(--border)"}`,
                          opacity: disabled ? 0.38 : 1,
                        }}>
                        <p className="font-black text-[15px]" style={{ color: selected ? sub.color : "var(--text)" }}>
                          {sub.name}
                        </p>
                        <div className="pt-1.5 mt-1" style={{ borderTop: `1px solid ${sub.color}35` }}>
                          <p className="text-[10px] font-semibold leading-snug" style={{ color: "var(--text-muted)" }}>
                            {sub.testedBy.join(" · ")}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* تاريخ الاختبار */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <p className="label">متى اختبارك؟</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "color-mix(in srgb, var(--text-muted) 15%, transparent)", color: "var(--text-muted)" }}>
              اختياري
            </span>
          </div>
          <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-2xl px-5 py-4 text-base text-[var(--text)] outline-none min-h-[56px]"
            style={{ background: "var(--surface)", border: "2px solid var(--border)", colorScheme: "dark" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
          {examDate && (
            <p className="text-sm mt-2 font-semibold" style={{ color: "var(--gold)" }}>
              {Math.max(0, Math.round((new Date(examDate + "T00:00:00").getTime() - new Date(new Date().toISOString().slice(0,10) + "T00:00:00").getTime()) / 86400000))} يوم على الاختبار
            </p>
          )}
        </div>

        <button className="btn-primary glow-blue mb-3" onClick={finish}
          disabled={subjects.length === 0} style={{ opacity: subjects.length > 0 ? 1 : 0.4 }}>
          يلا نبدأ ←
        </button>

        <button onClick={() => setStep(1)} className="text-[15px] font-semibold w-full text-center py-2"
          style={{ color: "var(--text-muted)" }}>
          ← رجوع
        </button>
      </div>
    </div>
  );
}
