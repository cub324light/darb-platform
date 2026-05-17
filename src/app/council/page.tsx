"use client";
import BottomNav from "@/components/BottomNav";

export default function CouncilPage() {
  return (
    <div className="min-h-dvh bg-[var(--bg)] flex flex-col items-center justify-center px-6 pb-nav text-center">
      <p className="text-6xl mb-6">💬</p>
      <h1 className="font-black text-2xl text-[var(--text)] mb-3">المجلس</h1>
      <p className="text-base text-[var(--text-muted)] mb-2">نقاشات الطلاب والتحدي الإقليمي</p>
      <p className="text-sm text-[var(--text-muted)] max-w-xs">
        هذه الميزة تحتاج لقاعدة بيانات مشتركة. قريباً.
      </p>
      <BottomNav />
    </div>
  );
}
