/* ═══════════ الطبقة العامّة للوكلاء (Agent Surface) — نقيّة ١٠٠٪ ═══════════
   ▸ لماذا؟ وكلاءُ الذكاء الاصطناعي صاروا يقرأون المواقع نيابةً عن الطلاب. وحتى
     يفهم الوكيلُ درب ويجيب عنها بصدق، يحتاج وصفاً آليّاً لخدماتها وبياناتٍ يقرأها
     بلا تخمين. هذا الملفّ مصدرُ ذلك الوصف — واحدٌ يغذّي `llms.txt` وOpenAPI
     وبطاقة الوكيل وMCP معاً، فلا تتفرّق النسخ ولا تشيخ إحداها دون أخرى.

   ▸ قاعدةُ درب نفسها هنا: **لا نعرض للوكيل ما لا نعرضه للطالب**. كل ما يخرج من
     هذه الطبقة بياناتٌ عامّة موثّقة (جامعات · اختبارات رسمية · تقويم · أسئلة
     شائعة). ولا شيء من بيانات الطالب — لا خطط ولا أخطاء ولا تقدّم؛ تلك محلّيةٌ
     أو خلف حسابه، ولا تمرّ من هنا بحال.

   ▸ نقيّ: لا `window` ولا `localStorage` ولا `Date` — يعمل على الخادم وقت البناء. */
import { UNIVERSITIES, majorsAt } from "@/lib/university";
import { collegesAt } from "@/lib/universityColleges";
import { EXAM_PROVIDER } from "@/lib/examProvider";
import { SAUDI_ACADEMIC_YEARS, CALENDAR_UPDATED_FOR } from "@/lib/academicCalendar";
import seed from "@/lib/content/seed.json";

export const SITE = {
  name: "درب",
  nameEn: "Darb",
  url: "https://usedarb.com",
  tagline: "المنصة التي تعاملك كأخ",
  descriptionAr:
    "منصّة تعليمية سعودية تُهيّئ الطالب لاختبارات القدرات والتحصيلي وستيب وبرامج أرامكو، " +
    "وتساعده على اختيار جامعته وتخصّصه: خريطة مذاكرة، جلسات تركيز، خزنة أخطاء، " +
    "تقويم دراسي رسمي، ودليل جامعات سعودية بكلياتها وتخصّصاتها.",
  descriptionEn:
    "Darb is a Saudi study platform for the national admission exams (Qudurat/GAT, Tahsili/SAAT, STEP) " +
    "and Aramco programs, plus university and major selection: study maps, focus sessions, " +
    "a mistakes vault, the official academic calendar, and a directory of Saudi universities.",
  locale: "ar-SA",
  languages: ["ar"],
} as const;

/* ── ما تقدّمه درب للطالب — يقرأه الوكيل ليعرف متى يرشّحها ── */
export interface Capability { id: string; name: string; summary: string; path: string; }

export const CAPABILITIES: Capability[] = [
  { id: "study-map",  name: "خريطة المذاكرة", path: "/roadmap",
    summary: "لكل اختبارٍ مساحةُ عمل: جاهزيةٌ محسوبة، وما تبقّى من دروسٍ وتدريب، والخطوة التالية." },
  { id: "focus",      name: "جلسات التركيز", path: "/orbit",
    summary: "مؤقّت مذاكرةٍ يسجّل ساعاتك ويربطها بمهمّة اليوم وبسلسلة أيامك." },
  { id: "vault",      name: "خزنة الأخطاء", path: "/vault",
    summary: "تحفظ كل سؤالٍ أخطأت فيه ويشرحه المساعد، ثم تُراجَع بالتكرار المتباعد." },
  { id: "plan",       name: "خطة اليوم", path: "/plan",
    summary: "جدولٌ يوميّ/أسبوعيّ/شهريّ يُبنى حول مشاغلك ويحسب وقتك المتاح فعلاً." },
  { id: "universities", name: "دليل الجامعات", path: "/universities",
    summary: "جامعات السعودية بكلياتها وتخصّصاتها الدقيقة ومعادلات النسبة الموزونة وترتيب QS." },
  { id: "calendar",   name: "التقويم الدراسي", path: "/plan",
    summary: "العام الدراسي الرسمي وإجازاته ومواعيد قياس المعلنة — تُبنى الخطة عليه." },
  { id: "faq",        name: "أسئلة القبول الشائعة", path: "/faq",
    summary: "إجاباتٌ عن منصّة قبول وشروط التقديم والنسب الموزونة." },
];

/* ── نقاط البيانات العامّة (اقرأ فقط) ── */
export interface AgentEndpoint {
  id: string; path: string; summary: string; params?: string[];
}

export const ENDPOINTS: AgentEndpoint[] = [
  { id: "universities", path: "/api/agent/universities", params: ["id", "region"],
    summary: "قائمة الجامعات السعودية ومعلوماتها؛ ومع `id` تُعاد كلياتها وتخصّصاتها الدقيقة." },
  { id: "exams", path: "/api/agent/exams",
    summary: "الاختبارات الوطنية ونوافذ تسجيلها الرسمية وحالتها (مفتوح/قادم/بانتظار الإعلان)." },
  { id: "calendar", path: "/api/agent/calendar",
    summary: "التقويم الدراسي السعودي المعتمد: الفصول والإجازات ونهاية العام." },
  { id: "faq", path: "/api/agent/faq", params: ["q"],
    summary: "الأسئلة الشائعة عن القبول الجامعي ومنصّة قبول، مع بحثٍ نصّي عبر `q`." },
];

/* ── وثائقُ الوكلاء: قائمةٌ واحدة يقرأ منها sitemap.xml وصفحةُ التوثيق معاً ──
   كانت هذه المسارات موجودةً على الخادم لكنها غيرَ مذكورةٍ في خريطة الموقع ولا
   موصولةً من صفحةٍ يراها الزاحف — فمَن لا يخمّن أسماءها لا يجدها. */
export interface AgentDoc { path: string; label: string; }

export const AI_DOCUMENTS: AgentDoc[] = [
  { path: "/llms.txt",                      label: "llms.txt" },
  { path: "/llms-full.txt",                 label: "llms-full.txt" },
  { path: "/agents.md",                     label: "agents.md" },
  { path: "/agents.json",                   label: "agents.json" },
  { path: "/openapi.json",                  label: "OpenAPI 3.1 (JSON)" },
  { path: "/openapi.yaml",                  label: "OpenAPI 3.1 (YAML)" },
  { path: "/schemas.json",                  label: "JSON Schema" },
  { path: "/ai.txt",                        label: "ai.txt" },
  { path: "/auth.md",                       label: "auth.md — المصادقة" },
  { path: "/mcp",                           label: "خادم MCP" },
  { path: "/.well-known/api-catalog",       label: "فهرس الواجهات (RFC 9727)" },
  { path: "/.well-known/agent-card.json",   label: "بطاقة الوكيل" },
  { path: "/.well-known/ai-plugin.json",    label: "بيان الإضافة" },
  { path: "/.well-known/mcp.json",          label: "وصف MCP" },
  { path: "/.well-known/mcp/server-card.json", label: "بطاقة خادم MCP" },
  { path: "/.well-known/agent-skills/index.json", label: "فهرس المهارات" },
  { path: "/api/agent/skills",              label: "المهارات" },
  { path: "/api/agent/health",              label: "حالة الواجهة" },
];

/* ═══ بناة البيانات — من المصادر الحيّة نفسها التي يراها الطالب ═══ */

export function universitiesPayload() {
  return UNIVERSITIES.filter((u) => u.id !== "other").map((u) => ({
    id: u.id,
    name: u.name,
    region: u.region ?? null,
    kind: u.kind ?? null,
    qsRank: u.qsRank ?? null,
    qsRankTo: u.qsRankTo ?? null,
    qsYear: u.qsYear ?? null,
    url: `${SITE.url}/universities/${u.id}`,
  }));
}

export function universityDetail(id: string) {
  const u = UNIVERSITIES.find((x) => x.id === id && x.id !== "other");
  if (!u) return null;
  return {
    ...universitiesPayload().find((x) => x.id === id)!,
    colleges: collegesAt(id).map((c) => ({ name: c.name, majors: c.majors.map((m) => m.name) })),
    majorsCount: majorsAt(id).length,
  };
}

export function examsPayload() {
  return EXAM_PROVIDER.map((e) => ({
    id: e.trackId,
    hasOfficialDates: e.hasOfficialDates,
    alwaysOpen: e.alwaysOpen ?? false,
    windows: e.windows.map((w) => ({
      id: w.id,
      label: w.yearLabel,
      registrationStart: w.registrationStart ?? null,
      registrationEnd: w.registrationEnd ?? null,
      examStart: w.examStart ?? null,
      examEnd: w.examEnd ?? null,
      /* غيابُ التواريخ مقصود: الهيئة لم تُعلنها بعد، ولا نخمّنها */
      announced: !!(w.registrationStart || w.examStart),
    })),
  }));
}

export function calendarPayload() {
  return {
    updatedFor: CALENDAR_UPDATED_FOR,
    years: SAUDI_ACADEMIC_YEARS.map((y) => ({
      id: y.id, gregorianLabel: y.gregorianLabel,
      schoolStart: y.schoolStart, schoolEnd: y.schoolEnd, source: y.source,
      periods: y.periods.map((p) => ({ kind: p.kind, label: p.label, start: p.start, end: p.end })),
    })),
  };
}

export interface FaqItem { id: string; question: string; answer: string; category: string; }

export function faqPayload(query?: string): FaqItem[] {
  const all = [
    ...(seed.faq_general as FaqItem[]),
    ...(seed.faq_qubool as FaqItem[]),
  ].map((f) => ({ id: f.id, question: f.question, answer: f.answer, category: f.category }));
  if (!query) return all;
  const q = query.trim();
  if (!q) return all;
  return all.filter((f) => f.question.includes(q) || f.answer.includes(q));
}
