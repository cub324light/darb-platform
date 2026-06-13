"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TRACKS } from "@/lib/tracks";

function useReveal(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [active]);
  return ref;
}

const FEATURES = [
  {
    icon: "⏱",
    title: "أوربت",
    tag: "تركيز",
    desc: "تايمر 50 دقيقة تركيز + 10 راحة. كل جلسة تنتهي تكسب Silver وتبني ستريكك.",
    color: "#2563EB",
  },
  {
    icon: "🗃",
    title: "خزنة الأخطاء",
    tag: "مراجعة",
    desc: "أي سؤال تغلط فيه احفظه. ما يطلع إلا لو راجعته — النظام يتابع عدد المراجعات لكل خطأ.",
    color: "#F59E0B",
  },
  {
    icon: "🧠",
    title: "بنك المراجعة",
    tag: "SM-2",
    desc: "بطاقات سؤال/جواب بخوارزمية Ebbinghaus العلمية. النظام يحسب متى تحتاج كل بطاقة بالضبط.",
    color: "#10B981",
  },
  {
    icon: "🤖",
    title: "المساعد الذكي",
    tag: "AI",
    desc: "أعطه مشاغيلك ويبني جدول يومك. يعرف مسارك ومواده ويوزع وقتك بذكاء.",
    color: "#8B5CF6",
  },
  {
    icon: "🗺",
    title: "خريطة المسار",
    tag: "تقدم",
    desc: "كل درس من تأسيس لتدريب لتسريبات — مرتّب ومقفول حتى تكمل ما قبله. تقدمك يحفظ تلقائياً.",
    color: "#06B6D4",
  },
  {
    icon: "⚔",
    title: "الأرينا",
    tag: "تحدي",
    desc: "1v1 ضد منافس يجاوب بنفسه. أسئلة حقيقية من مسارك، 15 ثانية للسؤال. الفوز = Silver.",
    color: "#EF4444",
  },
];

const STEPS = [
  { n: "١", title: "سجّل في ثانية", desc: "اسمك + مسارك + تاريخ اختبارك — بدون إيميل، بدون باسورد." },
  { n: "٢", title: "شوف خريطتك", desc: "كل دروس مسارك مرتّبة. ابدأ من التأسيس واقفل كل مرحلة." },
  { n: "٣", title: "ذاكر يومياً", desc: "أوربت للتركيز، الخزنة للأخطاء، المراجعة للحفظ — كل شي بمكان." },
];

const PAIN = [
  { q: "تذاكر بدون خطة؟", a: "الخريطة توضح كل خطوة من البداية للاختبار." },
  { q: "تنسى اللي ذاكرته؟", a: "بنك المراجعة SM-2 يتابع متى تحتاج كل معلومة قبل ما تنساها." },
  { q: "ما تعرف وين غلطاتك؟", a: "خزنة الأخطاء تحفظ كل سؤال غلطت فيه وتذكّرك تراجعه." },
];

export default function LandingPage() {
  const [onboarded, setOnboarded] = useState(false);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useReveal(!checking);

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
        <p className="font-black text-5xl text-[var(--accent-light)]" style={{ letterSpacing: "-1px" }}>درب</p>
      </div>
    );
  }

  const ctaHref = "/onboarding";

  return (
    <div ref={rootRef} className="relative z-[1]">

      {/* ── ناف بار: درب يمين + ثلاث نقاط يسار ── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 py-3.5"
        style={{ background: "color-mix(in srgb, var(--bg) 90%, transparent)", backdropFilter: "blur(14px)", borderBottom: "1px solid var(--border)" }}>
        <span className="font-black text-2xl" style={{ color: "var(--accent-light)", letterSpacing: "-0.5px" }}>درب</span>
        <button
          onClick={() => setMenuOpen(true)}
          className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-[5px]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          aria-label="القائمة"
        >
          <span className="w-4 h-[2.5px] rounded-full" style={{ background: "var(--text-dim)" }} />
          <span className="w-4 h-[2.5px] rounded-full" style={{ background: "var(--text-dim)" }} />
          <span className="w-4 h-[2.5px] rounded-full" style={{ background: "var(--text-dim)" }} />
        </button>
      </nav>

      {/* ── نافذة القائمة ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div
            className="relative w-full max-w-lg rounded-t-3xl p-6 pb-10 slide-up"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 rounded-full mx-auto mb-6" style={{ background: "var(--border)" }} />
            <div className="flex flex-col gap-2">
              {onboarded && (
                <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-base"
                  style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)", textDecoration: "none" }}>
                  <span>ادخل للتطبيق</span>
                  <span>←</span>
                </Link>
              )}
              {[
                { label: "الأدوات", id: "features" },
                { label: "المسارات", id: "tracks" },
                { label: "كيف تبدأ", id: "steps" },
              ].map((item) => (
                <button key={item.id}
                  onClick={() => {
                    setMenuOpen(false);
                    document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-base text-right"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                  <span>{item.label}</span>
                  <span style={{ color: "var(--text-muted)" }}>↓</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* ═══ الهيرو ═══ */}
      {/* ══════════════════════════════════════════ */}
      <section className="min-h-dvh flex flex-col items-center justify-center px-5 text-center pt-20 pb-12 max-w-2xl mx-auto">

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7 text-sm font-bold"
          style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", color: "var(--accent-light)" }}>
          مجاني تماماً · صُنع في السعودية
        </div>

        <h1 className="font-black leading-tight mb-5"
          style={{
            fontSize: "clamp(2.2rem, 8vw, 3.6rem)",
            letterSpacing: "-1px",
            background: "linear-gradient(145deg, var(--text) 40%, var(--accent-light) 75%, var(--accent-hi))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}>
          منصة التحضير الذكية<br />للطلاب السعوديين
        </h1>

        <p className="text-lg leading-relaxed max-w-md mb-8" style={{ color: "var(--text-dim)" }}>
          تأسيس حقيقي للتحصيلي والقدرات وأرامكو CPC وايلتس وستيب وتوفل ودوليقو.
          خطة واضحة، جدول ذكي، ومتابعة لحظة بلحظة — بدون أرقام وهمية.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          {[
            { n: "8", l: "مسارات" },
            { n: "6", l: "أدوات" },
            { n: "AI", l: "جدول ذكي" },
            { n: "∞", l: "مجاني" },
          ].map((s) => (
            <div key={s.l} className="flex flex-col items-center px-5 py-3 rounded-2xl"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)", minWidth: "72px" }}>
              <span className="font-black text-2xl font-mono-nums" style={{ color: "var(--accent-light)" }}>{s.n}</span>
              <span className="text-xs font-semibold mt-0.5" style={{ color: "var(--text-muted)" }}>{s.l}</span>
            </div>
          ))}
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 scroll-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════ */}
      {/* ═══ المشكلة ═══ */}
      {/* ══════════════════════════════════════════ */}
      <section className="px-5 py-16 max-w-2xl mx-auto">
        <div className="reveal text-center mb-8">
          <p className="eyebrow mb-2" style={{ color: "var(--accent-light)" }}>المشكلة</p>
          <h2 className="font-black text-2xl" style={{ color: "var(--text)" }}>وش يخلّي الطالب يفشل؟</h2>
        </div>
        <div className="flex flex-col gap-3">
          {PAIN.map((p, i) => (
            <div key={i} className={`reveal reveal-d${i + 1} rounded-2xl p-5 flex items-start gap-4`}
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black"
                style={{ background: "color-mix(in srgb, #EF4444 12%, transparent)", color: "#EF4444", border: "1px solid color-mix(in srgb, #EF4444 25%, transparent)" }}>
                ✕
              </div>
              <div>
                <p className="font-black text-base mb-1" style={{ color: "var(--text)" }}>{p.q}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>درب يحل هذا: {p.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════ */}
      {/* ═══ الأدوات ═══ */}
      {/* ══════════════════════════════════════════ */}
      <section id="features" className="px-5 py-16 max-w-2xl mx-auto">
        <div className="reveal text-center mb-8">
          <p className="eyebrow mb-2" style={{ color: "var(--accent-light)" }}>أدواتك</p>
          <h2 className="font-black text-2xl" style={{ color: "var(--text)" }}>٦ أدوات تحصّلها بمكان واحد</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FEATURES.map((f, i) => (
            <div key={f.title}
              className={`reveal reveal-d${(i % 3) + 1} rounded-2xl p-5`}
              style={{
                background: "var(--surface)",
                border: `1.5px solid ${f.color}30`,
                boxShadow: `0 0 22px ${f.color}0D`,
              }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}>
                  {f.icon}
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-base" style={{ color: f.color }}>{f.title}</p>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${f.color}15`, color: f.color }}>
                    {f.tag}
                  </span>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════ */}
      {/* ═══ المسارات ═══ */}
      {/* ══════════════════════════════════════════ */}
      <section id="tracks" className="px-5 py-16 max-w-2xl mx-auto">
        <div className="reveal text-center mb-8">
          <p className="eyebrow mb-2" style={{ color: "var(--accent-light)" }}>المسارات</p>
          <h2 className="font-black text-2xl" style={{ color: "var(--text)" }}>وش تستعد له؟</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
          {TRACKS.map((t, i) => (
            <div key={t.id} className={`reveal reveal-d${(i % 3) + 1} rounded-2xl p-4`}
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl">{t.icon}</span>
                <p className="font-black text-sm leading-tight" style={{ color: "var(--text)" }}>{t.title}</p>
              </div>
              <p className="text-xs leading-snug" style={{ color: "var(--text-muted)" }}>{t.sub}</p>
            </div>
          ))}
        </div>
        <p className="reveal text-center text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
          كل مسار بخريطة كاملة من التأسيس إلى التسريبات، مع نقاط مراجعة كل ربع حتى ما تنسى.
        </p>
      </section>

      {/* ══════════════════════════════════════════ */}
      {/* ═══ كيف تبدأ ═══ */}
      {/* ══════════════════════════════════════════ */}
      <section id="steps" className="px-5 py-16 max-w-2xl mx-auto">
        <div className="reveal text-center mb-8">
          <p className="eyebrow mb-2" style={{ color: "var(--accent-light)" }}>البداية</p>
          <h2 className="font-black text-2xl" style={{ color: "var(--text)" }}>ثلاث خطوات وتكون في دربك</h2>
        </div>
        <div className="flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <div key={i} className={`reveal reveal-d${i + 1} rounded-2xl p-5 flex items-start gap-4`}
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl flex-shrink-0"
                style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)", border: "1.5px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}>
                {s.n}
              </div>
              <div>
                <p className="font-black text-base mb-1" style={{ color: "var(--text)" }}>{s.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════ */}
      {/* ═══ CTA الختام ═══ */}
      {/* ══════════════════════════════════════════ */}
      <section className="px-5 py-16 pb-24 max-w-lg mx-auto text-center">
        <div className="reveal rounded-3xl p-8"
          style={{
            background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 8%, transparent), var(--surface))",
            border: "1.5px solid color-mix(in srgb, var(--accent) 22%, transparent)",
          }}>
          <h2 className="font-black text-2xl mb-3" style={{ color: "var(--text)" }}>جاهز تبدأ دربك؟</h2>
          <p className="text-base mb-7 leading-relaxed" style={{ color: "var(--text-dim)" }}>
            أقل من دقيقة وأنت بداخل — اسمك ومسارك وبس. بدون إيميل، بدون باسورد.
          </p>
          <Link href={ctaHref}
            className="btn-primary glow-blue inline-flex items-center px-12 text-lg"
            style={{ textDecoration: "none", minHeight: "56px" }}>
            سجّل الآن ←
          </Link>
          <p className="text-xs mt-6" style={{ color: "var(--text-muted)" }}>صُنع في السعودية · مجاني بالكامل</p>
        </div>
        <Link href="/privacy" className="inline-block mt-8 text-xs" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          سياسة الخصوصية
        </Link>
      </section>

    </div>
  );
}
