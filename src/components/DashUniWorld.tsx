"use client";
/* ─── عالم الطالب الجامعي في اللوحة — «يعيش داخل جامعته وفصله» ───
   بطل واحد «فصلك الحالي» (بطاقات حالة متساوية بألوان بمعنى)، ثم Timeline رأسي
   «مستقبلك» يرى فيه الطريق كاملاً (المحطة الحالية مُبرزة)، ثم «يساعدك هذا الأسبوع»
   بطاقات سياقية، ثم مدخل «عالم تخصصك» وأدواته. المنطق كلّه في uniJourney.ts النقي.
   قراءة كسولة واحدة (loadUser/loadGoals + التقويم/الرحلة تُحسب مرة) — لا setState
   في effect (React Compiler). لبنات ds/ToolTile الموحّدة بلا تنسيق مكرّر. */
import { useState } from "react";
import Link from "next/link";
import ToolTile from "@/components/ToolTile";
import { CardGrid } from "@/components/ds";
import { loadUser, loadGoals } from "@/lib/storage";
import { findMajor } from "@/lib/university";
import { hasMajorWorld } from "@/lib/majors";
import {
  semesterInfo, gradProgress, buildUniJourney, aiThisWeek, AI_INTEGRITY_NOTE,
  type JourneyStep, type JourneyState,
} from "@/lib/uniJourney";

/* هدف تميّز مرجعي على سُلّم الـ٥ (تقدير ممتاز) — يوجّه لمخطّط «وش أحتاج» في /uni-tools */
const HONORS_GPA = "4.50";

/* لون المعدّل حسب معناه (من ٥): أخضر عالٍ · ذهبي جيد · أحمر متعثّر */
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
      <span className="font-mono-nums font-black" style={{ fontSize: "1.5rem", lineHeight: 1.1, color }}>{value}</span>
      <span className="t-caption" style={{ color: "var(--text-muted)" }}>{sub}</span>
    </Link>
  );
}

/* ألوان عُقدة/بطاقة المحطة حسب حالتها — أخضر=منجز · أزرق=الآن · رمادي=قادم */
const NODE_ACCENT: Record<JourneyState, string> = {
  done: "var(--success)", current: "var(--accent)", upcoming: "var(--text-muted)",
};

/* محطة واحدة في Timeline «مستقبلك» — عُقدة موصولة بخط + بطاقة صغيرة */
function JourneyRow({ step, isLast }: { step: JourneyStep; isLast: boolean }) {
  const c = NODE_ACCENT[step.state];
  const isCurrent = step.state === "current";
  const isDone = step.state === "done";
  return (
    <div className="flex gap-3 items-stretch">
      {/* عمود العقدة + الخط الرأسي (يمين في RTL) */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 34 }}>
        <span className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[15px] leading-none"
          style={{
            background: `color-mix(in srgb, ${c} ${isCurrent ? 20 : 12}%, var(--surface))`,
            border: `1.5px solid color-mix(in srgb, ${c} ${isCurrent ? 55 : 34}%, transparent)`,
            boxShadow: isCurrent ? `0 0 14px color-mix(in srgb, ${c} 30%, transparent)` : "none",
          }}
          aria-hidden="true">
          {isDone ? "✓" : step.icon}
        </span>
        {!isLast && (
          <span className="flex-1 w-[2px] my-1 rounded-full"
            style={{ background: `color-mix(in srgb, ${c} 26%, var(--border))` }} aria-hidden="true" />
        )}
      </div>

      {/* بطاقة المحطة */}
      <div className="flex-1 min-w-0 rounded-2xl px-3 py-2.5 mb-1"
        style={{
          background: isCurrent ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "var(--surface)",
          border: `1px solid ${isCurrent
            ? "color-mix(in srgb, var(--accent) 32%, transparent)"
            : "var(--border)"}`,
          opacity: step.state === "upcoming" ? 0.82 : 1,
        }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>{step.year}</span>
          {isCurrent && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent-light)" }}>
              أنت هنا
            </span>
          )}
        </div>
        <p className="text-[14px] font-black leading-tight mt-0.5"
          style={{ color: isCurrent ? "var(--accent-light)" : isDone ? "var(--text-dim)" : "var(--text)" }}>
          {step.title}
        </p>
        <p className="t-caption mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{step.detail}</p>
      </div>
    </div>
  );
}

/* رأس قسم موجز داخل عالم الجامعي (أيقونة + عنوان + سطر معنى) */
function Head({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="px-0.5">
      <h2 className="t-h3" style={{ color: "var(--text)" }}>{icon} {title}</h2>
      <p className="t-caption" style={{ color: "var(--text-muted)" }}>{sub}</p>
    </div>
  );
}

export default function DashUniWorld({ hint }: { hint: string }) {
  /* قراءة كسولة واحدة: التخزين (المعدّل/الساعات/التخصص/السنة) + التقويم + الرحلة */
  const [w] = useState(() => {
    const now = new Date();
    let gpa: number | null = null, hours: number | null = null;
    let majorId: string | undefined, year: string | undefined;
    if (typeof window !== "undefined") {
      const u = loadUser();
      const g = loadGoals();
      gpa = u?.universityGpa ?? null;
      hours = u?.creditHoursCompleted ?? null;
      majorId = g.majorId;
      year = u?.universityYear;
    }
    return {
      gpa, hours,
      majorName: hasMajorWorld(majorId) ? (findMajor(majorId)?.name ?? null) : null,
      sem: semesterInfo(now),
      grad: gradProgress(hours ?? undefined),
      journey: buildUniJourney(majorId, year),
      week: aiThisWeek(majorId),
    };
  });

  const { sem, grad } = w;
  /* بطاقة الفصل/الأسبوع تتكيّف: داخل الفصل رقم الأسبوع، خارجه حالة إجازة */
  const weekValue = sem ? String(sem.weekNumber) : "إجازة";
  const weekSub = sem ? sem.termLabel : "استعد للفصل القادم ←";
  /* الفاينل: رقم الأيام (أحمر إن قرُب ≤ ١٤ يوماً) أو «—» إن لا فاينل قادم */
  const finalsClose = sem?.daysToFinals != null && sem.daysToFinals <= 14;
  const finalsValue = sem?.daysToFinals != null ? String(sem.daysToFinals) : "—";
  const finalsSub = sem?.finalsLabel ?? "لا فاينل قريب";
  const gradColor = grad.pct >= 100 ? "var(--success)" : "var(--accent-light)";

  return (
    <div className="mb-3 flex flex-col gap-4">
      {/* ═══ البطل الواحد: فصلك الحالي ═══ */}
      <div className="flex flex-col gap-2.5">
        <Head icon="🎓" title="فصلك الحالي" sub="أين أنت الآن في جامعتك وفصلك" />
        {/* شبكة كوكبِت مضغوطة: عمودان على الجوال، ثلاثة على سطح المكتب — لا قائمة طويلة */}
        <div className="grid grid-cols-2 min-[1100px]:grid-cols-3 gap-2.5 items-stretch [&>*]:h-full">
          <StatCard href="/uni-tools" icon="📅" label="أسبوعك"
            value={weekValue} sub={weekSub} color="var(--text)" />
          <StatCard href="/uni-tools" icon="⏰" label="للاختبارات"
            value={finalsValue}
            sub={sem?.daysToFinals != null ? `يوم · ${finalsSub}` : finalsSub}
            color={finalsClose ? "var(--danger)" : "var(--text)"} />
          <StatCard href="/uni-tools" icon="📚" label="ساعاتك"
            value={w.hours != null ? String(grad.done) : "—"}
            sub={w.hours != null ? "ساعة منجزة" : "أضِفها ←"}
            color="var(--text)" />
          <StatCard href="/uni-tools" icon="🎓" label="للتخرّج"
            value={w.hours != null ? `${grad.pct}%` : "—"}
            sub={w.hours != null ? `${grad.remaining} ساعة متبقية` : "أضِف ساعاتك ←"}
            color={gradColor} />
          <StatCard href="/uni-tools" icon="📊" label="معدّلك"
            value={w.gpa != null ? w.gpa.toFixed(2) : "—"}
            sub={w.gpa != null ? "من ٥" : "أضِفه ←"}
            color={gpaColor(w.gpa)} />
          <StatCard href="/uni-tools" icon="🎯" label="المستهدف"
            value={HONORS_GPA} sub="تقدير ممتاز · خطّط له ←" color="var(--gold)" />
        </div>
      </div>

      {/* ═══ مستقبلك: Timeline رأسي — يرى الطريق كاملاً ═══ */}
      <div className="flex flex-col gap-2.5">
        <Head icon="💼" title="مستقبلك" sub="من أول سنة حتى أول وظيفة — أنت في الطريق" />
        <div className="flex flex-col">
          {w.journey.map((step, i) => (
            <JourneyRow key={step.year} step={step} isLast={i === w.journey.length - 1} />
          ))}
        </div>
      </div>

      {/* ═══ يساعدك هذا الأسبوع: مهام سياقية ═══ */}
      <div className="flex flex-col gap-2.5">
        <Head icon="🤖" title="يساعدك هذا الأسبوع" sub="مهامك الجامعية، وكيف يعينك دويرب فيها" />
        <CardGrid cols={2}>
          {w.week.map((it) => (
            <div key={it.task} className="ds-card ds-card-tight flex items-start gap-2 text-right">
              <span className="text-[15px] leading-none mt-0.5" aria-hidden="true">✦</span>
              <div className="min-w-0">
                <p className="text-[13px] font-black leading-tight" style={{ color: "var(--accent-light)" }}>{it.task}</p>
                <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{it.via}</p>
              </div>
            </div>
          ))}
        </CardGrid>
        <p className="t-caption px-0.5" style={{ color: "var(--text-dim)" }}>ℹ️ {AI_INTEGRITY_NOTE}</p>
      </div>

      {/* ═══ مدخل «عالم تخصصك» البارز → /career (يحمل التلميح المهني) ═══ */}
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
            {w.majorName ? `عالم ${w.majorName}` : "عالم تخصصك"}
          </p>
          <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>برامجك وشهاداتك وشركاتك ومساراتك</p>
          <p className="t-caption mt-1" style={{ color: "var(--text-dim)" }}>💼 {hint}</p>
        </div>
        <span className="text-[18px] flex-shrink-0" style={{ color: "var(--accent-light)" }} aria-hidden="true">←</span>
      </Link>

      {/* ═══ أدوات الجامعة + عُدّة تخصصك (ToolTile الموحّد) ═══ */}
      <CardGrid cols={2}>
        <ToolTile icon="🧮" title="أدوات الجامعة" desc="المعدل والغياب والفاينل" color="var(--accent)" href="/uni-tools" />
        <ToolTile icon="💻" title="عُدّة تخصصك" desc="أجهزة وبرامج وأدوات AI" color="var(--gold)" href="/uni-gear" />
      </CardGrid>
    </div>
  );
}
