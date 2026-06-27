/* ─── طبقة توليد اللغة (خادمية) — مقعد المزوّد ───
   النموذج طبقة لغة فقط. تبديل المزوّد (Groq/GPT/Claude/Gemini…) يقتصر على
   هذا الملف؛ لا يلمس المسار ولا المحرّكات. لا تستوردها من العميل.
   ═══════════════════════════════════════════════════════════════════════ */

export type LLMUserContent =
  | string
  | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];

export interface ChatResult { text: string; model: string; promptTokens: number; completionTokens: number; }

/** خطأ موحّد يحمل رمز HTTP المناسب — يُحوّله المسار لاستجابة عربية. */
export class LLMError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "LLMError"; }
}

/* اختيار المزوّد/النموذج في مكان واحد */
const PROVIDER = process.env.LLM_PROVIDER ?? "groq";
const TEXT_MODEL = process.env.LLM_TEXT_MODEL ?? "llama-3.3-70b-versatile";
const VISION_MODEL = process.env.LLM_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

/** يولّد رداً من النموذج المختار. لإضافة مزوّد جديد: أضِف فرعاً هنا فقط. */
export async function chatComplete(opts: {
  system: string;
  userContent: LLMUserContent;
  useVision: boolean;
  maxTokens: number;
  temperature: number;
}): Promise<ChatResult> {
  if (PROVIDER !== "groq") {
    throw new LLMError(500, `مزوّد غير مدعوم: ${PROVIDER}`);
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new LLMError(500, "GROQ_API_KEY غير مضبوط — أضفه في Environment Variables ثم أعد الـ Deploy");
  }
  const model = opts.useVision ? VISION_MODEL : TEXT_MODEL;

  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.userContent },
        ],
      }),
    });
  } catch {
    throw new LLMError(500, "خطأ في الاتصال");
  }

  if (response.status === 429) throw new LLMError(429, "الخادم مشغول، حاول بعد ثوانٍ");
  if (!response.ok) {
    let detail = "";
    if (opts.useVision) {
      try {
        const errJson = (await response.json()) as { error?: { message?: string } };
        detail = errJson?.error?.message ? ` — ${errJson.error.message}` : "";
      } catch { /* تجاهل */ }
    }
    throw new LLMError(502, `تعذّر تحليل الصورة${detail || "، حاول بصورة أوضح"}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new LLMError(502, "لم يرجع رد، حاول مرة ثانية");

  return {
    text,
    model,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  };
}
