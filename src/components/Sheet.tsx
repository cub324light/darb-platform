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
}

export default function Sheet({ onClose, children, label }: Props) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="sheet-layer flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
      {children}
    </div>,
    document.body,
  );
}
