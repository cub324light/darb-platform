/* ─── مزايا درب (صفحة عامة) — قائمةٌ واحدة مشتقّة من الكتالوج، فلا تشيخ. ─── */
import type { Metadata } from "next";
import Link from "next/link";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import { SITE, CAPABILITIES } from "@/lib/agent/catalog";

const DESC = "كل ما تقدّمه درب للطالب: خريطة مذاكرة، جلسات تركيز، خزنة أخطاء، خطة يومية، دليل جامعات، وتقويم دراسي رسمي.";

export const metadata: Metadata = {
  title: "مزايا درب",
  description: DESC,
  alternates: { canonical: "/features" },
  openGraph: { title: "مزايا درب", description: DESC, url: "/features", type: "website", locale: "ar_SA" },
  twitter: { card: "summary_large_image", title: "مزايا درب", description: DESC },
};

export default function FeaturesPage() {
  return (
    <div className="page">
      <Dome compact>
        <header className="flex items-center gap-3">
          <BackButton />
          <h1 className="title-lg grad-title">المزايا</h1>
        </header>
      </Dome>

      <main className="page-content mt-4 flex flex-col gap-4">
        <p className="t-body" style={{ color: "var(--text-dim)" }}>{DESC}</p>

        {CAPABILITIES.map((c) => (
          <article key={c.id} className="ds-card" aria-labelledby={`f-${c.id}`}>
            <h2 id={`f-${c.id}`} className="t-h3 font-black mb-1.5">{c.name}</h2>
            <p className="t-body leading-relaxed mb-3" style={{ color: "var(--text-dim)" }}>{c.summary}</p>
            <Link href={c.path} className="t-body font-black" style={{ color: "var(--accent-light)" }}>
              افتحها ←
            </Link>
          </article>
        ))}

        <section className="ds-card" aria-labelledby="agents">
          <h2 id="agents" className="t-h3 font-black mb-2">لوكلاء الذكاء الاصطناعي</h2>
          <p className="t-body leading-relaxed" style={{ color: "var(--text-dim)" }}>
            بياناتُ درب العامّة متاحةٌ آلياً: <Link href="/docs/api">توثيق الواجهة</Link> ·{" "}
            <a href="/openapi.json">OpenAPI</a> · <a href="/llms.txt">llms.txt</a> · خادم MCP على{" "}
            <code>{SITE.url}/mcp</code>.
          </p>
        </section>
      </main>
      <PageFooter />
    </div>
  );
}
