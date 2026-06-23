"use client";
/* ─── رحلة التعلّم — معالم + آخر نشاط (مرتّبة زمنياً) ─── */
import { memo } from "react";

export interface JourneyItem { ts: number; icon: string; text: string; milestone?: boolean; }

function relDay(ts: number): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(ts); d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff <= 0) return "اليوم";
  if (diff === 1) return "أمس";
  if (diff < 7) return `قبل ${diff.toLocaleString("ar")} أيام`;
  try { return new Date(ts).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }); } catch { return ""; }
}

function ProfileTimelineBase({ items }: { items: JourneyItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="text-4xl mb-2">🗺️</div>
        <p className="font-black text-[16px] mb-1" style={{ color: "var(--text)" }}>رحلتك تبدأ الآن</p>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          كل جلسة وخطة وإنجاز يُسجَّل هنا كمحطة في رحلتك. أول خطوة تصنع الفرق.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="label mb-3">رحلتك</p>
      <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex flex-col gap-3">
          {items.map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{
                  background: t.milestone ? "color-mix(in srgb, var(--gold) 18%, transparent)" : "color-mix(in srgb, var(--accent) 10%, transparent)",
                  border: t.milestone ? "1px solid color-mix(in srgb, var(--gold) 40%, transparent)" : "none",
                }}>{t.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] leading-snug" style={{ color: "var(--text)", fontWeight: t.milestone ? 800 : 400 }}>{t.text}</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{relDay(t.ts)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(ProfileTimelineBase);
