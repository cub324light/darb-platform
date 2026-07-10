/* ─── فهرس الدروس (/lesson) ───
   نقطة دخول الطالب لطبقة الدروس: بحثٌ في المعرفة + قائمة الدروس المتاحة. غير
   مفهرَسة الآن (طبقةٌ ناشئة). المصدر: نموذج العالم (KB) عبر LessonBrowser. */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import LessonBrowser from "@/components/lesson/LessonBrowser";

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
        <header className="ds-card ds-card-lg flex flex-col gap-1">
          <span className="eyebrow" style={{ color: "var(--accent-light)" }}>الدروس</span>
          <h1 className="t-h1" style={{ color: "var(--text)" }}>تعلّم بالمفاهيم</h1>
          <p className="t-body" style={{ color: "var(--text-dim)" }}>ابحث عن مفهومٍ لتصل لدرسه مباشرة. نبدأ بأول درسٍ كامل ونتوسّع.</p>
        </header>
        <LessonBrowser />
      </div>
      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
