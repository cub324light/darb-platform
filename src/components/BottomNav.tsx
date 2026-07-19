"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { loadUser } from "@/lib/storage";
import { isUniversityPhase, isGraduatePhase, isUniversityGraduate } from "@/lib/phase";

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

/* المدرسة — للثانوي (عادت للشريط؛ «خطتي» أُزيلت والوصول للخطة من «خطة اليوم» في الرئيسية) */
const SCHOOL_ITEM: NavItem = {
  href: "/school",
  label: "المدرسة",
  icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5 3.5 4v13.5L12 20m0-13.5L20.5 4v13.5L12 20m0-13.5V20" />
    </svg>
  ),
};

/* المهارات — العنصر الأوسط لخريج الجامعة (تطوير مهني، لا قبول/قياس/جامعات) */
const SKILLS_ITEM: NavItem = {
  href: "/skills",
  label: "مهاراتي",
  icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21.6 7.1 18l.9-5.5-4-3.9L9.5 8 12 3z" />
    </svg>
  ),
};

/* المستقبل — تحلّ محلّ «المدرسة» للجامعي والخريج (تدريب/وظائف/شهادات/مسارات) */
const FUTURE_ITEM: NavItem = {
  href: "/future",
  label: "المستقبل",
  icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c3.5 1.5 5.5 4.5 5.5 8.5 0 2-.6 3.6-1.5 4.8L12 21l-4-4.7c-.9-1.2-1.5-2.8-1.5-4.8C6.5 7.5 8.5 4.5 12 3z" />
      <circle cx="12" cy="10.5" r="2" />
    </svg>
  ),
};

const BASE_ITEMS: (NavItem | "MID" | "SCHOOL")[] = [
  {
    href: "/dashboard",
    label: "الرئيسية",
    icon: (a: boolean) => (
      <svg viewBox="0 0 24 24" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth={a ? 0 : 1.9} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 10.5 12 3l8.5 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-4.5V14h-5v7.5H5A1.5 1.5 0 0 1 3.5 20v-9.5z" />
      </svg>
    ),
  },
  "MID",
  {
    href: "/orbit",
    label: "تركيز",
    icon: (a: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.9} className="w-6 h-6">
        <circle cx="12" cy="13" r="8" /><path strokeLinecap="round" d="M12 9.5V13l2.5 2M10 2h4" />
      </svg>
    ),
  },
  "SCHOOL",
  {
    href: "/vault",
    label: "أخطائي",
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
  const [{ midItem, schoolItem }] = useState<{ midItem: NavItem; schoolItem: NavItem }>(() => {
    if (typeof window === "undefined") return { midItem: ROADMAP_ITEM, schoolItem: SCHOOL_ITEM };
    const u = loadUser();
    /* خريج الجامعة: مهني بحت — لا قبول (admission) ولا مساري (قدرات/تحصيلي) */
    /* الثانوي والخريج (ثانوي): «مساري» (يضمّ القبول/الجامعات/الاختبارات) · الجامعي: أدوات · خريج الجامعة: مهارات */
    const mid = isUniversityPhase(u) ? UNI_TOOLS_ITEM
      : isUniversityGraduate(u) ? SKILLS_ITEM
      : ROADMAP_ITEM;
    /* الثانوي: «المدرسة» · الجامعي والخريج: «المستقبل» */
    const school = isUniversityPhase(u) || isGraduatePhase(u) ? FUTURE_ITEM : SCHOOL_ITEM;
    return { midItem: mid, schoolItem: school };
  });

  const navItems: NavItem[] = BASE_ITEMS.map((it) =>
    it === "MID" ? midItem : it === "SCHOOL" ? schoolItem : it) as NavItem[];

  return (
    <nav className="float-nav flex items-stretch px-2" aria-label="التنقل الرئيسي">
      {navItems.map((item) => {
        const active = pathname === item.href;
        const badge = item.href === "/vault" && dueCount > 0 ? dueCount : 0;
        return (
          <Link key={item.href} href={item.href}
            className={`float-nav-item ${active ? "active" : ""}`}>
            <span className="nav-bubble relative">
              {item.icon(active)}
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-black flex items-center justify-center"
                  style={{ background: "#EF4444", color: "#fff", lineHeight: 1 }}>
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </span>
            <span className={`nav-label text-[13px] ${active ? "font-extrabold" : "font-semibold"}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
