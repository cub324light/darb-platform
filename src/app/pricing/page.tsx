"use client";
import { useState } from "react";
import Link from "next/link";
import { PLANS, PARENT_PLAN } from "@/lib/constants";

const COMPARE_FEATURES = [
  { label: "خزنة الأخطاء", free: "20 سؤال", shaheen: "غير محدودة", anqa: "غير محدودة" },
  { label: "دروس التأسيس", free: "3 تجريبية", shaheen: "الكل", anqa: "الكل" },
  { label: "Orbit 50/10", free: "✓", shaheen: "✓", anqa: "✓" },
  { label: "الخريطة + الستريك", free: "✓", shaheen: "✓", anqa: "✓" },
  { label: "بنك المراجعة SM-2", free: "—", shaheen: "✓", anqa: "✓" },
  { label: "المجلس (مشاركة)", free: "قراءة فقط", shaheen: "✓", anqa: "✓" },
  { label: "الأرينا 1v1", free: "—", shaheen: "✓", anqa: "✓" },
  { label: "6 طيور للاختيار", free: "الصقر فقط", shaheen: "5 طيور", anqa: "كل الطيور" },
  { label: "الفينكس 🔥", free: "—", shaheen: "—", anqa: "✓" },
  { label: "شهادة الانضباط", free: "—", shaheen: "—", anqa: "✓" },
  { label: "دور المؤسس", free: "—", shaheen: "—", anqa: "✓" },
  { label: "خصم 79 ريال (جامعة)", free: "—", shaheen: "—", anqa: "✓" },
];

export default function PricingPage() {
  const [lifeTime, setLifeTime] = useState(false);

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      {/* Nav */}
      <div className="px-5 py-4 flex items-center justify-between glass border-b border-[var(--border)]">
        <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition">
          ← الرئيسية
        </Link>
        <span className="font-black text-[var(--gold)]">🦅 درب</span>
        <Link href="/dashboard" className="text-sm text-[var(--blue-light)] font-bold">
          ابدأ مجاناً
        </Link>
      </div>

      <div className="px-5 pt-8 pb-16 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[var(--text)] mb-2">الباقات</h1>
          <p className="text-sm text-[var(--text-muted)]">
            لا تدليل. فقط نتائج وانضباط.
          </p>
        </div>

        {/* Student plans */}
        <h2 className="font-bold text-sm text-[var(--text-muted)] mb-3 flex items-center gap-2">
          <span>للطلاب</span>
          <span className="flex-1 h-px bg-[var(--border)]" />
        </h2>

        <div className="space-y-3 mb-8">
          {/* Free */}
          <div className="glass rounded-3xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-black text-lg text-[var(--text)]">مجاني</p>
                  <p className="text-xs text-[var(--text-muted)]">ابدأ الآن، بدون بطاقة</p>
                </div>
                <div>
                  <span className="font-mono-nums text-3xl font-black text-[var(--text-muted)]">0</span>
                  <span className="text-xs text-[var(--text-muted)]"> ريال</span>
                </div>
              </div>
              <div className="space-y-1.5 mb-4">
                {["خزنة الأخطاء (20 سؤال)", "3 دروس تجريبية", "Orbit 50/10 كامل", "الخريطة + الستريك"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-[var(--success)] text-xs">✓</span>
                    <span className="text-xs text-[var(--text-dim)]">{f}</span>
                  </div>
                ))}
                {["خزنة غير محدودة", "بنك SM-2", "المجلس (مشاركة)"].map((f) => (
                  <div key={f} className="flex items-center gap-2 opacity-40">
                    <span className="text-xs">—</span>
                    <span className="text-xs text-[var(--text-muted)] line-through">{f}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/dashboard"
                className="block w-full py-3 rounded-2xl font-bold text-center text-sm text-[var(--text)] glass border border-[var(--border)] hover:border-[var(--blue)]/40 transition"
              >
                ابدأ مجاناً
              </Link>
            </div>
          </div>

          {/* Shaheen */}
          <div
            className="rounded-3xl overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(37,99,235,0.04))",
              border: "1.5px solid rgba(37,99,235,0.4)",
              boxShadow: "0 0 30px rgba(37,99,235,0.1)",
            }}
          >
            <div className="absolute top-4 left-4 bg-[#2563EB] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              الأكثر شيوعاً
            </div>
            <div className="p-5 pt-10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-black text-lg text-[var(--text)]">شاهين 🦅</p>
                  <p className="text-xs text-[var(--text-muted)]">للطالب الجاد</p>
                </div>
                <div className="text-left">
                  <span className="font-mono-nums text-3xl font-black text-[var(--blue-light)]">35</span>
                  <span className="text-xs text-[var(--text-muted)]"> ريال/شهر</span>
                </div>
              </div>
              <div className="space-y-1.5 mb-4">
                {[
                  "خزنة الأخطاء غير محدودة",
                  "كل دروس التأسيس",
                  "بنك المراجعة الذكية SM-2",
                  "المجلس (مشاركة كاملة)",
                  "الأرينا 1v1",
                  "5 طيور للاختيار",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-[var(--blue-light)] text-xs">✓</span>
                    <span className="text-xs text-[var(--text-dim)]">{f}</span>
                  </div>
                ))}
              </div>
              <button
                className="w-full py-3 rounded-2xl font-bold text-sm text-white transition"
                style={{ background: "#2563EB" }}
              >
                اشترك في شاهين — 35 ريال
              </button>
            </div>
          </div>

          {/* Anqa */}
          <div
            className="rounded-3xl overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.03))",
              border: "1.5px solid rgba(245,158,11,0.35)",
              boxShadow: "0 0 30px rgba(245,158,11,0.08)",
            }}
          >
            <div className="absolute top-4 left-4 bg-[#F59E0B] text-[#0A0A0F] text-[10px] font-bold px-2 py-0.5 rounded-full">
              النخبة والمؤسسون
            </div>
            <div className="p-5 pt-10">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="font-black text-lg text-[var(--text)]">عنقاء 🔥</p>
                  <p className="text-xs text-[var(--text-muted)]">للنخبة فقط</p>
                </div>
                <div className="text-left">
                  <span className="font-mono-nums text-3xl font-black text-[var(--gold)]">
                    {lifeTime ? "209" : "119"}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {lifeTime ? " ريال مدى الحياة" : " ريال/سنة"}
                  </span>
                </div>
              </div>

              {/* Toggle yearly/lifetime */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setLifeTime(false)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${!lifeTime ? "bg-[var(--gold)] text-[var(--bg)]" : "glass text-[var(--text-muted)]"}`}
                >
                  سنوي — 119
                </button>
                <button
                  onClick={() => setLifeTime(true)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${lifeTime ? "bg-[var(--gold)] text-[var(--bg)]" : "glass text-[var(--text-muted)]"}`}
                >
                  مدى الحياة — 209
                </button>
              </div>

              <div className="space-y-1.5 mb-4">
                {[
                  "كل مميزات شاهين",
                  "الفينكس (الطائر الأسطوري) 🔥",
                  "شهادة الانضباط الرقمية",
                  "خصم 79 ريال عند الجامعة",
                  "دور المؤسس الدائم",
                  "أولوية في الميزات الجديدة",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-[var(--gold)] text-xs">✓</span>
                    <span className="text-xs text-[var(--text-dim)]">{f}</span>
                  </div>
                ))}
              </div>
              <button
                className="w-full py-3 rounded-2xl font-bold text-sm text-[var(--bg)] transition glow-gold"
                style={{ background: "#F59E0B" }}
              >
                اشترك في عنقاء — {lifeTime ? "209 (مدى الحياة)" : "119 ريال/سنة"}
              </button>

              {lifeTime && (
                <p className="text-[10px] text-center text-[var(--text-muted)] mt-2">
                  لماذا 209 تحديداً؟ لأنه رقم محسوب — يعكس قيمة حقيقية.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Parent plan */}
        <h2 className="font-bold text-sm text-[var(--text-muted)] mb-3 flex items-center gap-2">
          <span>لولي الأمر (منتج مستقل)</span>
          <span className="flex-1 h-px bg-[var(--border)]" />
        </h2>

        <div
          className="rounded-3xl p-5 mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.03))",
            border: "1.5px solid rgba(16,185,129,0.3)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-black text-lg text-[var(--text)]">سند 👨‍👦</p>
              <p className="text-xs text-[var(--text-muted)]">متابعة الابن بدون ضغط</p>
            </div>
            <div className="text-left">
              <span className="font-mono-nums text-3xl font-black text-[var(--success)]">49</span>
              <span className="text-xs text-[var(--text-muted)]"> ريال/شهر</span>
            </div>
          </div>
          <div className="space-y-1.5 mb-4">
            {[
              "حالة الابن في الوقت الفعلي",
              "تقارير أداء أسبوعية",
              "مقارنة بالمتوسط العام",
              "إضافة ابن واحد مجاناً",
              "خصم 50% لأخ أو أخت",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <span className="text-[var(--success)] text-xs">✓</span>
                <span className="text-xs text-[var(--text-dim)]">{f}</span>
              </div>
            ))}
          </div>
          <Link
            href="/parent"
            className="block w-full py-3 rounded-2xl font-bold text-center text-sm text-[var(--bg)] transition"
            style={{ background: "#10B981" }}
          >
            اكتشف باقة سند
          </Link>
        </div>

        {/* Pay with effort */}
        <div
          className="rounded-2xl p-4 mb-8 text-center"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
        >
          <p className="text-sm font-bold text-[var(--gold)] mb-1">💡 ادفع بجهدك</p>
          <p className="text-xs text-[var(--text-dim)]">
            تقدر تستخدم عملة Silver المكتسبة من المذاكرة لتمديد اشتراكك.
            الانضباط له قيمة حقيقية في درب.
          </p>
        </div>

        {/* Comparison table */}
        <h2 className="font-bold text-sm text-[var(--text-muted)] mb-4 flex items-center gap-2">
          <span>مقارنة تفصيلية</span>
          <span className="flex-1 h-px bg-[var(--border)]" />
        </h2>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 text-center py-3 border-b border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)] text-right pr-3">الميزة</p>
            <p className="text-xs text-[var(--text-muted)]">مجاني</p>
            <p className="text-xs text-[var(--blue-light)] font-bold">شاهين</p>
            <p className="text-xs text-[var(--gold)] font-bold">عنقاء</p>
          </div>
          {COMPARE_FEATURES.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-4 text-center py-2.5 ${i % 2 === 0 ? "" : "bg-[var(--surface)]/30"}`}
            >
              <p className="text-[10px] text-[var(--text-dim)] text-right pr-3">{row.label}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{row.free}</p>
              <p className="text-[10px] text-[var(--blue-light)]">{row.shaheen}</p>
              <p className="text-[10px] text-[var(--gold)]">{row.anqa}</p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-8">
          سبب 209 تحديداً: يبدو &ldquo;محسوباً&rdquo; مش &ldquo;مقرباً&rdquo; — يزيد المصداقية.
          <br />
          سبب 35: يعكس قيمة أعلى ولا يزال أرخص من أي منافس.
        </p>
      </div>
    </div>
  );
}
