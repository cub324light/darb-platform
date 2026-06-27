/* ═══════════════════════════════════════════════════════════════════════
   LLM Provider — طبقة توليد اللغة (قابلة للتبديل، مستقلة عن المزوّد)
   النموذج طبقة لغة فقط. تبديل المزوّد (Groq/Llama/GPT/Claude/Gemini…) لا
   يغيّر معمارية درب — فقط هذا الملف. الذكاء يبقى داخل المحرّكات.
   ═══════════════════════════════════════════════════════════════════════ */

export interface LLMRequest {
  prompt: string;
  mode?: string;
  subjects?: string[];
  context?: string;        // كتلة السياق الموحّدة من المحرّكات
  profile?: unknown;       // يبقى للأوضاع التخطيطية (جدول/مذاكرة)
  planning?: unknown;
  calendar?: unknown;
  images?: string[];
}

export interface LLMProvider {
  name: string;
  complete(req: LLMRequest): Promise<string>;
}

/* مزوّد Groq الافتراضي — يمرّ عبر مسار /api/chat (المفتاح على الخادم).
   تبديله بمزوّد آخر = استبدال هذا الصنف فقط. */
export class GroqProvider implements LLMProvider {
  name = "groq";
  async complete(req: LLMRequest): Promise<string> {
    /* أرفِق رمز هوية Firebase ليتحقّق الخادم من الطالب (نقطة نهاية مُصادَقة) */
    const token = await import("@/lib/cloud").then((m) => m.getIdToken()).catch(() => null);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch("/api/chat", { method: "POST", headers, body: JSON.stringify(req) });
    const data = await res.json().catch(() => null) as { text?: string; error?: string } | null;
    if (!res.ok || !data) throw new Error(data?.error ?? "تعذّر الاتصال بدويرب");
    return data.text ?? "";
  }
}
