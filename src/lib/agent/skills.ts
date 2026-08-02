/* ═══════════ مهاراتُ الوكلاء (Agent Skills Discovery RFC v0.2.0) ═══════════
   لكل مهارةٍ ملفُّ `SKILL.md` يشرح للوكيل كيف ينفّذها، وفهرسٌ يجمعها مع بصمة
   sha256 لكلّ ملفٍّ حتى يتحقّق الوكيل أن ما قرأه هو ما نشرناه.

   المحتوى مولَّدٌ من `catalog.ts` — الأدوات والواجهات نفسها التي يستعملها MCP
   وOpenAPI، فلا وصفَ ثانٍ يشيخ. والبصمةُ تُحسب من النصّ المولَّد نفسه، فتتغيّر
   تلقائياً متى تغيّر الوصف.

   نقيّ: لا `window` ولا `Date` — يُقيَّم وقت البناء. */
import { createHash } from "node:crypto";
import { SITE, ENDPOINTS } from "./catalog";

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  /** أداةُ MCP المقابلة، إن وُجدت */
  tool?: string;
  endpoint: string;
  body: string;
}

const rules = `
## قواعد لا تُخالَف
1. **لا تخترع موعداً ولا رقماً.** الحقلُ الفارغ يعني أن الجهة الرسمية لم تُعلنه
   بعد — انقل «لم يُعلن بعد» ولا تملأ الفراغ بتقدير.
2. **انسب المصدر** عند نقل تقويمٍ أو نافذة تسجيل؛ الجهةُ هي المرجع ودرب ناقل.
3. **لا بيانات طلاب.** لا تُخرِج هذه المهارةُ خططاً ولا أخطاءً ولا تقدّماً، ولا
   يوجد طريقٌ يفعل ذلك.
`.trim();

function skillDoc(o: {
  name: string; description: string; endpoint: string; tool?: string;
  usage: string; example: string;
}): string {
  return `---
name: ${o.name}
description: ${o.description}
---

# ${o.name}

${o.description}

## متى تستعملها
${o.usage}

## كيف
\`GET ${SITE.url}${o.endpoint}\` — JSON، عامّة بلا مصادقة.${
  o.tool ? `\n\nأو عبر خادم MCP على \`${SITE.url}/mcp\` بالأداة \`${o.tool}\`.` : ""
}

\`\`\`
${o.example}
\`\`\`

${rules}
`;
}

const byId = (id: string) => ENDPOINTS.find((e) => e.id === id)!;

export const AGENT_SKILLS: AgentSkill[] = [
  {
    id: "agent-auth",
    name: "المصادقة والتسجيل",
    description: "كيف يصل الوكيلُ إلى درب: الواجهةُ العامّة مفتوحةٌ بلا اعتماد، وبيانات الطالب مغلقةٌ دائماً.",
    endpoint: "/api/agent/claim",
    body: `---
name: المصادقة والتسجيل
description: كيف يصل الوكيلُ إلى درب: الواجهةُ العامّة مفتوحةٌ بلا اعتماد، وبيانات الطالب مغلقةٌ دائماً.
---

# المصادقة والتسجيل — ${SITE.name}

## الخلاصة في سطر
لا تحتاج شيئاً. استدعِ الواجهةَ العامّة مباشرةً.

## التسجيل (anonymous)
نوعُ الهويّة \`anonymous\` ونوعُ الاعتماد \`none\`. وللتأكّد آلياً:

\`\`\`
GET ${SITE.url}/api/agent/claim
\`\`\`

يُعيد \`{"granted": true, "credential": null}\` مع قائمة العناوين المتاحة وحدّ
الطلبات. لا يُنشئ حساباً ولا يُصدر رمزاً — إنما يخبرك أن البابَ مفتوحٌ أصلاً،
فلا تضيّع الوقت في البحث عن مفتاح.

- البيانُ الكامل: ${SITE.url}/auth.md
- المورد المحميّ (RFC 9728): ${SITE.url}/.well-known/oauth-protected-resource
- خادم التفويض (RFC 8414): ${SITE.url}/.well-known/oauth-authorization-server

## الحدّ الذي لا يُتجاوز
خطّةُ الطالب وأخطاؤه وتقدّمه **لا تخرج إلى وكيلٍ بحال**. ليست محميّةً بمفتاحٍ
تطلبه، بل **لا توجد واجهةٌ تُخرجها** — و\`delegated_agent_access\` مُطفأ عن قصد.
ما خلف تسجيل الدخول هو تطبيق الطالب نفسه يفتحه بهويّته من Google.

## حدُّ الطلبات
ستّون طلباً في الدقيقة لكل عنوان. تجاوزُه يُبطئك ولا يحجبك.

${rules}
`,
  },
  {
    id: "saudi-universities",
    name: "دليل الجامعات السعودية",
    description: byId("universities").summary,
    tool: "list_universities",
    endpoint: "/api/agent/universities",
    body: skillDoc({
      name: "دليل الجامعات السعودية",
      description: byId("universities").summary,
      endpoint: "/api/agent/universities",
      tool: "list_universities",
      usage: "حين يسأل الطالب عن جامعةٍ أو تخصّصٍ أو أين يُدرَّس تخصّصٌ بعينه.",
      example: `GET ${SITE.url}/api/agent/universities?region=المنطقة الشرقية
GET ${SITE.url}/api/agent/universities?id=kfupm   # كلياتها وتخصّصاتها الدقيقة`,
    }),
  },
  {
    id: "national-exams",
    name: "الاختبارات الوطنية ونوافذ التسجيل",
    description: byId("exams").summary,
    tool: "list_exams",
    endpoint: "/api/agent/exams",
    body: skillDoc({
      name: "الاختبارات الوطنية ونوافذ التسجيل",
      description: byId("exams").summary,
      endpoint: "/api/agent/exams",
      tool: "list_exams",
      usage: "حين يسأل الطالب متى يفتح تسجيل قدرات أو التحصيلي أو ستيب، أو متى الاختبار.",
      example: `GET ${SITE.url}/api/agent/exams
# التواريخ الفارغة (null) تعني: لم تُعلنها هيئة تقويم التعليم والتدريب بعد.`,
    }),
  },
  {
    id: "academic-calendar",
    name: "التقويم الدراسي السعودي",
    description: byId("calendar").summary,
    tool: "get_academic_calendar",
    endpoint: "/api/agent/calendar",
    body: skillDoc({
      name: "التقويم الدراسي السعودي",
      description: byId("calendar").summary,
      endpoint: "/api/agent/calendar",
      tool: "get_academic_calendar",
      usage: "حين تبني خطةً زمنية أو تحسب أياماً دراسية أو تتحقّق من إجازة.",
      example: `GET ${SITE.url}/api/agent/calendar`,
    }),
  },
  {
    id: "admission-faq",
    name: "أسئلة القبول الجامعي الشائعة",
    description: byId("faq").summary,
    tool: "search_faq",
    endpoint: "/api/agent/faq",
    body: skillDoc({
      name: "أسئلة القبول الجامعي الشائعة",
      description: byId("faq").summary,
      endpoint: "/api/agent/faq",
      tool: "search_faq",
      usage: "حين يسأل الطالب عن منصّة قبول أو النسبة الموزونة أو شروط التقديم.",
      example: `GET ${SITE.url}/api/agent/faq?q=النسبة الموزونة`,
    }),
  },
];

/** بصمةُ محتوى المهارة — يتحقّق بها الوكيل أن الملفّ لم يُبدَّل. */
export const skillDigest = (s: AgentSkill) =>
  createHash("sha256").update(s.body, "utf8").digest("hex");

export const skillUrl = (s: AgentSkill) =>
  `${SITE.url}/.well-known/agent-skills/${s.id}/SKILL.md`;

export const findSkill = (id: string) => AGENT_SKILLS.find((s) => s.id === id) ?? null;
