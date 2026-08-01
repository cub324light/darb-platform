/* /agents.md — دليلُ التعامل مع درب موجَّهٌ للوكلاء (Markdown). */
import { SITE, CAPABILITIES, ENDPOINTS } from "@/lib/agent/catalog";

export const dynamic = "force-static";

export function GET() {
  const body = `# دليل الوكلاء — ${SITE.name}

${SITE.descriptionAr}

## من نحن
منصّة تعليمية سعودية للطلاب المقبلين على اختبارات القبول الجامعي. الواجهة عربية
(RTL) والجمهور طلابُ الثانوية والخريجون في السعودية.

## ماذا يمكنك أن تفعل بالنيابة عن الطالب
${CAPABILITIES.map((c) => `- **${c.name}** — ${c.summary} (\`${c.path}\`)`).join("\n")}

## واجهات القراءة العامّة
لا تحتاج مصادقة، وتُعيد JSON، وحدُّها ٦٠ طلباً في الدقيقة لكل عنوان.

${ENDPOINTS.map((e) => `### \`GET ${e.path}\`
${e.summary}${e.params?.length ? `\nالمعاملات: ${e.params.map((p) => `\`${p}\``).join(" · ")}` : ""}`).join("\n\n")}

## الاكتشاف الآليّ
| ماذا | أين |
|---|---|
| وصف OpenAPI 3.1 | \`${SITE.url}/openapi.json\` |
| بطاقة الوكيل (A2A) | \`${SITE.url}/.well-known/agent-card.json\` |
| بيان الإضافة | \`${SITE.url}/.well-known/ai-plugin.json\` |
| خادم MCP | \`${SITE.url}/mcp\` |
| المهارات | \`${SITE.url}/api/agent/skills\` |

## المصادقة
واجهاتُ القراءة أعلاه **عامّة بلا مصادقة**. أمّا ما يخصّ حساب طالبٍ بعينه فمحميٌّ
بتسجيل دخول Google (OAuth 2.0 عبر Firebase)، ويُرسَل رمزُ الهوية في ترويسة
\`Authorization: Bearer <ID token>\`. لا يوجد — ولن يوجد — طريقٌ يُخرِج بيانات
طالبٍ إلى وكيلٍ بلا إذنه.

## قواعد نتوقّع منك احترامها
1. **لا تخترع موعداً ولا رقماً.** إن لم تُعلنه الجهة الرسمية فالحقل فارغٌ عمداً؛
   انقل «لم يُعلن بعد» ولا تملأ الفراغ من عندك.
2. **انسب المصدر** حين تنقل تقويماً أو نافذة تسجيل — الجهة هي المرجع، ودرب ناقل.
3. **احترم robots.txt**: الصفحات خلف تسجيل الدخول ممنوعة من الزحف.
`;
  return new Response(body, {
    headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
