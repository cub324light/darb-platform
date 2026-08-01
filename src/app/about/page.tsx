/* ─── عن درب (صفحة عامة) — تشرح المنصّة للبشر ولوكلاء الذكاء الاصطناعي. ───
   HTML دلاليّ (header/main/section/footer) وترتيب عناوين H1 → H2 صحيح. */
import type { Metadata } from "next";
import Link from "next/link";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import { SITE, CAPABILITIES } from "@/lib/agent/catalog";

export const metadata: Metadata = {
  title: "عن درب",
  description: SITE.descriptionAr,
  alternates: { canonical: "/about" },
  openGraph: { title: "عن درب", description: SITE.descriptionAr, url: "/about", type: "website", locale: "ar_SA" },
  twitter: { card: "summary_large_image", title: "عن درب", description: SITE.descriptionAr },
};

export default function AboutPage() {
  return (
    <div className="page">
      <Dome compact>
        <header className="flex items-center gap-3">
          <BackButton />
          <h1 className="title-lg grad-title">عن درب</h1>
        </header>
      </Dome>

      <main id="about-main" className="page-content mt-4 flex flex-col gap-5">
        <section aria-labelledby="what" className="ds-card">
          <h2 id="what" className="t-h3 font-black mb-2">ما هي درب؟</h2>
          <p className="t-body leading-relaxed" style={{ color: "var(--text-dim)" }}>{SITE.descriptionAr}</p>
        </section>

        <section aria-labelledby="who" className="ds-card">
          <h2 id="who" className="t-h3 font-black mb-2">لمن؟</h2>
          <p className="t-body leading-relaxed" style={{ color: "var(--text-dim)" }}>
            طلابُ المرحلة الثانوية وخرّيجوها في السعودية، ومَن يستعدّ لاختبارات القدرات
            والتحصيلي وستيب وبرامج أرامكو، أو يختار جامعته وتخصّصه.
          </p>
        </section>

        <section aria-labelledby="how" className="ds-card">
          <h2 id="how" className="t-h3 font-black mb-3">كيف تعمل</h2>
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {CAPABILITIES.map((c) => (
              <li key={c.id}>
                <h3 className="t-title font-black">{c.name}</h3>
                <p className="t-small" style={{ color: "var(--text-muted)" }}>{c.summary}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="honesty" className="ds-card">
          <h2 id="honesty" className="t-h3 font-black mb-2">مبدأٌ لا نتنازل عنه</h2>
          <p className="t-body leading-relaxed" style={{ color: "var(--text-dim)" }}>
            لا نعرض رقماً ولا موعداً لم تُعلنه جهةٌ رسمية. ما لم يُعلَن يبقى فارغاً
            ومكتوباً أنه لم يُعلَن — لأن الطالب يبني قراره على ما يقرأه هنا.
          </p>
        </section>

        <nav aria-label="روابط ذات صلة" className="ds-card">
          <h2 className="t-h3 font-black mb-3">اقرأ أيضاً</h2>
          <ul className="flex flex-wrap gap-3 list-none p-0 m-0 t-body font-bold">
            <li><Link href="/features">المزايا</Link></li>
            <li><Link href="/pricing">الأسعار</Link></li>
            <li><Link href="/docs">التوثيق</Link></li>
            <li><Link href="/faq">الأسئلة الشائعة</Link></li>
            <li><Link href="/privacy">الخصوصية</Link></li>
            <li><Link href="/terms">الشروط</Link></li>
          </ul>
        </nav>
      </main>
      <PageFooter />
    </div>
  );
}
