import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { SubjectId } from "@/lib/types";

export interface SearchResult {
  found: boolean;
  question: string;
  answer: string;
  subject: SubjectId;
  category: string;
  explanation: string;
}

const SYSTEM_PROMPT = `أنت مساعد متخصص في البحث في كتاب أسئلة التحصيلي السعودي. عندما يصف الطالب سؤالاً أو جزءاً منه، ابحث عنه في الكتاب المرفق وأرجع البيانات بصيغة JSON فقط.

أرجع JSON فقط بهذا الشكل بالضبط، بدون أي نص إضافي:
{
  "found": true,
  "question": "نص السؤال كاملاً من الكتاب",
  "answer": "الإجابة الصحيحة",
  "subject": "فيزياء",
  "category": "ما فهمت المفهوم",
  "explanation": "شرح مختصر يوضح لماذا الإجابة صحيحة"
}

القيم المتاحة لـ subject: فيزياء، رياضيات، كيمياء، أحياء
القيم المتاحة لـ category: استعجلت، ما فهمت المفهوم، خطأ حسابي، نسيت القانون، أخطأت في القراءة، غير مصنف

إذا لم تجد السؤال في الكتاب:
{ "found": false, "question": "", "answer": "", "subject": "فيزياء", "category": "غير مصنف", "explanation": "لم أجد هذا السؤال في الكتاب" }`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

  const { query } = body as { query?: string };
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "وصف السؤال فارغ" }, { status: 400 });
  }
  if (query.length > 500) {
    return NextResponse.json({ error: "النص طويل جداً (500 حرف كحد أقصى)" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const fileId = process.env.ANTHROPIC_FILE_ID;

  if (!apiKey) return NextResponse.json({ error: "خطأ في إعدادات الخادم" }, { status: 500 });
  if (!fileId) return NextResponse.json({ error: "الكتاب غير مُعدّ على الخادم بعد" }, { status: 500 });

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.beta.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "file", file_id: fileId },
              } as never,
              {
                type: "text",
                text: `ابحث عن هذا السؤال في الكتاب: ${query.trim()}`,
              },
            ],
          },
        ],
      },
      { headers: { "anthropic-beta": "files-api-2025-04-14" } },
    );

    const text =
      response.content.find((b) => b.type === "text")?.text ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "تعذّر تحليل رد الذكاء الاصطناعي" }, { status: 502 });
    }

    const result = JSON.parse(jsonMatch[0]) as SearchResult;
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "الخادم مشغول، حاول بعد ثوانٍ" }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: "خطأ في الاتصال بالذكاء الاصطناعي" }, { status: 502 });
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
