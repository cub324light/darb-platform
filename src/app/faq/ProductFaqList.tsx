"use client";
/* ─── قائمة الأسئلة الشائعة عن درب — أكورديون بسيط أنيق ───
   عشرة أسئلة فقط من PRODUCT_FAQ (نمط AccordionItem منسوخ محلياً كي لا تعتمد
   الصفحة على متصفح المحتوى الذي انتقل إلى /guide). للتفاعل فقط — بلا جلب. */
import { useState } from "react";
import { PRODUCT_FAQ, type ProductFaqItem } from "@/lib/productFaq";

/* عنصر أكورديون واحد — الفتح/الإغلاق بانتقال grid-template-rows سلس */
function AccordionItem({
  item, open, onToggle,
}: {
  item: ProductFaqItem;
  open: boolean;
  onToggle: () => void;
}) {
  const accent = item.trackColor ?? "var(--accent)";
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--surface)",
        border: open
          ? `1.5px solid color-mix(in srgb, ${accent} 45%, var(--border))`
          : "1.5px solid var(--border)",
        transition: "border-color 0.25s ease",
      }}>
      <button onClick={onToggle} aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-right">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" aria-hidden="true"
          style={{ background: accent }} />
        <span className="flex-1 font-bold text-[16px] leading-relaxed"
          style={{ color: open ? accent : "var(--text)", transition: "color 0.25s ease" }}>
          {item.question}
        </span>
        <span aria-hidden="true" className="flex-shrink-0 text-[15px]"
          style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }}>
          ▼
        </span>
      </button>
      <div className="grid" style={{ gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-[16px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProductFaqList() {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2.5">
      {PRODUCT_FAQ.map((item) => (
        <AccordionItem key={item.id} item={item}
          open={openId === item.id}
          onToggle={() => setOpenId(openId === item.id ? null : item.id)} />
      ))}
    </div>
  );
}
