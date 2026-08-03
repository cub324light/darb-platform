"use client";
/* غلافٌ عميل: التحميلُ الديناميكيّ بـ`ssr: false` لا يُسمح به في مكوّن خادم،
   والمتجرُ يقرأ رصيدَ الجهاز فلا يُرسم على الخادم أصلاً. */
import dynamic from "next/dynamic";
const SilverStore = dynamic(() => import("@/components/store/SilverStore"), { ssr: false });

export default function StoreBody() {
  return <SilverStore />;
}
