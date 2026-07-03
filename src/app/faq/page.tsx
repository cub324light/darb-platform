/* ─── الأسئلة الشائعة (صفحة عامة، ISR كل ساعة) ───
   Server Component: يجلب المحتوى خادمياً عبر getContentSnapshot (بذرة + overlay
   من Firestore، offline-first) — لا يصل firebase إلى العميل أبداً.
   يبني JSON-LD من نوع FAQPage للفهرسة الغنية في محركات البحث. */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import { ThemeToggle } from "@/components/Profile";
import PublicPageCta from "@/components/content/PublicPageCta";
import { getContentSnapshot } from "@/lib/content/server";
import FaqBrowser from "./FaqBrowser";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "الأسئلة الشائعة — القبول الجامعي ومنصة قبول | درب",
  description:
    "إجابات موثوقة عن القبول الجامعي في السعودية بعشرة تصنيفات: منصة قبول، القدرات، التحصيلي، اختبار STEP، الجامعات، المكافآت، السكن، التجسير، وسنة الفراغ — مع بحث فوري وقوائم مرجعية ونصائح تقديم.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "الأسئلة الشائعة — القبول الجامعي ومنصة قبول | درب",
    description: "إجابات موثوقة بعشرة تصنيفات: منصة قبول، القدرات، التحصيلي، STEP، الجامعات، المكافآت، السكن، التجسير، وسنة الفراغ — مع بحث فوري.",
    url: "/faq",
    siteName: "درب",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "الأسئلة الشائعة — القبول الجامعي ومنصة قبول | درب",
    description: "إجابات موثوقة عن القبول الجامعي والقياس في السعودية — بحث فوري وعشرة تصنيفات.",
  },
};

export default async function FaqPage() {
  const snap = await getContentSnapshot();

  /* JSON-LD (FAQPage) — كل الأسئلة بإجاباتها الكاملة، مع تعقيم < ضد الحقن */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [...snap.faqGeneral, ...snap.faqQubool].map((f) => ({
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
          كل اللي تحتاج تعرفه عن القبول والاختبارات — ابحث فورياً أو تصفح بالتصنيفات، مع قوائم مرجعية ونصائح من تجارب حقيقية.
        </p>

        <FaqBrowser
          general={snap.faqGeneral}
          qubool={snap.faqQubool}
          referenceLists={snap.referenceLists}
          tips={snap.tips}
        />

        <PublicPageCta current="/faq" />
      </main>
    </div>
  );
}
