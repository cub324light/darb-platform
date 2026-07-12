"use client";
/* ─── لوحة الطالب الجامعي — تشغيلية لا مدرسية ───
   الجامعي لا يرى قدرات/تحصيلي/قبول/غياب. يرى ما يعينه على قرارٍ الآن:
   شريطٌ أكاديميّ واحد (المعدّل · الساعات · المتبقّي للتخرّج تقريبياً · الفصل/الفاينل)
   ثم بطاقات إجراء قليلة (الواجبات · التدريب والوظائف · دويرب · مسارك).
   «اختباره القادم» = الفاينل من semesterInfo لا القياس. أرقامٌ حقيقية فقط —
   ما لا مصدر له (المقررات المسجَّلة) لا يُعرض. قراءة كسولة SSR-safe. */
import { useState } from "react";
import Link from "next/link";
import { loadUser } from "@/lib/storage";
import { semesterInfo, gradProgress } from "@/lib/uniJourney";

interface Tile { icon: string; title: string; desc: string; href?: string; event?: string; }

function TileCard({ t }: { t: Tile }) {
  const inner = (
    <>
      <span className="text-[20px] leading-none flex-shrink-0" aria-hidden="true">{t.icon}</span>
      <span className="flex flex-col min-w-0">
        <span className="t-body font-black leading-tight" style={{ color: "var(--text)" }}>{t.title}</span>
        <span className="t-caption truncate" style={{ color: "var(--text-muted)" }}>{t.desc}</span>
      </span>
    </>
  );
  const cls = "ds-card ds-card-tight ds-card-interactive flex items-center gap-2.5 no-underline w-full text-right";
  return t.href
    ? <Link href={t.href} className={cls}>{inner}</Link>
    : <button onClick={() => window.dispatchEvent(new CustomEvent(t.event!))} className={cls}>{inner}</button>;
}

/* خانة رقمٍ واحدة داخل الشريط الأكاديمي — تفتح /uni-tools لإضافة/تعديل القيمة */
function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <Link href="/uni-tools" className="flex flex-col gap-0.5 text-right no-underline flex-1 min-w-0">
      <span className="t-caption" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="font-mono-nums font-black" style={{ fontSize: "1.35rem", lineHeight: 1.1, color }}>{value}</span>
      <span className="t-caption truncate" style={{ color: "var(--text-muted)" }}>{sub}</span>
    </Link>
  );
}

function gpaColor(g: number | null): string {
  if (g == null) return "var(--text-muted)";
  if (g >= 4.5) return "var(--success)";
  if (g >= 3.0) return "var(--gold)";
  return "var(--danger)";
}

export default function UniBoard({ hint }: { hint: string }) {
  const [w] = useState(() => {
    if (typeof window === "undefined") return null;
    const u = loadUser();
    const gpa = u?.universityGpa ?? null;
    const hours = u?.creditHoursCompleted ?? null;
    return { gpa, hours, sem: semesterInfo(new Date()), grad: gradProgress(hours ?? undefined) };
  });
  if (!w) return null;
  const { gpa, hours, sem, grad } = w;
  const finalsClose = sem?.daysToFinals != null && sem.daysToFinals <= 14;

  return (
    <div className="flex flex-col gap-4">
      {/* ═══ الشريط الأكاديمي — كل ما يحدّد قرار الجامعي في بطاقة واحدة ═══ */}
      <section className="ds-card ds-card-lg flex flex-col gap-3">
        {/* الفصل والفاينل — «اختباره القادم» */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="t-caption" style={{ color: "var(--text-muted)" }}>الفصل الحالي</p>
            <p className="t-body font-black leading-tight" style={{ color: "var(--text)" }}>
              {sem ? `${sem.termLabel} · الأسبوع ${sem.weekNumber}` : "إجازة — استعد للفصل القادم"}
            </p>
          </div>
          {sem?.daysToFinals != null && (
            <span className="flex-shrink-0 text-right">
              <span className="font-mono-nums font-black text-[15px]" style={{ color: finalsClose ? "var(--danger)" : "var(--accent-light)" }}>
                ⏳ {sem.daysToFinals} يوم
              </span>
              <span className="t-caption block" style={{ color: "var(--text-muted)" }}>{sem.finalsLabel ?? "للاختبارات"}</span>
            </span>
          )}
        </div>

        {/* المعدّل · الساعات · المتبقّي للتخرّج (تقريبي) */}
        <div className="flex items-stretch gap-3 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          <Stat label="معدّلك" value={gpa != null ? gpa.toFixed(2) : "—"} sub={gpa != null ? "من ٥" : "أضِفه ←"} color={gpaColor(gpa)} />
          <Stat label="ساعاتك" value={hours != null ? String(grad.done) : "—"} sub={hours != null ? "ساعة منجزة" : "أضِفها ←"} color="var(--text)" />
          <Stat label="للتخرّج (تقريبي)" value={hours != null ? `${grad.remaining}` : "—"} sub={hours != null ? `ساعة · ${grad.pct}%` : "أضِف ساعاتك"} color={grad.pct >= 100 ? "var(--success)" : "var(--accent-light)"} />
        </div>
      </section>

      {/* ═══ بطاقات الإجراء — قليلة، كلٌّ يقود لقرار ═══ */}
      <div className="grid grid-cols-2 gap-2.5">
        <TileCard t={{ icon: "📝", title: "الواجبات", desc: "ما عليك هذا الأسبوع", href: "/school" }} />
        <TileCard t={{ icon: "💼", title: "التدريب والوظائف", desc: "التعاوني والفرص", href: "/opportunities" }} />
        <TileCard t={{ icon: "🤖", title: "دويرب", desc: "مساعدك الذكي", event: "darb:openDuirb" }} />
        <TileCard t={{ icon: "🗺️", title: "مسارك ومستقبلك", desc: "عالم تخصصك", href: "/career" }} />
      </div>

      <p className="t-caption px-0.5" style={{ color: "var(--text-dim)" }}>💼 {hint}</p>
    </div>
  );
}
