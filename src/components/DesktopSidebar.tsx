"use client";
/* ─── الشريط الجانبي الدائم (سطح المكتب فقط ≥1100px) ───
   تجربة سطح مكتب حقيقية: شريط جانبي بعناوين (لا أيقونات فقط)، قابل للطيّ،
   مع هوية أعلاه وبروفايل المستخدم + إجراءات سريعة أسفله.
   مخفيّ تماماً على الجوال (display:none) — لا يلمس تجربة الجوال إطلاقاً.

   يضبط html[data-sidebar="expanded|collapsed"] فيُزيح المحتوى الرئيسي عبر CSS. */
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { ThemeToggle } from "./Profile";
import SettingsButton from "./SettingsPanel";
import { loadUser, type DarbUser } from "@/lib/storage";
import { currentPhase, type NavMid, type PhaseView } from "@/lib/transition";

/* عدّاد البطاقات المستحقّة — نفس منطق BottomNav */
function calcDue(): number {
  if (typeof window === "undefined") return 0;
  try {
    const cards = JSON.parse(localStorage.getItem("darb_cards") ?? "[]");
    return Array.isArray(cards) ? cards.filter((c: { dueDate: number }) => c.dueDate <= Date.now()).length : 0;
  } catch { return 0; }
}

type Icon = (a: boolean) => React.ReactNode;
interface NavLink { href: string; label: string; icon: Icon; badge?: boolean; }

const I = {
  home: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth={a ? 0 : 1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 10.5 12 3l8.5 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-4.5V14h-5v7.5H5A1.5 1.5 0 0 1 3.5 20v-9.5z" />
    </svg>
  ),
  school: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5 3.5 4v13.5L12 20m0-13.5L20.5 4v13.5L12 20m0-13.5V20" />
    </svg>
  ),
  orbit: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <circle cx="12" cy="13" r="8" /><path strokeLinecap="round" d="M12 9.5V13l2.5 2M10 2h4" />
    </svg>
  ),
  roadmap: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20 3.5 17.5v-13L9 7m0 13 6-3m-6 3V7m6 10 5.5 2.5v-13L15 4m0 13V4M9 7l6-3" />
    </svg>
  ),
  university: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 2 8.5l10 5.5 10-5.5L12 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 10.8v5.2a8 8 0 0 0 12 0v-5.2" />
    </svg>
  ),
  uniTools: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <rect x="5.5" y="3" width="13" height="18" rx="2.5" />
      <path strokeLinecap="round" d="M8.5 7h7M8.5 11h0M12 11h0M15.5 11h0M8.5 14.5h0M12 14.5h0M15.5 14.5h0M8.5 18h0M12 18h3.5" />
    </svg>
  ),
  plan: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" /><path strokeLinecap="round" d="M3.5 9h17M8 3v3m8-3v3" />
    </svg>
  ),
  study: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14 5-3 6 3 5-3V5l-5 3-6-3-5 3m11 11V5" />
    </svg>
  ),
  cards: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <rect x="5" y="4" width="14" height="17" rx="2.5" /><path strokeLinecap="round" d="M9 4.5V3m6 1.5V3M9 12l2 2 4-4.5" />
    </svg>
  ),
  vault: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" /><path strokeLinecap="round" d="M8 10V7.5a4 4 0 0 1 8 0V10" /><circle cx="12" cy="15.2" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  council: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5h16v10H9l-4 3.5v-3.5H4z" />
    </svg>
  ),
  arena: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 4 19 8.5M9.5 9 4 14.5 9.5 20 15 14.5M13 5.5l5.5 5.5M3 21l3-3" />
    </svg>
  ),
  trophy: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10v5a5 5 0 0 1-10 0V4zM5 5H3v2a3 3 0 0 0 3 3m13-5h2v2a3 3 0 0 1-3 3M9 19h6m-3-5v5" />
    </svg>
  ),
  target: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  future: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c3.5 1.5 5.5 4.5 5.5 8.5 0 2-.6 3.6-1.5 4.8L12 21l-4-4.7c-.9-1.2-1.5-2.8-1.5-4.8C6.5 7.5 8.5 4.5 12 3z" />
      <circle cx="12" cy="10.5" r="2" />
    </svg>
  ),
  skills: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.3 : 1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21.6 7.1 18l.9-5.5-4-3.9L9.5 8 12 3z" />
    </svg>
  ),
  robot: () => <span className="text-[20px] leading-none">🤖</span>,
};

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("darb_sidebar_collapsed") === "1";
}

export default function DesktopSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [user] = useState<DarbUser | null>(() => (typeof window !== "undefined" ? loadUser() : null));
  const [view] = useState<PhaseView | null>(() => (typeof window !== "undefined" ? currentPhase() : null));
  const [due, setDue] = useState(calcDue);

  /* مزامنة سمة الإزاحة مع الـDOM + تحديث عدّاد البطاقات دورياً */
  useEffect(() => {
    document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
  }, [collapsed]);

  useEffect(() => {
    const t = setInterval(() => setDue(calcDue()), 60000);
    return () => {
      clearInterval(t);
      /* عند مغادرة التطبيق لصفحة عامة (هبوط/خصوصية) نلغي الإزاحة */
      delete document.documentElement.dataset.sidebar;
    };
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("darb_sidebar_collapsed", next ? "1" : "0"); } catch {}
      document.documentElement.dataset.sidebar = next ? "collapsed" : "expanded";
      return next;
    });
  };

  const MID_LINK: Record<NavMid, NavLink> = {
    roadmap: { href: "/roadmap", label: "مساري", icon: I.roadmap },
    admission: { href: "/university", label: "القبول الجامعي", icon: I.university },
    "uni-tools": { href: "/uni-tools", label: "أدوات الجامعة", icon: I.uniTools },
    skills: { href: "/skills", label: "مهاراتي", icon: I.skills },
  };

  const primary: NavLink[] = [
    { href: "/dashboard", label: "الرئيسية", icon: I.home },
    /* العنصرُ الأوسط من `phaseExperience.navMid` — نفسُ مصدر الشريط السفليّ.
       (كان كلٌّ يكتب منطقَه بيده فتفرّقا على ثالث ثانوي وخريج الثانوي.) */
    MID_LINK[view?.navMid ?? "roadmap"],
    { href: "/orbit", label: "تركيز", icon: I.orbit },
    /* المدرسة للثانوي فقط — الجامعي/الخريج يرون «المستقبل» بدلاً منها */
    view?.allows("school") ?? true
      ? { href: "/school", label: "المدرسة", icon: I.school }
      : { href: "/future", label: "المستقبل", icon: I.future },
    { href: "/plan", label: "خطتي", icon: I.plan },
    { href: "/study-plan", label: "مخطط الدراسة", icon: I.study },
    { href: "/vault", label: "أخطائي", icon: I.vault, badge: true },
  ];

  const community: NavLink[] = [
    { href: "/council", label: "المجلس", icon: I.council },
    { href: "/arena", label: "الأرينا", icon: I.arena },
    { href: "/leaderboard", label: "لوحة الشرف", icon: I.trophy },
    { href: "/challenges", label: "التحديات", icon: I.target },
  ];

  const renderItem = (it: NavLink) => {
    const active = pathname === it.href;
    const badge = it.badge && due > 0 ? due : 0;
    return (
      <Link key={it.href} href={it.href}
        className={`desk-nav-item ${active ? "active" : ""}`}
        title={collapsed ? it.label : undefined}>
        <span className="desk-nav-icon">
          {it.icon(active)}
          {badge > 0 && <span className="desk-nav-badge">{badge > 9 ? "9+" : badge}</span>}
        </span>
        <span className="desk-nav-label">{it.label}</span>
      </Link>
    );
  };

  return (
    <aside className={`desk-sidebar ${collapsed ? "collapsed" : ""}`} aria-label="التنقل الرئيسي">
      {/* رأس: الهوية + زر الطيّ */}
      <div className="desk-sidebar-head">
        <Link href="/dashboard" className="desk-brand no-underline" aria-label="درب — الرئيسية">
          <Logo className="font-black text-[25px]" style={{ letterSpacing: "-0.5px" }} />
        </Link>
        <button onClick={toggle} className="desk-collapse-btn" aria-label={collapsed ? "توسيع الشريط" : "طيّ الشريط"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? "M14 6l-6 6 6 6" : "M10 6l6 6-6 6"} />
          </svg>
        </button>
      </div>

      {/* التنقّل */}
      <nav className="desk-nav">
        {primary.map(renderItem)}
        <div className="desk-nav-sep"><span className="desk-nav-grouplabel">المجتمع</span></div>
        {community.map(renderItem)}
      </nav>

      {/* أسفل: إجراءات سريعة + بروفايل المستخدم */}
      <div className="desk-sidebar-foot">
        <div className="desk-quick">
          <button onClick={() => window.dispatchEvent(new CustomEvent("darb:openDuirb"))}
            className="desk-quick-btn desk-quick-duirb" title="دويرب — مساعدك الذكي" aria-label="افتح دويرب">
            {I.robot()}
            <span className="desk-nav-label">دويرب</span>
          </button>
          <div className="desk-quick-row">
            <ThemeToggle className="" />
            <SettingsButton />
          </div>
        </div>

        <Link href="/profile" className="desk-profile no-underline" aria-label="افتح ملفي الشخصي">
          <span className="desk-profile-avatar">{(user?.name ?? "د").charAt(0)}</span>
          <span className="desk-profile-meta">
            <span className="desk-profile-name">{user?.name ?? "ملفي"}</span>
            <span className="desk-profile-sub">عرض الملف الشخصي</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
