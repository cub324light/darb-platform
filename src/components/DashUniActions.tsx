"use client";
/* ─── إجراءات لوحة الطالب الجامعي — «كيف تبني مسارك الجامعي؟» ───
   بطاقات حالة (معدّلك + التقدّم للتخرّج) ثم مدخل «عالم تخصصك» ثم أدوات الجامعة.
   يقرأ تخزينه بتهيئة كسولة مرة واحدة (majorId + المعدّل + الساعات) — لا setState
   في effect (React Compiler). الأرقام بخط أحادي المسافة، والألوان بمعنى، ولبنات
   ds/ToolTile الموحّدة بلا تنسيق مخصّص مكرّر. */
import { useState } from "react";
import Link from "next/link";
import ToolTile from "@/components/ToolTile";
import { CardGrid } from "@/components/ds";
import { loadUser, loadGoals } from "@/lib/storage";
import { findMajor } from "@/lib/university";
import { hasMajorWorld } from "@/lib/majors";

/* إجمالي ساعات تقريبي لخطة البكالوريوس (موسوم «تقريبي» في العرض) */
const GRAD_TOTAL_HOURS = 132;

/* لون المعدّل حسب معناه (من ٥) — أخضر عالٍ · ذهبي جيد · أحمر متعثّر */
function gpaColor(g: number | null): string {
  if (g == null) return "var(--text-muted)";
  if (g >= 4.5) return "var(--success)";
  if (g >= 3.0) return "var(--gold)";
  return "var(--danger)";
}

/* بطاقة حالة موحّدة — أيقونة + رقم أحادي المسافة + سطر معنى؛ تفتح لتعديل القيمة */
function StatCard({ href, icon, label, value, sub, color }: {
  href: string; icon: string; label: string; value: string; sub: string; color: string;
}) {
  return (
    <Link href={href}
      className="ds-card ds-card-tight flex flex-col gap-1 text-right no-underline h-full transition active:scale-[0.98]">
      <div className="flex items-center gap-1.5">
        <span className="text-[15px]" aria-hidden="true">{icon}</span>
        <span className="t-caption" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <span className="font-mono-nums font-black" style={{ fontSize: "1.6rem", lineHeight: 1.1, color }}>{value}</span>
      <span className="t-caption" style={{ color: "var(--text-muted)" }}>{sub}</span>
    </Link>
  );
}

export default function DashUniActions({ hint }: { hint: string }) {
  /* قراءة واحدة كسولة: المعدّل والساعات من المستخدم، واسم التخصص الدقيق من الأهداف */
  const [uni] = useState(() => {
    if (typeof window === "undefined") return { gpa: null as number | null, hours: null as number | null, majorName: null as string | null };
    const u = loadUser();
    const g = loadGoals();
    const m = hasMajorWorld(g.majorId) ? findMajor(g.majorId) : undefined;
    return {
      gpa: u?.universityGpa ?? null,
      hours: u?.creditHoursCompleted ?? null,
      majorName: m?.name ?? null,
    };
  });

  const gpaVal = uni.gpa != null ? uni.gpa.toFixed(2) : "—";
  const hoursDone = uni.hours ?? 0;
  const gradPct = uni.hours != null ? Math.min(100, Math.round((hoursDone / GRAD_TOTAL_HOURS) * 100)) : null;
  const gradColor = gradPct != null && gradPct >= 100 ? "var(--success)" : "var(--accent-light)";

  return (
    <div className="mb-3 flex flex-col gap-2.5">
      <div className="px-0.5">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>كيف تبني مسارك الجامعي؟</h2>
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>حالتك الآن، وعالم تخصصك، وأدواتك — في مكان واحد</p>
      </div>

      {/* ── بطاقات الحالة (متساوية الارتفاع) ── */}
      <CardGrid cols={2}>
        <StatCard href="/uni-tools" icon="📊" label="معدّلك"
          value={gpaVal}
          sub={uni.gpa != null ? "من ٥" : "أضِفه ←"}
          color={gpaColor(uni.gpa)} />
        <StatCard href="/uni-tools" icon="🎓" label="التقدّم للتخرّج"
          value={gradPct != null ? `${gradPct}%` : "—"}
          sub={gradPct != null ? `${hoursDone} من ١٣٢ ساعة (تقريبي)` : "أضِف ساعاتك ←"}
          color={gradColor} />
      </CardGrid>

      {/* ── مدخل «عالم تخصصك» البارز → /career (يحمل التلميح المهني) ── */}
      <Link href="/career"
        className="rounded-2xl px-4 py-3 flex items-center gap-3 text-right no-underline transition active:scale-[0.98]"
        style={{
          background: "color-mix(in srgb, var(--accent) 12%, transparent)",
          border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
        }}>
        <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-[22px] leading-none flex-shrink-0"
          style={{
            background: "color-mix(in srgb, var(--accent) 16%, transparent)",
            border: "1.5px solid color-mix(in srgb, var(--accent) 32%, transparent)",
          }}
          aria-hidden="true">🌍</span>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-black leading-tight" style={{ color: "var(--accent-light)" }}>
            {uni.majorName ? `عالم ${uni.majorName}` : "عالم تخصصك"}
          </p>
          <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>برامجك وشهاداتك وشركاتك ومساراتك</p>
          <p className="t-caption mt-1" style={{ color: "var(--text-dim)" }}>💼 {hint}</p>
        </div>
        <span className="text-[18px] flex-shrink-0" style={{ color: "var(--accent-light)" }} aria-hidden="true">←</span>
      </Link>

      {/* ── أدوات الجامعة + عُدّة تخصصك (ToolTile الموحّد) ── */}
      <CardGrid cols={2}>
        <ToolTile icon="🧮" title="أدوات الجامعة" desc="المعدل والغياب والفاينل" color="var(--accent)" href="/uni-tools" />
        <ToolTile icon="💻" title="عُدّة تخصصك" desc="أجهزة وبرامج وأدوات AI" color="var(--gold)" href="/uni-gear" />
      </CardGrid>
    </div>
  );
}
