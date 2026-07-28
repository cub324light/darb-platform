"use client";
/* ─── تذييل عام: الملاحظات + آخر التحديثات — أسفل كل صفحة ─── */
import FeedbackButton from "@/components/FeedbackButton";

export default function PageFooter() {
  return (
    <div className="px-5 pt-3 pb-2 max-w-lg mx-auto w-full">
      <div className="w-full h-px mb-3" style={{ background: "var(--border)" }} />
      {/* سطرٌ واحد لا سطران: flex-wrap كان يكسرهما على الجوال لأن مجموع عرضهما
          يتجاوز الشاشة بقليل. nowrap + مقاسٌ من السلّم + فجوةٌ أضيق يُبقيهما جنباً لجنب. */}
      <div className="flex items-center justify-center gap-2 flex-nowrap">
        <FeedbackButton
          className="t-small font-bold transition active:scale-95 whitespace-nowrap tap-44"
          style={{ color: "var(--text-muted)", background: "transparent", border: "none", padding: 0 }}
        />
        <span className="flex-shrink-0" style={{ color: "var(--border)" }}>·</span>
        <a href="/changelog" className="t-small font-bold transition active:scale-95 whitespace-nowrap tap-44" style={{ color: "var(--text-muted)" }}>
          ✨ آخر التحديثات
        </a>
      </div>
    </div>
  );
}
