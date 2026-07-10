/* ─── 💼 مسيرتك المهنية — مركز الحياة المهنية للطالب الجامعي (وخريج الجامعة) ───
   Server Component بنمط uni-tools: metadata هنا والتفاعل كله في CareerCenter
   (client). كل المحتوى إرشادي دائم من src/lib/career النقي. صفحة تطبيق خاصة
   فلا تُفهرَس. النسخة الأولى (V1): إرشادات وقوالب ونصائح — نعمّق أدواتها تِباعاً. */
import type { Metadata } from "next";
import Link from "next/link";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import CareerCenter from "./CareerCenter";
import PriorityHint from "@/components/PriorityHint";

export const metadata: Metadata = {
  title: "عالم تخصصك — أدوات وشهادات وشركات ومسارات | درب",
  description:
    "عالم تخصصك الدقيق: برامجه وشهاداته الاحترافية والشركات التي توظّفه ومساراته الوظيفية وراتبه الاسترشادي وأدوات الذكاء الاصطناعي المناسبة له، إضافة إلى خطواتك المهنية (تدريب وسيرة ولينكدإن وفرص ودراسات عليا) — إرشادي عملي.",
  robots: { index: false },
};

export default function CareerPage() {
  return (
    <div className="page desk-wide">
      {/* الترويسة شريط علوي فقط — البطل المُخصَّص «عالم تخصصك» داخل CareerCenter */}
      <Dome compact>
        <div className="flex items-center gap-3">
          <BackButton />
        </div>
      </Dome>
      <div className="h-4" />

      <div className="page-content">
        <PriorityHint />
        <CareerCenter />

        {/* جسر إلى أدوات الجامعة والأجهزة — ربط داخلي، لا تكرار */}
        <section className="rounded-2xl p-4 flex items-center gap-3 flex-wrap"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <span className="text-[18px]" aria-hidden="true">🎓</span>
          <p className="text-[13px] font-bold flex-1" style={{ color: "var(--text-muted)" }}>
            معدّلك وغيابك في{" "}
            <Link href="/uni-tools" className="font-black" style={{ color: "var(--accent-light)" }}>
              أدوات الجامعة ←
            </Link>
            {" "}· وأجهزة وبرامج وأدوات تخصصك في{" "}
            <Link href="/uni-gear" className="font-black" style={{ color: "var(--accent-light)" }}>
              عُدّة تخصصك ←
            </Link>
          </p>
        </section>
      </div>

      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
