"use client";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  subject: string;
  color: string;
  onAdd: (titles: string[]) => void;
}

type Stage = "input" | "loading" | "review";

async function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("فشل تحميل الصورة")); };
    img.src = url;
  });
}

async function pdfToImages(file: File): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  /* الـ worker مخدوم من أصل التطبيق نفسه (public/) — أوثق من حزم الـ bundler */
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages = Math.min(pdf.numPages, 3);
  const dataUrls: string[] = [];
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    canvas.width = vp.width; canvas.height = vp.height;
    const ctx = canvas.getContext("2d")!;
    /* خلفية بيضاء — PDF شفاف يطلع أسود مع JPEG */
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
    /* JPEG أصغر بكثير من PNG ويكفي لقراءة النص — يتفادى حد حجم الصورة */
    dataUrls.push(canvas.toDataURL("image/jpeg", 0.85));
  }
  return dataUrls;
}

function parseTopics(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/\n/)
        .map((l) => l.replace(/^[\d٠-٩]+[.)،\-\s]+/, "").replace(/^[-•*▪▸◦]\s*/, "").trim())
        .filter((l) => l.length >= 2 && l.length <= 80),
    ),
  ];
}

export default function TopicExtractor({ subject, color, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("input");
  const [pastedText, setPastedText] = useState("");
  const [topics, setTopics] = useState<{ title: string; checked: boolean }[]>([]);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const close = () => { setOpen(false); setStage("input"); setPastedText(""); setTopics([]); setErr(""); };

  const extract = async (images: string[], text: string) => {
    setStage("loading");
    setErr("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "topics",
          subjects: [subject],
          prompt: text || `استخرج مواضيع مادة ${subject}`,
          images: images.length ? images : undefined,
        }),
      });
      const data = await res.json() as { text?: string; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error ?? "لم يرجع رد");
      const parsed = parseTopics(data.text);
      if (!parsed.length) throw new Error("لم يُستخرج أي موضوع — جرّب صورة أوضح");
      setTopics(parsed.map((t) => ({ title: t, checked: true })));
      setStage("review");
    } catch (e) {
      setErr((e as Error).message || "حدث خطأ");
      setStage("input");
    }
  };

  const handleFile = async (file: File) => {
    setErr("");
    setStage("loading"); // أظهر التحميل أثناء معالجة الملف (قد يأخذ ثوانٍ لـ PDF)
    try {
      let images: string[];
      if (file.type === "application/pdf") {
        images = await pdfToImages(file);
      } else {
        images = [await imageToDataUrl(file)];
      }
      await extract(images, "");
    } catch (e) {
      setErr((e as Error).message || "فشل معالجة الملف");
      setStage("input");
    }
  };

  const confirm = () => {
    const selected = topics.filter((t) => t.checked).map((t) => t.title);
    if (selected.length) onAdd(selected);
    close();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl py-3 font-bold text-[15px] transition active:scale-[0.98]"
        style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: `1.5px solid color-mix(in srgb, ${color} 35%, transparent)`, color }}>
        استخرج المواضيع بالذكاء الاصطناعي (صورة / PDF)
      </button>
    );
  }

  const overlay = (
    <div className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="relative m-auto w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl flex flex-col gap-4 p-6"
        style={{ background: "var(--bg)", border: "1.5px solid var(--border)" }}>

        <div className="flex items-center justify-between">
          <p className="font-black text-lg" style={{ color: "var(--text)" }}>استخراج مواضيع — {subject}</p>
          <button onClick={close} className="text-2xl font-bold px-2" style={{ color: "var(--text-muted)" }}>×</button>
        </div>

        {stage === "input" && (
          <>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl py-5 font-bold text-[16px] flex flex-col items-center gap-2 transition active:scale-[0.98]"
              style={{ background: "var(--surface)", border: `2px dashed ${color}60` }}>
              <span className="text-3xl">📷</span>
              <span style={{ color }}>ارفع صورة فهرس أو ملف PDF</span>
              <span className="text-[13px] font-normal" style={{ color: "var(--text-muted)" }}>صورة أو PDF — أول ٣ صفحات</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>أو الصق النص</span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)}
              placeholder="الصق قائمة المحتويات أو الفهرس هنا..."
              rows={5}
              className="w-full rounded-2xl px-4 py-3 text-[15px] outline-none resize-none"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }} />

            {err && <p className="text-[13px] text-center font-semibold" style={{ color: "var(--danger)" }}>{err}</p>}

            {pastedText.trim() && (
              <button onClick={() => extract([], pastedText.trim())}
                className="btn-primary"
                style={{ background: color }}>
                استخرج المواضيع ←
              </button>
            )}
          </>
        )}

        {stage === "loading" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${color} transparent transparent transparent` }} />
            <p className="text-[15px] font-semibold" style={{ color: "var(--text-muted)" }}>يستخرج المواضيع...</p>
          </div>
        )}

        {stage === "review" && (
          <>
            <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
              اختر المواضيع التي تريد إضافتها ({topics.filter((t) => t.checked).length} محدد)
            </p>
            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
              {topics.map((t, i) => (
                <label key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer transition"
                  style={{ background: t.checked ? `color-mix(in srgb, ${color} 10%, transparent)` : "var(--surface)", border: `1.5px solid ${t.checked ? color + "40" : "var(--border)"}` }}>
                  <input type="checkbox" checked={t.checked}
                    onChange={(e) => setTopics((prev) => prev.map((x, j) => j === i ? { ...x, checked: e.target.checked } : x))}
                    className="w-4 h-4 flex-shrink-0" />
                  <input
                    value={t.title}
                    onChange={(e) => setTopics((prev) => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[14px] font-semibold"
                    style={{ color: "var(--text)" }} />
                  <button onClick={() => setTopics((prev) => prev.filter((_, j) => j !== i))}
                    className="text-[var(--text-muted)] text-sm px-1" tabIndex={-1}>✕</button>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStage("input")}
                className="flex-1 rounded-2xl py-3 font-bold text-[15px]"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
                رجوع
              </button>
              <button onClick={confirm} disabled={!topics.some((t) => t.checked)}
                className="flex-[2] rounded-2xl py-3 font-bold text-[15px] text-white"
                style={{ background: color, opacity: topics.some((t) => t.checked) ? 1 : 0.5 }}>
                أضف المحدد ({topics.filter((t) => t.checked).length})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
