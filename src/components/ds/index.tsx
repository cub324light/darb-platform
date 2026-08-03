/* ─── درب — مكوّنات نظام التصميم الأساسية (Design System primitives) ───
   مصدر واحد للبطاقة/الترويسة/الشبكة/الرقم، يفرض الاتساق (حواف/حشو/طباعة/إيقاع)
   بدل تكرار قيم متناثرة في كل صفحة. أي شاشة جديدة تُبنى من هذه اللبنات.
   عرض نقي بلا حالة — يعمل خادمياً وداخل مكوّنات العميل. */
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/* البطاقة القياسية — نفس الحواف/الحشو/الحد/الظل لكل بطاقات المنتج.
   tint: لون مميّز اختياري (يلوّن الحد وتوهج المرور دون كسر البنية).
   as: عنصر/رابط/زر — الرابط والزر يصيران تفاعليين (رفع عند المرور). */
export function Card({
  children, tint, pad = "md", interactive, href, onClick, className = "", style, ariaLabel,
}: {
  children: ReactNode;
  tint?: string;
  pad?: "tight" | "md" | "lg";
  interactive?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  const padCls = pad === "lg" ? "ds-card-lg" : pad === "tight" ? "ds-card-tight" : "";
  const cls = `ds-card ${padCls} ${interactive || href || onClick ? "ds-card-interactive" : ""} ${className}`.trim();
  const st: CSSProperties = {
    ...(tint ? ({ ["--tint" as string]: tint, borderColor: `color-mix(in srgb, ${tint} 28%, var(--border))` }) : {}),
    ...style,
  };
  if (href) return <Link href={href} aria-label={ariaLabel} className={`${cls} no-underline block`} style={st}>{children}</Link>;
  if (onClick) return <button onClick={onClick} aria-label={ariaLabel} className={`${cls} text-right w-full`} style={st}>{children}</button>;
  return <div className={cls} style={st}>{children}</div>;
}

/* ترويسة قسم موحّدة — عين سطر + عنوان H2 + وصف اختياري (تسلسل بصري ثابت) */
export function SectionHeader({
  eyebrow, title, sub, action,
}: { eyebrow?: string; title: ReactNode; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5" style={{ color: "var(--accent-light)" }}>{eyebrow}</p>}
        <h2 className="t-h2" style={{ color: "var(--text)" }}>{title}</h2>
        {sub && <p className="t-body mt-1.5" style={{ color: "var(--text-dim)" }}>{sub}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/* شبكة بطاقات متساوية الارتفاع — أعمدة متجاوبة بفجوة موحّدة */
export function CardGrid({ cols = 2, children, className = "" }: { cols?: 2 | 3 | 4; children: ReactNode; className?: string }) {
  return <div className={`ds-grid ds-grid-${cols} ${className}`.trim()}>{children}</div>;
}

/* رقم بارز (إحصاء) بخط أحادي المسافة — للوحات والبطاقات الرقمية */
export function Stat({ value, label, color = "var(--accent-light)" }: { value: ReactNode; label: string; color?: string }) {
  return (
    <div className="ds-tile items-center text-center">
      <span className="font-mono-nums font-black" style={{ fontSize: "1.5rem", lineHeight: 1.1, color }}>{value}</span>
      <span className="t-caption" style={{ color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}
