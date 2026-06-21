"use client";
/* ─── زر رجوع موحّد وواضح (نفس أسلوب المنصة) ─── */
import Link from "next/link";

export default function BackButton({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href}
      className="dome-chip text-[15px] font-bold flex-shrink-0"
      style={{ color: "var(--text)" }}>
      ← رجوع
    </Link>
  );
}
