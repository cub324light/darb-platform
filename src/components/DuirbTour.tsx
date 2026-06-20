"use client";
/* ─── جولة أول مستخدم — ٣ خطوات فقط ───
   تظهر مرة واحدة بعد الـ onboarding مباشرة.
   مفتاح localStorage: darb_tour_done */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

const TOUR_KEY = "darb_tour_done";

const STEPS = [
  {
    icon: "⏱️",
    title: "أوربت — جلسة تركيز",
    body: "كل جلسة ٥٠ دقيقة تركيز + ١٠ دقائق راحة. ابدأ جلسة من زر «ابدأ جلسة أوربت» في الداشبورد.",
    accent: "#2563EB",
  },
  {
    icon: "🤖",
    title: "دويرب — مساعدك الذكي",
    body: "اطلب منه خطة يومية، حلّل ملفاً دراسياً، أو ولّد أسئلة تدريبية. زر دويرب العائم دائماً في أسفل يسار الشاشة.",
    accent: "#8B5CF6",
  },
  {
    icon: "🗺️",
    title: "الخريطة — طريقك للاختبار",
    body: "خريطة مخصصة لمسارك تقسّم المنهج إلى دروس قابلة للتتبع، مع مراحل تأسيس وتدريب وتسريبات.",
    accent: "#F59E0B",
  },
];

export default function DuirbTour() {
  const pathname = usePathname();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    /* أظهر فقط في الداشبورد وللمستخدم الذي لم يرَ الجولة */
    if (pathname !== "/dashboard") return;
    try {
      if (!localStorage.getItem(TOUR_KEY)) setVisible(true);
    } catch { /* localStorage غير متاح */ }
  }, [pathname]);

  const finish = () => {
    try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* */ }
    setVisible(false);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const overlay = (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 pb-8"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4"
        style={{ background: "var(--surface)", border: `2px solid ${current.accent}33` }}>
        {/* أيقونة ونبضة */}
        <div className="flex justify-center">
          <span className="text-[52px] leading-none">{current.icon}</span>
        </div>

        {/* العنوان */}
        <h2 className="text-center text-[20px] font-black" style={{ color: "var(--text)" }}>
          {current.title}
        </h2>

        {/* الوصف */}
        <p className="text-center text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {current.body}
        </p>

        {/* نقاط التقدم */}
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className="rounded-full transition-all"
              style={{
                width: i === step ? "20px" : "8px",
                height: "8px",
                background: i === step ? current.accent : "var(--border)",
              }} />
          ))}
        </div>

        {/* أزرار */}
        <div className="flex gap-2 mt-1">
          <button onClick={finish}
            className="flex-1 py-3 rounded-2xl text-[14px] font-bold"
            style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            تخطّى
          </button>
          <button onClick={isLast ? finish : () => setStep((s) => s + 1)}
            className="flex-[2] py-3 rounded-2xl text-[15px] font-black transition"
            style={{ background: current.accent, color: "#fff" }}>
            {isLast ? "ابدأ الآن ✓" : "التالي ←"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
