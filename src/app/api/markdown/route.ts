/* تفاوضُ المحتوى: يصل هنا الطلبُ الذي حمل `Accept: text/markdown` بعد إعادة
   كتابةٍ في `next.config.ts` — فالمتصفّح لا يمرّ من هنا أصلاً وHTML يبقى الأصل.

   ▓ `force-dynamic` لازم: `force-static` يُفرِغ `searchParams` فيضيع `p`. */
import { markdownFor } from "@/lib/agent/pageMarkdown";
import { AGENT_HEADERS } from "@/lib/agent/respond";

export const dynamic = "force-dynamic";

export function OPTIONS() { return new Response(null, { status: 204, headers: AGENT_HEADERS }); }

export function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("p") ?? "/";
  const md = markdownFor(path);
  if (md === null) {
    return new Response(`لا تمثيلَ نصّيّاً لهذا المسار: ${path}\n`, {
      status: 404,
      headers: { ...AGENT_HEADERS, "content-type": "text/markdown; charset=utf-8" },
    });
  }
  return new Response(md, {
    headers: {
      ...AGENT_HEADERS,
      "content-type": "text/markdown; charset=utf-8",
      /* تقديرُ الحجم بالرموز — يفيد الوكيل في ميزانية سياقه.
         تقريبٌ محافظ: أربعةُ محارف للرمز الواحد. */
      "x-markdown-tokens": String(Math.ceil(md.length / 4)),
      /* الرابطُ الأصلي للصفحة، ولا نُفهرس التمثيل النصّيّ بديلاً عنها */
      "x-robots-tag": "noindex",
      vary: "Accept",
    },
  });
}
