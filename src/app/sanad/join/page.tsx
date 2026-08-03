import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import JoinBody from "./JoinBody";

export const metadata: Metadata = {
  title: "تسجيل سند — تابع ابنك بإذنه | درب",
  description: "سجّل في سند بخطوتين: حسابك، ثم الرمز الذي يعطيك إياه ابنك. لا نفتح ملفّ أحدٍ بغير إذنه.",
  robots: { index: false },
};

export default function SanadJoinPage() {
  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3">
          <BackButton href="/sanad" label="سند" />
          <h1 className="title-lg grad-title">تسجيل سند</h1>
        </div>
      </Dome>
      <div className="h-4" />
      <div className="page-content">
        <JoinBody />
      </div>
      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
