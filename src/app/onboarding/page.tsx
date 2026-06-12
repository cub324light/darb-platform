"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRACKS, type TrackId } from "@/lib/tracks";
import { saveUser } from "@/lib/storage";
import { registerUser } from "@/lib/firestore";
import Dome from "@/components/Dome";

/* ─── دخول مختصر: اسمك + مسارك. بدون إيميل، بدون باسورد ─── */

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [track, setTrack] = useState<TrackId | null>(null);

  const ready = name.trim().length > 0 && track !== null;

  const finish = () => {
    if (!ready || !track) return;
    const trimmedName = name.trim();
    saveUser({ name: trimmedName, track, onboarded: true });
    registerUser(trimmedName, track);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-dvh flex flex-col">
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
          <div className="flex flex-col gap-3">
            {TRACKS.map((t) => {
              const active = track === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTrack(t.id)}
                  className="w-full rounded-2xl p-5 text-right flex items-center gap-4 transition-all duration-200 active:scale-[0.98]"
                  style={{
                    background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  <span className="text-3xl">{t.icon}</span>
                  <div className="flex-1">
                    <p className="font-black text-lg text-[var(--text)]">{t.title}</p>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">{t.sub}</p>
                  </div>
                  {active && <span className="text-2xl font-black text-[var(--accent-light)]">✓</span>}
                </button>
              );
            })}
          </div>
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
