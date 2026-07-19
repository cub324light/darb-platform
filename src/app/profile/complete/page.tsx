"use client";
/* ─── 🎉 صفحة احتفال اكتمال الملف الشخصي — مستقلّة، تظهر مرّةً واحدة فقط ───
   تُبلَّغ بإشارةٍ عابرة في sessionStorage يضعها «حفظ» بعد اكتمال الملف أوّل مرّة.
   دخولٌ مباشر بلا إشارة → إعادة توجيهٍ فوريّة إلى «معلوماتي». متابعة (أو تلقائياً) ← «معلوماتي». */
import { useEffect, useState } from "react";
import { n } from "@/lib/format";

const AUTO_MS = 2000; // تُتابِع تلقائياً بعدها (أو فوراً بزر «متابعة»)
const back = () => window.location.assign("/profile?tab=info");

export default function ProfileCompletePage() {
  const [state] = useState<{ valid: boolean; silver: number }>(() => {
    if (typeof window === "undefined") return { valid: false, silver: 0 };
    try {
      const raw = sessionStorage.getItem("darb_celebrate_complete");
      if (!raw) return { valid: false, silver: 0 };
      const v = JSON.parse(raw) as { silver?: number };
      return { valid: true, silver: typeof v?.silver === "number" ? v.silver : 35 };
    } catch { return { valid: false, silver: 0 }; }
  });

  useEffect(() => {
    try { sessionStorage.removeItem("darb_celebrate_complete"); } catch {}
    if (!state.valid) { window.location.replace("/profile?tab=info"); return; }
    const id = setTimeout(back, AUTO_MS);
    return () => clearTimeout(id);
  }, [state.valid]);

  if (!state.valid) return null;

  return (
    <div className="min-h-dvh pb-nav flex flex-col items-center justify-center text-center px-6 page-enter">
      <div className="scale-in text-[76px] leading-none mb-3" aria-hidden>🎉</div>
      <h1 className="t-display font-black rise" style={{ color: "var(--text)" }}>أحسنت!</h1>
      <p className="t-h3 font-bold mt-1 mb-6 rise" style={{ color: "var(--text-muted)" }}>اكتمل ملفك الشخصي</p>

      <div className="flex flex-col gap-2.5 w-full max-w-xs mb-6">
        <div className="ds-card flex items-center justify-center gap-2.5"
          style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }}>
          <span className="text-[20px] leading-none">🥈</span>
          <span className="t-title font-black font-mono-nums" style={{ color: "var(--text)" }}>+{n(state.silver)} فضة</span>
        </div>
        <div className="ds-card flex items-center justify-center gap-2.5"
          style={{ background: "color-mix(in srgb, var(--gold) 14%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--gold) 45%, var(--border))" }}>
          <span className="text-[20px] leading-none">🏅</span>
          <span className="t-title font-black" style={{ color: "var(--text)" }}>وسام اكتمال الملف</span>
        </div>
      </div>

      <p className="t-body font-bold max-w-sm mb-8" style={{ color: "var(--text-muted)" }}>
        وسيستخدم دويرب هذه المعلومات لتخصيص خططك ومراجعتك بشكلٍ أفضل.
      </p>

      <button onClick={back} className="btn-primary glow-blue w-full max-w-xs">متابعة</button>
    </div>
  );
}
