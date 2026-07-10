/* ─── متصفّح قاعدة المعرفة — صفحة مطوّر مخفية ───
   لمراجعة بنية قاعدة المعرفة الموحّدة قبل ضخّ المحتوى: الكيانات، علاقاتها،
   وكيف يقرؤها دويرب. غير مفهرَسة ولا مرتبطة من أي تنقّل. */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import KBBrowser from "@/components/dev/KBBrowser";

export const metadata: Metadata = {
  title: "قاعدة المعرفة — متصفّح البنية (مطوّر)",
  robots: { index: false, follow: false },
};

export default function KBPage() {
  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3"><BackButton /></div>
      </Dome>
      <div className="h-4" />
      <div className="page-content flex flex-col gap-3">
        <header className="ds-card ds-card-lg flex flex-col gap-1"
          style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--accent) 24%, var(--border))" }}>
          <span className="eyebrow" style={{ color: "var(--accent-light)" }}>أداة مطوّر · البنية أولاً</span>
          <h1 className="t-h1" style={{ color: "var(--text)" }}>قاعدة المعرفة الموحّدة</h1>
          <p className="t-body" style={{ color: "var(--text-dim)" }}>
            رسمٌ واحد يربط الجامعات والتخصصات والوظائف والشركات والمهارات والشهادات والاختبارات. راجع البنية — فحين تُقرّها نضخّ المحتوى بنفس الشكل.
          </p>
        </header>
        <KBBrowser />
      </div>
      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
