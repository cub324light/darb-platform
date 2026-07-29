/* ─── 🚀 المستقبل — مكانٌ واحد لكل ما بعد الجامعة ───
   لا نبني منطقاً جديداً: نعيد استخدام CareerCenter القائم (هو فعلاً «المستقبل»)
   الذي يجمع التدريب التعاوني والوظائف والشهادات الاحترافية والمهارات والشركات
   المناسبة للتخصص وخطوات السيرة الذاتية وشبكة LinkedIn والمسارات — كلّها بمصادر
   حقيقية من lib/career و lib/majors. هذه الصفحة تؤطّرها باسمٍ يخاطب الطالب:
   «المستقبل» خارج الصفحة الرئيسية (الرئيسية = قرار الآن فقط). Server Component. */
import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import NextThread from "@/components/NextThread";
import PriorityHint from "@/components/PriorityHint";
import CareerCenter from "../career/CareerCenter";

export const metadata: Metadata = {
  title: "المستقبل — تدريب ووظائف وشهادات ومسارات | درب",
  description:
    "مكانٌ واحد لكل ما بعد الجامعة: التدريب التعاوني والوظائف والشهادات الاحترافية والمهارات المطلوبة والشركات المناسبة لتخصصك وخطوات سيرتك الذاتية وشبكتك المهنية ومساراتك — إرشادي عملي.",
  robots: { index: false },
};

export default function FuturePage() {
  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3"><BackButton /></div>
      </Dome>
      <div className="h-4" />

      <div className="page-content">
        <div className="mb-2">
          <h1 className="t-h2" style={{ color: "var(--text)" }}>🚀 المستقبل</h1>
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>كل ما بعد الجامعة في مكانٍ واحد — تدريب ووظائف وشهادات ومهارات ومسارات</p>
        </div>
        <PriorityHint />
        <CareerCenter />
      </div>

      <div className="h-6" />
      <NextThread page="/future" />
      <PageFooter />
    </div>
  );
}
