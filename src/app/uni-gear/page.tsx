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
  title: "أفضل أجهزة الجامعة — حسب تخصصك وميزانيتك | درب",
  description:
    "دليل محايد لاختيار لابتوب أو جهاز لوحي أو طابعة وإكسسوارات الجامعة حسب تخصصك (صحي، هندسي، حاسب، إداري، قانوني) وميزانيتك — توصيات مواصفات عملية بمدى سعري استرشادي بالريال، بدون روابط شراء.",
  alternates: { canonical: "/uni-gear" },
  openGraph: {
    title: "أفضل أجهزة الجامعة — حسب تخصصك وميزانيتك | درب",
    description: "لابتوبات ولوحية وطابعات وإكسسوارات حسب تخصصك وميزانيتك — توصيات مواصفات محايدة بمدى سعري استرشادي.",
    url: "/uni-gear",
    siteName: "درب",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "أفضل أجهزة الجامعة — حسب تخصصك وميزانيتك | درب",
    description: "لابتوبات ولوحية وطابعات وإكسسوارات حسب التخصص والميزانية — توصيات مواصفات محايدة.",
  },
  robots: { index: false },
};

export default function UniGearPage() {
  return (
    <div className="min-h-dvh">
      <Dome compact hideControls>
        <div className="flex items-center gap-3">
          <BackButton href="/university" />
          <h1 className="title-lg grad-title flex-1">أجهزة الجامعة</h1>
          <ThemeToggle />
        </div>
      </Dome>

      <main className="px-5 py-6 max-w-2xl min-[1100px]:max-w-3xl mx-auto flex flex-col gap-10 pb-20">
        <p className="text-[14.5px] leading-relaxed -mb-4" style={{ color: "var(--text-muted)" }}>
          مواصفات تدوم بدل موديلات تتقادم: حدّد تخصصك وميزانيتك وشف وش يستاهل فعلاً — توصيات محايدة بدون روابط شراء.
        </p>

        <GearBrowser />
      </main>
    </div>
  );
}
