"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { loadUser, showsUniversityUI } from "@/lib/storage";
import { isUniversityPhase } from "@/lib/phase";

function calcDue(): number {
  if (typeof window === "undefined") return 0;
  try {
    const cards = JSON.parse(localStorage.getItem("darb_cards") ?? "[]");
    return Array.isArray(cards) ? cards.filter((c: { dueDate: number }) => c.dueDate <= Date.now()).length : 0;
  } catch { return 0; }
}

function useDueCards() {
  const [count, setCount] = useState(calcDue);
  useEffect(() => {
    const t = setInterval(() => setCount(calcDue()), 60000);
    return () => clearInterval(t);
  }, []);
  return count;
}

interface NavItem { href: string; label: string; icon: (a: boolean) => React.ReactNode; }

const ROADMAP_ITEM: NavItem = {
  href: "/roadmap",
  label: "مساري",
  icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20 3.5 17.5v-13L9 7m0 13 6-3m-6 3V7m6 10 5.5 2.5v-13L15 4m0 13V4M9 7l6-3" />
    </svg>
  ),
};

const ADMISSION_ITEM: NavItem = {
  href: "/university",
  label: "القبول",
  icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 2 8.5l10 5.5 10-5.5L12 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 8.5v7M22 8.5v3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 10.8v5.2a8 8 0 0 0 12 0v-5.2" />
    </svg>
  ),
};

/* أدوات الجامعة — العنصر الأوسط للجامعي (حاسبة المعدل/الغياب/الفاينل) */
const UNI_TOOLS_ITEM: NavItem = {
  href: "/uni-tools",
  label: "الأدوات",
  icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
      <rect x="5.5" y="3" width="13" height="18" rx="2.5" />
      <path strokeLinecap="round" d="M8.5 7h7M8.5 11h0M12 11h0M15.5 11h0M8.5 14.5h0M12 14.5h0M15.5 14.5h0M8.5 18h0M12 18h3.5" />
    </svg>
  ),
};

const BASE_ITEMS: (NavItem | "MID")[] = [
  {
    href: "/dashboard",
    label: "الرئيسية",
    icon: (a: boolean) => (
      <svg viewBox="0 0 24 24" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth={a ? 0 : 1.9} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 10.5 12 3l8.5 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-4.5V14h-5v7.5H5A1.5 1.5 0 0 1 3.5 20v-9.5z" />
      </svg>
    ),
  },
  {
    href: "/school",
    label: "المدرسة",
    icon: (a: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5 3.5 4v13.5L12 20m0-13.5L20.5 4v13.5L12 20m0-13.5V20" />
      </svg>
    ),
  },
  {
    href: "/orbit",
    label: "أوربت",
    icon: (a: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
        <circle cx="12" cy="13" r="8" /><path strokeLinecap="round" d="M12 9.5V13l2.5 2M10 2h4" />
      </svg>
    ),
  },
  "MID",
  {
    href: "/vault",
    label: "أخطائي",
    icon: (a: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
        <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" /><path strokeLinecap="round" d="M8 10V7.5a4 4 0 0 1 8 0V10" /><circle cx="12" cy="15.2" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/review",
    label: "بطاقاتي",
    icon: (a: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
        <rect x="5" y="4" width="14" height="17" rx="2.5" /><path strokeLinecap="round" d="M9 4.5V3m6 1.5V3M9 12l2 2 4-4.5" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const dueCount = useDueCards();
  /* العنصر الأوسط حسب المرحلة (نفس المنطق الثلاثي في DesktopSidebar):
     جامعي → أدوات الجامعة، ثالث ثانوي/خريج → القبول، وإلا مساري.
     تهيئة كسولة بنمط DesktopSidebar — لا setState داخل effect. */
  const [midItem] = useState<NavItem>(() => {
    if (typeof window === "undefined") return ROADMAP_ITEM;
    const u = loadUser();
    return isUniversityPhase(u) ? UNI_TOOLS_ITEM : showsUniversityUI(u) ? ADMISSION_ITEM : ROADMAP_ITEM;
  });

  const navItems: NavItem[] = BASE_ITEMS.map((it) => it === "MID" ? midItem : it) as NavItem[];

  return (
    <nav className="float-nav flex items-stretch px-2" aria-label="التنقل الرئيسي">
      {navItems.map((item) => {
        const active = pathname === item.href;
        const badge = item.href === "/review" && dueCount > 0 ? dueCount : 0;
        return (
          <Link key={item.href} href={item.href}
            className={`float-nav-item ${active ? "active" : ""}`}>
            <span className="nav-bubble relative">
              {item.icon(active)}
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
                  style={{ background: "#EF4444", color: "#fff", lineHeight: 1 }}>
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </span>
            <span className={`nav-label text-[11.5px] ${active ? "font-extrabold" : "font-semibold"}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
