import type { Metadata } from "next";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import StoreBody from "./StoreBody";

export const metadata: Metadata = {
  title: "متجر الفضة — درب",
  description: "اصرف فضّتك على ألقابٍ وشاراتٍ تظهر جنب اسمك.",
};

export default function StorePage() {
  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center justify-between gap-3">
          <BackButton href="/dashboard" />
          <h1 className="title-lg grad-title flex-1">المتجر</h1>
        </div>
      </Dome>
      <div className="h-4" />
      <div className="page-content">
        <StoreBody />
      </div>
      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
