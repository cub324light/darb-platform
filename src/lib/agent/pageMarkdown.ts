/* ═══════════ تمثيلٌ نصّيّ (Markdown) لصفحات درب العامّة ═══════════
   حين يطلب الوكيلُ `Accept: text/markdown` نُعيد الصفحةَ نصّاً بدل HTML.
   المتصفّحُ لا يطلبها فيبقى HTML هو الأصل.

   يُبنى من مصادر المحتوى نفسها التي ترسمها الصفحة (`catalog` · `UNIVERSITIES`
   · `seed.json` · `CHANGELOG`) — لا نصَّ منسوخٌ يشيخ بعد تعديل الصفحة.

   نقيّ: لا `window` ولا `Date`. */
import { SITE, CAPABILITIES, ENDPOINTS, faqPayload, universitiesPayload } from "./catalog";
import { CHANGELOG, CHANGE_META } from "@/lib/changelog";
import { dateLong } from "@/lib/format";

const header = (title: string, path: string) =>
  `# ${title}\n\n<${SITE.url}${path === "/" ? "" : path}>\n`;

const footer = `
---
هذا تمثيلٌ نصّيّ للصفحة نفسها. النسخةُ الكاملة بالـHTML على العنوان أعلاه.
وصفُ الموقع للوكلاء: ${SITE.url}/llms.txt · الواجهة: ${SITE.url}/openapi.json
`;

function home(): string {
  return `${header(`${SITE.name} — ${SITE.tagline}`, "/")}
${SITE.descriptionAr}

${SITE.descriptionEn}

## ما تقدّمه درب
${CAPABILITIES.map((c) => `- **${c.name}** — ${c.summary}`).join("\n")}

## روابط
- [عن درب](${SITE.url}/about) · [المزايا](${SITE.url}/features) · [الأسعار](${SITE.url}/pricing)
- [دليل الجامعات](${SITE.url}/universities) · [الأسئلة الشائعة](${SITE.url}/faq)
- [التوثيق](${SITE.url}/docs) · [الواجهة البرمجية](${SITE.url}/docs/api)
${footer}`;
}

function about(): string {
  return `${header("عن درب", "/about")}
${SITE.descriptionAr}

اللغة: العربية · الجمهور: طلاب المرحلة الثانوية والخريجون في السعودية.

## ماذا تفعل درب
${CAPABILITIES.map((c) => `### ${c.name}\n${c.summary}`).join("\n\n")}
${footer}`;
}

function features(): string {
  return `${header("مزايا درب", "/features")}
${CAPABILITIES.map((c) => `## ${c.name}\n${c.summary}\n\n<${SITE.url}${c.path}>`).join("\n\n")}
${footer}`;
}

function universities(): string {
  const list = universitiesPayload();
  return `${header("دليل الجامعات السعودية", "/universities")}
${list.length} جامعة. البياناتُ الآلية: \`${SITE.url}/api/agent/universities\`

| الجامعة | المنطقة | النوع | ترتيب QS |
|---|---|---|---|
${list.map((u) => {
  const qs = u.qsRank ? (u.qsRankTo ? `${u.qsRank}–${u.qsRankTo}` : `${u.qsRank}`) : "—";
  return `| [${u.name}](${u.url}) | ${u.region ?? "—"} | ${u.kind ?? "—"} | ${qs} |`;
}).join("\n")}

ترتيبُ QS كما نشرته المؤسّسة؛ والشرطةُ تعني أنها غير مصنَّفة أو لم يُنشر لها ترتيب.
${footer}`;
}

function faq(): string {
  const items = faqPayload();
  return `${header("الأسئلة الشائعة", "/faq")}
${items.length} سؤالاً. البياناتُ الآلية: \`${SITE.url}/api/agent/faq?q=\`

${items.map((f) => `## ${f.question}\n${f.answer}`).join("\n\n")}
${footer}`;
}

function docsApi(): string {
  return `${header("الواجهة البرمجية", "/docs/api")}
واجهاتٌ للقراءة فقط، عامّة بلا مصادقة، وحدُّها ستّون طلباً في الدقيقة.

${ENDPOINTS.map((e) => `## \`GET ${e.path}\`
${e.summary}${e.params?.length ? `\n\nالمعاملات: ${e.params.map((p) => `\`${p}\``).join(" · ")}` : ""}`).join("\n\n")}

## خادم MCP
\`POST ${SITE.url}/mcp\` — JSON-RPC 2.0، بروتوكول \`2025-06-18\`.

## المصادقة
لا شيء للسطح العامّ. التفصيل: ${SITE.url}/auth.md
${footer}`;
}

function changelog(): string {
  return `${header("آخر التحديثات", "/changelog")}
${CHANGELOG.map((e) => `## ${dateLong(e.date)}${e.title ? ` — ${e.title}` : ""}
${e.changes.map((c) => `- **${CHANGE_META[c.type].label}:** ${c.text}`).join("\n")}`).join("\n\n")}
${footer}`;
}

/** الصفحاتُ التي لها تمثيلٌ نصّيّ — والمصدرُ الوحيد لقائمة إعادات الكتابة. */
export const MARKDOWN_PAGES: Record<string, () => string> = {
  "/": home,
  "/about": about,
  "/features": features,
  "/universities": universities,
  "/faq": faq,
  "/docs/api": docsApi,
  "/changelog": changelog,
};

export const markdownFor = (path: string): string | null =>
  MARKDOWN_PAGES[path] ? MARKDOWN_PAGES[path]() : null;
