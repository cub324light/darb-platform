/* ─── نموذج العالم — صفحة مطوّر مخفية (/dev/world) ───
   الرسم الكامل: أي عقدة نضغطها نرى علاقاتها الداخلة والخارجة، أين تُستخدَم، ومن
   يعتمد عليها. عليها تُبنى كل ميزة مستقبلية في درب. غير مفهرَسة ولا مرتبطة. */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import WorldGraph from "@/components/dev/WorldGraph";

export const metadata: Metadata = {
  title: "نموذج العالم — الرسم الكامل (مطوّر)",
  robots: { index: false, follow: false },
};

export default function WorldPage() {
  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3"><BackButton /></div>
      </Dome>
      <div className="h-4" />
      <div className="page-content flex flex-col gap-3">
        <header className="ds-card ds-card-lg flex flex-col gap-1"
          style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--accent) 24%, var(--border))" }}>
          <span className="eyebrow" style={{ color: "var(--accent-light)" }}>أداة مطوّر · الرسم هو الحقيقة</span>
          <h1 className="t-h1" style={{ color: "var(--text)" }}>نموذج عالم درب (World Model)</h1>
          <p className="t-body" style={{ color: "var(--text-dim)" }}>
            كل شيء في حياة الطالب عقدةٌ في رسمٍ واحد. اضغط أي عقدة لترى علاقاتها الداخلة والخارجة، أين تُستخدَم، ومن يعتمد عليها.
          </p>
        </header>
        <WorldGraph />
      </div>
      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
