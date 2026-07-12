"use client";
/* ─── مخطّط التسريبات: ارفع ملف التجميعات/التسريبات (PDF)، نعدّ صفحاته،
   ونقسمها على الأيام المتبقية للاختبار لنعطيك هدفاً يومياً (كم صفحة باليوم). ───
   النتيجة تُحفظ محلياً (darb_leaks_plan) وتتزامن سحابياً. */
import { useState } from "react";

interface LeaksPlan {
  fileName: string;
  pages: number;
  startPage: number;   // أول صفحة فعلية (نتجاوز الغلاف/الفهرس)
  daysLeft: number;
  restDays: number;    // أيام راحة يخصمها الطالب
  createdAt: number;
}

const KEY = "darb_leaks_plan";

function loadPlan(): LeaksPlan | null {
  if (typeof window === "undefined") return null;
  try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as LeaksPlan) : null; }
  catch { return null; }
}
function savePlan(p: LeaksPlan | null) {
  try { if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY); } catch {}
}

async function countPdfPages(file: File): Promise<number> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  return pdf.numPages;
}

export default function LeaksPlanner({ color, daysLeft }: { color: string; daysLeft: number | null }) {
  const [plan, setPlan] = useState<LeaksPlan | null>(() => loadPlan());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setErr("");
    if (file.type !== "application/pdf") { setErr("ارفع ملف PDF فقط"); return; }
    setLoading(true);
    try {
      const pages = await countPdfPages(file);
      const dl = daysLeft && daysLeft > 0 ? daysLeft : 1;
      const next: LeaksPlan = {
        fileName: file.name, pages, startPage: 1, daysLeft: dl, restDays: 0, createdAt: Date.now(),
      };
      setPlan(next); savePlan(next);
    } catch {
      setErr("ما قدرنا نقرأ الملف — تأكد أنه PDF صالح");
    } finally { setLoading(false); }
  };

  const update = (patch: Partial<LeaksPlan>) => {
    setPlan((p) => { if (!p) return p; const n = { ...p, ...patch }; savePlan(n); return n; });
  };

  const clear = () => { setPlan(null); savePlan(null); };

  /* الحساب: الصفحات الفعلية ÷ أيام الدراسة المتاحة */
  const studyDays = plan ? Math.max(1, plan.daysLeft - plan.restDays) : 1;
  const realPages = plan ? Math.max(1, plan.pages - (plan.startPage - 1)) : 0;
  const perDay = plan ? Math.ceil(realPages / studyDays) : 0;

  return (
    <div className="rounded-2xl p-4 mb-4 flex flex-col gap-3"
      style={{ background: "color-mix(in srgb, var(--gold) 6%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--gold) 35%, var(--border))" }}>
      <div className="flex items-center gap-2">
        <span className="text-[20px]">📄</span>
        <p className="font-black text-[17px]" style={{ color: "var(--text)" }}>قسّم ملف التسريبات على أيامك</p>
      </div>

      {!plan ? (
        <>
          <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>
            ارفع ملف التجميعات/التسريبات (PDF)، نعدّ صفحاته ونقسمها على الأيام المتبقية لاختبارك.
          </p>
          <label className="w-full rounded-2xl py-4 font-bold text-[17px] text-center cursor-pointer transition active:scale-[0.98]"
            style={{ background: "var(--surface)", border: `2px dashed ${color}`, color }}>
            {loading ? "جارٍ قراءة الملف..." : "📄 ارفع ملف PDF"}
            <input type="file" accept="application/pdf" className="hidden" disabled={loading}
              onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {err && <p className="text-[15px] text-center font-bold" style={{ color: "#EF4444" }}>{err}</p>}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <span className="text-[15px] font-bold truncate" style={{ color: "var(--text)" }}>{plan.fileName}</span>
            <span className="text-[14px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>{plan.pages} صفحة</span>
          </div>

          {/* ضبط: أول صفحة + أيام راحة */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl px-3 py-2 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>أبدأ من صفحة</span>
              <input type="number" min={1} max={plan.pages} value={plan.startPage}
                onChange={(e) => update({ startPage: Math.max(1, Math.min(plan.pages, Number(e.target.value) || 1)) })}
                className="bg-transparent outline-none text-[17px] font-bold w-full" style={{ color: "var(--text)" }} />
            </div>
            <div className="rounded-xl px-3 py-2 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>أيام راحة</span>
              <input type="number" min={0} max={Math.max(0, plan.daysLeft - 1)} value={plan.restDays}
                onChange={(e) => update({ restDays: Math.max(0, Math.min(plan.daysLeft - 1, Number(e.target.value) || 0)) })}
                className="bg-transparent outline-none text-[17px] font-bold w-full" style={{ color: "var(--text)" }} />
            </div>
          </div>

          {/* النتيجة */}
          <div className="rounded-2xl p-4 text-center flex flex-col gap-1"
            style={{ background: "color-mix(in srgb, var(--gold) 12%, var(--surface))", border: "1.5px solid var(--gold)" }}>
            <span className="font-mono-nums font-black text-3xl" style={{ color: "var(--gold)" }}>{perDay}</span>
            <span className="text-[15px] font-bold" style={{ color: "var(--text)" }}>صفحة في اليوم</span>
            <span className="text-[14px] mt-1" style={{ color: "var(--text-muted)" }}>
              {realPages} صفحة ÷ {studyDays} يوم دراسة {plan.daysLeft > 0 ? `(${plan.daysLeft} يوم على الاختبار)` : ""}
            </span>
          </div>

          <button onClick={clear} className="text-[15px] font-bold py-2" style={{ color: "var(--text-muted)" }}>
            ارفع ملفاً آخر
          </button>
        </>
      )}
    </div>
  );
}
