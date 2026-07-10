/* ─── تغطية المعرفة — صفحة مطوّر مخفية (/dev/coverage) ───
   قبل الطبقة الثانية: كم مفهوماً مكتمل، وكم ينقصه شرحٌ/أمثلة/أسئلة/مصادر، ومن أين
   نبدأ حسب الأهمية. تقيس نضج طبقة المفاهيم قبل بدء الدروس. غير مفهرَسة ولا مرتبطة. */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import KnowledgeCoverage from "@/components/dev/KnowledgeCoverage";

export const metadata: Metadata = {
  title: "تغطية المعرفة (مطوّر)",
  robots: { index: false, follow: false },
};

export default function CoveragePage() {
  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3"><BackButton /></div>
      </Dome>
      <div className="h-4" />
      <div className="page-content flex flex-col gap-3">
        <header className="ds-card ds-card-lg flex flex-col gap-1"
          style={{ background: "color-mix(in srgb, var(--gold) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--gold) 24%, var(--border))" }}>
          <span className="eyebrow" style={{ color: "var(--gold)" }}>أداة مطوّر · نضج المحتوى</span>
          <h1 className="t-h1" style={{ color: "var(--text)" }}>تغطية المعرفة</h1>
          <p className="t-body" style={{ color: "var(--text-dim)" }}>
            أنهينا طبقة المفاهيم (بأماكن الشرح والأمثلة والأوزان). هذه الصفحة تقيس ما ينقص كل مفهوم قبل أن نبدأ الطبقة الثانية: الدروس ← الأسئلة ← المصادر ← الكتب.
          </p>
        </header>
        <KnowledgeCoverage />
      </div>
      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
