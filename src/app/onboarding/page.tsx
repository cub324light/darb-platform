"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRACKS, type TrackId } from "@/lib/tracks";
import { saveUser, saveExamDate } from "@/lib/storage";
import { registerUser } from "@/lib/firestore";
import Dome from "@/components/Dome";

/* ─── دخول مختصر: اسمك + مسارك. بدون إيميل، بدون باسورد ─── */

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [track, setTrack] = useState<TrackId | null>(null);
  const [examDate, setExamDate] = useState("");

  const ready = name.trim().length > 0 && track !== null;

  const finish = () => {
    if (!ready || !track) return;
    const trimmedName = name.trim();
    saveUser({ name: trimmedName, track, onboarded: true });
    if (examDate) saveExamDate(examDate);
    registerUser(trimmedName, track);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-dvh flex flex-col app-col">
      <Dome hideControls>
        <div className="text-center py-6">
          <p className="font-black text-5xl mb-1"
            style={{ color: "var(--text)", filter: "drop-shadow(0 0 22px color-mix(in srgb, var(--accent) 45%, transparent))" }}>
            درب
          </p>
          <p className="eyebrow" style={{ color: "var(--text-dim)" }}>YOUR PATH TO EXCELLENCE</p>
        </div>
      </Dome>
      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-sm mx-auto w-full gap-7">

        {/* الاسم */}
        <div>
          <p className="label mb-3">وش اسمك؟</p>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: فهد، سارة، خالد..."
            maxLength={20}
            className="w-full rounded-2xl px-5 py-4 text-lg text-[var(--text)] placeholder-[var(--text-muted)] outline-none transition-colors"
            style={{ background: "var(--surface)", border: "2px solid var(--border)" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
        </div>

        {/* المسار — كلها أزرق */}
        <div>
          <p className="label mb-3">وش تستعد له؟</p>
          <div className="grid grid-cols-2 gap-2.5">
            {TRACKS.map((t) => {
              const active = track === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTrack(t.id)}
                  className="rounded-2xl p-4 text-right transition-all duration-200 active:scale-[0.98] relative"
                  style={{
                    background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  {active && <span className="absolute top-2 left-2.5 text-lg font-black text-[var(--accent-light)]">✓</span>}
                  <p className="font-black text-base text-[var(--text)]">{t.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-snug">{t.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* تاريخ الاختبار */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="label">متى اختبارك؟</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "color-mix(in srgb, var(--text-muted) 15%, transparent)", color: "var(--text-muted)" }}>اختياري</span>
          </div>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-2xl px-5 py-4 text-base text-[var(--text)] outline-none transition-colors min-h-[56px]"
            style={{ background: "var(--surface)", border: "2px solid var(--border)", colorScheme: "dark" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          {examDate && (
            <p className="text-sm mt-2 font-semibold" style={{ color: "var(--gold)" }}>
              {Math.max(0, Math.round((new Date(examDate + "T00:00:00").getTime() - new Date(new Date().toISOString().slice(0,10) + "T00:00:00").getTime()) / 86400000))} يوم على الاختبار
            </p>
          )}
        </div>

        {/* دخول */}
        <button
          className="btn-primary glow-blue"
          onClick={finish}
          disabled={!ready}
          style={{ opacity: ready ? 1 : 0.4 }}
        >
          يلا نبدأ ←
        </button>
      </div>
    </div>
  );
}
