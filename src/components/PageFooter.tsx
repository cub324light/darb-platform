"use client";
/* ─── تذييل عام: الملاحظات + آخر التحديثات — أسفل كل صفحة ─── */
import FeedbackButton from "@/components/FeedbackButton";

export default function PageFooter() {
  return (
    <div className="px-5 pt-3 pb-2 max-w-lg mx-auto w-full">
      <div className="w-full h-px mb-3" style={{ background: "var(--border)" }} />
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <FeedbackButton
          className="text-[15px] font-bold transition active:scale-95"
          style={{ color: "var(--text-muted)", background: "transparent", border: "none", padding: 0 }}
        />
        <span style={{ color: "var(--border)" }}>·</span>
        <a href="/changelog" className="text-[15px] font-bold transition active:scale-95" style={{ color: "var(--text-muted)" }}>
          ✨ آخر التحديثات
        </a>
      </div>
    </div>
  );
}
