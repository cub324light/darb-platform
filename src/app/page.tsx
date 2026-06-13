"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TRACKS } from "@/lib/tracks";
import Bird from "@/components/Birds";
import { BIRDS } from "@/lib/birds";

/* ─── صفحة الهبوط: تعريف بالمنصة مع أنميشن سكرول ─── */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

/* نجوم ثابتة (مواقع مرسومة مسبقاً عشان لا تختلف بين السيرفر والمتصفح) */
const HERO_STARS = [
  { x: 8, y: 12, size: 2, delay: 0 }, { x: 22, y: 28, size: 3, delay: 1.2 },
  { x: 35, y: 8, size: 2, delay: 0.5 }, { x: 48, y: 18, size: 2, delay: 2.1 },
  { x: 62, y: 6, size: 3, delay: 0.8 }, { x: 75, y: 22, size: 2, delay: 1.7 },
  { x: 88, y: 10, size: 2, delay: 0.3 }, { x: 15, y: 45, size: 2, delay: 2.4 },
  { x: 92, y: 38, size: 3, delay: 1.0 }, { x: 5, y: 70, size: 2, delay: 1.5 },
  { x: 95, y: 65, size: 2, delay: 0.6 }, { x: 28, y: 85, size: 2, delay: 2.0 },
  { x: 70, y: 88, size: 3, delay: 0.9 }, { x: 55, y: 75, size: 2, delay: 1.4 },
];

const FEATURES = [
  { title: "خزنة الأخطاء", desc: "كل سؤال غلطت فيه ينحفظ — عشان ما تغلط فيه مرتين. راجعها قبل الاختبار وادخل وأنت مرتاح.", color: "#F59E0B" },
  { title: "بنك المراجعة", desc: "بطاقات بنظام SM-2 العلمي للتكرار المتباعد. النظام يحسب لك متى تراجع كل معلومة قبل ما تنساها.", color: "#10B981" },
  { title: "المساعد الذكي", desc: "قل له مشاغيلك — مدرسة، نادي، أي شيء — ويبني لك جدول مذاكرة يومك حولها بالذكاء الاصطناعي.", color: "#8B5CF6" },
];

export default function LandingPage() {
  const [onboarded, setOnboarded] = useState(false);
  const [checking, setChecking] = useState(true);
  const rootRef = useReveal();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("darb_user");
      const user = raw ? JSON.parse(raw) : null;
      if (user?.onboarded) setOnboarded(true);
    } catch {}
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="font-black text-5xl text-[var(--accent-light)] hero-glow">درب</p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative z-[1]">

      {/* ── شريط علوي للمسجّلين ── */}
      {onboarded && (
        <div className="fixed top-0 inset-x-0 z-50 flex justify-between items-center px-5 py-3"
          style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
          <span className="font-black text-xl" style={{ color: "var(--accent-light)" }}>درب</span>
          <Link href="/dashboard" className="btn-primary py-2 px-5 text-sm" style={{ textDecoration: "none" }}>
            داشبوردك ←
          </Link>
        </div>
      )}

      {/* ═══ الواجهة ═══ */}
      <section className="min-h-dvh flex flex-col items-center justify-center px-6 text-center relative overflow-hidden"
        style={{ paddingTop: onboarded ? "72px" : 0 }}>
        {/* نجوم الواجهة */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {HERO_STARS.map((s, i) => (
            <span key={i} className="hero-star"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
          ))}
        </div>

        <div className="hero-float mb-2 relative">
          <Bird id="falcon" size={130} />
        </div>
        <p className="font-black text-7xl mb-3 hero-glow"
          style={{
            background: "linear-gradient(135deg, var(--text) 30%, var(--accent-light) 70%, var(--accent-hi))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}>درب</p>
        <p className="eyebrow mb-5" style={{ color: "var(--text-dim)" }}>YOUR PATH TO EXCELLENCE</p>
        <h1 className="title-xl mb-4 fade-in" style={{ color: "var(--text)" }}>
          المنصة التي تعاملك كأخ
        </h1>
        <p className="text-lg leading-relaxed max-w-sm mb-7" style={{ color: "var(--text-dim)" }}>
          تأسيس حقيقي للقدرات والتحصيلي وأرامكو CPC واختبارات الإنجليزية.
          خطة، التزام، ووصول — بدون أرقام وهمية.
        </p>

        {/* أرقام سريعة */}
        <div className="flex items-center gap-2.5 mb-9 flex-wrap justify-center">
          {["8 مسارات", "6 رفاق", "ذكاء يبني جدولك", "مجاني"].map((c) => (
            <span key={c} className="text-[13px] font-bold px-3.5 py-1.5 rounded-full"
              style={{ background: "color-mix(in srgb, var(--accent) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)", color: "var(--accent-light)" }}>
              {c}
            </span>
          ))}
        </div>

        {onboarded ? (
          <Link href="/dashboard" className="btn-primary glow-blue px-10" style={{ textDecoration: "none" }}>
            ادخل لداشبوردك ←
          </Link>
        ) : (
          <Link href="/onboarding" className="btn-primary glow-blue px-10" style={{ textDecoration: "none" }}>
            ابدأ رحلتك ←
          </Link>
        )}
        <div className="absolute bottom-8 scroll-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2} className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ═══ المسارات ═══ */}
      <section className="px-6 py-20 max-w-lg md:max-w-3xl mx-auto">
        <div className="reveal text-center mb-10">
          <p className="eyebrow mb-2" style={{ color: "var(--accent-light)" }}>المسارات</p>
          <h2 className="title-lg" style={{ color: "var(--text)" }}>وش تستعد له؟</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TRACKS.map((t, i) => (
            <div key={t.id} className={`reveal reveal-d${(i % 3) + 1} rounded-2xl p-4`}
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <p className="font-black text-base" style={{ color: "var(--text)" }}>{t.title}</p>
              <p className="text-xs mt-1 leading-snug" style={{ color: "var(--text-muted)" }}>{t.sub}</p>
            </div>
          ))}
        </div>
        <p className="reveal reveal-d3 text-center text-base mt-8 leading-relaxed" style={{ color: "var(--text-dim)" }}>
          كل مسار بمواده وخريطته: <strong style={{ color: "var(--text)" }}>تأسيس ← تدريب ← تسريبات</strong>
          <br />مع نقاط مراجعة كل ربع — عشان ما تنسى اللي ذاكرته.
        </p>
      </section>

      {/* ═══ أوربت ═══ */}
      <section className="px-6 py-20 max-w-lg md:max-w-3xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <div className="reveal relative mb-8">
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="76" fill="none" stroke="var(--border)" strokeWidth="5" />
              <circle cx="90" cy="90" r="76" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round"
                strokeDasharray="160 318" className="orbit-ring" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-black font-mono-nums" style={{ color: "var(--text)" }}>50:00</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>تركيز</p>
            </div>
          </div>
          <div className="reveal reveal-d1">
            <p className="eyebrow mb-2" style={{ color: "var(--accent-light)" }}>أوربت</p>
            <h2 className="title-lg mb-3" style={{ color: "var(--text)" }}>تايمر يخليك بالمدار</h2>
            <p className="text-base leading-relaxed max-w-xs" style={{ color: "var(--text-dim)" }}>
              50 دقيقة تركيز كامل، 10 دقائق راحة. كل جلسة تكسب فيها Silver وتبني ستريكك اليومي 🔥
            </p>
          </div>
        </div>
      </section>

      {/* ═══ الأدوات ═══ */}
      <section className="px-6 py-20 max-w-lg md:max-w-3xl mx-auto">
        <div className="reveal text-center mb-10">
          <p className="eyebrow mb-2" style={{ color: "var(--accent-light)" }}>أدواتك</p>
          <h2 className="title-lg" style={{ color: "var(--text)" }}>كل اللي تحتاجه — بمكان واحد</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={f.title}
              className={`reveal ${i % 2 === 0 ? "reveal-right" : "reveal-left"} rounded-2xl p-6`}
              style={{ background: "var(--surface)", border: `1.5px solid ${f.color}40`, boxShadow: `0 0 18px ${f.color}14` }}>
              <p className="font-black text-lg mb-2" style={{ color: f.color }}>{f.title}</p>
              <p className="text-base leading-relaxed" style={{ color: "var(--text-dim)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ الرفاق ═══ */}
      <section className="px-6 py-20 max-w-lg md:max-w-3xl mx-auto">
        <div className="reveal text-center mb-10">
          <p className="eyebrow mb-2" style={{ color: "var(--accent-light)" }}>الرفاق</p>
          <h2 className="title-lg" style={{ color: "var(--text)" }}>اختر طيرك — يرافقك للنتيجة</h2>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {BIRDS.map((b, i) => (
            <div key={b.id} className={`reveal reveal-d${(i % 3) + 1} rounded-2xl p-3 flex flex-col items-center gap-1.5`}
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <Bird id={b.id} size={62} />
              <p className="font-bold text-sm" style={{ color: "var(--text)" }}>{b.name}</p>
              <p className="text-[11px] text-center leading-tight" style={{ color: "var(--text-muted)" }}>{b.symbol}</p>
            </div>
          ))}
        </div>
        <p className="reveal reveal-d3 text-center text-sm mt-7" style={{ color: "var(--text-dim)" }}>
          ألوان كل طير تتغير مع الوضع الليلي والنهاري
        </p>
      </section>

      {/* ═══ الختام ═══ */}
      <section className="px-6 pt-16 pb-24 max-w-lg mx-auto text-center">
        <div className="reveal">
          <h2 className="title-xl mb-4" style={{ color: "var(--text)" }}>
            {onboarded ? "يلا نكمل الدرب" : "جاهز تبدأ دربك؟"}
          </h2>
          <p className="text-base mb-9 leading-relaxed" style={{ color: "var(--text-dim)" }}>
            {onboarded
              ? "داشبوردك ينتظرك — جلستك اليومية ما بدأت بعد."
              : "التسجيل ياخذ أقل من دقيقة — اسمك ومسارك وبس."}
          </p>
          <Link
            href={onboarded ? "/dashboard" : "/onboarding"}
            className="btn-primary glow-blue inline-block px-12"
            style={{ textDecoration: "none" }}
          >
            {onboarded ? "ادخل لداشبوردك ←" : "سجّل دخولك ←"}
          </Link>
          <p className="text-sm mt-10" style={{ color: "var(--text-muted)" }}>صُنع في السعودية</p>
        </div>
      </section>

    </div>
  );
}
