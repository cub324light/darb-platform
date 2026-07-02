/* ─── عرض نصوص المحتوى التعليمي ───
   النصوص القادمة من الأرشيف تفصل بنودها بعلامة «•». هنا نعرضها كقائمة أنيقة
   بنقاط ملوّنة دون أي تغيير في النص نفسه (تحسين عرض فقط — المحتوى كما هو).
   مكوّن نقي بلا حالة — يعمل خادمياً وداخل مكوّنات العميل على السواء. */

export default function BulletText({
  text,
  color = "var(--text-dim)",
  dotColor = "var(--accent-light)",
}: {
  text: string;
  color?: string;
  dotColor?: string;
}) {
  const parts = text.split("•").map((p) => p.trim()).filter(Boolean);

  /* بلا فواصل نقطية → فقرة عادية تحافظ على الأسطر الأصلية */
  if (parts.length <= 1) {
    return (
      <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color }}>
        {text}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {parts.map((p, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[14px] leading-relaxed" style={{ color }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[9px]" style={{ background: dotColor }} aria-hidden="true" />
          <span className="flex-1">{p}</span>
        </li>
      ))}
    </ul>
  );
}
