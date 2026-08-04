"use client";
/* ─── رؤى الأداء — قراءة مفسَّرة لبيانات الطالب (لا أرقام خام) ─── */
import { memo } from "react";
import type { DayPeriod, ReadinessLabel } from "@/lib/insights";
import { n } from "@/lib/format";

export interface InsightsData {
  mostActiveTime: { period: DayPeriod; mins: number } | null;
  mostStudied: { name: string; mins: number } | null;
  strong: { name: string; score: number }[];
  weak: { name: string; score: number }[];
  weeklyDeltaPct: number | null;
  monthlyDeltaPct: number | null;
  readiness: { pct: number; label: ReadinessLabel };
  daysLeft: number | null;
}

const READINESS_COLOR: Record<ReadinessLabel, string> = {
  "مبكّر": "var(--text-muted)",
  "في الطريق": "var(--gold)",
  "شبه جاهز": "var(--accent-light)",
  "جاهز": "var(--success)",
};

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-[15px]" style={{ color: "var(--text-muted)" }}>—</span>;
  const up = pct >= 0;
  return (
    <span className="text-[15px] font-bold" style={{ color: up ? "var(--success)" : "var(--danger)" }}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <p className="text-[12px] font-bold mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
      {children}
    </div>
  );
}

function ProfileInsightsBase({ data }: { data: InsightsData }) {
  const hasData = data.mostStudied || data.mostActiveTime || data.strong.length > 0 || (data.readiness.pct > 0);

  if (!hasData) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="text-4xl mb-2">🧭</div>
        <p className="font-black text-[18px] mb-1" style={{ color: "var(--text)" }}>رؤاك تبدأ بأول جلسة</p>
        <p className="text-[15px] leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
          بمجرد ما تذاكر، نحلّل أنشط أوقاتك، أقوى موادك، وجاهزيتك للاختبار — هنا بالضبط.
        </p>
        <a href="/orbit" className="inline-block px-5 py-2.5 rounded-2xl text-[16px] font-bold no-underline transition active:scale-[0.98]"
          style={{ background: "var(--accent)", color: "#fff" }}>
          ▶ ابدأ جلسة تركيز
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="label mb-3">رؤى أدائك</p>

      {/* الجاهزية المقدّرة — الأبرز */}
      <div className="rounded-2xl px-4 py-4 mb-3" style={{ background: "var(--surface2)", border: `1.5px solid ${READINESS_COLOR[data.readiness.label]}` }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[15px] font-bold" style={{ color: "var(--text)" }}>
            <span aria-hidden="true">🚀 </span>الجاهزية المقدّرة
          </span>
          <span aria-live="polite" className="text-[14px] font-black px-2 py-0.5 rounded-full" style={{ background: `color-mix(in srgb, ${READINESS_COLOR[data.readiness.label]} 18%, transparent)`, color: READINESS_COLOR[data.readiness.label] }}>
            {data.readiness.label}
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="num-hero text-[32px] leading-none font-mono-nums" style={{ color: READINESS_COLOR[data.readiness.label] }}>{data.readiness.pct}%</span>
          {data.daysLeft !== null && data.daysLeft >= 0 && (
            <span className="text-[14px]" style={{ color: "var(--text-muted)" }}>· باقٍ {n(data.daysLeft)} يوم للاختبار</span>
          )}
        </div>
        <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "var(--border)" }}
          role="progressbar" aria-label="الجاهزية المقدّرة" aria-valuenow={data.readiness.pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${data.readiness.pct}%`, background: READINESS_COLOR[data.readiness.label] }} />
        </div>
        <p className="text-[12px] mt-1.5" style={{ color: "var(--text-muted)" }}>مؤشّر إرشادي = تقدّم المسار + إتقان المهارات + الانتظام</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {data.mostActiveTime && (
          <Tile label="⏰ أنشط وقتك">
            <p className="text-[16px] font-black" style={{ color: "var(--text)" }}>{data.mostActiveTime.period}</p>
          </Tile>
        )}
        {data.mostStudied && (
          <Tile label="📈 أكثر مادة">
            <p className="text-[16px] font-black truncate" style={{ color: "var(--text)" }}>{data.mostStudied.name}</p>
          </Tile>
        )}
        {data.strong.length > 0 && (
          <Tile label="💪 أقوى مهارة">
            <p className="text-[16px] font-black truncate" style={{ color: "var(--success)" }}>{data.strong[0].name}</p>
          </Tile>
        )}
        {data.weak.length > 0 && (
          <Tile label="⚠️ تحتاج تقوية">
            <p className="text-[16px] font-black truncate" style={{ color: "var(--gold)" }}>{data.weak[0].name}</p>
          </Tile>
        )}
        <Tile label="📅 تحسّن أسبوعي"><Delta pct={data.weeklyDeltaPct} /></Tile>
        <Tile label="🗓️ تحسّن شهري"><Delta pct={data.monthlyDeltaPct} /></Tile>
      </div>
    </div>
  );
}

export default memo(ProfileInsightsBase);
