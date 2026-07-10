/* ─── 🎓 أدوات الجامعة — حاسبات المعدل والغياب والفاينل وتحويل المعدل ───
   Server Component بنمط uni-gear: metadata هنا والتفاعل كله في UniTools (client).
   الحساب كله في src/lib/uniTools النقي. صفحة تطبيق خاصة فلا تُفهرَس. */
import type { Metadata } from "next";
import Link from "next/link";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import UniTools from "./UniTools";
import PriorityHint from "@/components/PriorityHint";

export const metadata: Metadata = {
  title: "أدوات الجامعة | درب",
  description:
    "حاسبة المعدل الجامعي (من ٥ ومن ٤)، حاسبة الغياب والحرمان، حاسبة درجة الفاينل، وتحويل المعدل بين السلالم — أدوات استرشادية لطالب الجامعة.",
  robots: { index: false },
};

export default function UniToolsPage() {
  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="title-lg grad-title">أدوات الجامعة</h1>
        </div>
        <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
          المعدل والغياب والفاينل وتحويل المعدل — استرشادي، والقرار للوائح جامعتك
        </p>
      </Dome>
      <div className="h-4" />

      <div className="page-content">
        <PriorityHint />
        <UniTools />

        {/* جسر إلى الخطة القائمة — إعادة استخدام لا تكرار */}
        <section className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <span className="text-[18px]" aria-hidden="true">📅</span>
          <p className="text-[13px] font-bold flex-1" style={{ color: "var(--text-muted)" }}>
            جدولك وخطتك الأسبوعية في{" "}
            <Link href="/plan" className="font-black" style={{ color: "var(--accent-light)" }}>
              خطتي ←
            </Link>
          </p>
        </section>
      </div>

      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
