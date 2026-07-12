/* ─── أفضل أجهزة الجامعة (صفحة داخل المنصة، ثابتة بالكامل) ───
   Server Component: البيانات ثابتة من src/lib/gear — لا revalidate ولا
   Firestore ولا firebase على العميل. التفاعل (فلترة الفئة/التخصص/الميزانية
   والتخصيص اللطيف) في GearBrowser. صفحة تطبيق فلا تُفهرَس (robots index:false). */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import { ThemeToggle } from "@/components/Profile";
import GearBrowser from "./GearBrowser";

export const metadata: Metadata = {
  title: "عُدّة تخصصك — أجهزة وبرامج وأدوات AI لتخصصك | درب",
  description:
    "دليل محايد لعُدّة الطالب الجامعي حسب تخصصك (صحي، هندسي، حاسب، إداري، قانوني) وميزانيتك: لابتوب ولوحي وطابعة وإكسسوارات، وأفضل البرامج لتخصصك، وأدوات الذكاء الاصطناعي المناسبة — توصيات عملية بمدى سعري استرشادي (وكثير منها مجاني/طلابي)، بدون روابط شراء.",
  alternates: { canonical: "/uni-gear" },
  openGraph: {
    title: "عُدّة تخصصك — أجهزة وبرامج وأدوات AI لتخصصك | درب",
    description: "أجهزة وبرامج وأدوات ذكاء اصطناعي حسب تخصصك وميزانيتك — توصيات محايدة، كثير منها مجاني/طلابي.",
    url: "/uni-gear",
    siteName: "درب",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "عُدّة تخصصك — أجهزة وبرامج وأدوات AI لتخصصك | درب",
    description: "أجهزة وبرامج وأدوات ذكاء اصطناعي حسب التخصص والميزانية — توصيات محايدة.",
  },
  robots: { index: false },
};

export default function UniGearPage() {
  return (
    <div className="min-h-dvh">
      <Dome compact hideControls>
        <div className="flex items-center gap-3">
          <BackButton href="/university" />
          <h1 className="title-lg grad-title flex-1">عُدّة تخصصك</h1>
          <ThemeToggle />
        </div>
      </Dome>

      <main className="px-5 py-6 max-w-2xl min-[1100px]:max-w-3xl mx-auto flex flex-col gap-10 pb-20">
        <p className="text-[16px] leading-relaxed -mb-4" style={{ color: "var(--text-muted)" }}>
          أجهزة وبرامج وأدوات ذكاء اصطناعي تخدم تخصصك: حدّد تخصصك وميزانيتك وشف وش يستاهل فعلاً — فئات ومواصفات تدوم بدل موديلات وإصدارات تتقادم، توصيات محايدة بلا روابط شراء (وكثير من البرامج مجاني أو له نسخة طلابية).
        </p>

        <GearBrowser />
      </main>
    </div>
  );
}
