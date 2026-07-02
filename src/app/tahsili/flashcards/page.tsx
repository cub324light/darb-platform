/* ─── حقائق التحصيلي السريعة (صفحة عامة، ISR كل ساعة) ───
   Server Component: يجلب البطاقات خادمياً عبر getContentSnapshot (بذرة +
   overlay من Firestore، offline-first) — لا يصل firebase إلى العميل أبداً.
   التفاعل (قلب البطاقات ووضع اختبر نفسك) في FlashcardsClient. */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import { ThemeToggle } from "@/components/Profile";
import PublicPageCta from "@/components/content/PublicPageCta";
import { getContentSnapshot } from "@/lib/content/server";
import FlashcardsClient from "./FlashcardsClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "حقائق التحصيلي السريعة — بطاقات مراجعة | درب",
  description:
    "بطاقات مراجعة تفاعلية لأهم حقائق التحصيلي في الفيزياء والأحياء: التطبيقات الفيزيائية، الأجهزة واستعمالاتها، العدسات والمرايا، والأنماط الصبغية — مع وضع اختبر نفسك.",
  alternates: { canonical: "/tahsili/flashcards" },
  openGraph: {
    title: "حقائق التحصيلي السريعة — بطاقات مراجعة | درب",
    description: "بطاقات مراجعة تفاعلية لأهم حقائق التحصيلي في الفيزياء والأحياء — مع وضع اختبر نفسك.",
    url: "/tahsili/flashcards",
    siteName: "درب",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "حقائق التحصيلي السريعة — بطاقات مراجعة | درب",
    description: "بطاقات مراجعة تفاعلية لأهم حقائق التحصيلي في الفيزياء والأحياء.",
  },
};

export default async function TahsiliFlashcardsPage() {
  const snap = await getContentSnapshot();

  return (
    <div className="min-h-dvh">
      <Dome compact hideControls>
        <div className="flex items-center gap-3">
          <BackButton href="/" />
          <h1 className="title-lg grad-title flex-1">حقائق التحصيلي</h1>
          <ThemeToggle />
        </div>
      </Dome>

      <main className="px-5 py-6 max-w-2xl mx-auto flex flex-col gap-10 pb-20">
        <p className="text-[14.5px] leading-relaxed -mb-4" style={{ color: "var(--text-muted)" }}>
          حقائق تتكرر في التحصيلي بصيغة «مفهوم ← تطبيق». اضغط البطاقة لقلبها، أو فعّل «اختبر نفسك» وحاول تتذكر قبل ما تكشف الإجابة.
        </p>

        <FlashcardsClient cards={snap.tahsiliFlashcards} />

        <PublicPageCta current="/tahsili/flashcards" />
      </main>
    </div>
  );
}
