"use client";
/* ─── لوحة الأدمن: إدارة المحتوى (/admin/content) ───
   إنشاء/تعديل/حذف/نشر/مراجعة محتوى World Model بدون كود، عبر طبقة Repository
   (Firestore في الإنتاج · محلي للتطوير). لا تلمس الصفحة قاعدة البيانات مباشرة. */
import Link from "next/link";
import ContentManager from "@/components/admin/ContentManager";

export default function AdminContentPage() {
  return (
    <div className="min-h-dvh app-col flex flex-col">
      <div className="px-5 py-4 flex items-center justify-between glass border-b border-[var(--border)] sticky top-0 z-10">
        <Link href="/admin" className="t-caption" style={{ color: "var(--text-muted)" }}>← لوحة الأدمن</Link>
        <span className="t-title" style={{ color: "var(--text)" }}>إدارة المحتوى</span>
        <span className="w-16" />
      </div>
      <div className="flex-1 w-full max-w-[720px] mx-auto px-4 py-5">
        <ContentManager />
      </div>
    </div>
  );
}
