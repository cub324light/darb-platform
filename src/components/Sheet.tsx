"use client";
/* ═══════════ الورقة السفلية — غلافٌ واحد لكل أوراق المنتج ═══════════
   كانت أربع أوراقٍ تكرّر الحجاب ونفس الفتحة والإغلاق بالنقر، وكلّها على `z-50` نفسِ
   رقم شريط التنقل — والشريط يأتي بعدها في DOM فيرسم فوقها، فيختفي آخر صفٍّ في الورقة
   (زرّ الحفظ غالباً) ولا يبلغه الطالب بالتمرير. رفعُ `z-index` وحده لا يكفي: الورقة
   تعيش داخل شجرة الصفحة، وأيّ سلفٍ ذي `transform`/`opacity` (وأنيميشن `.rise` منها)
   يفتح سياق تكديسٍ جديداً يحبس الرقم داخله. فالحلّ بوّابةٌ إلى `document.body`
   ثم `.sheet-layer` — وهو ما كان `DayScheduler` يفعله وحده فظهرت ورقته سليمة. */
import { createPortal } from "react-dom";

interface Props {
  onClose: () => void;
  children: React.ReactNode;
  /** وصفٌ للقارئ الآلي حين لا يكفي عنوانٌ داخل الورقة. */
  label?: string;
  /** حين يُمرَّر: تُبنى اللوحةُ القياسية (مقبض · عنوان · ✕ · جسمٌ يمرّر).
      وحين يُترك: يرسم المستدعي لوحتَه بنفسه — كما كانت الأوراقُ القديمة. */
  title?: string;
  /** لونُ العنوان — لونُ المادة أو القسم إن أراده المستدعي. */
  titleColor?: string;
}

export default function Sheet({ onClose, children, label, title, titleColor }: Props) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="sheet-layer flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose} role="dialog" aria-modal="true" aria-label={label ?? title}>
      {title === undefined ? children : (
        <div className="relative w-full max-w-md rounded-t-3xl max-h-[90dvh] overflow-y-auto slide-up"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderBottom: "none", overscrollBehavior: "contain" }}
          onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 z-10 pt-4 pb-3 px-5"
            style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            <div className="w-10 h-1.5 rounded-full mx-auto mb-3" style={{ background: "var(--border)" }} />
            <div className="flex items-center justify-between gap-3">
              <p className="t-title font-black min-w-0 truncate" style={{ color: titleColor ?? "var(--text)" }}>{title}</p>
              <button onClick={onClose} aria-label="إغلاق"
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 t-body"
                style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>✕</button>
            </div>
          </div>
          <div className="px-5 py-4 pb-10">{children}</div>
        </div>
      )}
    </div>,
    document.body,
  );
}
