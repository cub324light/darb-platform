"use client";
/* ─── تحليل ملف دراسي بدويرب (PDF / DOCX / TXT) ───
   يرفع الملف لـ Firebase Storage (أفضل جهد)، يستخرج النص في المتصفح،
   يرسله لـ /api/analyze (تلخيص + مهارات + تصنيف + خطة)، ويعرض النتيجة.
   الملفات الكبيرة تُقسَّم وتُحلَّل وتُجمَّع داخل الخادم. */
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ref, uploadBytes, getStorage } from "firebase/storage";
import { auth, app } from "@/lib/firebase";
import { extractFileText, detectKind } from "@/lib/fileText";
import { recordFileAnalyzed } from "@/lib/storage";

/* تهيئة Storage هنا فقط (هذا المكوّن محمّل ديناميكياً) — يُبعِد حزمة Storage
   عن حزمة كل صفحة، ولا تُحمَّل إلا عند فتح «حلّل ملف». */
const storage = getStorage(app);

type Stage = "input" | "loading" | "result";

interface Analysis {
  pages: number;
  summary: string;
  skills: string[];
  classification: string;
  plan: string;
  chunkCount: number;
}

const KIND_LABEL: Record<string, string> = { pdf: "PDF", docx: "Word", txt: "نص" };

export default function FileAnalyzer({
  subjects, color = "var(--accent)",
}: { subjects: string[]; color?: string }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("input");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [progress, setProgress] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = () => {
    setStage("input"); setFile(null); setResult(null); setProgress(""); setErr("");
    if (fileRef.current) fileRef.current.value = "";
  };
  const close = () => { setOpen(false); reset(); };

  const pick = (f: File | null) => {
    setErr("");
    if (!f) return;
    if (!detectKind(f)) { setErr("صيغة غير مدعومة — اختر PDF أو DOCX أو TXT"); return; }
    if (f.size > 15 * 1024 * 1024) { setErr("الملف كبير جداً (الحد ١٥ ميجابايت)"); return; }
    setFile(f);
  };

  const analyze = async () => {
    if (!file) { setErr("اختر ملفاً أولاً"); return; }
    setErr("");
    setStage("loading");
    try {
      /* ١) رفع لـ Firebase Storage — أفضل جهد، لا يُفشل التحليل إن تعذّر */
      setProgress("جارٍ رفع الملف...");
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          const safe = file.name.replace(/[^\w.\-أ-ي ]+/g, "_").slice(0, 80);
          await uploadBytes(ref(storage, `analyses/${uid}/${Date.now()}-${safe}`), file);
        } catch { /* قواعد Storage قد لا تكون منشورة — نكمل بالتحليل */ }
      }

      /* ٢) استخراج النص محلياً */
      setProgress("جارٍ استخراج النص...");
      const { text, pages } = await extractFileText(file);
      if (text.trim().length < 20) {
        setErr("ما قدرنا نقرأ نصاً كافياً — قد يكون الملف صوراً ممسوحة بلا نص");
        setStage("input");
        return;
      }

      /* ٣) التحليل عبر دويرب — رسائل متغيرة تعطي إحساساً بالتقدم */
      const ANALYSIS_STAGES = [
        "دويرب يقرأ المحتوى...",
        "دويرب يستخرج المعلومات...",
        "دويرب يحلّل الأجزاء...",
        "دويرب يجمع النتائج...",
        "دويرب يُنهي التحليل...",
      ];
      let stageIdx = 0;
      setProgress(ANALYSIS_STAGES[0]);
      progressTimerRef.current = setInterval(() => {
        stageIdx = Math.min(stageIdx + 1, ANALYSIS_STAGES.length - 1);
        setProgress(ANALYSIS_STAGES[stageIdx]);
      }, 3500);

      const clearTimer = () => {
        if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
      };

      let data: Partial<Analysis> & { error?: string };
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, pages, fileName: file.name, subjects }),
        });
        clearTimer();
        data = (await res.json()) as Partial<Analysis> & { error?: string };
        if (!res.ok || !data.summary) {
          setErr(data.error ?? "تعذّر التحليل — حاول مرة ثانية");
          setStage("input");
          return;
        }
      } catch {
        clearTimer();
        throw new Error("fetch_failed");
      }

      setProgress("اكتمل ✓");
      recordFileAnalyzed();
      setResult({
        pages: data.pages ?? pages,
        summary: data.summary ?? "",
        skills: data.skills ?? [],
        classification: data.classification ?? "",
        plan: data.plan ?? "",
        chunkCount: data.chunkCount ?? 1,
      });
      setStage("result");
    } catch {
      if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
      setErr("صار خطأ أثناء المعالجة — تأكد من الملف وحاول مرة ثانية");
      setStage("input");
    }
  };

  const kind = file ? detectKind(file) : null;

  const overlay = (
    <div className="fixed inset-0 z-[9990] flex flex-col overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="sticky top-0 z-10 px-5 pt-safe pt-4 pb-3 flex items-center gap-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <button onClick={close} className="dome-chip text-[17px] font-bold flex-shrink-0" style={{ color: "var(--text)" }}>← رجوع</button>
        <p className="title-lg flex-1 text-right" style={{ color: "var(--text)" }}>تحليل ملف</p>
      </div>

      <div className="px-5 py-5 flex flex-col gap-5 pb-28 max-w-lg w-full mx-auto">
        {stage === "loading" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: color }} />
            <p className="text-[15px] font-bold" style={{ color: "var(--text-muted)" }}>{progress || "جارٍ المعالجة..."}</p>
          </div>
        )}

        {stage === "input" && (
          <>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              ارفع ملف PDF أو Word أو نص، ودويرب يستخرج النص ويعطيك ملخصاً والمهارات وخطة مذاكرة. الملفات الكبيرة تُقسَّم وتُحلَّل تلقائياً.
            </p>

            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl py-5 font-bold text-[16px] transition active:scale-[0.98]"
              style={{ background: "var(--surface)", border: `2px dashed ${color}`, color }}>
              📄 اختر ملف PDF أو Word أو نص
            </button>

            {file && (
              <div className="flex items-center justify-between rounded-xl px-3.5 py-3 text-[14px]"
                style={{ background: "var(--surface2)", color: "var(--text)" }}>
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                  style={{ background: color + "22", color }}>{kind ? KIND_LABEL[kind] : ""}</span>
                <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-[var(--text-muted)] px-2 flex-shrink-0">✕</button>
              </div>
            )}

            {err && (
              <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(239,68,68,0.12)", border: "2px solid #EF4444" }}>
                <p className="text-[14px] text-center font-bold" style={{ color: "#EF4444" }}>{err}</p>
              </div>
            )}

            <button onClick={analyze} disabled={!file}
              className="w-full rounded-2xl py-4 font-black text-[17px] transition active:scale-[0.98]"
              style={{ background: color, color: "#fff", opacity: file ? 1 : 0.4 }}>
              حلّل الملف 🤖
            </button>
          </>
        )}

        {stage === "result" && result && (
          <>
            {/* بطاقات سريعة: الصفحات + المهارات + الأجزاء */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { n: result.pages, l: "صفحة" },
                { n: result.skills.length, l: "مهارة" },
                { n: result.chunkCount, l: "جزء حُلّل" },
              ].map((c) => (
                <div key={c.l} className="rounded-2xl py-3.5 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p className="text-[22px] font-black" style={{ color }}>{c.n}</p>
                  <p className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>{c.l}</p>
                </div>
              ))}
            </div>

            {result.classification && (
              <div className="rounded-2xl px-4 py-3" style={{ background: color + "12", border: `1px solid ${color}33` }}>
                <p className="text-[12px] font-bold mb-1" style={{ color }}>التصنيف</p>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--text)" }}>{result.classification}</p>
              </div>
            )}

            <div>
              <p className="title-md mb-2" style={{ color: "var(--text)" }}>الملخص</p>
              <div className="rounded-2xl px-4 py-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{result.summary}</p>
              </div>
            </div>

            {result.skills.length > 0 && (
              <div>
                <p className="title-md mb-2" style={{ color: "var(--text)" }}>المهارات المستخرجة</p>
                <div className="flex flex-wrap gap-2">
                  {result.skills.map((s, i) => (
                    <span key={i} className="rounded-xl px-3 py-1.5 text-[13px] font-bold"
                      style={{ background: color + "16", border: `1px solid ${color}33`, color: "var(--text)" }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {result.plan && (
              <div>
                <p className="title-md mb-2" style={{ color: "var(--text)" }}>الخطة المقترحة</p>
                <div className="rounded-2xl px-4 py-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{result.plan}</p>
                </div>
              </div>
            )}

            {/* الخطوة التالية: درّب نفسك على ما حلّلته */}
            <button
              onClick={() => { close(); window.dispatchEvent(new CustomEvent("darb:openDuirb", { detail: { tab: "quiz" } })); }}
              className="w-full rounded-2xl py-3.5 font-black text-[15px] transition active:scale-[0.98] flex items-center justify-center gap-1.5"
              style={{ background: color, color: "#fff" }}>
              ❓ درّب نفسك — ولّد أسئلة على هذا
            </button>

            <button onClick={reset}
              className="w-full rounded-2xl py-4 font-black text-[16px] transition active:scale-[0.98]"
              style={{ background: "var(--surface)", border: `1.5px solid ${color}`, color }}>
              حلّل ملفاً آخر
            </button>
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
        📄 حلّل ملفاً مع دويرب 🤖
      </button>
      {open && createPortal(overlay, document.body)}
    </>
  );
}
