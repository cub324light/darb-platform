"use client";
/* ─── إشارات الرئيسية: «قريباً» + «آخر التحديثات» + «الاختبارات القادمة» ───
   بياناتٌ حقيقية فقط: تقويم الاختبارات الرسمي + نتائج الطالب المنتظَرة + روابط الجهات
   الرسمية. لا محتوى منسوخ ولا عناوين مختلقة — ملخّصٌ سطرٌ واحد وزرّ «المصدر الرسمي». */
import { useState } from "react";
import Link from "next/link";
import { loadUser, localDayKey } from "@/lib/storage";
import { upcomingMilestones, officialUpdates, milestoneIcon, type Milestone, type OfficialUpdate } from "@/lib/home/homeSignals";
import { n, dateShort } from "@/lib/format";

interface SignalsData {
  soon: Milestone[];
  updates: OfficialUpdate[];
  exams: { track: string; daysUntil: number | null; date: string | null }[];
}

function build(): SignalsData | null {
  if (typeof window === "undefined") return null;
  const u = loadUser();
  const today = localDayKey(new Date());
  const pending = u?.pendingResults ?? [];
  const soon = upcomingMilestones({ today, horizonDays: 120, pending, limit: 5 });

  /* اختبارات الطالب المختارة → أقرب موعد اختبارٍ معلن (إن وُجد) */
  const examMs = upcomingMilestones({ today, horizonDays: 365, pending, limit: 30 }).filter((m) => m.kind === "exam");
  const byTrack = new Map<string, Milestone>();
  for (const m of examMs) if (!byTrack.has(m.track)) byTrack.set(m.track, m);
  const tracks = (u?.activeTracks ?? []).filter((t) => t === "قدرات" || t === "تحصيلي" || t === "ستيب" || t === "تحصيلي مبكر");
  const exams = tracks.map((t) => {
    const m = byTrack.get(t);
    return { track: t, daysUntil: m?.daysUntil ?? null, date: m?.date ?? null };
  });

  return { soon, updates: officialUpdates(), exams };
}

export default function HomeSignals() {
  const [d] = useState(build);
  if (!d) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* ═══ ٥أ) قريباً — مواعيد رسمية قادمة فقط ═══ */}
      <section className="ds-card ds-card-tight">
        <p className="t-title font-black mb-2.5" style={{ color: "var(--text)" }}>قريباً</p>
        {d.soon.length > 0 ? (
          <div className="flex flex-col gap-2">
            {d.soon.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <span className="text-[16px] flex-shrink-0">{milestoneIcon(m.kind)}</span>
                <span className="t-body font-bold flex-1 min-w-0" style={{ color: "var(--text)" }}>{m.title}</span>
                <span className="t-caption font-black font-mono-nums flex-shrink-0 px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>
                  {m.daysUntil === 0 ? "اليوم" : `بعد ${n(m.daysUntil)} يوم`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-body" style={{ color: "var(--text-muted)" }}>لا مواعيد رسمية قادمة معلنة حالياً — تابع المصدر الرسمي.</p>
        )}
      </section>

      {/* ═══ ٥ب) آخر التحديثات — الجهات الرسمية المعتمدة ═══ */}
      <section className="ds-card ds-card-tight">
        <p className="t-title font-black mb-1" style={{ color: "var(--text)" }}>آخر التحديثات</p>
        <p className="t-caption mb-2.5" style={{ color: "var(--text-muted)" }}>معلومات رسمية فقط — للتفاصيل افتح المصدر الرسمي.</p>
        {d.updates.length > 0 ? (
          <div className="flex flex-col gap-2">
            {d.updates.map((u) => (
              <div key={u.id} className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="t-caption font-black" style={{ color: "var(--accent-light)" }}>{u.entity}</span>
                  <span className="t-caption font-mono-nums flex-shrink-0" style={{ color: "var(--text-dim)" }}>{dateShort(u.updatedAt)}</span>
                </div>
                <p className="t-body font-bold mt-0.5 mb-2 leading-snug" style={{ color: "var(--text)" }}>{u.title}</p>
                <a href={u.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 t-caption font-bold no-underline px-2.5 py-1 rounded-full tap-44"
                  style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>
                  المصدر الرسمي ↗
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-body" style={{ color: "var(--text-muted)" }}>لا توجد تحديثات جديدة حالياً.</p>
        )}
      </section>

      {/* ═══ ٦) الاختبارات القادمة — اختبارات الطالب + عدّاد + مراجعة ═══ */}
      {d.exams.length > 0 && (
        <section>
          <p className="t-title font-black mb-2.5 px-0.5" style={{ color: "var(--text)" }}>الاختبارات القادمة</p>
          <div className="grid grid-cols-2 gap-2.5">
            {d.exams.map((e) => (
              <div key={e.track} className="ds-card ds-card-tight flex flex-col gap-2">
                <p className="t-body font-black" style={{ color: "var(--text)" }}>{e.track}</p>
                <p className="t-caption font-mono-nums" style={{ color: e.daysUntil != null ? "var(--accent-light)" : "var(--text-muted)" }}>
                  {e.daysUntil != null ? `بعد ${n(e.daysUntil)} يوم` : "لم يُعلن الموعد بعد"}
                </p>
                <Link href="/review" className="mt-auto text-center t-caption font-bold no-underline rounded-xl py-2"
                  style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}>
                  مراجعة
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
