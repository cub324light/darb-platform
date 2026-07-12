"use client";
/* ─── بطل لوحة الطالب — Hero واحد يملأ أول الشاشة ───
   يجمع ما يحتاجه الطالب فور الدخول: تحية + «ماذا أفعل الآن؟» (قرار Life Engine
   الأول) + أقرب اختبار + تقدّم اليوم + زرٌّ رئيسي واحد. لا جدار نصوص (تفاصيل القرار
   تخرج من هنا)، ولونان فقط: لون الأولوية والنص. يقرأ من المحرّك لا يقرّر. */
import { useState } from "react";
import Link from "next/link";
import { readLifeContext, lifeEngine, type PriorityArea } from "@/lib/lifeEngine";
import { loadStats } from "@/lib/storage";

const AREA_COLOR: Record<PriorityArea, string> = {
  urgent: "var(--danger)", gpa: "var(--accent)", study: "var(--accent)",
  career: "var(--success)", growth: "var(--success)", admission: "var(--gold)",
};

export default function DashHero() {
  const [d] = useState(() => {
    const ctx = readLifeContext();
    const top = lifeEngine(ctx)[0] ?? null;
    const stats = loadStats();
    return { top, qiyas: ctx.qiyas, todayMins: stats.todayFocusMins ?? 0 };
  });

  const c = d.top ? AREA_COLOR[d.top.area] : "var(--accent)";

  return (
    <section className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 text-right mb-3"
      style={{
        background: `linear-gradient(155deg, color-mix(in srgb, ${c} ${d.top?.urgent ? 15 : 10}%, var(--surface)) 0%, var(--surface) 80%)`,
        border: `1px solid color-mix(in srgb, ${c} ${d.top?.urgent ? 38 : 24}%, var(--border))`,
      }}>
      {/* ماذا أفعل الآن؟ — قرار واحد (التحية أعلاه في القبة) */}
      {d.top ? (
        <div className="flex items-start gap-3">
          <span className="text-[29px] leading-none flex-shrink-0 mt-0.5" aria-hidden="true">{d.top.icon}</span>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className="eyebrow" style={{ color: c }}>{d.top.urgent ? "⏳ الأهمّ الآن" : "✦ الأهمّ الآن"}</span>
            <h1 className="t-h1 leading-tight" style={{ color: "var(--text)" }}>{d.top.title}</h1>
          </div>
        </div>
      ) : (
        <h1 className="t-h1 leading-tight" style={{ color: "var(--text)" }}>ابدأ يومك بجلسة تركيز 🎯</h1>
      )}

      {/* أقرب اختبار + تقدّم اليوم — إشارتان موجزتان (بلا لونٍ ثالث) */}
      <div className="flex items-center gap-2 flex-wrap">
        {d.qiyas && (
          <span className="inline-flex items-center gap-1.5 text-[14px] font-bold px-2.5 py-1 rounded-lg"
            style={{ background: "var(--surface2)", color: "var(--text-dim)" }}>
            📅 {d.qiyas.label} · بعد {d.qiyas.approximate ? "~" : ""}{d.qiyas.days} يوم
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 text-[14px] font-bold px-2.5 py-1 rounded-lg"
          style={{ background: "var(--surface2)", color: "var(--text-dim)" }}>
          ⏳ اليوم: {d.todayMins} دقيقة
        </span>
      </div>

      {/* زرٌّ رئيسي واحد */}
      <Link href={d.top?.href ?? "/orbit"}
        className="inline-flex items-center justify-center gap-2 rounded-xl px-4 no-underline font-black transition active:scale-[0.98] self-stretch sm:self-start"
        style={{
          height: "var(--btn-h)", background: c,
          color: d.top?.area === "admission" ? "#1a1400" : "#fff",
          boxShadow: `0 4px 16px color-mix(in srgb, ${c} 30%, transparent)`,
        }}>
        {d.top?.cta ?? "ابدأ جلسة الآن"}<span aria-hidden="true">←</span>
      </Link>
    </section>
  );
}
