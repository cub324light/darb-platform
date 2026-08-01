/* ─── التوثيق (صفحة عامة) — مدخلٌ للبشر وللوكلاء إلى كل ما تنشره درب آلياً. ─── */
import type { Metadata } from "next";
import Link from "next/link";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import { SITE, ENDPOINTS } from "@/lib/agent/catalog";

const DESC = "توثيق درب: كيف تعمل المنصّة، وأين تجد بياناتها العامّة، وكيف يستدعيها وكيلُ ذكاءٍ اصطناعي.";

export const metadata: Metadata = {
  title: "التوثيق",
  description: DESC,
  alternates: { canonical: "/docs" },
  openGraph: { title: "توثيق درب", description: DESC, url: "/docs", type: "website", locale: "ar_SA" },
  twitter: { card: "summary_large_image", title: "توثيق درب", description: DESC },
};

const DISCOVERY = [
  { label: "llms.txt — وصفٌ مختصر للوكلاء", href: "/llms.txt" },
  { label: "llms-full.txt — المرجع الكامل بالبيانات", href: "/llms-full.txt" },
  { label: "agents.md — دليلُ التعامل", href: "/agents.md" },
  { label: "openapi.json — وصف OpenAPI 3.1", href: "/openapi.json" },
  { label: "بطاقة الوكيل (A2A)", href: "/.well-known/agent-card.json" },
  { label: "بيان الإضافة", href: "/.well-known/ai-plugin.json" },
  { label: "وصف خادم MCP", href: "/.well-known/mcp.json" },
  { label: "اكتشاف المهارات", href: "/api/agent/skills" },
  { label: "خريطة الموقع", href: "/sitemap.xml" },
  { label: "تغذية RSS", href: "/feed.xml" },
];

export default function DocsPage() {
  return (
    <div className="page">
      <Dome compact>
        <header className="flex items-center gap-3">
          <BackButton />
          <h1 className="title-lg grad-title">التوثيق</h1>
        </header>
      </Dome>

      <main className="page-content mt-4 flex flex-col gap-5">
        <p className="t-body" style={{ color: "var(--text-dim)" }}>{DESC}</p>

        <section className="ds-card" aria-labelledby="discovery">
          <h2 id="discovery" className="t-h3 font-black mb-3">ملفّات الاكتشاف</h2>
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {DISCOVERY.map((d) => (
              <li key={d.href}>
                <a href={d.href} className="t-body font-bold">{d.label}</a>
              </li>
            ))}
          </ul>
        </section>

        <section className="ds-card" aria-labelledby="data">
          <h2 id="data" className="t-h3 font-black mb-3">بياناتٌ عامّة للقراءة</h2>
          <p className="t-small mb-3" style={{ color: "var(--text-muted)" }}>
            بلا مصادقة · JSON · لا تحوي أي بيانات طلاب.
          </p>
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {ENDPOINTS.map((e) => (
              <li key={e.id}>
                <h3 className="t-title font-black"><code>GET {e.path}</code></h3>
                <p className="t-small" style={{ color: "var(--text-muted)" }}>{e.summary}</p>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label="روابط" className="ds-card">
          <h2 className="t-h3 font-black mb-3">اقرأ أيضاً</h2>
          <ul className="flex flex-wrap gap-3 list-none p-0 m-0 t-body font-bold">
            <li><Link href="/docs/api">توثيق الواجهة البرمجية</Link></li>
            <li><Link href="/about">عن درب</Link></li>
            <li><Link href="/features">المزايا</Link></li>
            <li><Link href="/faq">الأسئلة الشائعة</Link></li>
          </ul>
        </nav>
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>الموقع: {SITE.url}</p>
      </main>
      <PageFooter />
    </div>
  );
}
