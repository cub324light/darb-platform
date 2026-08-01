/* تغذية RSS — من سجلّ التحديثات الحقيقيّ لا من قائمةٍ منفصلة تشيخ. */
import { CHANGELOG } from "@/lib/changelog";
import { SITE } from "@/lib/agent/catalog";

export const dynamic = "force-static";

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string));

export function GET() {
  const items = CHANGELOG.slice(0, 20).map((e) => {
    const body = e.changes.map((c) => `• ${c.text}`).join("\n");
    return `    <item>
      <title>${esc(e.title ?? "تحديث")}</title>
      <link>${SITE.url}/changelog</link>
      <guid isPermaLink="false">darb-${e.date}-${esc(e.title ?? "")}</guid>
      <pubDate>${new Date(`${e.date}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${esc(body)}</description>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.name)} — آخر التحديثات</title>
    <link>${SITE.url}/changelog</link>
    <description>${esc(SITE.descriptionAr)}</description>
    <language>ar</language>
    <atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
