/* ─── صفحة الدرس للطالب (/lesson/[id]) ───
   أول تجربة تعليمية حقيقية في درب مقروءةٌ من نموذج العالم (KB): الدرس وكتلُه،
   والمفهوم الذي يشرحه، وأسئلته ومصادره ومفاهيمه المرتبطة — كلّها من الرسم عبر
   العلاقات. Server Component يجمع البيانات، وLessonView يعرضها. تُبنى ثابتة. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import LessonView, { type LessonViewData } from "@/components/lesson/LessonView";
import { KB } from "@/lib/kb/entities";

/* كل الدروس تُبنى ثابتة */
export function generateStaticParams() {
  return KB.all("lesson").map((l) => ({ id: l.id.replace(/^lesson:/, "") }));
}
export const dynamicParams = false;

/* يجمع بيانات العرض من الرسم (العلاقات هي المصدر) */
function buildData(lessonId: string): LessonViewData | null {
  const e = KB.get(lessonId);
  if (!e || e.kind !== "lesson") return null;

  const conceptNode = KB.neighbors(lessonId, { type: "teaches", dir: "out", kind: "concept" })[0];
  const concept = conceptNode && conceptNode.kind === "concept"
    ? { id: conceptNode.id, name: conceptNode.name, definition: conceptNode.body?.definition, whyImportant: conceptNode.body?.whyImportant }
    : undefined;

  const questions = KB.neighbors(lessonId, { type: "belongs_to", dir: "in", kind: "question" })
    .filter((q) => q.kind === "question")
    .map((q) => ({ id: q.id, prompt: q.summary, answer: q.kind === "question" ? q.answer : undefined, difficulty: q.kind === "question" ? q.difficulty : undefined }));

  const resources = KB.neighbors(lessonId, { type: "supported_by", dir: "out", kind: "resource" })
    .map((r) => ({ id: r.id, name: r.name, summary: r.summary, format: r.kind === "resource" ? r.format : undefined }));

  const related = KB.neighbors(lessonId, { type: "related_to", kind: "concept" })
    .map((c) => ({ id: c.id, name: c.name }));

  return {
    id: e.id, name: e.name, summary: e.summary,
    durationMin: e.durationMin, level: e.level, blocks: e.blocks ?? [],
    concept, questions, resources, related,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = buildData(`lesson:${id}`);
  if (!data) return { title: "الدرس غير موجود | درب" };
  const title = `${data.name} | درب`;
  return { title, description: data.summary, robots: { index: false, follow: false } };
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = buildData(`lesson:${id}`);
  if (!data) notFound();

  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3"><BackButton /></div>
      </Dome>
      <div className="h-4" />
      <div className="page-content flex flex-col gap-3">
        <LessonView data={data} />
      </div>
      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
