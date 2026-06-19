"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/events";

/* يسجّل زيارة كل صفحة في السجل الدائم (Firestore) لتحليلات الأدمن:
   عدد الزوار، أكثر الصفحات زيارة، نسبة التحويل.
   مرة واحدة لكل مسار في الجلسة — لتقليل كتابات Firestore. */
export default function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname);
  }, [pathname]);
  return null;
}
