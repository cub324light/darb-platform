"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ImproveTabs() {
  const path = usePathname();
  return (
    <div className="px-5 pt-1 pb-4">
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: "var(--surface)" }}>
        {[
          { href: "/vault",  label: "أخطائي" },
          { href: "/review", label: "بطاقاتي" },
        ].map((t) => {
          const active = path === t.href;
          return (
            <Link key={t.href} href={t.href}
              className="flex-1 py-2.5 rounded-xl text-[14px] font-bold text-center transition"
              style={active
                ? { background: "var(--accent)", color: "#fff" }
                : { color: "var(--text-muted)" }}>
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
