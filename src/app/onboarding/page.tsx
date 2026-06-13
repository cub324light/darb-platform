"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRACKS, TRACK_GROUPS, type TrackId } from "@/lib/tracks";
import { saveUser, saveExamDate } from "@/lib/storage";
import { registerUser } from "@/lib/firestore";
import Dome from "@/components/Dome";

const STUDY_LEVELS = ["ثانوي", "جامعي", "خريج", "أخرى"];
const MAX_TRACKS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);

  const [name, setName]             = useState("");
  const [age, setAge]               = useState("");
  const [studyLevel, setStudyLevel] = useState("");

  const [activeTracks, setActiveTracks] = useState<TrackId[]>([]);
  const [examDate, setExamDate]         = useState("");

  const toggleTrack = (id: TrackId) => {
    setActiveTracks((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : prev.length >= MAX_TRACKS ? prev : [...prev, id]
    );
  };

  const finish = () => {
    if (!activeTracks.length) return;
    const trimmedName = name.trim();
    const primaryTrack = activeTracks[0];
    saveUser({
      name: trimmedName,
      track: primaryTrack,
      activeTracks,
      onboarded: true,
      age: age ? parseInt(age) : undefined,
      studyLevel: studyLevel || undefined,
    });
    if (examDate) saveExamDate(examDate);
    registerUser(trimmedName, primaryTrack);
    router.push("/dashboard");
  };

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
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "color-mix(in srgb, var(--text-muted) 15%, transparent)", color: "var(--text-muted)" }}>اختياري</span>
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
              style={{ background: "color-mix(in srgb, var(--text-muted) 15%, transparent)", color: "var(--text-muted)" }}>اختياري</span>
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

        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <p className="label">متى اختبارك؟</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "color-mix(in srgb, var(--text-muted) 15%, transparent)", color: "var(--text-muted)" }}>اختياري</span>
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
          disabled={activeTracks.length === 0} style={{ opacity: activeTracks.length > 0 ? 1 : 0.4 }}>
          يلا نبدأ ←
        </button>
        <button onClick={() => setStep(1)} className="text-[15px] font-semibold w-full text-center py-2"
          style={{ color: "var(--text-muted)" }}>← رجوع</button>
      </div>
    </div>
  );
}
