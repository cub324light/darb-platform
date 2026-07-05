/* ─── دليل الجامعات السعودية (صفحة عامة مفهرسة، ثابتة SSG) ───
   Server Component بالكامل — لا تفاعل ولا جلب عميل، فلا JS إضافي. شبكة بطاقات
   لكل الجامعات مجمّعة بالمنطقة (universitiesByRegion)، كل بطاقة Link إلى ملف
   الجامعة المستقل /universities/[id]. مصدر الحقيقة الوحيد: src/lib/university.ts.
   الهدف: كنز بحث عضوي (SEO) + وضع الاستكشاف للطلاب بلا حساب. */
import type { Metadata } from "next";
import Link from "next/link";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import { ThemeToggle } from "@/components/Profile";
import PublicPageCta from "@/components/content/PublicPageCta";
import {
  UNIVERSITIES,
  universitiesByRegion,
  universityCity,
  type UniversityOption,
} from "@/lib/university";

const BASE = "https://usedarb.com";

export const metadata: Metadata = {
  title: "دليل الجامعات السعودية | درب",
  description:
    "دليل الجامعات السعودية الحكومية والأهلية — الكليات والتخصصات ومعادلات القبول الموزونة والسكن الجامعي لكل جامعة، مرتبة حسب المنطقة. اختر جامعتك بوعي قبل ما تقدّم.",
  alternates: { canonical: "/universities" },
  openGraph: {
    title: "دليل الجامعات السعودية | درب",
    description:
      "استكشف الجامعات السعودية الحكومية والأهلية — الكليات ومعادلات القبول الموزونة والسكن الجامعي لكل جامعة.",
    url: "/universities",
    siteName: "درب",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "دليل الجامعات السعودية | درب",
    description: "استكشف الجامعات السعودية الحكومية والأهلية — الكليات والقبول والسكن لكل جامعة.",
  },
};

/* الحرف الأول المميّز للجامعة — يُزيل بادئة «جامعة/الجامعة» و«ال» ليعطي حرفاً دالّاً */
function uniInitial(name: string): string {
  const cleaned = name.replace(/^(جامعة|الجامعة)\s+/, "").replace(/^ال/, "");
  return (cleaned.charAt(0) || name.charAt(0)).toUpperCase();
}

/* لون البطاقة حسب النوع: الحكومية بلون المنصة، الأهلية بالذهبي */
function kindColor(u: UniversityOption): string {
  return u.kind === "أهلية" ? "var(--gold)" : "var(--accent)";
}

/* بطاقة جامعة واحدة — Link إلى ملفها المستقل */
function UniCard({ u }: { u: UniversityOption }) {
  const c = kindColor(u);
  const city = universityCity(u);
  return (
    <Link href={`/universities/${u.id}`}
      className="rounded-2xl p-4 flex items-center gap-3 glow-card-hover no-underline"
      style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
      {/* الأفاتار: الحرف الأول فوق تدرّج بلون النوع (لا صور خارجية — CSP) */}
      <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-[19px] font-black flex-shrink-0"
        style={{
          background: `color-mix(in srgb, ${c} 16%, transparent)`,
          border: `1.5px solid color-mix(in srgb, ${c} 38%, transparent)`,
          color: c,
        }}
        aria-hidden="true">
        {uniInitial(u.name)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-black text-[15px] leading-tight truncate" style={{ color: "var(--text)" }}>{u.name}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {u.kind && (
            <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: `color-mix(in srgb, ${c} 12%, transparent)`, color: c }}>
              {u.kind}
            </span>
          )}
          {city && (
            <span className="text-[12px] font-semibold" style={{ color: "var(--text-muted)" }}>{city}</span>
          )}
          {u.foundedYear && (
            <span className="text-[11.5px] font-mono-nums" style={{ color: "var(--text-dim)" }}>· {u.foundedYear}</span>
          )}
        </div>
      </div>
      <span className="text-[15px] flex-shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden="true">←</span>
    </Link>
  );
}

export default function UniversitiesDirectoryPage() {
  /* التجميع بالمنطقة — يتبع ترتيب UNIVERSITIES (جغرافي) ويتجاوز «أخرى» بلا منطقة */
  const groups = universitiesByRegion();
  const regions = Object.keys(groups);
  const total = UNIVERSITIES.filter((u) => u.id !== "other").length;

  /* JSON-LD ItemList — يساعد محركات البحث على فهم القائمة والروابط */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "دليل الجامعات السعودية",
    numberOfItems: total,
    itemListElement: UNIVERSITIES.filter((u) => u.id !== "other").map((u, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: u.name,
      url: `${BASE}/universities/${u.id}`,
    })),
  };

  return (
    <div className="min-h-dvh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <Dome compact hideControls>
        <div className="flex items-center gap-3">
          <BackButton href="/" />
          <h1 className="title-lg grad-title flex-1">دليل الجامعات</h1>
          <ThemeToggle />
        </div>
      </Dome>

      {/* حاوية أوسع على سطح المكتب — تتيح ثلاثة أعمدة للبطاقات */}
      <main className="px-5 py-6 max-w-2xl min-[1100px]:max-w-5xl mx-auto flex flex-col gap-10 pb-20">
        <p className="text-[14.5px] leading-relaxed -mb-4" style={{ color: "var(--text-muted)" }}>
          الجامعات السعودية الحكومية والأهلية — الكليات ومعادلات القبول الموزونة والسكن الجامعي لكل جامعة، مرتبة حسب المنطقة. اضغط أي جامعة لملفها الكامل.
        </p>

        {regions.map((region) => (
          <section key={region}>
            <p className="eyebrow mb-1" style={{ color: "var(--accent-light)" }}>المنطقة</p>
            <h2 className="font-black text-[19px] mb-4" style={{ color: "var(--text)" }}>{region}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 desk-grid-3 gap-3">
              {groups[region].map((u) => (
                <UniCard key={u.id} u={u} />
              ))}
            </div>
          </section>
        ))}

        <PublicPageCta current="/universities" />
      </main>
    </div>
  );
}
