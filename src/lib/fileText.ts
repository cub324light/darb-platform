"use client";
/* ─── استخراج النص من ملف (PDF / DOCX / TXT) في المتصفح ───
   PDF عبر pdfjs-dist (نفس إعداد TopicExtractor)، DOCX عبر mammoth،
   TXT مباشرة. نُعيد النص وعدد الصفحات (تقديري للـ DOCX/TXT). */

export type FileKind = "pdf" | "docx" | "txt";

export interface ExtractedFile {
  text: string;
  pages: number;
  kind: FileKind;
}

/* حدّد نوع الملف من الامتداد أو الـ MIME */
export function detectKind(file: File): FileKind | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) return "docx";
  if (file.type.startsWith("text/") || name.endsWith(".txt")) return "txt";
  return null;
}

/* PDF → نص كامل + عدد الصفحات الفعلي */
async function extractPdf(file: File): Promise<ExtractedFile> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages = pdf.numPages;
  const parts: string[] = [];
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (line) parts.push(line);
  }
  return { text: parts.join("\n\n"), pages, kind: "pdf" };
}

/* DOCX → نص خام، وتقدير عدد الصفحات (~٤٠٠ كلمة/صفحة) */
async function extractDocx(file: File): Promise<ExtractedFile> {
  const mammoth = await import("mammoth/mammoth.browser");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = (result.value ?? "").replace(/\n{3,}/g, "\n\n").trim();
  const words = text ? text.split(/\s+/).length : 0;
  const pages = Math.max(1, Math.ceil(words / 400));
  return { text, pages, kind: "docx" };
}

/* TXT → نص مباشر، وتقدير الصفحات (~٣٠٠٠ حرف/صفحة) */
async function extractTxt(file: File): Promise<ExtractedFile> {
  const raw = await file.text();
  const text = raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const pages = Math.max(1, Math.ceil(text.length / 3000));
  return { text, pages, kind: "txt" };
}

export async function extractFileText(file: File): Promise<ExtractedFile> {
  const kind = detectKind(file);
  if (!kind) throw new Error("نوع غير مدعوم");
  if (kind === "pdf") return extractPdf(file);
  if (kind === "docx") return extractDocx(file);
  return extractTxt(file);
}
