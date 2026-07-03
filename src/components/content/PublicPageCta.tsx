/* ─── ذيل الصفحات العامة للمحتوى التعليمي ───
   روابط تنقّل بين صفحات المحتوى الشقيقة (تقوية الربط الداخلي للـ SEO) + دعوة
   للتسجيل بنفس أسلوب CTA الصفحة الرئيسية. مكوّن نقي بلا حالة — يعمل خادمياً. */
import Link from "next/link";

const SIBLINGS = [
  { href: "/faq",                 label: "الأسئلة الشائعة",   icon: "❓" },
  { href: "/tahsili/flashcards",  label: "حقائق التحصيلي",    icon: "🃏" },
  { href: "/success-stories",     label: "قصص نجاح",          icon: "🏆" },
  { href: "/uni-gear",            label: "أجهزة الجامعة",     icon: "💻" },
] as const;

export default function PublicPageCta({ current }: { current: string }) {
  const others = SIBLINGS.filter((s) => s.href !== current);
  return (
    <div className="flex flex-col gap-6">
      {/* روابط شقيقة */}
      <div>
        <p className="eyebrow mb-2.5" style={{ color: "var(--accent-light)" }}>شوف أيضاً</p>
        {/* flex-wrap: عنصران بالصف على الجوال (والفردي يتمدد بأناقة)، وثلاثة على المتوسطة+ */}
        <div className="flex flex-wrap gap-2.5">
          {others.map((s) => (
            <Link key={s.href} href={s.href}
              className="grow basis-[45%] md:basis-[30%] rounded-2xl p-4 flex items-center gap-2.5 glow-card-hover"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)", textDecoration: "none" }}>
              <span className="text-[18px]" aria-hidden="true">{s.icon}</span>
              <span className="font-bold text-[13.5px]" style={{ color: "var(--text)" }}>{s.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* دعوة للتسجيل — بنفس أسلوب CTA الرئيسية */}
      <section className="relative rounded-3xl p-7 text-center overflow-hidden"
        style={{
          background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 8%, transparent), var(--surface))",
          border: "1.5px solid color-mix(in srgb, var(--accent) 22%, transparent)",
        }}>
        <h2 className="font-black text-[20px] mb-2" style={{ color: "var(--text)" }}>جاهز تبدأ دربك؟</h2>
        <p className="text-[14px] mb-5 leading-relaxed" style={{ color: "var(--text-dim)" }}>
          خريطة مذاكرة كاملة للقدرات والتحصيلي وستيب — تأسيس وتدريب ومتابعة، مجاناً.
        </p>
        <Link href="/onboarding"
          className="btn-shimmer inline-flex items-center gap-2 px-9 py-3.5 font-black text-[16px]"
          style={{ textDecoration: "none" }}>
          ابدأ مجاناً ←
        </Link>
      </section>
    </div>
  );
}
