"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { TRACKS } from "@/lib/tracks";
import Logo from "@/components/Logo";
import { loadTheme, applyTheme, type Theme } from "@/lib/storage";
import { capturePendingRef } from "@/lib/referral";
import { Sparkles } from "@/components/ui/sparkles";
import { Meteors } from "@/components/ui/meteors";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { BorderBeam } from "@/components/ui/border-beam";

/* شريط قصص النجاح — ديناميكي: يُبقي بذرة المحتوى خارج حزمة الهبوط الحرجة */
const SuccessStoriesStrip = dynamic(() => import("@/components/SuccessStoriesStrip"));

function useReveal(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll(".reveal");
    const showAll = () => els.forEach((el) => el.classList.add("visible"));

    if (typeof IntersectionObserver === "undefined") { showAll(); return; }

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.05 }
    );
    els.forEach((el) => io.observe(el));
    const fallback = setTimeout(showAll, 1600);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, [active]);
  return ref;
}

const FEATURES = [
  { icon: "⏱", title: "أوربت", tag: "تركيز", desc: "تايمر 50 دقيقة تركيز + 10 راحة. كل جلسة تنتهي تكسب فضة وتبني ستريكك.", color: "#2563EB" },
  { icon: "🗃", title: "أخطائي", tag: "مراجعة", desc: "أي سؤال تغلط فيه احفظه. دويرب يشرح لك كل خطأ بالضبط — النظام يتابع كم مرة راجعته.", color: "#F59E0B" },
  { icon: "🧠", title: "بطاقاتي", tag: "تكرار متباعد", desc: "بطاقات سؤال/جواب بخوارزمية Ebbinghaus. النظام يحسب متى تحتاج كل بطاقة بالضبط.", color: "#10B981" },
  { icon: "🤖", title: "المساعد الذكي", tag: "AI", desc: "أعطه مشاغيلك ويبني جدول يومك. يعرف مسارك ومواده ويوزع وقتك بذكاء.", color: "#8B5CF6" },
  { icon: "🗺", title: "خريطة المسار", tag: "تقدم", desc: "كل درس من تأسيس لتدريب لتسريبات — مرتّب ومقفول حتى تكمل ما قبله.", color: "#06B6D4" },
  { icon: "⚔", title: "الأرينا", tag: "تحدي", desc: "1v1 ضد منافس يجاوب بنفسه. أسئلة حقيقية من مسارك، 15 ثانية للسؤال. الفوز = فضة.", color: "#EF4444" },
];

const STEPS = [
  { n: "١", title: "ادخل بثانية", desc: "بحساب Google — يحفظ تقدّمك ويزامنه على كل أجهزتك." },
  { n: "٢", title: "شوف خريطتك", desc: "كل دروس مسارك مرتّبة. ابدأ من التأسيس واقفل كل مرحلة." },
  { n: "٣", title: "ذاكر يومياً", desc: "أوربت للتركيز، أخطائي للأخطاء، بطاقاتي للحفظ — كل شي بمكان." },
];

const PAIN = [
  { q: "تذاكر بدون خطة؟", a: "الخريطة توضح كل خطوة من البداية للاختبار." },
  { q: "تنسى اللي ذاكرته؟", a: "بطاقاتي بالتكرار المتباعد يتابع متى تحتاج كل معلومة قبل ما تنساها." },
  { q: "ما تعرف وين غلطاتك؟", a: "أخطائي تحفظ كل سؤال غلطت فيه — ودويرب يشرح لك سببه." },
];

const STATS = [
  { n: "8", l: "مسارات", c: "#3B82F6" },
  { n: "6", l: "أدوات", c: "#8B5CF6" },
  { n: "AI", l: "جدول ذكي", c: "#10B981" },
];

export default function LandingPage() {
  const router = useRouter();
  const [onboarded] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("darb_user");
      return !!(raw ? JSON.parse(raw)?.onboarded : false);
    } catch { return false; }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window !== "undefined" ? loadTheme() : "dark"
  );
  const rootRef = useReveal(true);

  /* التقط كود الإحالة من ?ref= عند الوصول لصفحة الهبوط (قبل التسجيل) */
  useEffect(() => { capturePendingRef(); }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    /* ديناميكي — يُؤخِّر تحميل firebase عن المسار الحرج لصفحة الهبوط */
    import("@/lib/cloud").then(({ onAuth }) => {
      unsub = onAuth((u) => {
        if (!u) return;
        let isOnboarded = false;
        try {
          const raw = localStorage.getItem("darb_user");
          isOnboarded = !!(raw ? JSON.parse(raw)?.onboarded : false);
        } catch {}
        router.replace(isOnboarded ? "/dashboard" : "/onboarding");
      });
    });
    return () => { unsub?.(); };
  }, [router]);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  const ctaHref = "/onboarding";
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1100px)");
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  return (
    <div ref={rootRef} className="relative z-[1]">

      {/* ── ناف بار ── */}
      <nav className="landing-nav fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 py-3.5"
        style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)", borderBottom: "1px solid var(--border)" }}>
        <Logo className="font-black text-2xl" style={{ letterSpacing: "-0.5px" }} />
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition active:scale-90"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            aria-label="تبديل المظهر">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button onClick={() => setMenuOpen(true)}
            className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-[5px]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            aria-label="القائمة">
            <span className="w-4 h-[2.5px] rounded-full" style={{ background: "var(--text-dim)" }} />
            <span className="w-4 h-[2.5px] rounded-full" style={{ background: "var(--text-dim)" }} />
            <span className="w-4 h-[2.5px] rounded-full" style={{ background: "var(--text-dim)" }} />
          </button>
        </div>
      </nav>

      {/* ── القائمة ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div className="relative w-full max-w-lg rounded-t-3xl p-6 pb-10 slide-up"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1.5 rounded-full mx-auto mb-6" style={{ background: "var(--border)" }} />
            <div className="flex flex-col gap-2">
              {onboarded && (
                <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-base"
                  style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)", textDecoration: "none" }}>
                  <span>ادخل للتطبيق</span><span>←</span>
                </Link>
              )}
              {[{ label: "الأدوات", id: "features" }, { label: "المسارات", id: "tracks" }, { label: "كيف تبدأ", id: "steps" }].map((item) => (
                <button key={item.id}
                  onClick={() => { setMenuOpen(false); document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" }); }}
                  className="flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-base text-right"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                  <span>{item.label}</span>
                  <span style={{ color: "var(--text-muted)" }}>↓</span>
                </button>
              ))}
              {/* صفحات المحتوى التعليمي العامة */}
              {[
                { label: "الأسئلة الشائعة", href: "/faq" },
                { label: "حقائق التحصيلي", href: "/tahsili/flashcards" },
                { label: "قصص نجاح", href: "/success-stories" },
              ].map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-base text-right"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", textDecoration: "none" }}>
                  <span>{item.label}</span>
                  <span style={{ color: "var(--text-muted)" }}>←</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* ═══ الهيرو ═══ */}
      {/* ══════════════════════════════════════════ */}
      <section className="relative min-h-dvh flex flex-col items-center justify-center px-5 text-center pt-20 pb-12 max-w-2xl mx-auto overflow-hidden">

        {/* خلفية جسيمات — أقل على سطح المكتب (العرض الأكبر يرفع تكلفة الرسم) */}
        <Sparkles count={isDesktop ? 12 : 28} color="var(--accent-hi)" />
        <Meteors number={isDesktop ? 4 : 8} />

        {/* دائرة توهج خلفية */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full hero-pulse pointer-events-none"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 70%)", filter: "blur(40px)" }} />

        {/* شارة */}
        <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7 text-sm font-bold"
          style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)", color: "var(--accent-light)" }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
          مجاني تماماً · صُنع في السعودية
        </div>

        {/* العنوان الرئيسي */}
        <h1 className="font-black leading-tight mb-5 relative z-10"
          style={{ fontSize: "clamp(2.2rem, 8vw, 3.6rem)", letterSpacing: "-1px" }}>
          <span style={{
            background: "linear-gradient(145deg, var(--text) 30%, var(--accent-light) 65%, var(--accent-hi))",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>
            منصة التحضير الذكية
          </span>
          <br />
          <AnimatedGradientText>للطلاب</AnimatedGradientText>
        </h1>

        <p className="text-lg leading-relaxed max-w-md mb-8 relative z-10" style={{ color: "var(--text-dim)" }}>
          تأسيس حقيقي للتحصيلي والقدرات وأرامكو CPC وايلتس وستيب وتوفل ودوليقو.
          خطة واضحة، جدول ذكي، ومتابعة لحظة بلحظة.
        </p>

        {/* إحصاءات */}
        <div className="flex flex-wrap justify-center gap-3 mb-10 relative z-10">
          {STATS.map((s, i) => (
            <div key={s.l}
              className="flex flex-col items-center px-5 py-3 rounded-2xl card-reveal"
              style={{
                animationDelay: `${i * 80}ms`,
                background: `color-mix(in srgb, ${s.c} 12%, var(--surface))`,
                border: `1.5px solid ${s.c}`,
                minWidth: "80px",
                boxShadow: `0 4px 18px color-mix(in srgb, ${s.c} 35%, transparent)`,
              }}>
              <span className="font-black text-2xl font-mono-nums" style={{ color: s.c }}>{s.n}</span>
              <span className="text-xs font-bold mt-0.5" style={{ color: "var(--text)" }}>{s.l}</span>
            </div>
          ))}
        </div>

        {/* زر الدخول الرئيسي */}
        <div className="relative z-10">
          <Link href={ctaHref}
            className="btn-shimmer inline-flex items-center gap-3 px-10 py-4 text-lg font-black"
            style={{ textDecoration: "none", minWidth: "220px", justifyContent: "center" }}>
            ابدأ مجاناً ←
          </Link>
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
            <div key={i}
              className={`reveal reveal-d${i + 1} rounded-2xl p-5 flex items-start gap-4 glow-card-hover`}
              style={{
                background: "var(--surface)",
                border: "1.5px solid color-mix(in srgb, #EF4444 20%, var(--border))",
                boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
              }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black"
                style={{ background: "color-mix(in srgb, #EF4444 12%, transparent)", color: "#EF4444", border: "1px solid color-mix(in srgb, #EF4444 25%, transparent)" }}>
                ✕
              </div>
              <div>
                <p className="font-black text-base mb-1" style={{ color: "var(--text)" }}>{p.q}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--success)", fontWeight: 700 }}>درب يحل هذا: </span>
                  {p.a}
                </p>
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
          <h2 className="font-black text-2xl" style={{ color: "var(--text)" }}>
            <AnimatedGradientText>٦ أدوات</AnimatedGradientText>
            {" "}تحصّلها بمكان واحد
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 desk-grid-3 gap-3">
          {FEATURES.map((f, i) => (
            <div key={f.title}
              className={`reveal reveal-d${(i % 3) + 1} rounded-2xl p-5 glow-card-hover group relative overflow-hidden`}
              style={{
                background: "var(--surface)",
                border: `1.5px solid color-mix(in srgb, ${f.color} 22%, var(--border))`,
                boxShadow: `0 2px 12px rgba(0,0,0,0.1)`,
              }}>
              {/* subtle gradient bg on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                style={{ background: `radial-gradient(300px at 0% 0%, color-mix(in srgb, ${f.color} 8%, transparent), transparent)` }} />
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    background: `color-mix(in srgb, ${f.color} 14%, transparent)`,
                    border: `1.5px solid color-mix(in srgb, ${f.color} 28%, transparent)`,
                    boxShadow: `0 0 12px color-mix(in srgb, ${f.color} 20%, transparent)`,
                  }}>
                  {f.icon}
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-base" style={{ color: f.color }}>{f.title}</p>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `color-mix(in srgb, ${f.color} 14%, transparent)`, color: f.color }}>
                    {f.tag}
                  </span>
                </div>
              </div>
              <p className="text-sm leading-relaxed relative z-10" style={{ color: "var(--text-dim)" }}>{f.desc}</p>
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
            <div key={t.id}
              className={`reveal reveal-d${(i % 3) + 1} rounded-2xl p-4 glow-card-hover group relative overflow-hidden`}
              style={{
                background: "var(--surface)",
                border: `1.5px solid color-mix(in srgb, ${t.color} 18%, var(--border))`,
              }}>
              <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-2xl"
                style={{ background: `linear-gradient(90deg, ${t.color}, transparent)` }} />
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                <p className="font-black text-sm leading-tight" style={{ color: "var(--text)" }}>{t.title}</p>
              </div>
              <p className="text-xs leading-snug mb-2" style={{ color: "var(--text-muted)" }}>{t.sub}</p>
              <div className="flex gap-1 flex-wrap">
                {t.subjects.map((s) => (
                  <span key={s.name} className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="reveal text-center text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
          كل مسار بخريطة كاملة من التأسيس إلى التسريبات، مع نقاط مراجعة كل ربع.
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
            <div key={i}
              className={`reveal reveal-d${i + 1} rounded-2xl p-5 flex items-start gap-4 glow-card-hover`}
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl flex-shrink-0"
                style={{
                  background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                  color: "var(--accent-light)",
                  border: "1.5px solid color-mix(in srgb, var(--accent) 28%, transparent)",
                  boxShadow: "0 0 16px color-mix(in srgb, var(--accent) 18%, transparent)",
                }}>
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
      {/* ═══ قصص نجاح (social proof) ═══ */}
      {/* ══════════════════════════════════════════ */}
      <SuccessStoriesStrip />

      {/* ══════════════════════════════════════════ */}
      {/* ═══ CTA الختام ═══ */}
      {/* ══════════════════════════════════════════ */}
      <section className="px-5 py-16 pb-24 max-w-lg mx-auto text-center">
        <div className="reveal relative rounded-3xl p-8 overflow-hidden"
          style={{
            background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 8%, transparent), var(--surface))",
            border: "1.5px solid color-mix(in srgb, var(--accent) 22%, transparent)",
          }}>
          <BorderBeam size={250} duration={12} colorFrom="var(--accent-hi)" colorTo="var(--gold)" />
          <Sparkles count={isDesktop ? 5 : 10} color="var(--accent-hi)" />

          <h2 className="font-black text-2xl mb-3 relative z-10" style={{ color: "var(--text)" }}>جاهز تبدأ دربك؟</h2>
          <p className="text-base mb-7 leading-relaxed relative z-10" style={{ color: "var(--text-dim)" }}>
            أقل من دقيقة وأنت بداخل — ادخل بحساب Google واختر مسارك.
          </p>
          <Link href={ctaHref}
            className="btn-shimmer inline-flex items-center gap-3 px-12 py-4 text-lg font-black relative z-10"
            style={{ textDecoration: "none", minWidth: "220px", justifyContent: "center" }}>
            سجّل الآن ←
          </Link>
          <p className="text-xs mt-6 relative z-10" style={{ color: "var(--text-muted)" }}>صُنع في السعودية · مجاني بالكامل</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-8 text-xs">
          <Link href="/faq" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
            الأسئلة الشائعة
          </Link>
          <Link href="/tahsili/flashcards" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
            حقائق التحصيلي
          </Link>
          <Link href="/success-stories" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
            قصص نجاح
          </Link>
          <Link href="/privacy" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
            سياسة الخصوصية
          </Link>
          <Link href="/terms" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
            شروط الاستخدام
          </Link>
          <Link href="/subscription" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
            الاشتراك والاسترجاع
          </Link>
        </div>
      </section>

    </div>
  );
}
