/* ─── فهرس الدروس (/lesson) ───
   نقطة دخول الطالب لطبقة الدروس: بحثٌ في المعرفة + قائمة الدروس المتاحة. غير
   مفهرَسة الآن (طبقةٌ ناشئة). المصدر: نموذج العالم (KB) عبر LessonBrowser. */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import LessonBrowser from "@/components/lesson/LessonBrowser";
import DismissibleNote from "@/components/DismissibleNote";

export const metadata: Metadata = {
  title: "الدروس | درب",
  robots: { index: false, follow: false },
};

export default function LessonIndexPage() {
  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3"><BackButton /></div>
      </Dome>
      <div className="h-4" />
      <div className="page-content flex flex-col gap-3">
        <DismissibleNote id="lesson-intro" title="تعلّم بالمفاهيم" tone="plain">
          ابحث عن مفهومٍ لتصل لدرسه مباشرة. نبدأ بأول درسٍ كامل ونتوسّع.
        </DismissibleNote>
        <LessonBrowser />
      </div>
      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
