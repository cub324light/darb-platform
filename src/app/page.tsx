"use client";
import Link from "next/link";
import { useState } from "react";

const FEATURES = [
  {
    icon: "⏱️",
    title: "Orbit 50/10",
    desc: "بومودورو صارم: 50 دقيقة تركيز + 10 راحة. لا تجاوز، لا تدليل. يحسب ساعات التركيز ويعطيك Silver.",
    color: "#2563EB",
  },
  {
    icon: "🔒",
    title: "خزنة الأخطاء",
    desc: "كل سؤال تغلط فيه يُحفظ تلقائياً. تصنّفه بنفسك: استعجلت؟ ما فهمت؟ خطأ حسابي؟ الهدف: فهم نوع الخطأ.",
    color: "#F59E0B",
  },
  {
    icon: "🧠",
    title: "بنك المراجعة الذكية",
    desc: "خوارزمية SM-2 (نفس Anki). تراجع السؤال في التوقيت الصحيح قبل ما تنساه — مش بعد.",
    color: "#10B981",
  },
  {
    icon: "🗺️",
    title: "خريطة الطريق",
    desc: "مبنية على جدول راكان 2026. من التأسيس للختام — تعرف وين أنت في أي لحظة.",
    color: "#8B5CF6",
  },
  {
    icon: "🦅",
    title: "الرفيق الذكي",
    desc: "طائر يرافقك — يتكلم بأسلوبك، يتطور معك، يحتفل بانتصاراتك ويصمت عند إخفاقاتك.",
    color: "#EF4444",
  },
  {
    icon: "👨‍👦",
    title: "بوابة ولي الأمر",
    desc: "الأب يشوف تقدم ابنه بدون ضغط. تقارير أسبوعية — مش إشعار فوري يزعزع التركيز.",
    color: "#06B6D4",
  },
];

const STATS = [
  { value: "100", label: "أعلى درجة تحصيلي", sub: "من مستخدمي درب" },
  { value: "50/10", label: "نظام Orbit", sub: "بومودورو مثبت علمياً" },
  { value: "SM-2", label: "خوارزمية المراجعة", sub: "نفس Anki" },
  { value: "٦", label: "طيور مختلفة", sub: "رفيقك يشبهك" },
];

export default function LandingPage() {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="min-h-dvh bg-[var(--bg)] overflow-x-hidden">
      {/* Stars background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 60 + "%",
              opacity: Math.random() * 0.5 + 0.1,
              animation: `twinkle ${2 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: Math.random() * 4 + "s",
            }}
          />
        ))}
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-5 py-4 glass border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦅</span>
          <span className="text-xl font-black text-[var(--gold)]">درب</span>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 hidden sm:block">YOUR PATH TO EXCELLENCE</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pricing" className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition">
            الأسعار
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-bold px-4 py-2 rounded-xl bg-[var(--blue)] hover:bg-[var(--blue-light)] transition text-white"
          >
            ابدأ مجاناً
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-5 pt-16 pb-12">
        {/* City lights from below effect */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 100%, rgba(37,99,235,0.15) 0%, transparent 70%)",
          }}
        />

        <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-xs text-[var(--text-dim)] mb-8 border border-[var(--blue)]/20">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          طلاب بقيق والمنطقة الشرقية
        </div>

        {/* Falcon hero */}
        <div className="flex justify-center mb-6">
          <div
            className="relative w-28 h-28"
            style={{ filter: "drop-shadow(0 0 20px rgba(37,99,235,0.4))" }}
          >
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="60,10 85,45 75,50 60,30 45,50 35,45" fill="#2563EB" opacity="0.9" />
              <polygon points="60,30 75,50 80,75 60,65 40,75 45,50" fill="#2563EB" />
              <polygon points="60,65 80,75 70,100 60,90 50,100 40,75" fill="#2563EB" opacity="0.8" />
              <circle cx="52" cy="38" r="5" fill="#F1F5F9" />
              <circle cx="53" cy="38" r="2.5" fill="#0A0A0F" />
              <polygon points="30,55 15,70 35,65 40,75" fill="#2563EB" opacity="0.6" />
              <polygon points="90,55 105,70 85,65 80,75" fill="#2563EB" opacity="0.6" />
            </svg>
            {/* Halo ring */}
            <div
              className="absolute inset-0 rounded-full border-2 border-[var(--blue)]/30 animate-ping"
              style={{ animationDuration: "3s" }}
            />
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black mb-3 leading-tight">
          <span className="text-[var(--text)]">درب</span>
          <br />
          <span className="text-[var(--gold)]">المنصة التي تعاملك كأخ</span>
        </h1>

        <p className="text-[var(--text-dim)] text-base max-w-sm mx-auto mb-10 leading-relaxed">
          تأسيس حقيقي للتحصيلي، القدرات، وأرامكو CPC.
          <br />
          لا تدليل. فقط نتائج وانضباط.
        </p>

        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link
            href="/dashboard"
            className="w-full py-4 rounded-2xl font-bold text-base transition glow-blue text-white"
            style={{ background: "linear-gradient(135deg, #1D4ED8, #2563EB)" }}
          >
            ابدأ مجاناً — بدون بطاقة
          </Link>
          <Link
            href="/pricing"
            className="w-full py-3 rounded-2xl font-medium text-sm transition text-[var(--text-dim)] border border-[var(--border)] hover:border-[var(--blue)]/40"
          >
            شاهين — 35 ريال/شهر
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 px-5 pb-10">
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {STATS.map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center">
              <div className="font-mono-nums text-2xl font-black text-[var(--blue-light)]">{s.value}</div>
              <div className="text-xs font-bold text-[var(--text)] mt-0.5">{s.label}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Darb */}
      <section className="relative z-10 px-5 pb-10 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-[var(--text)]">ليش درب؟</h2>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            الفرق بين الـ 83 والـ 100 مش ذكاء — هو نظام
          </p>
        </div>

        <div className="space-y-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-4 flex gap-4 items-start">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: f.color + "22", border: `1px solid ${f.color}44` }}
              >
                {f.icon}
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text)]">{f.title}</h3>
                <p className="text-xs text-[var(--text-dim)] mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gap comparison */}
      <section className="relative z-10 px-5 pb-10 max-w-lg mx-auto">
        <div className="glass rounded-2xl overflow-hidden border border-[var(--border)]">
          <div className="p-4 border-b border-[var(--border)]">
            <h3 className="font-black text-center text-[var(--text)]">الفجوة بين 83 و 100</h3>
          </div>
          <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[var(--border)]">
            <div className="p-4 space-y-3">
              <div className="text-center">
                <span className="text-2xl font-black text-[var(--text-muted)]">83</span>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">الطالب العادي</p>
              </div>
              {["مذاكرة متقطعة", "بدون خطة", "تشتت في المصادر", "يتجاهل أخطاءه", "لا أدوات تقنية"].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <span className="text-[var(--danger)] text-xs">✕</span>
                  <span className="text-xs text-[var(--text-dim)]">{t}</span>
                </div>
              ))}
            </div>
            <div className="p-4 space-y-3">
              <div className="text-center">
                <span className="text-2xl font-black text-[var(--gold)]">100</span>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">الطالب الذكي</p>
              </div>
              {["مذاكرة يومية منتظمة", "جدول راكان الصارم", "ناصر عبدالكريم فقط", "أول ساعة للأخطاء", "Orbit + SM-2"].map(
                (t) => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="text-[var(--success)] text-xs">✓</span>
                    <span className="text-xs text-[var(--text-dim)]">{t}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="relative z-10 px-5 pb-10 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-[var(--text)]">الباقات</h2>
        </div>

        <div className="space-y-3">
          {[
            { name: "مجاني", price: "0", period: "", note: "ابدأ الآن، لا بطاقة", color: "#64748B" },
            { name: "شاهين 🦅", price: "35", period: "شهر", note: "الطالب الجاد", color: "#2563EB" },
            { name: "عنقاء 🔥", price: "119", period: "سنة", note: "أو 209 ريال مدى الحياة", color: "#F59E0B" },
            { name: "سند 👨‍👦", price: "49", period: "شهر", note: "لولي الأمر فقط", color: "#10B981" },
          ].map((p) => (
            <div
              key={p.name}
              className="glass rounded-2xl px-5 py-4 flex items-center justify-between"
              style={{ borderColor: p.color + "33" }}
            >
              <div>
                <p className="font-bold text-sm" style={{ color: p.color }}>
                  {p.name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{p.note}</p>
              </div>
              <div className="text-left">
                <span className="font-mono-nums text-xl font-black text-[var(--text)]">{p.price}</span>
                {p.period && <span className="text-xs text-[var(--text-muted)]"> ريال/{p.period}</span>}
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/pricing"
          className="block text-center mt-4 text-sm text-[var(--blue-light)] underline underline-offset-4"
        >
          مقارنة تفصيلية للباقات ←
        </Link>
      </section>

      {/* Science quote */}
      <section className="relative z-10 px-5 pb-10 max-w-lg mx-auto">
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.1), rgba(245,158,11,0.05))", border: "1px solid rgba(37,99,235,0.2)" }}
        >
          <p className="text-base font-bold text-[var(--text)] leading-relaxed mb-2">
            &ldquo;مخك لا يحفظ بالتكرار — يحفظ بالتوقيت.&rdquo;
          </p>
          <p className="text-xs text-[var(--text-dim)]">
            راجع السؤال 4 مرات بفواصل زمنية = يدخل ذاكرتك الدائمة.
            <br />
            درب يحسب هذا التوقيت عنك تلقائياً.
          </p>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative z-10 px-5 pb-16 max-w-xs mx-auto">
        <Link
          href="/dashboard"
          className="block w-full py-4 rounded-2xl font-black text-center text-white text-lg transition glow-blue"
          style={{ background: "linear-gradient(135deg, #1D4ED8, #2563EB)" }}
        >
          ابدأ درب الآن — مجاناً
        </Link>
        <p className="text-center text-xs text-[var(--text-muted)] mt-3">
          بدون بطاقة بنكية · بدون إعلانات · درب = الأخ الكبير
        </p>
      </section>

      {/* Footer */}
      <footer className="relative z-10 glass border-t border-[var(--border)] py-8 px-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-xl">🦅</span>
          <span className="font-black text-[var(--gold)]">درب</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">YOUR PATH TO EXCELLENCE</p>
        <div className="flex justify-center gap-6 text-xs text-[var(--text-muted)]">
          <Link href="/pricing" className="hover:text-[var(--text)] transition">
            الأسعار
          </Link>
          <Link href="/parent" className="hover:text-[var(--text)] transition">
            بوابة ولي الأمر
          </Link>
          <Link href="/dashboard" className="hover:text-[var(--text)] transition">
            الدخول
          </Link>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-6">© 2026 منصة درب التعليمية — صُنعت لجيل التحدي</p>
      </footer>
    </div>
  );
}
