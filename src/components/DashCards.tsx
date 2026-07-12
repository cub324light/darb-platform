"use client";
/* ─── بطاقات لوحة الطالب الموجزة ───
   بعد البطل: بطاقاتٌ مختصرة فقط، لكلٍّ هدفٌ واضح ووجهة. لا تفاصيل هنا — التفاصيل
   تظهر بعد دخول البطاقة (صفحةٌ مستقلة). تقصّر الصفحة وتُبقيها قابلةً للمسح بلمحة.
   كل بطاقةٍ تقود لصفحةٍ قائمةٍ فعلاً (لا وجهات وهمية). */
import Link from "next/link";

interface Card { icon: string; title: string; desc: string; href: string; }

/* الوجهات كلّها موجودة في التطبيق — بلا ميزاتٍ مُفترَضة */
const CARDS: Card[] = [
  { icon: "📆", title: "يومك",        desc: "جلسة تركيز اليوم",    href: "/orbit" },
  { icon: "🗺️", title: "مساري",       desc: "خريطة مسارك وتقدّمه",  href: "/roadmap" },
  { icon: "📚", title: "الاختبارات",   desc: "تدرّب وراجع",         href: "/review" },
  { icon: "🏆", title: "الإنجازات",    desc: "تحدياتك وأوسمتك",     href: "/challenges" },
  { icon: "🎓", title: "الجامعة",      desc: "القبول والمفاضلة",    href: "/university" },
  { icon: "💼", title: "التخصصات",     desc: "المسارات المهنية",    href: "/career" },
  { icon: "🛠️", title: "الأدوات",      desc: "أدوات دراستك",        href: "/uni-gear" },
  { icon: "🏛️", title: "دليل الجامعات", desc: "استكشف الجامعات",     href: "/universities" },
];

export default function DashCards() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {CARDS.map((c) => (
        <Link key={c.href} href={c.href}
          className="ds-card ds-card-tight ds-card-interactive flex items-center gap-2.5 no-underline">
          <span className="text-[23px] leading-none flex-shrink-0" aria-hidden="true">{c.icon}</span>
          <span className="flex flex-col min-w-0">
            <span className="t-body font-black leading-tight" style={{ color: "var(--text)" }}>{c.title}</span>
            <span className="t-caption truncate" style={{ color: "var(--text-muted)" }}>{c.desc}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
