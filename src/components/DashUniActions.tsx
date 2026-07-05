"use client";
/* ─── إجراءات لوحة الطالب الجامعي — بطلٌ بديل عن عدّاد اختبار قياس ───
   مكوّن عرض نقي (props فقط): لا يقرأ تخزيناً ولا يجلب شبكة. يستهلك تلميح
   المرحلة (سيرة/تدريب) من phaseExperience، ويُبرز عالم الطالب الجامعي:
   أدوات الجامعة + أجهزة التخصص — بلا أي إشارة لقياس أو قبول (جوهر الطلب). */
import Link from "next/link";

/* رابطان بارزان لعالم الجامعي — وجهات قائمة في المنصة */
const LINKS = [
  { href: "/uni-tools", icon: "🧮", label: "أدوات الجامعة", desc: "معدّلك والغياب والفاينل", accent: "var(--accent)" },
  { href: "/uni-gear",  icon: "💻", label: "أجهزة تخصصك",   desc: "أفضل جهاز لمجالك",     accent: "var(--gold)" },
] as const;

export default function DashUniActions({ hint }: { hint: string }) {
  return (
    <div className="mb-3">
      {/* تلميح مهني — سيرة/تدريب: البطاقة نفسها مدخل «مسيرتك المهنية» (التلميح مهني الطابع) */}
      <Link href="/career"
        className="rounded-2xl px-4 py-3 mb-2.5 flex items-center gap-3 text-right transition active:scale-[0.98] no-underline"
        style={{
          background: "color-mix(in srgb, var(--accent) 12%, transparent)",
          border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
        }}>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>خطوتك القادمة · مسيرتك المهنية</p>
          <p className="text-[16px] font-black mt-0.5" style={{ color: "var(--accent-light)" }}>💼 {hint}</p>
        </div>
        <span className="text-[18px] flex-shrink-0" style={{ color: "var(--accent-light)" }} aria-hidden="true">←</span>
      </Link>

      {/* رابطان بارزان: أدوات الجامعة + أجهزة التخصص */}
      <div className="grid grid-cols-2 gap-2.5">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}
            className="rounded-2xl px-3.5 py-3 flex flex-col gap-1 text-right transition active:scale-[0.97] no-underline"
            style={{
              background: `color-mix(in srgb, ${l.accent} 8%, var(--surface))`,
              border: `1.5px solid color-mix(in srgb, ${l.accent} 30%, transparent)`,
            }}>
            <span className="text-[22px] leading-none">{l.icon}</span>
            <span className="font-extrabold text-[15px]" style={{ color: "var(--text)" }}>{l.label}</span>
            <span className="text-[12px] leading-snug" style={{ color: "var(--text-muted)" }}>{l.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
