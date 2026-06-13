"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TRACKS } from "@/lib/tracks";

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

const FEATURES = [
  { title: "خزنة الأخطاء", desc: "كل سؤال غلطت فيه ينحفظ — عشان ما تغلط فيه مرتين. راجعها قبل الاختبار وادخل وأنت مرتاح.", color: "#F59E0B" },
  { title: "بنك المراجعة", desc: "بطاقات بنظام SM-2 العلمي للتكرار المتباعد. النظام يحسب لك متى تراجع كل معلومة قبل ما تنساها.", color: "#10B981" },
  { title: "المساعد الذكي", desc: "قل له مشاغيلك — مدرسة، نادي، أي شيء — ويبني لك جدول مذاكرة يومك حولها بالذكاء الاصطناعي.", color: "#8B5CF6" },
];

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const rootRef = useReveal();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("darb_user");
      const user = raw ? JSON.parse(raw) : null;
      if (user?.onboarded) { router.replace("/dashboard"); return; }
    } catch {}
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="font-black text-5xl text-[var(--accent-light)] hero-glow">درب</p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative z-[1]">

      {/* ═══ الواجهة ═══ */}
      <section className="min-h-dvh flex flex-col items-center justify-center px-6 text-center relative">
        <div className="hero-float">
          <p className="font-black text-7xl mb-3 text-[var(--text)] hero-glow">درب</p>
        </div>
        <p className="eyebrow mb-5" style={{ color: "var(--text-dim)" }}>YOUR PATH TO EXCELLENCE</p>
        <h1 className="title-xl mb-4 fade-in" style={{ color: "var(--text)" }}>
          المنصة التي تعاملك كأخ
        </h1>
        <p className="text-lg leading-relaxed max-w-sm mb-9" style={{ color: "var(--text-dim)" }}>
          تأسيس حقيقي للتحصيلي والقدرات وأرامكو CPC.
          خطة، التزام، ووصول — بدون أرقام وهمية.
        </p>
        <Link href="/onboarding" className="btn-primary glow-blue px-10" style={{ textDecoration: "none" }}>
          ابدأ رحلتك ←
        </Link>
        <div className="absolute bottom-8 scroll-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2} className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ═══ المسارات ═══ */}
      <section className="px-6 py-20 max-w-lg mx-auto">
        <div className="reveal text-center mb-10">
          <p className="eyebrow mb-2" style={{ color: "var(--accent-light)" }}>المسارات</p>
          <h2 className="title-lg" style={{ color: "var(--text)" }}>وش تستعد له؟</h2>
        </div>
        <div className="flex flex-col gap-4">
          {TRACKS.map((t, i) => (
            <div key={t.id} className={`reveal reveal-d${i + 1} rounded-2xl p-5 flex items-center gap-4`}
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <span className="text-3xl">{t.icon}</span>
              <div>
                <p className="font-black text-lg" style={{ color: "var(--text)" }}>{t.title}</p>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{t.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="reveal reveal-d3 text-center text-base mt-8 leading-relaxed" style={{ color: "var(--text-dim)" }}>
          كل مسار بمواده وخريطته: <strong style={{ color: "var(--text)" }}>تأسيس ← تدريب ← تسريبات</strong>
          <br />مع نقاط مراجعة كل ربع — عشان ما تنسى اللي ذاكرته.
        </p>
      </section>

      {/* ═══ أوربت ═══ */}
      <section className="px-6 py-20 max-w-lg mx-auto">
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
      <section className="px-6 py-20 max-w-lg mx-auto">
        <div className="reveal text-center mb-10">
          <p className="eyebrow mb-2" style={{ color: "var(--accent-light)" }}>أدواتك</p>
          <h2 className="title-lg" style={{ color: "var(--text)" }}>كل اللي تحتاجه — بمكان واحد</h2>
        </div>
        <div className="flex flex-col gap-4">
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

      {/* ═══ الختام ═══ */}
      <section className="px-6 pt-16 pb-24 max-w-lg mx-auto text-center">
        <div className="reveal">
          <h2 className="title-xl mb-4" style={{ color: "var(--text)" }}>جاهز تبدأ دربك؟</h2>
          <p className="text-base mb-9 leading-relaxed" style={{ color: "var(--text-dim)" }}>
            التسجيل ياخذ أقل من دقيقة — اسمك ومسارك وبس.
          </p>
          <Link href="/onboarding" className="btn-primary glow-blue inline-block px-12" style={{ textDecoration: "none" }}>
            سجّل دخولك ←
          </Link>
          <p className="text-sm mt-10" style={{ color: "var(--text-muted)" }}>صُنع في السعودية</p>
        </div>
      </section>

    </div>
  );
}
