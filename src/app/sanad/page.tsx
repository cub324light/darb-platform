import type { Metadata } from "next";
import Link from "next/link";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import { SANAD_PRICE } from "@/lib/plan";
import { price } from "@/lib/format";

export const metadata: Metadata = {
  title: "سند — تطمئنّ على ابنك بلا أن تضغطه | درب",
  description:
    "سند منتجُ وليّ الأمر في درب: تقريرٌ صادقٌ أسبوعياً عن مذاكرة ابنك — كم ذاكر، وأين يتعثّر، وبماذا تدعمه. بلا تجسّسٍ ولا رقابةِ رسائل.",
};

/* ─── صفحةُ سند — ما هو، وماذا يرى الوالد، وبكم ───
   بوّابةُ سند نفسُها في `/parent`؛ هذه صفحةُ التعريف التي يفتحها الوالدُ قبل أن
   يشترك. لا نَعِد فيها بما لا يوجد: كلُّ ما تحتها مبنيٌّ في `parentDigest`. */

const WHAT: { icon: string; title: string; desc: string }[] = [
  { icon: "📊", title: "ملخّصٌ أسبوعيّ صادق", desc: "كم ساعةً ذاكر فعلاً، وكم جلسةً أتمّ، وهل انتظم أم انقطع — من قياسٍ حقيقيّ لا من إقرارِ الابن." },
  { icon: "🎯", title: "أين يتعثّر", desc: "المادّةُ التي يقلّ فيها إنجازُه، والخطأ الذي يتكرّر عليه — لتعرف بماذا تسأله." },
  { icon: "💬", title: "ماذا تقول له", desc: "اقتراحُ جملةٍ واحدةٍ تقولها هذا الأسبوع. أكثرُ ما يُفسد المتابعةَ سؤالٌ في وقتٍ خطأ." },
  { icon: "🗓️", title: "قربُ اختباره", desc: "كم بقي على أقرب اختبارٍ رسميّ له، ومتى تبدأ إجازتُه — من التقويم الرسميّ." },
];

const NOT: string[] = [
  "لا نعرض لك محادثاته مع دويرب ولا ما يكتبه في دفتره.",
  "لا نتتبّع موقعَه ولا نقرأ رسائلَه ولا نفتح كاميرته.",
  "لا نُرسل له تنبيهاً بأنك تراقبه — سندٌ ليس عصا.",
  "وابنُك يعرف أنّ حسابَك مرتبطٌ بحسابه؛ لا متابعةَ من خلف ظهره.",
];

export default function SanadPage() {
  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3">
          <BackButton href="/pricing" label="الباقات" />
          <h1 className="title-lg grad-title">سند</h1>
        </div>
      </Dome>
      <div className="h-4" />

      <div className="page-content flex flex-col gap-4">
        <section className="ds-card ds-stack-tight"
          style={{ background: "color-mix(in srgb, var(--success) 8%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--success) 32%, var(--border))" }}>
          <p className="eyebrow" style={{ color: "var(--success)" }}>لوليّ الأمر</p>
          <h2 className="t-h2 font-black leading-snug" style={{ color: "var(--text)" }}>
            تطمئنّ على ابنك — بلا أن تضغطه
          </h2>
          <p className="t-body leading-relaxed" style={{ color: "var(--text-muted)" }}>
            أكثرُ ما يُفسد مذاكرةَ الطالب سؤالٌ يوميّ: «ذاكرت؟». سندٌ يعطيك الجوابَ
            مرّةً في الأسبوع بأرقامٍ حقيقية، فتسأله عن الشيء الصحيح في الوقت الصحيح.
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="t-display font-black font-mono-nums" style={{ color: "var(--success)" }}>{price(SANAD_PRICE.amount)}</span>
            <span className="t-body font-bold" style={{ color: "var(--text-muted)" }}>ريال / {SANAD_PRICE.period}</span>
          </div>
          <p className="t-caption" style={{ color: "var(--text-dim)" }}>
            ابنٌ واحدٌ مشمول، وخصمُ النصف لكلّ أخٍ أو أخت.
          </p>
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="t-h3 px-1" style={{ color: "var(--text)" }}>ماذا ترى؟</h2>
          {WHAT.map((x) => (
            <div key={x.title} className="ds-card flex items-start gap-3">
              <span className="w-11 h-11 rounded-2xl grid place-items-center text-[20px] flex-shrink-0"
                style={{ background: "color-mix(in srgb, var(--success) 12%, var(--surface2))" }} aria-hidden="true">{x.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block t-title font-black" style={{ color: "var(--text)" }}>{x.title}</span>
                <span className="block t-caption leading-relaxed mt-0.5" style={{ color: "var(--text-muted)" }}>{x.desc}</span>
              </span>
            </div>
          ))}
        </section>

        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>وما الذي لا يفعله سند</h2>
          <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
            الثقةُ بين الأب وابنه أثمنُ من أيّ تقرير. فحدودُ سندٍ مكتوبةٌ صراحةً:
          </p>
          <div className="flex flex-col gap-2 mt-1">
            {NOT.map((x) => (
              <div key={x} className="flex items-start gap-2.5">
                <span className="t-body flex-shrink-0" style={{ color: "var(--danger)" }} aria-hidden="true">✕</span>
                <span className="t-small leading-relaxed" style={{ color: "var(--text-dim)" }}>{x}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>كيف تبدأ</h2>
          <ol className="flex flex-col gap-2 mt-1" style={{ listStyle: "none" }}>
            {["افتح بوّابة سند من جوّالك.", "اربطها بحساب ابنك بموافقته.", "يصلك أول ملخّصٍ بعد أسبوعٍ من مذاكرته — قبله لا رقمَ يُقال."].map((step, i) => (
              <li key={step} className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full grid place-items-center t-caption font-black flex-shrink-0 font-mono-nums"
                  style={{ background: "color-mix(in srgb, var(--success) 14%, transparent)", color: "var(--success)" }}>{i + 1}</span>
                <span className="t-small leading-relaxed" style={{ color: "var(--text-dim)" }}>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <Link href="/parent"
          className="rounded-2xl py-4 t-body font-black text-center no-underline"
          style={{ background: "var(--success)", color: "#04231a" }}>
          افتح بوّابة سند ←
        </Link>
        <p className="t-caption text-center" style={{ color: "var(--text-dim)" }}>
          البوّابة تعمل الآن بالملخّص الحقيقيّ لابنك. والاشتراك المدفوع يُفتح قريباً — ولن نأخذ منك شيئاً قبل ذلك.
        </p>
      </div>

      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
