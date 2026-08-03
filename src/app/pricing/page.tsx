"use client";
import { useState } from "react";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { useRouter } from "next/navigation";
import { getPlan, setPlan, PLAN_NAMES, PLAN_PRICE, SANAD_PRICE } from "@/lib/plan";
import { price } from "@/lib/format";
import type { PlanId } from "@/lib/types";

/* ▓ مبدأُ التقسيم: **ما يذاكر به الطالبُ مجّانيّ**. لا نبيع أدواتِ المذاكرة —
   تركيزٌ ومساري والتقويم والدفتر والمدرسة وأخطائي كلُّها في المجاني بلا نقصان.
   المدفوعُ يشتري **السعةَ والذكاء**: حدودٌ أوسع، ودويرب بلا عدّاد، وتحليلٌ أعمق.
   من لا يدفع يبقى طالباً كاملاً في درب — لا معاقَباً. */
const COMPARE_FEATURES = [
  { label: "تركيز · مساري · التقويم · الدفتر", free: "✓", shaheen: "✓", anqa: "✓" },
  { label: "المدرسة (الواجبات والمدرّسون)", free: "✓", shaheen: "✓", anqa: "✓" },
  { label: "خزنة الأخطاء", free: "25 لكل مادة", shaheen: "غير محدودة", anqa: "غير محدودة" },
  { label: "دويرب (رسائل يومياً)", free: "محدود", shaheen: "بلا حدّ", anqa: "بلا حدّ" },
  { label: "تحليل ملفاتك بالذكاء", free: "—", shaheen: "✓", anqa: "✓" },
  { label: "توليد اختبارات قصيرة", free: "محدود", shaheen: "بلا حدّ", anqa: "بلا حدّ" },
  { label: "خطّتك عبر الأشهر", free: "✓", shaheen: "✓", anqa: "✓" },
  { label: "بنك المراجعة بالتكرار المتباعد", free: "—", shaheen: "✓", anqa: "✓" },
  { label: "تقرير أسبوعيّ مفصّل", free: "—", shaheen: "✓", anqa: "✓" },
  { label: "المجلس (مشاركة)", free: "قراءة فقط", shaheen: "✓", anqa: "✓" },
  { label: "شهادة الانضباط", free: "—", shaheen: "—", anqa: "✓" },
  { label: "الجديد يصلك أولاً", free: "—", shaheen: "—", anqa: "✓" },
];

export default function PricingPage() {
  const router = useRouter();
  const [current, setCurrent] = useState<PlanId>(() =>
    typeof window !== "undefined" ? getPlan() : "free"
  );
  const [toast, setToast] = useState("");

  /* تفعيل تجريبي فوري — بدون بوابة دفع (للتجربة ولعرض المزايا للأصدقاء) */
  const activate = (plan: PlanId) => {
    if (!setPlan(plan)) {
      router.push("/onboarding"); // لا يوجد حساب بعد — أكمل التسجيل أولاً
      return;
    }
    setCurrent(plan);
    setToast(plan === "free" ? "رجعت للباقة المجانية" : `تم تفعيل باقة ${PLAN_NAMES[plan]} ✦ (تجريبي بدون دفع)`);
    setTimeout(() => setToast(""), 2600);
  };

  return (
    <div className="min-h-dvh app-col">
      {/* إشعار التفعيل */}
      {toast && (
        <div className="fixed top-4 inset-x-0 z-[9999] flex justify-center px-4 pointer-events-none">
          <div className="rounded-2xl px-5 py-3 text-sm font-bold shadow-2xl pointer-events-auto"
            style={{ background: "var(--accent)", color: "white", boxShadow: "0 12px 40px color-mix(in srgb, var(--accent) 45%, transparent)" }}>
            {toast}
          </div>
        </div>
      )}
      {/* Nav */}
      <div className="px-5 py-4 flex items-center justify-between glass border-b border-[var(--border)]">
        <BackButton href="/" label="الرئيسية" />
        <span className="font-black text-[var(--gold)]">درب</span>
        <Link href="/dashboard" className="text-sm text-[var(--accent-light)] font-bold">
          ابدأ مجاناً
        </Link>
      </div>

      <div className="px-5 pt-8 pb-16 max-w-lg mx-auto">
        <div className="text-center mb-8 rise rise-1">
          <h1 className="text-3xl font-black text-[var(--text)] mb-2">الباقات</h1>
          <p className="text-sm text-[var(--text-muted)]">
            لا تدليل. فقط نتائج وانضباط.
          </p>
        </div>

        {/* Student plans */}
        <h2 className="font-bold text-sm text-[var(--text-muted)] mb-3 flex items-center gap-2 rise rise-2">
          <span>للطلاب</span>
          <span className="flex-1 h-px bg-[var(--border)]" />
        </h2>

        <div className="space-y-3 mb-8 rise rise-3">
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
                {["كل أدوات المذاكرة: تركيز · مساري · التقويم · الدفتر · المدرسة", "خزنة الأخطاء — 25 لكل مادة", "دويرب برسائل محدودة يومياً", "خطّتك عبر الأشهر والتقويم الرسميّ"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-[var(--success)] text-xs">✓</span>
                    <span className="text-xs text-[var(--text-dim)]">{f}</span>
                  </div>
                ))}
                {["خزنة غير محدودة", "دويرب بلا حدّ", "تحليل ملفاتك بالذكاء"].map((f) => (
                  <div key={f} className="flex items-center gap-2 opacity-40">
                    <span className="text-xs">—</span>
                    <span className="text-xs text-[var(--text-muted)] line-through">{f}</span>
                  </div>
                ))}
              </div>
              {current === "free" ? (
                <Link
                  href="/dashboard"
                  className="block w-full py-3 rounded-2xl font-bold text-center text-sm text-[var(--text)] glass border border-[var(--border)] hover:border-[var(--accent)]/40 transition"
                >
                  باقتك الحالية — ابدأ
                </Link>
              ) : (
                <button
                  onClick={() => activate("free")}
                  className="block w-full py-3 rounded-2xl font-bold text-center text-sm text-[var(--text-muted)] glass border border-[var(--border)] transition"
                >
                  الرجوع للمجاني
                </button>
              )}
            </div>
          </div>

          {/* Shaheen */}
          <div
            className="rounded-3xl overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, transparent), color-mix(in srgb, var(--accent) 4%, transparent)), var(--surface)",
              border: "1.5px solid color-mix(in srgb, var(--accent) 40%, transparent)",
              boxShadow: "0 0 30px color-mix(in srgb, var(--accent) 10%, transparent)",
            }}
          >
            <div className="absolute top-4 left-4 bg-[var(--accent)] text-white text-[19px] font-bold px-2 py-0.5 rounded-full">
              الأكثر شيوعاً
            </div>
            <div className="p-5 pt-10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-black text-lg text-[var(--text)]">شاهين</p>
                  <p className="text-xs text-[var(--text-muted)]">للطالب الجاد</p>
                </div>
                <div className="text-left">
                  <span className="font-mono-nums text-3xl font-black text-[var(--accent-light)]">{price(PLAN_PRICE.shaheen!.amount)}</span>
                  <span className="text-xs text-[var(--text-muted)]"> ريال/{PLAN_PRICE.shaheen!.period}</span>
                </div>
              </div>
              <div className="space-y-1.5 mb-4">
                {[
                  "خزنة الأخطاء غير محدودة",
                  "دويرب بلا عدّاد رسائل",
                  "تحليل ملفاتك ومذكّراتك بالذكاء",
                  "اختبارات قصيرة بلا حدّ",
                  "بنك المراجعة بالتكرار المتباعد",
                  "تقرير أسبوعيّ مفصّل عن مذاكرتك",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-[var(--accent-light)] text-xs">✓</span>
                    <span className="text-xs text-[var(--text-dim)]">{f}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => activate("shaheen")}
                disabled={current === "shaheen"}
                className="w-full py-3 rounded-2xl font-bold text-sm transition glow-blue disabled:opacity-100"
                style={{ background: current === "shaheen" ? "var(--accent)" : "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1.5px solid var(--accent)", color: current === "shaheen" ? "white" : "var(--accent-light)" }}
              >
                {current === "shaheen" ? "باقتك الحالية ✓" : "فعّل شاهين — تجربة مجانية"}
              </button>
            </div>
          </div>

          {/* Anqa */}
          <div
            className="rounded-3xl overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.03)), var(--surface)",
              border: "1.5px solid rgba(245,158,11,0.35)",
              boxShadow: "0 0 30px rgba(245,158,11,0.08)",
            }}
          >
            <div className="absolute top-4 left-4 bg-[#F59E0B] text-[#0A0A0F] text-[19px] font-bold px-2 py-0.5 rounded-full">
              النخبة والمؤسسون
            </div>
            <div className="p-5 pt-10">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="font-black text-lg text-[var(--text)]">عنقاء 🔥</p>
                  <p className="text-xs text-[var(--text-muted)]">للنخبة فقط</p>
                </div>
                <div className="text-left">
                  <span className="font-mono-nums text-3xl font-black text-[var(--gold)]">{price(PLAN_PRICE.anqa!.amount)}</span>
                  <span className="text-xs text-[var(--text-muted)]"> ريال/{PLAN_PRICE.anqa!.period}</span>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                {[
                  "كل مميزات شاهين",
                  "شهادة الانضباط الرقمية",
                  "الميزات الجديدة تصلك أولاً",
                  "دور المؤسس الدائم",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-[var(--gold)] text-xs">✓</span>
                    <span className="text-xs text-[var(--text-dim)]">{f}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => activate("anqa")}
                disabled={current === "anqa"}
                className="w-full py-3 rounded-2xl font-bold text-sm transition glow-gold disabled:opacity-100"
                style={{ background: current === "anqa" ? "#F59E0B" : "rgba(245,158,11,0.08)", border: "1.5px solid #F59E0B", color: current === "anqa" ? "#1A1205" : "#F59E0B" }}
              >
                {current === "anqa" ? "باقتك الحالية ✓" : "فعّل عنقاء — تجربة مجانية"}
              </button>
            </div>
          </div>
        </div>

        {/* Parent plan */}
        <h2 className="font-bold text-sm text-[var(--text-muted)] mb-3 flex items-center gap-2 rise rise-4">
          <span>لولي الأمر (منتج مستقل)</span>
          <span className="flex-1 h-px bg-[var(--border)]" />
        </h2>

        <div
          className="rounded-3xl p-5 mb-8 rise rise-5"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.03)), var(--surface)",
            border: "1.5px solid rgba(16,185,129,0.3)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-black text-lg text-[var(--text)]">سند</p>
              <p className="text-xs text-[var(--text-muted)]">متابعة الابن بدون ضغط</p>
            </div>
            <div className="text-left">
              <span className="font-mono-nums text-3xl font-black text-[var(--success)]">{price(SANAD_PRICE.amount)}</span>
              <span className="text-xs text-[var(--text-muted)]"> ريال/{SANAD_PRICE.period}</span>
            </div>
          </div>
          <div className="space-y-1.5 mb-4">
            {[
              "ملخّصٌ أسبوعيّ صادق عن مذاكرته",
              "أين يتعثّر، وبماذا تدعمه",
              "كم بقي على أقرب اختبارٍ له",
              "ابنٌ واحدٌ مشمول، وخصمُ النصف لكلّ أخ",
              "ولا يرى محادثاته ولا دفترَه ولا موقعَه",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <span className="text-[var(--success)] text-xs">✓</span>
                <span className="text-xs text-[var(--text-dim)]">{f}</span>
              </div>
            ))}
          </div>
          <Link href="/sanad"
            className="block w-full py-3 rounded-2xl font-bold text-center text-sm no-underline"
            style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)", border: "1.5px solid var(--success)", color: "var(--success)" }}
          >
            اعرف سند ←
          </Link>
        </div>

        {/* Pay with effort */}
        <div
          className="rounded-2xl p-4 mb-8 text-center"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
        >
          <p className="text-sm font-bold text-[var(--gold)] mb-1">ما نبيعه وما لا نبيعه</p>
          <p className="text-xs text-[var(--text-dim)] leading-relaxed">
            أدواتُ المذاكرة كلُّها في المجاني: تركيز · مساري · التقويم · الدفتر · المدرسة · أخطائي.
            المدفوعُ يشتري السعةَ والذكاء — لا يشتري حقَّك في أن تذاكر.
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
            <p className="text-xs text-[var(--accent-light)] font-bold">شاهين</p>
            <p className="text-xs text-[var(--gold)] font-bold">عنقاء</p>
          </div>
          {COMPARE_FEATURES.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-4 text-center py-2.5 ${i % 2 === 0 ? "" : "bg-[var(--surface)]/30"}`}
            >
              <p className="text-[19px] text-[var(--text-dim)] text-right pr-3">{row.label}</p>
              <p className="text-[19px] text-[var(--text-muted)]">{row.free}</p>
              <p className="text-[19px] text-[var(--accent-light)]">{row.shaheen}</p>
              <p className="text-[19px] text-[var(--gold)]">{row.anqa}</p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-8">
          الأسعار بالريال السعودي، وتُلغى متى شئت. والباقة المجانية تبقى مجانية —
          ليست تجربةً تنتهي.
        </p>
      </div>
    </div>
  );
}
