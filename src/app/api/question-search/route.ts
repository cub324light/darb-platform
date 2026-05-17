import { NextRequest, NextResponse } from "next/server";
import Fuse from "fuse.js";
import type { SearchResult } from "@/lib/types";
import questionsData from "@/data/questions.json";

const fuse = new Fuse(questionsData as string[], {
  threshold: 0.4,
  minMatchCharLength: 3,
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

  const { query } = body as { query?: string };
  if (!query || typeof query !== "string" || query.trim().length === 0)
    return NextResponse.json({ error: "وصف السؤال فارغ" }, { status: 400 });
  if (query.length > 500)
    return NextResponse.json({ error: "النص طويل جداً (500 حرف كحد أقصى)" }, { status: 400 });

  if ((questionsData as string[]).length === 0) {
    return NextResponse.json(
      { error: "الفهرس فارغ — شغّل: node scripts/build-question-index.mjs" },
      { status: 503 }
    );
  }

  const results = fuse.search(query.trim(), { limit: 1 });

  if (!results.length) {
    const notFound: SearchResult = {
      found: false,
      question: "",
      answer: "",
      subject: "فيزياء",
      category: "غير مصنف",
      explanation: "لم أجد هذا السؤال في الكتاب",
    };
    return NextResponse.json(notFound);
  }

  const found: SearchResult = {
    found: true,
    question: results[0].item,
    answer: "",
    subject: "فيزياء",
    category: "غير مصنف",
    explanation: "تم العثور على هذا المقطع في الكتاب",
  };
  return NextResponse.json(found);
}
