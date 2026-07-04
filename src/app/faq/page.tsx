/* ─── الأسئلة الشائعة عن درب (صفحة عامة تسويقية) ───
   سؤال لكل مسار اختبار «كيف يساعدني درب في X؟» + سؤال «وش هو درب؟» — عشرة فقط
   من PRODUCT_FAQ (ثابتة، بلا getContentSnapshot). Server Component يبني JSON-LD
   من نوع FAQPage للفهرسة الغنية، والأكورديون في ProductFaqList (عميل).
   المحتوى المعرفي الكامل (تصنيفات + بحث + قوائم مرجعية) انتقل إلى /guide. */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import { ThemeToggle } from "@/components/Profile";
import PublicPageCta from "@/components/content/PublicPageCta";
import { PRODUCT_FAQ } from "@/lib/productFaq";
import ProductFaqList from "./ProductFaqList";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة عن درب",
  description:
    "كيف يساعدك درب في القدرات والتحصيلي وستيب وآيلتس وتوفل ودووليجو واختبارات القبول أرامكو CPC وITC — سؤال لكل اختبار، وسؤال: وش هو درب؟",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "الأسئلة الشائعة عن درب",
    description: "كيف يساعدك درب في كل اختبار — القدرات والتحصيلي وستيب واختبارات اللغة والقبول.",
    url: "/faq",
    siteName: "درب",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "الأسئلة الشائعة عن درب",
    description: "كيف يساعدك درب في كل اختبار — سؤال لكل مسار، وسؤال: وش هو درب؟",
  },
};

export default function FaqPage() {
  /* JSON-LD (FAQPage) — العشرة أسئلة بإجاباتها، مع تعقيم < ضد الحقن */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PRODUCT_FAQ.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="min-h-dvh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <Dome compact hideControls>
        <div className="flex items-center gap-3">
          <BackButton href="/" />
          <h1 className="title-lg grad-title flex-1">الأسئلة الشائعة</h1>
          <ThemeToggle />
        </div>
      </Dome>

      <main className="px-5 py-6 max-w-2xl min-[1100px]:max-w-3xl mx-auto flex flex-col gap-10 pb-20">
        <p className="text-[14.5px] leading-relaxed -mb-4" style={{ color: "var(--text-muted)" }}>
          سؤال لكل اختبار: وش المشكلة فيه بالضبط، وكيف يحلّها درب — من القدرات والتحصيلي إلى اختبارات اللغة والقبول.
        </p>

        <ProductFaqList />

        <PublicPageCta current="/faq" />
      </main>
    </div>
  );
}
