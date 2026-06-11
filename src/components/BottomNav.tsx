"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "الرئيسية", icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth={a ? 0 : 1.9} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 10.5 12 3l8.5 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-4.5V14h-5v7.5H5A1.5 1.5 0 0 1 3.5 20v-9.5z" />
    </svg>
  )},
  { href: "/orbit", label: "أوربت", icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
      <circle cx="12" cy="13" r="8" /><path strokeLinecap="round" d="M12 9.5V13l2.5 2M10 2h4" />
    </svg>
  )},
  { href: "/roadmap", label: "الخريطة", icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20 3.5 17.5v-13L9 7m0 13 6-3m-6 3V7m6 10 5.5 2.5v-13L15 4m0 13V4M9 7l6-3" />
    </svg>
  )},
  { href: "/vault", label: "الخزنة", icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" /><path strokeLinecap="round" d="M8 10V7.5a4 4 0 0 1 8 0V10" /><circle cx="12" cy="15.2" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )},
  { href: "/review", label: "مراجعة", icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
      <rect x="5" y="4" width="14" height="17" rx="2.5" /><path strokeLinecap="round" d="M9 4.5V3m6 1.5V3M9 12l2 2 4-4.5" />
    </svg>
  )},
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="float-nav flex items-stretch px-2" aria-label="التنقل الرئيسي">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className={`float-nav-item ${active ? "active" : ""}`}>
            <span className="nav-bubble">{item.icon(active)}</span>
            <span className={`text-[11.5px] ${active ? "font-extrabold" : "font-semibold"}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
