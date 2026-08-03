"use client";
/* ═══════════ شاشةٌ كاملة — للتحرير الذي يحتاج مساحة ═══════════
   الورقةُ السفلية تكفي نموذجاً من حقلين، ولا تكفي **دفتراً**: الطالبُ يرسم
   مخطّطاً أو يملأ جدولاً بثمانية أعمدة، فيخنقه نصفُ الشاشة. فهذه تفتح على
   الشاشة كلّها: شريطٌ علويّ ثابت (رجوع · العنوان · حفظ) وجسمٌ يمرّر تحته.

   بوّابةٌ إلى `document.body` لنفس سبب `Sheet`: أيُّ سلفٍ ذي `transform`
   (وأنيميشن `.rise` منها) يفتح سياقَ تكديسٍ يحبس `z-index` داخله. */
import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function FullPage({
  title, onClose, action, children,
}: {
  title: string;
  onClose: () => void;
  /** الفعلُ الأساسيّ في الشريط العلويّ (حفظٌ غالباً). */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  /* لا تُمرَّر الصفحةُ خلف الشاشة الكاملة */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="sheet-layer flex flex-col" role="dialog" aria-modal="true" aria-label={title}
      style={{ background: "var(--bg, var(--surface))", inset: 0 }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
          paddingTop: "calc(12px + env(safe-area-inset-top))",
        }}>
        <button onClick={onClose} aria-label="رجوع"
          className="dome-chip tap-44 t-small font-bold inline-flex items-center gap-1.5 flex-shrink-0"
          style={{ color: "var(--text)" }}>
          <span aria-hidden="true">→</span> رجوع
        </button>
        <p className="t-title font-black flex-1 min-w-0 truncate text-center" style={{ color: "var(--text)" }}>{title}</p>
        <div className="flex-shrink-0">{action}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ overscrollBehavior: "contain", paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
