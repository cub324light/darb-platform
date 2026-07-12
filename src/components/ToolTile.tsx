"use client";
/* ─── بطاقة أداة موحّدة (ToolTile) — نقطة دخول لأداة مستقلة ───
   عرض نقي بالكامل (props فقط): أيقونة كبيرة + اسم + وصف سطر واحد + لون مميز،
   بحيث يُفهَم دور الأداة في ثوانٍ ويحسّ المستخدم أنها أداة مستقلة لا رابط.
   تعمل رابطاً داخلياً (href) أو زرّاً (onClick) — يُمرَّر واحد منهما فقط.
   الألوان بمتغيرات الثيم عبر color-mix فتحترم الوضعين الفاتح والداكن.
   مُعاد استخدامها في أدوات الجامعة ولوحة الطالب الجامعي بلا تكرار تنسيق. */
import Link from "next/link";

export interface ToolTileProps {
  icon: string;          // إيموجي/رمز الأداة
  title: string;         // اسم الأداة
  desc: string;          // وصف سطر واحد (قاعدة الـ5 ثوانٍ)
  color: string;         // لون مميز — متغيّر ثيم مثل var(--accent)
  href?: string;         // وجهة تنقّل داخلية
  onClick?: () => void;  // أو فعل مباشر (فتح أداة داخل الصفحة)
  ariaLabel?: string;    // بديل نصي — يفترض العنوان إن غاب
}

/* المحتوى الداخلي المشترك بين الرابط والزر — لا تكرار تنسيق */
function Inner({ icon, title, desc, color }: Pick<ToolTileProps, "icon" | "title" | "desc" | "color">) {
  return (
    <>
      <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-[25px] leading-none flex-shrink-0"
        style={{
          background: `color-mix(in srgb, ${color} 14%, transparent)`,
          border: `1.5px solid color-mix(in srgb, ${color} 30%, transparent)`,
          boxShadow: `0 0 16px color-mix(in srgb, ${color} 16%, transparent)`,
        }}
        aria-hidden="true">
        {icon}
      </span>
      <span className="font-black text-[17px] leading-tight mt-0.5" style={{ color }}>{title}</span>
      <span className="text-[14px] leading-snug" style={{ color: "var(--text-muted)" }}>{desc}</span>
    </>
  );
}

/* تنسيق البطاقة الموحّد — خلفية مصبوغة بلون الأداة + توهج عند hover */
const TILE_CLASS =
  "glow-card-hover rounded-2xl p-4 flex flex-col gap-1.5 text-right no-underline w-full transition active:scale-[0.98] cursor-pointer";
const tileStyle = (color: string) => ({
  background: `color-mix(in srgb, ${color} 8%, var(--surface))`,
  border: `1.5px solid color-mix(in srgb, ${color} 30%, transparent)`,
});

export default function ToolTile({ icon, title, desc, color, href, onClick, ariaLabel }: ToolTileProps) {
  const inner = <Inner icon={icon} title={title} desc={desc} color={color} />;
  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel ?? title} className={TILE_CLASS} style={tileStyle(color)}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel ?? title} className={TILE_CLASS} style={tileStyle(color)}>
      {inner}
    </button>
  );
}
