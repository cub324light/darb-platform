"use client";
/* ─── نظام الملاحظات: اقتراح ميزة / مشكلة / رأي — يصل للوحة الإدارة ─── */
import { useState } from "react";
import { createPortal } from "react-dom";
import { postSocial } from "@/lib/authFetch";
import { loadUser } from "@/lib/storage";

const KINDS = [
  { id: "feature", icon: "💡", label: "اقتراح ميزة" },
  { id: "bug",     icon: "🐞", label: "مشكلة / خطأ" },
  { id: "opinion", icon: "💬", label: "رأي أو ملاحظة" },
] as const;

export default function FeedbackButton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("feature");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (text.trim().length < 3 || busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await postSocial({
        mode: "submitFeedback",
        kind,
        text: text.trim(),
        name: loadUser()?.name ?? "",
        page: typeof window !== "undefined" ? window.location.pathname : "",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(true);
      } else {
        setErr(data.error ?? "تعذّر الإرسال — حاول مرة ثانية");
      }
    } catch {
      setErr("تعذّر الاتصال — حاول مرة ثانية");
    } finally {
      setBusy(false);
    }
  };

  const close = () => { setOpen(false); setText(""); setDone(false); setErr(null); setKind("feature"); };

  const overlay = (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={close}>
      <div className="absolute inset-0 bg-black/55 fade-in" />
      <div className="relative w-full max-w-lg rounded-t-3xl p-6 pb-10 slide-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none", maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <p className="title-md" style={{ color: "var(--text)" }}>شاركنا رأيك</p>
          <button onClick={close} className="text-[17px] font-bold px-3 py-1.5 rounded-xl"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>إغلاق</button>
        </div>

        {done ? (
          <div className="flex flex-col items-center text-center gap-3 py-8">
            <span className="text-[50px]">✅</span>
            <p className="font-black text-[20px]" style={{ color: "var(--text)" }}>وصلتنا ملاحظتك، شكراً لك!</p>
            <p className="text-[16px]" style={{ color: "var(--text-muted)" }}>نقرأ كل ملاحظة ونطوّر درب على أساسها.</p>
            <button onClick={close} className="btn-primary mt-2 px-8" style={{ width: "auto" }}>تمام</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {KINDS.map((k) => (
                <button key={k.id} onClick={() => setKind(k.id)}
                  className="rounded-2xl py-3 flex flex-col items-center gap-1 transition"
                  style={kind === k.id
                    ? { background: "color-mix(in srgb, var(--accent) 14%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }
                    : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <span className="text-[23px]">{k.icon}</span>
                  <span className="text-[14px] font-bold">{k.label}</span>
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب اقتراحك أو المشكلة أو رأيك بالتفصيل..."
              maxLength={2000}
              rows={5}
              className="w-full rounded-2xl px-4 py-3 text-[17px] outline-none resize-none mb-3"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}
            />
            {err && <p className="text-[15px] mb-3 text-center font-bold" style={{ color: "#EF4444" }}>{err}</p>}
            <button onClick={submit} disabled={text.trim().length < 3 || busy}
              className="btn-primary w-full" style={{ opacity: text.trim().length < 3 || busy ? 0.5 : 1 }}>
              {busy ? "جارٍ الإرسال..." : "إرسال"}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className={className} style={style}>
        💬 شاركنا رأيك أو اقتراحك
      </button>
      {open && typeof document !== "undefined" && createPortal(overlay, document.body)}
    </>
  );
}
