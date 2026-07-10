/* ─── مصفوفة التحقّق — صفحة مطوّر مخفية ───
   ٤٠+ حالة حقيقية وقرار العقل لكلٍّ، للمراجعة قبل ربط العقل بالمنصة.
   غير مفهرَسة ولا مرتبطة من أي تنقّل. */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import ScenarioMatrix from "@/components/dev/ScenarioMatrix";

export const metadata: Metadata = {
  title: "Life Engine — مصفوفة التحقّق (مطوّر)",
  robots: { index: false, follow: false },
};

export default function ScenariosPage() {
  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3"><BackButton /></div>
      </Dome>
      <div className="h-4" />
      <div className="page-content flex flex-col gap-3">
        <header className="ds-card ds-card-lg flex flex-col gap-1"
          style={{ background: "color-mix(in srgb, var(--danger) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--danger) 24%, var(--border))" }}>
          <span className="eyebrow" style={{ color: "var(--danger)" }}>أداة مطوّر · مراجعة قبل الربط</span>
          <h1 className="t-h1" style={{ color: "var(--text)" }}>مصفوفة التحقّق</h1>
          <p className="t-body" style={{ color: "var(--text-dim)" }}>
            قرار العقل على حالات حقيقية. إذا رأيت ٩٥٪ منها منطقية، نربطه بالمنصة كلها دفعة واحدة.
          </p>
        </header>
        <ScenarioMatrix />
      </div>
      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
