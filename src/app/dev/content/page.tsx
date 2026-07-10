/* ─── لوحة قيادة المحتوى — صفحة مطوّر مخفية (/dev/content) ───
   نموّ المحتوى بالدفعات: أعداد العقد لكل نوع، مجموع العلاقات، ونسبة اكتمال كل
   مجال بالترتيب الرسمي (القدرات ← التحصيلي ← الكتب ← STEP ← الجامعة). */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import ContentDashboard from "@/components/dev/ContentDashboard";

export const metadata: Metadata = {
  title: "لوحة قيادة المحتوى (مطوّر)",
  robots: { index: false, follow: false },
};

export default function ContentPage() {
  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3"><BackButton /></div>
      </Dome>
      <div className="h-4" />
      <div className="page-content flex flex-col gap-3">
        <header className="ds-card ds-card-lg flex flex-col gap-1"
          style={{ background: "color-mix(in srgb, var(--success) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--success) 24%, var(--border))" }}>
          <span className="eyebrow" style={{ color: "var(--success)" }}>أداة مطوّر · نموّ المحتوى</span>
          <h1 className="t-h1" style={{ color: "var(--text)" }}>لوحة قيادة المحتوى</h1>
          <p className="t-body" style={{ color: "var(--text-dim)" }}>
            نبني بالدفعات (٢٠–٣٠ عقدة)، ثم مراجعة وتنظيف وربط، ثم الدفعة التالية. الترتيب: القدرات ← التحصيلي ← الكتب ← STEP ← الجامعة.
          </p>
        </header>
        <ContentDashboard />
      </div>
      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
