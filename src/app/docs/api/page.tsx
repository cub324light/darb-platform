/* ─── توثيق الواجهة البرمجية — للمطوّرين ولوكلاء الذكاء الاصطناعي. ─── */
import type { Metadata } from "next";
import Link from "next/link";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import { SITE, ENDPOINTS } from "@/lib/agent/catalog";

const DESC = "واجهة درب العامّة: بيانات الجامعات والاختبارات والتقويم والأسئلة الشائعة — JSON بلا مصادقة، مع OpenAPI وخادم MCP.";

export const metadata: Metadata = {
  title: "الواجهة البرمجية (API)",
  description: DESC,
  alternates: { canonical: "/docs/api" },
  openGraph: { title: "واجهة درب البرمجية", description: DESC, url: "/docs/api", type: "website", locale: "ar_SA" },
  twitter: { card: "summary_large_image", title: "واجهة درب البرمجية", description: DESC },
};

const MCP_SNIPPET = `curl -X POST ${SITE.url}/mcp \\
  -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

export default function ApiDocsPage() {
  return (
    <div className="page">
      <Dome compact>
        <header className="flex items-center gap-3">
          <BackButton />
          <h1 className="title-lg grad-title">الواجهة البرمجية</h1>
        </header>
      </Dome>

      <main className="page-content mt-4 flex flex-col gap-5">
        <p className="t-body" style={{ color: "var(--text-dim)" }}>{DESC}</p>

        <section className="ds-card" aria-labelledby="auth">
          <h2 id="auth" className="t-h3 font-black mb-2">المصادقة</h2>
          <p className="t-body leading-relaxed" style={{ color: "var(--text-dim)" }}>
            واجهاتُ القراءة أدناه <strong>عامّة بلا مصادقة</strong>. أمّا ما يخصّ حساب
            طالبٍ بعينه فمحميٌّ بدخول Google (OAuth 2.0 عبر Firebase) ويُرسَل رمزُه في
            <code> Authorization: Bearer &lt;ID token&gt;</code>. لا يوجد طريقٌ يُخرِج
            بيانات طالبٍ إلى وكيلٍ بلا إذنه.
          </p>
        </section>

        {ENDPOINTS.map((e) => (
          <article key={e.id} className="ds-card" aria-labelledby={`e-${e.id}`}>
            <h2 id={`e-${e.id}`} className="t-h3 font-black mb-1.5"><code>GET {e.path}</code></h2>
            <p className="t-body mb-2" style={{ color: "var(--text-dim)" }}>{e.summary}</p>
            {e.params?.length ? (
              <p className="t-small" style={{ color: "var(--text-muted)" }}>
                المعاملات: {e.params.map((p) => <code key={p}>{p} </code>)}
              </p>
            ) : null}
            <a href={e.path} className="t-small font-black" style={{ color: "var(--accent-light)" }}>جرّبها ←</a>
          </article>
        ))}

        <section className="ds-card" aria-labelledby="mcp">
          <h2 id="mcp" className="t-h3 font-black mb-2">خادم MCP</h2>
          <p className="t-body mb-3" style={{ color: "var(--text-dim)" }}>
            عنوانُه <code>{SITE.url}/mcp</code> ويتكلّم JSON-RPC 2.0. أدواتُه:
            <code> list_universities</code> · <code>get_university</code> · <code>list_exams</code> ·
            <code> get_academic_calendar</code> · <code>search_faq</code>.
          </p>
          <pre className="t-small" style={{ overflowX: "auto", background: "var(--surface2)", padding: "12px", borderRadius: "12px" }}>
            <code>{MCP_SNIPPET}</code>
          </pre>
        </section>

        <section className="ds-card" aria-labelledby="rules">
          <h2 id="rules" className="t-h3 font-black mb-2">قواعد الاستعمال</h2>
          <ul className="t-body leading-relaxed flex flex-col gap-1.5" style={{ color: "var(--text-dim)" }}>
            <li>حدُّ الطلبات ستّون في الدقيقة لكل عنوان.</li>
            <li>الحقلُ الفارغ يعني «لم تُعلنه الجهة الرسمية» — لا يُملأ تخميناً.</li>
            <li>انسب المصدر عند نقل تقويمٍ أو نافذة تسجيل.</li>
          </ul>
        </section>

        <nav aria-label="روابط" className="ds-card">
          <ul className="flex flex-wrap gap-3 list-none p-0 m-0 t-body font-bold">
            <li><a href="/openapi.json">OpenAPI 3.1</a></li>
            <li><a href="/llms.txt">llms.txt</a></li>
            <li><a href="/agents.md">agents.md</a></li>
            <li><Link href="/docs">التوثيق</Link></li>
          </ul>
        </nav>
      </main>
      <PageFooter />
    </div>
  );
}
