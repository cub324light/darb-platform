"use client";
/* ═══════════ WebMCP — أدوات درب داخل المتصفّح ═══════════
   يعرّف `navigator.modelContext.provideContext()` أدواتٍ يستطيع وكيلُ المتصفّح
   استدعاءها نيابةً عن الطالب وهو في صفحته.

   ▸ الأداتان الفاعلتان (جلسة تركيز · خطة اليوم) **تنقلان الطالبَ في متصفّحه هو**
     ولا تُخرجان شيئاً؛ والثلاثُ الباقية تقرأ بياناتٍ عامّة. فلا تُسرَّب خطّةُ
     طالبٍ ولا أخطاؤه ولا تقدّمه إلى أي وكيل — لا يوجد طريقٌ يفعل ذلك.
   ▸ الكلفة عند التحميل: فحصُ وجود الواجهة ثم تسجيلُ تعريفاتٍ في الذاكرة.
     لا طلبَ شبكيّاً إلا حين يستدعي الوكيلُ أداةً فعلاً. */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { focusHandoffQuery } from "@/lib/roadmap/handoff";

/* واجهةُ WebMCP لم تدخل أنواعَ TypeScript بعد — نصفها بالقدر الذي نستعمله. */
interface McpToolResult { content: { type: "text"; text: string }[] }
interface McpTool {
  name: string;
  description: string;
  inputSchema: { type: "object"; properties?: Record<string, unknown>; required?: string[] };
  execute: (args: Record<string, unknown>) => Promise<McpToolResult>;
}
interface ModelContext { provideContext: (ctx: { tools: McpTool[] }) => void | Promise<void> }

const text = (t: string): McpToolResult => ({ content: [{ type: "text", text: t }] });

const json = async (url: string) => {
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`تعذّر الوصول إلى ${url}`);
  return r.json();
};

export default function WebMcp() {
  const router = useRouter();

  useEffect(() => {
    const mc = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!mc?.provideContext) return;   // المتصفّح لا يدعمها — لا شيء يُفعل

    const tools: McpTool[] = [
      {
        name: "start_study_session",
        description:
          "يفتح جلسة تركيز (مؤقّت مذاكرة) في درب ويبدأ عدّها. تُستعمل حين يقول الطالب إنه يريد أن يذاكر الآن.",
        inputSchema: {
          type: "object",
          properties: {
            minutes: { type: "number", description: "مدّة الجلسة بالدقائق (الافتراضي خمسون)" },
            subject: { type: "string", description: "المادة أو المهمّة التي سيذاكرها" },
          },
        },
        /* ▓ عقدُ التسليم نفسُه الذي تستعمله «خطتي» و«مساري» — كنتُ أمرّر
           `?minutes=` وأوربت لا يقرأها أصلاً، فيضيع ما طلبه الطالب. */
        execute: async (a) => {
          const subject = typeof a.subject === "string" ? a.subject : undefined;
          const taskMins = typeof a.minutes === "number" ? Math.round(a.minutes) : undefined;
          router.push(`/orbit?${focusHandoffQuery({ from: "plan", subject, taskMins, taskLabel: subject })}`);
          return text("فُتحت جلسة التركيز في درب وبدأ المؤقّت.");
        },
      },
      {
        name: "generate_study_plan",
        description:
          "يفتح «خطتي» في درب لبناء خطة مذاكرةٍ حول مشاغل الطالب ووقته المتاح، محسوبةً على التقويم الدراسي الرسمي.",
        inputSchema: {
          type: "object",
          properties: {
            exam: { type: "string", description: "الاختبار المستهدف: قدرات أو تحصيلي أو ستيب" },
          },
        },
        execute: async (a) => {
          const exam = typeof a.exam === "string" && a.exam ? `?exam=${encodeURIComponent(a.exam)}` : "";
          router.push(`/plan${exam}`);
          return text("فُتحت «خطتي» في درب. اختر أيامك وساعاتك المتاحة ليُبنى الجدول.");
        },
      },
      {
        name: "search_universities",
        description:
          "يبحث في دليل الجامعات السعودية: الاسم والمنطقة والنوع وترتيب QS، ومع معرّفِ جامعةٍ تُعاد كلياتها وتخصّصاتها الدقيقة.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "معرّف الجامعة (مثل «kfupm») لتفاصيلها" },
            region: { type: "string", description: "تصفية بالمنطقة الإدارية" },
          },
        },
        execute: async (a) => {
          const q = new URLSearchParams();
          if (typeof a.id === "string" && a.id) q.set("id", a.id);
          if (typeof a.region === "string" && a.region) q.set("region", a.region);
          return text(JSON.stringify(await json(`/api/agent/universities?${q}`), null, 2));
        },
      },
      {
        name: "search_admission_deadlines",
        description:
          "مواعيدُ الاختبارات الوطنية ونوافذ تسجيلها الرسمية. الحقلُ الفارغ يعني أن الجهة لم تُعلن الموعد بعد — لا يُخمَّن.",
        inputSchema: {
          type: "object",
          properties: { exam: { type: "string", description: "تصفية باسم الاختبار" } },
        },
        execute: async (a) => {
          const all = await json("/api/agent/exams");
          const exam = typeof a.exam === "string" ? a.exam.trim() : "";
          const exams = exam
            ? (all.exams as { id: string }[]).filter((e) => e.id.includes(exam))
            : all.exams;
          return text(JSON.stringify({ note: all.note, exams }, null, 2));
        },
      },
      {
        name: "search_faq",
        description: "يبحث في أسئلة القبول الجامعي ومنصّة قبول الشائعة ويعيد السؤال وجوابه.",
        inputSchema: {
          type: "object",
          properties: { q: { type: "string", description: "نصّ البحث" } },
          required: ["q"],
        },
        execute: async (a) => {
          const q = typeof a.q === "string" ? a.q : "";
          return text(JSON.stringify(await json(`/api/agent/faq?q=${encodeURIComponent(q)}`), null, 2));
        },
      },
    ];

    try { void mc.provideContext({ tools }); } catch { /* لا نُسقط الصفحة لأجل واجهةٍ تجريبية */ }
  }, [router]);

  return null;
}
