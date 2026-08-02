"use client";
/* ─── بطاقةٌ تعريفية تُغلَق ───
   تشرح الصفحةَ أوّل مرّة، ثم يُغلقها الطالبُ فلا تعود. تُستعمل في رؤوس الصفحات
   بدل نصٍّ ثابتٍ يقرؤه مرّةً ويمرّ عليه ثلاثمئة.

   ▸ `id` يجب أن يكون ثابتاً عبر النشرات: تغييرُه يعيد إظهار البطاقة لمن أغلقها.
   ▸ مساحةُ لمس الزرّ 44×44 كما بقيةُ أزرار درب الصغيرة (قاعدةٌ ثبتناها سابقاً). */
import { useDismissed, dismiss } from "@/lib/dismissed";

interface Props {
  id: string;
  title: string;
  children?: React.ReactNode;
  /** نبرةٌ بارزة (خلفيةٌ ملوّنة) — لرؤوس الصفحات */
  tone?: "accent" | "plain";
}

export default function DismissibleNote({ id, title, children, tone = "accent" }: Props) {
  const gone = useDismissed(id);
  if (gone) return null;

  const accent = tone === "accent";
  return (
    <section
      className="ds-card ds-card-lg flex items-start gap-2"
      style={accent ? {
        background: "color-mix(in srgb, var(--accent) 8%, var(--surface))",
        borderColor: "color-mix(in srgb, var(--accent) 24%, var(--border))",
      } : undefined}
    >
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <p className="t-title font-black" style={{ color: "var(--text)" }}>{title}</p>
        {children && <div className="t-body" style={{ color: "var(--text-dim)" }}>{children}</div>}
      </div>
      <button
        type="button"
        onClick={() => dismiss(id)}
        aria-label={`إخفاء «${title}»`}
        className="flex-shrink-0 flex items-center justify-center rounded-full transition active:scale-90"
        style={{ width: 44, height: 44, marginTop: -6, marginInlineEnd: -10,
                 color: "var(--text-muted)", background: "transparent" }}
      >
        <span aria-hidden="true" className="t-body font-black">✕</span>
      </button>
    </section>
  );
}
