"use client";
/* ─── بوابة سند — لوحة الوالد (/parent) ───
   تعرض ملخّص الطالب الحقيقي (readParentDigest) للوالد المرتبط: هل ابني بخير؟ يتقدّم؟
   يحتاج دعماً؟ ماذا أفعل اليوم؟ — بلا بيانات تجريبية وبلا نظام جديد. */
import Link from "next/link";
import ParentDashboard from "@/components/parent/ParentDashboard";

export default function ParentPage() {
  return (
    <div className="min-h-dvh app-col flex flex-col">
      {/* الرأس */}
      <div className="px-5 py-4 flex items-center justify-between glass border-b border-[var(--border)] sticky top-0 z-10">
        <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition">
          ← الرئيسية
        </Link>
        <span className="font-black text-[var(--text)]">بوابة سند</span>
        <span className="w-12" />
      </div>

      <div className="flex-1 w-full max-w-[600px] mx-auto px-4 py-5">
        <ParentDashboard />
      </div>
    </div>
  );
}
