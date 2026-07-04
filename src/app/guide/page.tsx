/* ─── دليل القبول والاختبارات (صفحة داخل المنصة، خلف تسجيل الدخول) ───
   انتقلت هنا تجربة الأسئلة المعرفية الكاملة (التصنيفات + البحث + القوائم
   المرجعية + النصائح) من /faq. Server Component: يجلب المحتوى خادمياً عبر
   getContentSnapshot (بذرة + overlay من Firestore، offline-first) — لا يصل
   firebase إلى العميل أبداً. صفحة تطبيق فلا تُفهرَس (robots index:false). */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import { ThemeToggle } from "@/components/Profile";
import { getContentSnapshot } from "@/lib/content/server";
import GuideBrowser from "./GuideBrowser";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "دليل القبول والاختبارات | درب",
  description:
    "دليلك الكامل للقبول الجامعي والاختبارات في السعودية: أسئلة بعشرة تصنيفات، قوائم مرجعية، ونصائح تقديم — مع بحث فوري.",
  robots: { index: false },
};

export default async function GuidePage() {
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
          <BackButton href="/dashboard" />
          <h1 className="title-lg grad-title flex-1">دليل القبول والاختبارات</h1>
          <ThemeToggle />
        </div>
      </Dome>

      <main className="px-5 py-6 max-w-2xl min-[1100px]:max-w-3xl mx-auto flex flex-col gap-10 pb-20">
        <p className="text-[14.5px] leading-relaxed -mb-4" style={{ color: "var(--text-muted)" }}>
          كل اللي تحتاج تعرفه عن القبول والاختبارات — ابحث فورياً أو تصفح بالتصنيفات، مع قوائم مرجعية ونصائح من تجارب حقيقية.
        </p>

        <GuideBrowser
          general={snap.faqGeneral}
          qubool={snap.faqQubool}
          referenceLists={snap.referenceLists}
          tips={snap.tips}
        />
      </main>
    </div>
  );
}
