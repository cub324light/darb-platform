"use client";
/* ─── استخراج مواضيع المادة من صورة فهرس/منهج أو ملف PDF أو نص مُلصق ───
   يرسل الصور لموديل الرؤية على Groq (mode:"topics")، يحلّل الرد لمواضيع،
   ثم يعرض شاشة مراجعة بمربعات اختيار قبل الإضافة. */
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { askDuwairb, type DuwairbRequest } from "@/lib/orchestrator";

type Stage = "input" | "loading" | "review";
interface Item { id: string; title: string; checked: boolean; }

/* حمّل صورة عبر عنصر <img> (يدعم HEIC/أي صيغة يفك المتصفح ترميزها) */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/* صغّر الصورة وحوّلها data-URL لتفادي رفض الخادم بسبب الحجم */
async function imageToDataUrl(file: File, maxDim = 1600): Promise<string> {
  const img = await loadImage(file);
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (Math.max(w, h) > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/* صفحات PDF (أول maxPages) → صور JPEG */
async function pdfToImages(file: File, maxPages = 3): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const out: string[] = [];
  const n = Math.min(maxPages, pdf.numPages);
  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, canvasContext: ctx, viewport } as Parameters<typeof page.render>[0]).promise;
    out.push(canvas.toDataURL("image/jpeg", 0.8));
  }
  return out;
}

/* حلّل رد الموديل لمواضيع: سطر لكل موضوع، نظّف الترقيم والرموز */
function parseTopics(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split("\n")) {
    const cleaned = line.replace(/^[\s\-•*–—.()\d٠-٩]+/, "").trim();
    if (cleaned.length < 2 || cleaned.length > 80) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
    if (out.length >= 40) break;
  }
  return out;
}

export default function TopicExtractor({
  subject, color, onAdd,
}: { subject: string; color: string; onAdd: (titles: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("input");
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage("input"); setFiles([]); setText(""); setItems([]); setErr("");
    if (fileRef.current) fileRef.current.value = "";
  };
  const close = () => { setOpen(false); reset(); };

  const extract = async () => {
    setErr("");
    const hasFiles = files.length > 0;
    const hasText = text.trim().length > 0;
    if (!hasFiles && !hasText) {
      setErr("اختر صورة أو ملف، أو الصق نص الفهرس");
      return;
    }
    setStage("loading");
    try {
      let req: DuwairbRequest;
      if (hasFiles) {
        const images: string[] = [];
        for (const f of files) {
          if (f.type === "application/pdf") {
            images.push(...(await pdfToImages(f)));
          } else {
            images.push(await imageToDataUrl(f));
          }
          if (images.length >= 4) break;
        }
        if (images.length === 0) throw new Error("ما قدرنا نقرأ الملف");
        req = {
          prompt: `استخرج أهم مواضيع مادة ${subject} من الصور المرفقة.`,
          subjects: [subject],
          mode: "topics",
          topic: `استخراج مواضيع ${subject}`,
          images: images.slice(0, 4),
        };
      } else {
        req = { prompt: text.trim(), subjects: [subject], mode: "topics", topic: `استخراج مواضيع ${subject}` };
      }

      /* عبر طبقة التنسيق (مثل بقية تفاعلات دويرب) */
      let resText = "";
      try {
        resText = (await askDuwairb(req)).text;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "تعذّر الاستخراج — حاول مرة ثانية");
        setStage("input");
        return;
      }
      if (!resText) {
        setErr("تعذّر الاستخراج — حاول مرة ثانية");
        setStage("input");
        return;
      }
      const topics = parseTopics(resText);
      if (topics.length === 0) {
        setErr("ما لقينا مواضيع واضحة — جرّب صورة أوضح للفهرس");
        setStage("input");
        return;
      }
      setItems(topics.map((t, i) => ({ id: `${Date.now()}-${i}`, title: t, checked: true })));
      setStage("review");
    } catch {
      setErr("صار خطأ أثناء المعالجة — تأكد من الملف وحاول مرة ثانية");
      setStage("input");
    }
  };

  const selectedCount = items.filter((i) => i.checked).length;
  const confirmAdd = () => {
    const titles = items.filter((i) => i.checked && i.title.trim()).map((i) => i.title.trim());
    if (titles.length) onAdd(titles);
    close();
  };

  const overlay = (
    <div className="fixed inset-0 z-[9990] flex flex-col overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="sticky top-0 z-10 px-5 pt-safe pt-4 pb-3 flex items-center gap-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <button onClick={close} className="dome-chip text-[17px] font-bold flex-shrink-0" style={{ color: "var(--text)" }}>← رجوع</button>
        <p className="title-lg flex-1 text-right" style={{ color: "var(--text)" }}>استخراج مواضيع {subject}</p>
      </div>

      <div className="px-5 py-5 flex flex-col gap-5 pb-28 max-w-lg w-full mx-auto">
        {stage === "loading" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: color }} />
            <p className="text-[15px] font-bold" style={{ color: "var(--text-muted)" }}>دويرب يقرأ المادة ويستخرج المواضيع...</p>
          </div>
        )}

        {stage === "input" && (
          <>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              صوّر فهرس الكتاب أو ارفع ملف PDF، ودويرب يستخرج أهم المواضيع. أو الصق نص الفهرس يدوياً.
            </p>

            {/* رفع ملف/صورة */}
            <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 4))} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl py-5 font-bold text-[16px] transition active:scale-[0.98]"
              style={{ background: "var(--surface)", border: `2px dashed ${color}`, color }}>
              📷 اختر صورة أو ملف PDF
            </button>
            {files.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2 text-[13px]"
                    style={{ background: "var(--surface2)", color: "var(--text)" }}>
                    <span className="truncate">{f.name}</span>
                    <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                      aria-label="حذف الملف" className="text-[var(--text-muted)] px-2">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>أو</span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            {/* لصق نص */}
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              placeholder="الصق هنا فهرس المنهج أو قائمة المواضيع..."
              rows={5}
              className="w-full rounded-2xl px-4 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none resize-y"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }} />

            {err && (
              <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(239,68,68,0.12)", border: "2px solid #EF4444" }}>
                <p className="text-[14px] text-center font-bold" style={{ color: "#EF4444" }}>{err}</p>
              </div>
            )}

            <button onClick={extract}
              className="w-full rounded-2xl py-4 font-black text-[17px] transition active:scale-[0.98]"
              style={{ background: color, color: "#fff" }}>
              استخرج المواضيع 🤖
            </button>
          </>
        )}

        {stage === "review" && (
          <>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              راجع المواضيع، احذف الغلط وعدّل اللي تبي، ثم أضف المحدّد. ({selectedCount} مختار)
            </p>
            <div className="flex flex-col gap-2">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5"
                  style={{ background: it.checked ? color + "10" : "var(--surface)", border: `1.5px solid ${it.checked ? color + "40" : "var(--border)"}` }}>
                  <button onClick={() => setItems((p) => p.map((x) => x.id === it.id ? { ...x, checked: !x.checked } : x))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={it.checked ? { background: color } : { border: "2px solid var(--border)" }}>
                    {it.checked && <span className="text-white text-sm font-black">✓</span>}
                  </button>
                  <input value={it.title}
                    onChange={(e) => setItems((p) => p.map((x) => x.id === it.id ? { ...x, title: e.target.value } : x))}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[15px] font-semibold"
                    style={{ color: "var(--text)" }} />
                  <button onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}
                    className="text-[var(--text-muted)] text-lg px-1 flex-shrink-0" aria-label="حذف">✕</button>
                </div>
              ))}
            </div>

            <div className="flex gap-2.5">
              <button onClick={() => { reset(); }}
                className="rounded-2xl py-4 px-5 font-bold text-[15px]"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
                إعادة
              </button>
              <button onClick={confirmAdd} disabled={selectedCount === 0}
                className="flex-1 rounded-2xl py-4 font-black text-[17px] transition active:scale-[0.98]"
                style={{ background: color, color: "#fff", opacity: selectedCount === 0 ? 0.4 : 1 }}>
                أضف المحدّد ({selectedCount}) ←
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full rounded-2xl py-3.5 font-bold text-[15px] transition active:scale-[0.98] flex items-center justify-center gap-2"
        style={{ background: "var(--surface)", border: `1.5px solid ${color}`, color }}>
        📷 استخرج المواضيع من صورة أو ملف 🤖
      </button>
      {open && createPortal(overlay, document.body)}
    </>
  );
}
