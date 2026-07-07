/* ─── Life Engine Debug — صفحة مطوّر مخفية (مرحلة التحقّق) ───
   ليست للمستخدم: غير مفهرَسة ولا مرتبطة من أي تنقّل. غرضها الوحيد مراجعة العقل
   المركزي قبل ربطه بأي صفحة: نرى ما يعرفه، وأولوياته، وثقته، والقواعد التي أطلقها.
   قاعدة: لا نربط أي صفحة بالعقل قبل أن نفسّر كل قرار يتخذه. */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import LifeEngineDebug from "@/components/dev/LifeEngineDebug";

export const metadata: Metadata = {
  title: "Life Engine Debug — درب (مطوّر)",
  robots: { index: false, follow: false },
};

export default function LifeEngineDebugPage() {
  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3">
          <BackButton />
        </div>
      </Dome>
      <div className="h-4" />

      <div className="page-content flex flex-col gap-3">
        <header className="ds-card ds-card-lg flex flex-col gap-1"
          style={{ background: "color-mix(in srgb, var(--danger) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--danger) 24%, var(--border))" }}>
          <span className="eyebrow" style={{ color: "var(--danger)" }}>أداة مطوّر · لا تُعرَض للمستخدم</span>
          <h1 className="t-h1" style={{ color: "var(--text)" }}>Life Engine — مراجعة القرار</h1>
          <p className="t-body" style={{ color: "var(--text-dim)" }}>
            مرحلة التحقّق: نراجع العقل لا النتيجة. عدّل أي إشارة، فترى الأولويات وثقتها والقواعد التي أطلقتها — بلا حفظ.
          </p>
        </header>

        <LifeEngineDebug />
      </div>

      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
