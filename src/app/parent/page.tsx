"use client";
import Link from "next/link";

export default function ParentPage() {
  return (
    <div className="min-h-dvh app-col flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between glass border-b border-[var(--border)] sticky top-0 z-10">
        <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition">
          ← الرئيسية
        </Link>
        <span className="font-black text-[var(--text)]">بوابة سند</span>
        <span className="w-12" />
      </div>

      {/* Coming soon */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-4">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          🛡️
        </div>
        <h1 className="text-2xl font-black text-[var(--text)]">بوابة سند قريباً</h1>
        <p className="text-base text-[var(--text-muted)] max-w-sm leading-relaxed">
          نجهّز لك بوابة تتابع فيها رحلة ابنك ببيانات حقيقية لحظة بلحظة — تقارير
          أسبوعية، مقارنة بالمتوسط، وتنبيهات ذكية. ننتظر تجهيزها بالشكل اللي يليق فيك.
        </p>
        <Link
          href="/dashboard"
          className="mt-2 px-6 py-3 rounded-2xl font-bold text-sm"
          style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}
        >
          ارجع للتطبيق ←
        </Link>
      </div>
    </div>
  );
}
