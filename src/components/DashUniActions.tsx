"use client";
/* ─── إجراءات لوحة الطالب الجامعي — بطلٌ بديل عن عدّاد اختبار قياس ───
   مكوّن عرض نقي (props فقط): لا يقرأ تخزيناً ولا يجلب شبكة. يستهلك تلميح
   المرحلة (سيرة/تدريب) من phaseExperience، ويُبرز عالم الطالب الجامعي كبطاقات
   أدوات مستقلة موحّدة (ToolTile): أدوات الجامعة + عُدّة تخصصك + مسيرتك المهنية
   — بلا أي إشارة لقياس أو قبول (جوهر الطلب). */
import Link from "next/link";
import ToolTile from "@/components/ToolTile";

/* بطاقات عالم الجامعي — بالمكوّن الموحّد بدل التنسيق المخصّص (وجهات قائمة) */
const TILES = [
  { href: "/uni-tools", icon: "🧮", label: "أدوات الجامعة",  desc: "المعدل والغياب والفاينل", color: "var(--accent)" },
  { href: "/uni-gear",  icon: "💻", label: "عُدّة تخصصك",     desc: "أجهزة وبرامج وأدوات AI", color: "var(--gold)" },
  { href: "/career",    icon: "💼", label: "مسيرتك المهنية", desc: "تدريب وسيرة وشهادات",   color: "var(--success)" },
] as const;

export default function DashUniActions({ hint }: { hint: string }) {
  return (
    <div className="mb-3">
      {/* التلميح المهني — نصيحة اليوم الشخصية (مُبقاة): مدخل مُبرز لمسيرتك المهنية */}
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

      {/* بطاقات الأدوات المستقلة — مكوّن ToolTile الموحّد */}
      <div className="grid grid-cols-3 gap-2.5">
        {TILES.map((t) => (
          <ToolTile key={t.href} icon={t.icon} title={t.label} desc={t.desc} color={t.color} href={t.href} />
        ))}
      </div>
    </div>
  );
}
